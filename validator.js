var task;
var platform;
var taskLoaded = false;

function loadUrl () {
   var href = window.location.href;
   var root = window.location.href.substr(0, href.lastIndexOf('/'));
   var taskUrl = $('#taskUrl').val()+'#'+root;
   $('#task-view').prop('src', taskUrl);
   taskLoaded = false;
}

function msgLog(msg) {
   console.log(msg);
   $('.messages').append(msg+'<br>');
}

function clearLogs() {
   $('.messages').html('');
}

function initTask (callback) {
   TaskProxyManager.getTaskProxy('task-view', function(resTask) {
      task = resTask
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

function getMetaData() {
   if (!task || !taskLoaded) {
      alert('please init and load task first');
      return;
   }
   msgLog('calling task.getMetaData...');
   task.getMetaData(function(metadata) {
      msgLog('task.getMetaData ok!');
      msgLog('received: '+JSON.stringify(metadata));
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
      msgLog('got answer: '+answer);
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
   msgLog('calling task.updateToken()..');
   task.updateToken('abc', function() {
      msgLog('token updated');
   });
}

function gradeTask() {
   var graderanswer = $('#graderanswer').val();;
   msgLog('calling task.reloadAnswer('+graderanswer+')..');
   task.gradeTask(graderanswer, '', function(score, message, scoreToken) {
      msgLog('received from grader: score='+score+', message='+message+', scoreToken='+scoreToken);
   });
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
