(function () {
'use strict';

function updateStatus(url, text) {
   console.log(url+': '+text);
   $('#status').html(url+': '+text);
}

function addLog(level, url, text, error) {
   console[level](url ? url+': '+text : text);
   if (error) {
      console[level](error.stack);
   }
   if (level != 'debug') {
      $('#log').append('<p class="'+level+'">('+url+') '+level+': '+text+'</p>');
   }
}


function autoTestLoad(url, task, callback) {
   updateStatus(url, 'calling task.load...');
   task.load({task: true, grader: true, solution: true, metadata: true, hints: true, editor: true}, callback, function(errorcode, errormsg) {
      addLog('error', url, 'error in task.load: '+errormsg);
      callback();
   });
}

function autoTestShowViews(url, task, callback) {
   updateStatus(url, 'calling task.showViews...');
   task.showViews({task: true, solution: true, hints: true, editor: true}, callback, function(errorcode, errormsg) {
      addLog('error', url, 'error in task.showViews: '+errormsg);
      callback();
   });
}

function autoTestGetAnswer(url, task, callback) {
   updateStatus(url, 'calling task.getAnswer...');
   task.getAnswer(function(answer) {
      if (typeof answer !== 'string') {
         addLog('error', url, 'task.getAnswer returned value of type "'+typeof answer+'"" instead of "string"');
      }
      callback();
   }, function(errorcode, errormsg) {
      addLog('error', url, 'error in task.getAnswer: '+errormsg);
      callback();
   });
}

function autoTestGetViews(url, task, callback) {
   updateStatus(url, 'calling task.getViews...');
   task.getViews(function(views) {
      addLog('debug', url, 'receiving views:');
      addLog('debug', null, views);
      if (!views) {
         addLog('error', url, 'task.getViews: no views returned');
      }
      var mandatory = ['task', 'solution', 'hints', 'editor', 'submissions', 'forum'];
      var missing = [];
      for (var i = 0; i < mandatory.length; i++) {
         var field = mandatory[i];
         if (typeof views[field] === 'undefined') {
            missing.push(field);
         }
      }
      if (missing.length) {
         addLog('error', url, 'missing views: "'+missing.join('", "')+'"');
      }
      callback();
   }, function(errorcode, errormsg) {
      addLog('error', url, 'error in task.getViews: '+errormsg);
      callback();
   });
}

function autoTestGetMetaData(url, task, callback) {
   updateStatus(url, 'calling task.getMetaData...');
   task.getMetaData(function(metadata) {
      addLog('debug', url, 'receiving metadata:');
      addLog('debug', null, metadata);
      if (!metadata) {
         addLog('error', url, 'task.getMetadata: no metadata returned');
      }
      var mandatory = ['id', 'language', 'version', 'title', 'authors', 'license'];
      var missing = [];
      for (var i = 0; i < mandatory.length; i++) {
         var field = mandatory[i];
         if (typeof metadata[field] === 'undefined') {
            missing.push(field);
         }
      }
      if (missing.length) {
         addLog('error', url, 'missing fields in metadata: "'+missing.join('", "')+'"');
      }
      callback();
   }, function(errorcode, errormsg) {
      addLog('error', url, 'error in task.getMetaData: '+errormsg);
      callback();
   });
}

function getTestArray(url, task, resources) {
   updateStatus(url, 'building tests...');
   return [
      {
         'name': 'task.load',
         'function': function(callback) {autoTestLoad(url, task, callback);}
      },
      {
         'name': 'task.getMetaData',
         'function': function(callback) {autoTestGetMetaData(url, task, callback);}
      },
      {
         'name': 'task.getViews',
         'function': function(callback) {autoTestGetViews(url, task, callback);}
      },
      {
         'name': 'task.showViews',
         'function': function(callback) {autoTestShowViews(url, task, callback);}
      },
      {
         'name': 'task.getAnswer',
         'function': function(callback) {autoTestGetAnswer(url, task, callback);}
      },
   ];
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

function createPlatform(url, task) {
   // task-proxy.js provides a Platform class
   var platform = new Platform(task);
   // we implement a few methods:
   platform.validate = function(mode, success, error) {
      addLog('debug', url, 'receiving platform.validate(' + mode + ')');
      if (success) {success();}
   };
   platform.updateHeight = function(height, success, error) {
      $('#task-view').height(height);
      addLog('debug', url, 'receiving platform.updateHeight(' + height + '), setting height of iframe');
      if (success) {success();}
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
      var res = {minScore: -3, maxScore: 10, randomSeed: 0, noScore: 0, readOnly: false, options: {}};
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

function validateUrl(url, callback) {
   updateStatus('start validation of '+url);
   $('#task-view').attr('src',url);
   updateStatus(url, 'getting proxy...');
   var timeout = window.setTimeout(function(){
      addLog('error', url, 'cannot obtain task proxy');
      callback();
   }, 2000);
   TaskProxyManager.getTaskProxy('task-view', function(task) {
      window.clearTimeout(timeout);
      var platform = createPlatform(url, task);
      TaskProxyManager.setPlatform(task, platform);
      updateStatus(url, 'getting resources...');
      task.getResources(function(resources) {
         validateTests(url, getTestArray(url, task, resources), 0, callback);
      }, function(errorcode, errormsg) {
         addLog('warning', url, 'error trying to get resources: '+errormsg);
         validateTests(url, getTestArray(url, task), 0, callback);
      });
   }, true);
}

function validateUrls(urls, urlIndex) {
   if (urlIndex >= urls.length) {
      updateStatus('','automatic validation finished!');
      return;
   }
   var url = urls[urlIndex];
   validateUrl(url, function() {
      validateUrls(urls, urlIndex+1);
   });
}

function startMultiValidation() {
   var urls = $('#urls').val().split("\n");
   validateUrls(urls, 0);
}

window.startMultiValidation = startMultiValidation;

}());