(function () {
'use strict';

function updateStatus(url, text) {
   console.log(url+': '+text);
   $('#status').html(url+': '+text);
}

var log = '';
function addLog(level, url, text, error) {
   console[level](url ? url+': '+text : text);
   if (error) {
      console[level](error.stack);
   }
   if (level != 'debug') {
      $('#log').append('<p class="'+level+'">('+url+') '+level+': '+text+'</p>');
      log = log+'\n'+'('+url+') '+level+': '+text;
   }
}

function getLog() {
   return log;
}

// we keep track of called callbacks to spot callbacks called twice
var callbackCalled = {};

function checkCallback(url, funcName) {
   var callbackName = url+funcName;
   if (callbackCalled[callbackName]) {
      addLog('error', url, 'received callback twice for task.'+funcName);
      return false;
   } else {
      callbackCalled[callbackName] = true;
      return true;
   }
}

function genAutoTest(url, task, functionName, args, resultChecker) {
   return function(callback) {
      if (!task[functionName]) {
         addLog('error', url, 'cannot call task.'+functionName);
         callback();
         return;
      }
      if (!args) {args = [];}
      var timeisout;
      var timeout = window.setTimeout(function() {
         timeisout = true;
         addLog('error', url, 'did not receive callback from task.'+functionName+'after 500ms, aborting');
         callback();
      },500);
      // adding success and error to args
      args.push(function() {
         if (!checkCallback(url, functionName)) {return;}
         window.clearTimeout(timeout);
         if (timeisout) {
            addLog('error', url, 'finally received callback from task.'+functionName+'but too late');
            return;
         }
         if (resultChecker && resultChecker(url,arguments[0],arguments[1],arguments[2])) {
               addLog('log', url, 'automatic test of task.'+functionName+' OK');
         } else if (!resultChecker) {
            addLog('log', url, 'automatic test of task.'+functionName+' OK');
         }
         callback();
      });
      args.push(function(errorcode, errormsg) {
         if (!checkCallback(url, functionName)) {return;}
         window.clearTimeout(timeout);
         addLog('error', url, 'error in task.getViews: '+errormsg);
         callback();
      });
      updateStatus(url, 'calling task.'+functionName+'...');
      task[functionName].apply(task,args);
   };
}

function checkAnswer(url, answer) {
   if (typeof answer !== 'string') {
      addLog('error', url, 'task.getAnswer returned value of type "'+typeof answer+'"" instead of "string"');
      return false;
   }
   return true;
}

function checkViews(url,views) {
   addLog('debug', url, 'receiving views:');
   addLog('debug', null, views);
   var res = true;
   if (!views) {
      addLog('error', url, 'task.getViews: no views returned');
      res = false;
   }
   var mandatory = ['task', 'solution', 'hints', 'editor', /*'submissions', */'forum'];
   var missing = [];
   for (var i = 0; i < mandatory.length; i++) {
      var field = mandatory[i];
      if (typeof views[field] === 'undefined') {
         missing.push(field);
      }
   }
   if (missing.length) {
      addLog('error', url, 'missing views: "'+missing.join('", "')+'"');
      res = false;
   }
   return res;
}

function checkMetaData(url,metadata) {
   addLog('debug', url, 'receiving metadata:');
   addLog('debug', null, metadata);
   var res = false;
   if (!metadata) {
      addLog('error', url, 'task.getMetadata: no metadata returned');
      res = false;
   }
   var mandatory = ['id', 'language', 'version', 'authors', 'license' /*, 'title' */];
   var missing = [];
   for (var i = 0; i < mandatory.length; i++) {
      var field = mandatory[i];
      if (typeof metadata[field] === 'undefined') {
         missing.push(field);
      }
   }
   if (missing.length) {
      addLog('error', url, 'missing fields in metadata: "'+missing.join('", "')+'"');
      res = false;
   }
   return res;
}

function checkGrader(url,score, message,scoreToken) {
   addLog('debug', url, 'receiving score of '+score+' and message "'+message+'"');
   var res = true;
   if (typeof score !== 'number') {
      addLog('error', url, 'task.gradeAnswer: score of type "'+typeof score+'" received instead of type "number"');
      res = false;
   }
   if (parseInt(score) !== score) {
      addLog('error', url, 'task.gradeAnswer: score is float instead of integer: '+score);
      res = false;
   }
   if (score < 0) {
      addLog('error', url, 'score below minScore: '+score);
      res = false;
   }
   if (score > 100) {
      addLog('error', url, 'score above maxScore: '+score);
      res = false;
   }
   if (typeof message !== 'string') {
      addLog('error', url, 'task.gradeAnswer: score of type "'+typeof message+'" received instead of type "string"');
      res = false;
   }
   return res;
}

function getUserInput(url,testname,message,callback) {
   $('#message').html(message);
   $('#button-ok').one('click', function() {
      addLog('log', url, 'manual test '+testname+' OK');
      $('#user-input').hide();
      $('#task-view').css('visibility', 'hidden');
      callback();
   });
   $('#button-nok').one('click', function() {
      addLog('error', url, 'manual test '+testname+' fail');
      $('#user-input').hide();
      $('#task-view').css('visibility', 'hidden');
      callback();
   });
   $('#button-idontknow').one('click', function() {
      addLog('error', url, 'manual test '+testname+' unknown');
      $('#user-input').hide();
      $('#task-view').css('visibility', 'hidden');
      callback();
   });
   $('#user-input').show();
   $('#task-view').css('visibility', 'visible');
}

function checkManualTestAnswer(url, task, test, callback) {
   task.reloadAnswer(test.answer, function() {
   getUserInput(url, test.answer, 'Please check the state of the iframe when reloading answer '+test.answer, function() {
      if (test.scoreOutOf100) {
         task.gradeAnswer(test.answer, null, function(score, message, scoreToken) {
            if (checkGrader(url, score, message, scoreToken)) {
               var res = true;
               if (message != test.message) {
                  res = false;
                  addLog('error', url, 'grading answer '+test.answer+' gives message "'+message+'" instead of "'+test.message+'"');
               }
               if (score != test.scoreOutOf100) {
                  res = false;
                  addLog('error', url, 'grading answer '+test.answer+' gives score '+score+'/100 instead of "'+test.scoreOutOf100+'/100');
               }
               if (res) {
                  addLog('log', url, 'task test grading answer '+test.answer+' OK');  
               }
            }
            callback();
         });
      } else {
         callback();
      }
   });
});
}

function genManualTest(url, task, test, nameArgs) {
   return function(callback) {
      if (test.answer) {
         if (test.reload) {
            updateStatus(url, 'manual test for answer'+test.answer+' (after unload/reload)');
            task.unload(function() {
               task.load(nameArgs.load[0], function() {
                  task.showViews(nameArgs.showViews[0], function() {
                     checkManualTestAnswer(url, task, test, callback);         
                  });
               });
            });
         } else {
            updateStatus(url, 'manual test for answer'+test.answer);
            checkManualTestAnswer(url, task, test, callback);
         }
      } else {
         addLog('error', url, 'missing answer field in task test');
         callback();
      }
   };
}

function getTestArray(url, task, resources) {
   updateStatus(url, 'building tests...');
   var res = [];
   var names = ['load', 'getMetaData', 'getViews', 'showViews', 'manual', 'reloadAnswer', 'getHeight', 'reloadState', 
      'updateToken', 'getAnswer', 'gradeAnswer', 'getState', 'unload'];
   var nameChecker = {
      'getAnswer': checkAnswer,
      'getViews': checkViews,
      'getMetaData': checkMetaData,
      'gradeAnswer': checkGrader,
      'getState': checkAnswer
   };
   var nameArgs = {
      'load': [{grader: true, metadata: true, task: true, solution: true, hints: true, forum: true}],
      'showViews': [{task: true, solution: true, hints: true, forum: true}],
      'reloadAnswer': [''],
      'reloadState': ['""'],
      'gradeAnswer': ['', ''],
      'updateToken': ['']
   };
   for (var i = 0; i<names.length; i++) {
      var funcName = names[i];
      // we add manual tests when task is loaded and showViews is called
      if (funcName == 'manual') {
         if (resources && resources.tests) {
            for (var j = 0; j<resources.tests.length; j++) {
               var test = resources.tests[j];
               res.push({
                  'name': 'manual test '+test.function,
                  'function': genManualTest(url, task, test, nameArgs)
               });
            }
         }
      } else {
         res.push({
            'name': 'task.'+funcName,
            'function': genAutoTest(url, task, funcName, nameArgs[funcName], nameChecker[funcName])
         });
      }
   }
   return res;
}

function validateTests(url, tests, testIndex, callback) {
   if (testIndex >= tests.length) {
      callback();
      return;
   }
   var testFun = tests[testIndex].function;
   try {
      testFun(function(){
         validateTests(url, tests, testIndex+1, callback);
      });
   } catch(e) {
      addLog('error', url, 'error calling '+tests[testIndex].name+': '+e, e);
   }
}

function getOptions(url) {
   var regex = new RegExp("[\\?&]options=([^&#]*)"),
      options = regex.exec(url);
   options = (options === null) ? "" : decodeURIComponent(options[1].replace(/\+/g, " "));
   var optionsRes;
   try {
      optionsRes = JSON.parse(options);
   } catch (e) {
      addLog('error', url, 'cannot understand options passed to url');
      optionsRes = {};
   }
   return optionsRes;
}

function createPlatform(url, task) {
   var options = getOptions(url);
   // task-proxy.js provides a Platform class
   var platform = new Platform(task);
   // we implement a few methods:
   platform.validate = function(mode, success, error) {
      addLog('debug', url, 'receiving platform.validate(' + mode + ')');
      if (success) {success();}
   };
   platform.updateHeight = function(height, success, error) {
      if (parseInt(height) !== height) {
         addLog('error', url, 'receiving platform.updateHeight with non-integer argument');
         if (success) {success();}
         return;
      }
      if (height < 1) {
         addLog('error', url, 'receiving platform.updateHeight with argument < 1');
         if (success) {success();}
         return;
      }
      $('#task-view').height(height);
      addLog('debug', url, 'receiving platform.updateHeight(' + height + '), setting height of iframe');
      
   };
   platform.askHint = function(success, error) {
      addLog('debug', url, 'receiving platform.askHint()');
      if (success) {success();}
   };
   platform.openUrl = function(id, success, error) {
      addLog('debug', url, 'receiving platform.openUrl(' + id + ')');
      if (success) {success();}
   };
   platform.showViews = function(views, success, error) {
      views = JSON.stringify(views);
      addLog('debug', url, 'receiving platform.showViews(' + views + ')');
      if (success) {success();}
   };
   platform.getTaskParams = function(key, defaultValue, success, error) {
      addLog('debug', url, 'receiving platform.getTaskParams(' + JSON.stringify(key) + ', '+JSON.stringify(defaultValue)+')');
      var res = {minScore: 0, maxScore: 100, randomSeed: 0, noScore: 0, readOnly: false, options: options};
      console.error(res);
      if (key) {
         if (key !== 'options' && key in res) {
            res = res[key];
         } else if (res.options && key in res.options) {
            res = res.options[key];
         } else {
            res = (typeof defaultValue !== 'undefined') ? defaultValue : null;
         }
      }
      if (typeof success !== 'function') {
         addLog('error', 'platform.getTaskParams must be called with a callback function as third argument');
      } else {
         success(res);
      }
   };
   return platform;
}

function formatJshintError(error) {
   return 'line '+error.line+' character '+error.character+' : '+error.reason;
}

function testScriptJshint(url, scriptName, script) {
   JSHINT(script, {
      "devel":true,
      "browser": true,
      "predef":[ "grader", "task", "platform", "stdAnsTypes", "displayHelper", "Platform", "Task", "Raphael", "DragAndDropSystem"],
      "trailing": true,
      "futurehostile": true,
      "undef":true,
      "unused":true,
      "eqnull": true,
      "jquery": true
   });
   if (JSHINT.errors.length) {
      addLog('error', url, 'jshint output the following messages:');
      for (var i = 0; i < JSHINT.errors.length; i++) {
         var error = JSHINT.errors[i];
         if (!error) {continue;}
         addLog('error', url, formatJshintError(error));
      }
   }
}

function getAbsoluteUrl(baseUrl, resourceUrl) {
   var isAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i');
   if (isAbsolute.test(resourceUrl)) {
      return resourceUrl;
   }
   baseUrl = baseUrl.substr(0, baseUrl.lastIndexOf("/") + 1);
   return baseUrl+resourceUrl;
}

var scriptUrlsTested = {};
function testResourceJshint(url, resource, callback) {
   if (resource.content) {
      testScriptJshint(url, 'inline', resource.content);
      callback();
   } else {
      var resourceUrl = getAbsoluteUrl(url, resource.url);
      if (scriptUrlsTested[resourceUrl]) {
         callback();
      } else {
         $.get(resourceUrl, function(data, status) {
            testScriptJshint(resourceUrl, resource.id, data);
            callback();
         }, 'text');
      }
   }
}

var resourceTypes = ['task', 'solution', 'grader', 'display_modules', 'display', 'sat_modules', 'sat'];
function testUrlJshint(url, resources, resourceTypeIndex, resourceIndex, callback) {
   if (!resources[resourceTypes[resourceTypeIndex]] || resourceIndex >= resources[resourceTypes[resourceTypeIndex]].length) {
      if (resourceTypeIndex >= resourceTypes.length) {
         callback();
      } else {
         testUrlJshint(url, resources, resourceTypeIndex+1, 0, callback);
      }
      return;
   }
   var resource = resources[resourceTypes[resourceTypeIndex]][resourceIndex];
   if (resource.type !== 'javascript') {
      testUrlJshint(url, resources, resourceTypeIndex, resourceIndex + 1, callback);
   } else {
      console.error(resource);
      testResourceJshint(url, resource, function() {
         testUrlJshint(url, resources, resourceTypeIndex, resourceIndex + 1, callback);
      });
   }
}

var useJshint = true;
function validateUrl(url, callback) {
   updateStatus('start validation of '+url);
   $('#task-view').attr('src',url);
   updateStatus(url, 'getting proxy...');
   var timeisout;
   var timeout = window.setTimeout(function(){
      timeisout = true;
      addLog('error', url, 'cannot obtain task proxy after 5s, aborting');
      callback();
   }, 5000);
   TaskProxyManager.getTaskProxy('task-view', function(task) {
      if (!checkCallback(url, 'getTaskProxy')) {return;}
      if (timeisout) {
         addLog('error', url, 'finally obtained proxy, but too late');
         return;
      }
      window.clearTimeout(timeout);
      var platform = createPlatform(url, task);
      TaskProxyManager.setPlatform(task, platform);
      updateStatus(url, 'getting resources...');
      task.getResources(function(resources) {
         if (!checkCallback(url, 'getResources')) {return;}
         if (useJshint) {
            testUrlJshint(url, resources, 0, 0, function(){
               var testArray = getTestArray(url, task, resources);
               validateTests(url, testArray, 0, callback);
            });
         } else {
            var testArray = getTestArray(url, task, resources);
            validateTests(url, testArray, 0, callback);
         }
      }, function(errorcode, errormsg) {
         if (!checkCallback(url, 'getResources')) {return;}
         addLog('warning', url, 'error trying to get resources: '+errormsg);
         validateTests(url, getTestArray(url, task), 0, callback);
      });
   }, true);
}

function validateUrls(urls, urlIndex) {
   if (urlIndex >= urls.length) {
      updateStatus('','automatic validation finished!');
      $('#task-view').css('display', 'none');
      $('#copyButton').css('display', 'block');
      return;
   }
   var url = urls[urlIndex];
   url = url.trim();
   if (!url) {
      validateUrls(urls, urlIndex+1);
   } else {
      if (urls.indexOf(url) != urlIndex) {
         addLog('error', url, 'url has been validated before, skipping');
         validateUrls(urls, urlIndex+1);
      } else {
         validateUrl(url, function() {
            validateUrls(urls, urlIndex+1);
         });
      }
   }
}

function startMultiValidation() {
   log = '';
   useJshint = $('#jshint').is(':checked');
   $('#task-view').css('display', 'block');
   var urls = $('#urls').val().split("\n");
   callbackCalled = {};
   validateUrls(urls, 0);
}

window.startMultiValidation = startMultiValidation;
window.getLog = getLog;

}());