var TIME_TO_WAIT = 30000;

var task;
var grader;
var platform;
var taskLoaded = false;
var urlLoaded = false;
var id = 1;

Date.prototype.tokenFormat = function () {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth() + 1).toString();
   var dd = this.getDate().toString();
   return (dd[1] ? dd : "0" + dd[0]) + '-' + (mm[1] ? mm : "0" + mm[0]) + '-' + yyyy;
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
   res['bHintsAllowed'] = $('#bHintsAllowed').is(":checked");
   res['bAuthorsDisplayed'] = $('#bAuthorsDisplayed').is(":checked");
   res['bAllowPrivateMetaData'] = $('#bAllowPrivateMetaData').is(":checked");
   res['bReadOnly'] = $('#bReadOnly').is(":checked");
   res['bAllowGrading'] = $('#bAllowGrading').is(":checked");
   res['bHasFullAccess'] = $('#bHasFullAccess').is(":checked");
   res['bAccessSolutions'] = $('#bAccessSolutions').is(":checked");
   res['bSubmissionPossible'] = $('#bSubmissionPossible').is(":checked");
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
   var id_ = id++;
   var tokenParams = grader ? getGraderTokenParams() : getTokenParams();
   timer = setTimeout(function () { msgLog(id_, "Timeout, task didn't answer."); }, TIME_TO_WAIT);
   msgLog(id_, 'building token...');
   $.post('buildToken.php', {privateKey: privateKey, tokenParams: tokenParams}, function (token) {
      console.log('token: ' + token);
      msgLog(id_, 'token received');
      callback(token);
      clearTimeout(timer);
   });
}

mainToken = '';

function getToken() {
   buildToken(false, function (token) {
      mainToken = token;
   });
}

/*function getDomain() {
   reg = new RegExp("\/\/(.*)" + location.pathname);
   return reg.exec(location.href)[1];
}

function getDomainOf(url) {
   var r = url.split("/")[2];
   return r === "127.0.0.1" ? "localhost" : r;
}

function sameDomain(url) {
   if(!/\/\//.test(url))
      return true;
   return getDomainOf(location.href) === getDomainOf(url);
}*/

function loadUrl() {
   var href = window.location.href;
   var root = window.location.href.substr(0, href.lastIndexOf('/'));
   var myurl = $('#taskUrl').val();
   //loadTaskPr(sameDomain(myurl));
   if(myurl === "") {
      $('#error-emptyTaskUrl').css("visibility", "visible");
   }
   else {
      $('#error-emptyTaskUrl').css("visibility", "hidden");
      if (!$('#main-token-fields').hasClass('hidden')) {
         var separator = (myurl.indexOf('?') === -1) ? '?' : '&';
         var taskUrl = myurl + separator + 'sToken=' + mainToken + '#' + root;
      } else {
         var taskUrl = myurl + '#' + root;
      }
      $('#task-view').prop('src', taskUrl);
      taskLoaded = false;
      urlLoaded = true;
   }
}

function msgLog(id_, msg) {
   console.log(id_ + '. ' + msg);
   $('.messages').append(id_ + '. ' + msg + '<br>');
}

function clearLogs() {
   $('.messages').html('');
   id = 1;
}

function initTask(callback) {
   TaskProxyManager.getTaskProxy('task-view', function (resTask) {
      task = resTask;
      grader = resTask;
      TaskProxyManager.setPlatform(task, platform);
      id_ = callback();
      msgLog(id_, 'task initialized');
   }, true);
}

function loadTask() {
   var id_ = id++;
   msgLog(id_, 'initializing task...');
   var timer = setTimeout(function () { msgLog(id_, "Timeout, task didn't answer."); }, TIME_TO_WAIT);
   initTask(function () {
      msgLog(id_, 'calling task.load...');
      task.load({'task': true, 'grader': true, 'metadata': true, 'solution': true, 'hints': true, 'forum': true, 'editor': true}, function () {
         taskLoaded = true;
         msgLog(id_, 'task.load ok!');
         clearTimeout(timer);
      });
      //little trick to have loadTask and initTask with the same id in logs
      return id_;
   });
}

function unloadTask() {
   var id_ = id++;
   msgLog(id_, 'calling task.unload...');
   var timer = setTimeout(function () { msgLog(id_, "Timeout, task didn't answer."); }, TIME_TO_WAIT);
   task.unload(function () {
      taskLoaded = false;
      msgLog(id_, 'task.unload ok!');
      clearTimeout(timer);
   });
}

function getViews() {
   var id_ = id++;
   msgLog(id_, 'calling task.getViews()..');
   var timer = setTimeout(function () { msgLog(id_, "Timeout, task didn't answer."); }, TIME_TO_WAIT);
   task.getViews(function (views) {
      var strView = JSON.stringify(views);
      msgLog(id_, 'got views: ' + strView);
      $('#code-viewer').val(strView);
      if (!views.hasOwnProperty('task')) {
         msgLog(id_, '<strong>error!</strong>missing "task" in returned views');
      }
      if (!views.hasOwnProperty('solution')) {
         msgLog(id_, '<strong>error!</strong>missing "solution" in returned views');
      }
      if (!views.hasOwnProperty('hint')) {
         msgLog(id_, '<strong>error!</strong>missing "hint" in returned views');
      }
      if (!views.hasOwnProperty('forum')) {
         msgLog(id_, '<strong>error!</strong>missing "forum" in returned views');
      }
      if (!views.hasOwnProperty('editor')) {
         msgLog(id_, '<strong>error!</strong>missing "editor" in returned views');
      }
      clearTimeout(timer);
   });
}

function getMetaData() {
   var id_ = id++;
   if (!task || !taskLoaded) {
      alert('please init and load task first');
      return;
   }
   msgLog(id_, 'calling task.getMetaData...');
   task.getMetaData(function (metadata) {
      msgLog(id_, 'task.getMetaData ok!');
      msgLog(id_, 'received: ' + JSON.stringify(metadata));
      if (metadata.minWidth) {
         $('#task-view').width(metadata.minWidth);
         msgLog(id_, 'setting iframe width to ' + metadata.minWidth);
      }
      if (!metadata.hasOwnProperty('id')) {
         msgLog(id_, '<strong>error!</strong>missing "id" in returned metadata');
      }
      if (!metadata.hasOwnProperty('language')) {
         msgLog(id_, '<strong>error!</strong>missing "language" in returned metadata');
      }
      if (!metadata.hasOwnProperty('version')) {
         msgLog(id_, '<strong>error!</strong>missing "version" in returned metadata');
      }
      if (!metadata.hasOwnProperty('title')) {
         msgLog(id_, '<strong>error!</strong>missing "title" in returned metadata');
      }
      if (!metadata.hasOwnProperty('authors')) {
         msgLog(id_, '<strong>error!</strong>missing "authors" in returned metadata');
      }
      if (!metadata.hasOwnProperty('license')) {
         msgLog(id_, '<strong>error!</strong>missing "license" in returned metadata');
      }
   });
}

function showViews() {
   if (!task || !taskLoaded) {
      alert('please init and load task first');
      return;
   }
   var strViews = $('#views').val();
   if (strViews === "") {
      $('#error-views').css("visibility", "visible");
   }
   else {
      var id_ = id++;
      $('#error-views').css("visibility", "hidden");
      var views = JSON.parse(strViews);
      msgLog(id_, 'calling task.showViews(' + strViews + ')..');
      task.showViews(views, function () {
         msgLog(id_, 'views loaded');
      });
   }
}

function getHeight() {
   var id_ = id++;
   msgLog(id_, 'calling task.getHeight()..');
   task.getHeight(function (height) {
      msgLog(id_, 'got height: ' + height);
      msgLog(id_, 'setting iframe height: ' + height);
      $('#task-view').height(height);
   });
}

function reloadAnswer() {
   var answer = $('#answer').val();
   if (answer === "") {
      $('#error-answer').css("visibility", "visible");
   }
   else {
      var id_ = id++;
      $('#error-answer').css("visibility", "hidden");
      msgLog(id_, 'calling task.reloadAnswer(' + answer + ')..');
      task.reloadAnswer(answer, function () {
         msgLog(id_, 'answer loaded');
      });
   }
}

function getAnswer() {
   var id_ = id++;
   msgLog(id_, 'calling task.getAnswer()..');
   task.getAnswer(function (answer) {
      msgLog(id_, 'got answer: ' + answer);
      $('#code-viewer').val(answer);
   });
}

function reloadState() {
   var state = $('#state').val();
   if (state === "") {
      $('#error-emptyState').css("visibility", "visible");
   }
   else {
      var id_ = id++;
      $('#error-emptyState').css("visibility", "hidden");
      msgLog(id_, 'calling task.reloadState(' + state + ')..');
      task.reloadState(state, function () {
         msgLog(id_, 'state loaded');
      });
   }
}

function getState() {
   var id_ = id++;
   msgLog(id_, 'calling task.getState()..');
   task.getState(function (state) {
      msgLog(id_, 'got state : ' + state);
      $('#code-viewer').val(state);
   });
}

function updateToken() {
   var id_ = id++;
   buildToken(false, function (token) {
      msgLog(id_, 'calling task.updateToken()..');
      task.updateToken(token, function () {
         msgLog(id_, 'token updated');
      });
   });
}

function gradeTask() {
   var graderanswer = $('#graderanswer').val();
   if (graderanswer === "") {
      $('#error-graderanswer').css("visibility", "visible");
   }
   else {
      var id_ = id++;
      $('#error-graderanswer').css("visibility", "hidden");
      if (!$('#main-token-fields').hasClass('hidden')) {
         buildToken(true, function (token) {
            msgLog(id_, 'calling grader.gradeTask(' + graderanswer + ')..');
            grader.gradeTask(graderanswer, token, function (score, message, scoreToken) {
               msgLog(id_, 'received from grader: score=' + score + ', message=' + message + ', scoreToken=' + scoreToken);
            });
         });
      } else {
         msgLog(id_, 'calling task.reloadAnswer(' + graderanswer + ')..');
         grader.gradeTask(graderanswer, '', function (score, message, scoreToken) {
            msgLog(id_, 'received from grader: score=' + score + ', message=' + message + ', scoreToken=' + scoreToken);
         });
      }
   }
}

function loadPlatform() {
   var id_ = id++;
   /*if(typeof task === "undefined") {
      alert("arrr !")
      setTimeout(loadPlatform, 250);
      return;
   }*/
   // task-proxy.js provides a Platform class
   platform = new Platform(task);
   // we implement a few methods:
   platform.validate = function (mode) {
      msgLog(id_, 'receiving platform.validate(' + mode + ')');
   };
   platform.updateHeight = function (height) {
      $('#task-view').height(height);
      msgLog(id_, 'receiving platform.updateHeight(' + height + '), setting height of iframe');
   };
   platform.askHint = function () {
      msgLog(id_, 'receiving platform.askHint()');
   };
   platform.openUrl = function (id) {
      msgLog(id_, 'receiving platform.openUrl(' + id + ')');
   };
   platform.showViews = function (views) {
      views = JSON.stringify(views);
      msgLog(id_, 'receiving platform.showViews(' + views + ')');
   };
}

$(document).ready(function () {
   loadPlatform();
});
