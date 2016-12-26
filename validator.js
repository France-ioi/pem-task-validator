var task;
var grader;
var platform;
var taskLoaded = false;
var urlLoaded = false;

Date.prototype.tokenFormat = function() {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString();
   var dd  = this.getDate().toString();
   return (dd[1]?dd:"0"+dd[0]) + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + yyyy;
};

function toggleTokens() {
   if (urlLoaded) {
      alert('you must enable or disable tokens before loading the iframe, please reload the page');
      return false;
   }
   var today = new Date();
   today = today.tokenFormat();
   $('#grade-date').val(today);
   $('#date').val(today);
   $('#main-token-fields').toggleClass('hidden');
   $('#grade-token-fields').toggleClass('hidden');
}

var publicKey = "";
var privateKey = "";

function getTokenParams() {
   publicKey = $('#publickey').val();
   privateKey = $('#privatekey').val();
   var res = {};
   res['date'] = $('#date').val().toString();
   res['idUser'] = $('#idUser').val().toString();
   res['idItem'] = $('#idItem').val().toString();
   res['platform'] = $('#platform').val().toString();
   res['nbHintsGiven'] = parseInt($('#nbHintsGiven').val());
   res['bHintsAllowed'] = $('#bHintsAllowed').prop("checked");
   res['bAuthorsDisplayed'] = $('#bAuthorsDisplayed').prop("checked");
   res['bAllowPrivateMetaData'] = $('#bAllowPrivateMetaData').prop("checked");
   res['bReadOnly'] = $('#bReadOnly').prop("checked");
   res['bAllowGrading'] = $('#bAllowGrading').prop("checked");
   res['bHasFullAccess'] = $('#bHasFullAccess').prop("checked");
   res['bAccessSolutions'] = $('#bAccessSolutions').prop("checked");
   res['bSubmissionPossible'] = $('#bSubmissionPossible').prop("checked");
   return res;
}

function getGraderTokenParams() {
   var res = {};
   res['date'] = $('#grade-date').val().toString();
   res['idUser'] = $('#grade-idUser').val().toString();
   res['idItem'] = $('#grade-idItem').val().toString();
   res['platform'] = $('#grade-platform').val().toString();
   res['sAnswer'] = $('#grade-sAnswer').val().toString();
   return res;
}

function buildToken(grader, callback) {
   var tokenParams = grader ? getGraderTokenParams() : getTokenParams();
   console.log(tokenParams)
   msgLog('building token...');
   var p = {
      privateKey: privateKey,
      tokenParams: JSON.stringify(tokenParams)
   }
   $.post('buildToken.php', p, function(token) {
      console.log('token: '+token);
      msgLog('token received');
      callback(token);
   });
}

mainToken = '';

function getToken() {
   buildToken(false, function(token) {
      mainToken = token;
   });
}

function loadUrl () {
   var href = window.location.href;
   var root = window.location.href.substr(0, href.lastIndexOf('/'));
   if (!$('#main-token-fields').hasClass('hidden')) {
      var myurl = $('#taskUrl').val()
      var separator = (myurl.indexOf('?') === -1) ? '?' : '&';
      var taskUrl = myurl+separator+'sToken='+mainToken+'#'+root;
   } else {
      var taskUrl = $('#taskUrl').val()+'#'+root;
   }
   $('#task-view').prop('src', taskUrl);
   taskLoaded = false;
   urlLoaded = true;
}

function msgLog(msg) {
   console.log(msg);
   $('.messages').append('<div style="width:600px;overflow:auto">'+ $('<div />').text(msg).html() + '</div>');
}

function clearLogs() {
   $('.messages').html('');
}

function initTask (callback) {
   TaskProxyManager.getTaskProxy('task-view', function(resTask) {
      task = resTask;
      grader = resTask;
      TaskProxyManager.setPlatform(task, platform);
      msgLog('task initialized');
      callback();
   }, true);
}

function loadTask() {
   msgLog('initializing task...');
   initTask(function() {
      msgLog('calling task.load...');
      task.load({'task': true, 'grader': true, 'metadata': true, 'solution': true, 'hints': true, 'forum': true, 'editor': true}, function() {
         taskLoaded = true;
         msgLog('task.load ok!');
      });
   });
}

function unloadTask() {
   msgLog('calling task.unload...');
   task.unload(function() {
      taskLoaded = false;
      msgLog('task.unload ok!');
   });
}

function getViews() {
   msgLog('calling task.getViews()..');
   task.getViews(function(views) {
      msgLog('got views: '+JSON.stringify(views));
      if (!views.hasOwnProperty('task')) {
         msgLog('<strong>error!</strong>missing "task" in returned views');
      }
      if (!views.hasOwnProperty('solution')) {
         msgLog('<strong>error!</strong>missing "solution" in returned views');
      }
      if (!views.hasOwnProperty('hint')) {
         msgLog('<strong>error!</strong>missing "hint" in returned views');
      }
      if (!views.hasOwnProperty('forum')) {
         msgLog('<strong>error!</strong>missing "forum" in returned views');
      }
      if (!views.hasOwnProperty('editor')) {
         msgLog('<strong>error!</strong>missing "editor" in returned views');
      }
   });
}

function getMetaData() {
   if (!task || !taskLoaded) {
      alert('please init and load task first');
      return;
   }
   msgLog('calling task.getMetaData...');
   task.getMetaData(function(metadata) {
      msgLog('task.getMetaData ok!');
      msgLog('received: '+JSON.stringify(metadata));
      if (metadata.minWidth) {
         $('#task-view').width(metadata.minWidth);
         msgLog('setting iframe width to '+metadata.minWidth);
      }
      if (!metadata.hasOwnProperty('id')) {
         msgLog('<strong>error!</strong>missing "id" in returned metadata');
      }
      if (!metadata.hasOwnProperty('language')) {
         msgLog('<strong>error!</strong>missing "language" in returned metadata');
      }
      if (!metadata.hasOwnProperty('version')) {
         msgLog('<strong>error!</strong>missing "version" in returned metadata');
      }
      if (!metadata.hasOwnProperty('title')) {
         msgLog('<strong>error!</strong>missing "title" in returned metadata');
      }
      if (!metadata.hasOwnProperty('authors')) {
         msgLog('<strong>error!</strong>missing "authors" in returned metadata');
      }
      if (!metadata.hasOwnProperty('license')) {
         msgLog('<strong>error!</strong>missing "license" in returned metadata');
      }
   });
}

function showViews() {
   if (!task || !taskLoaded) {
      alert('please init and load task first');
      return;
   }
   var views = JSON.parse($('#views').val());
   msgLog('calling task.showViews('+JSON.stringify(views)+')..');
   task.showViews(views, function() {
      msgLog('views loaded');
   });
}

function getHeight() {
   msgLog('calling task.getHeight()..');
   task.getHeight(function(height) {
      msgLog('got height: '+height);
      msgLog('setting iframe height: '+height);
      $('#task-view').height(height);
   });
}

function reloadAnswer() {
   var answer = $('#answer').val();
   msgLog('calling task.reloadAnswer('+answer+')..');
   task.reloadAnswer(answer, function() {
      msgLog('answer loaded');
   });
}

function getAnswer() {
   msgLog('calling task.getAnswer()..');
   task.getAnswer(function(answer) {
      msgLog('got answer: ' + answer);
   });
}

function reloadState() {
   var state = $('#state').val();;
   msgLog('calling task.reloadState('+state+')..');
   task.reloadState(state, function() {
      msgLog('state loaded');
   });
}

function getState() {
   msgLog('calling task.getState()..');
   task.getState(function(state) {
      msgLog('got state : '+state);
   });
}

function updateToken() {
   buildToken(false, function(token) {
      msgLog('calling task.updateToken()..');
      task.updateToken(token, function() {
         msgLog('token updated');
      });
   });
}

function gradeTask() {
   var graderanswer = $('#graderanswer').val();
   if (!$('#main-token-fields').hasClass('hidden')) {
      buildToken(true, function(token){
         msgLog('calling grader.gradeTask('+graderanswer+')..');
         grader.gradeTask(graderanswer, token, function(score, message, scoreToken) {
            msgLog('received from grader: score='+score+', message='+message+', scoreToken='+scoreToken);
         });
      });
   } else {
      msgLog('calling task.reloadAnswer('+graderanswer+')..');
      grader.gradeTask(graderanswer, '', function(score, message, scoreToken) {
         msgLog('received from grader: score='+score+', message='+message+', scoreToken='+scoreToken);
      });
   }
}

$(document).ready(function() {
   // task-proxy.js provides a Platform class
   platform = new Platform(task);
   // we implement a few methods:
   platform.validate = function(mode) {
      msgLog('receiving platform.validate('+mode+')');
   }
   platform.updateHeight = function(height) {
      $('#task-view').height(height);
      msgLog('receiving platform.updateHeight('+height+'), setting height of iframe');
   }
   platform.askHint = function() {
      msgLog('receiving platform.askHint()');
   }
   platform.openUrl = function(id) {
      msgLog('receiving platform.openUrl('+id+')');
   }
   platform.showViews = function(views) {
      views = JSON.stringify(views);
      msgLog('receiving platform.showViews('+views+')');
   }
});