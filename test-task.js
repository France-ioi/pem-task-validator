var output = {

    log: function(msg) {
        $('#output').append('<div>' + msg + '</div>')
    },

    warning: function(msg) {
        $('#output').append('<div class="alert-warning">' + msg + '</div>')
    },

    error: function(msg) {
        $('#output').append('<div class="alert-danger">' + msg + '</div>')
    }

}


var settings = {

    default_data: {
        metadata: {
            id: 'http://test.test/test-task',
            language: 'en',
            version: '1',
            title: 'Test task',
            authors: '',
            license: 'MIT',
            translators: [],
            autoHeight: true,
            browserSupport: [],
            //minWidth: 800 (int or string, optional): minimum width (in px) the task needs to be displayed, default is 800. The value “auto” should allow the task to take as much room as it can
            nbHints: 0,
            //fullFeedback: false (boolean, optional): a boolean indicating whether the task provides full feedback to the user on the validity of his answer (default is false)
        },


        views: {
            task: {},
            solution: {},
            hint: {requires: 'task'},
            forum: {requires: 'task'},
            editor: {includes: ['submission']},
            submission: {},
            metadata: {}
        },

        options: {
            manual_callback: false,
            custom_height: '',
            answer: 'f8958112ad2156426434dac40915099a',
            state: '{"a": "589dc444dbcae69885ba71a7bcfdb939"}'
        }
    },

    data: {},
    cookie_name: 'test_task_settings',
    popup: null,

    getDefaultData: function() {
        return $.extend(true, {}, this.default_data);
    },

    resetData: function() {
       this.data = this.getDefaultData();
    },

    save: function() {
        Cookies.set(this.cookie_name, this.data);
    },

    load: function() {
        this.data = null;
        try {
            this.data = JSON.parse(Cookies.get(this.cookie_name));
        } catch(e) {}
        if(!this.data) this.resetData();
    },

    show: function() {
        var self = this;
        var form = $('form#settings').clone();
        this.fillForm(form);
        this.popup = bootbox.dialog({
            title: 'Settigns',
            message: form,
            buttons: {
                save: {
                    label: 'Save',
                    className: 'btn-primary',
                    callback: function() {
                        self.collectForm(form);
                        self.save();
                        self.hide();
                    }
                },
                cancel: {
                    label: 'Cancel',
                    className: 'btn-default',
                    callback: function() {
                        self.hide()
                    }
                },
                reset: {
                    label: 'Reset to default',
                    className: 'btn-danger pull-left',
                    callback: function(e) {
                        e.preventDefault();
                        self.resetData();
                        self.fillForm(form);
                        return false;
                    }
                }
            }
        });
    },

    hide: function() {
        this.popup && this.popup.modal('hide');
    },


    fillForm: function(el) {
        el.find('[name=manual_callback]').prop('checked', this.data.options.manual_callback);
        el.find('[name=custom_height]').val(this.data.options.custom_height);
        el.find('[name=answer]').val(this.data.options.answer);
        el.find('[name=state]').val(this.data.options.state);
        el.find('[name=views]').val(JSON.stringify(this.data.views, null, 4));
        el.find('[name=metadata]').val(JSON.stringify(this.data.metadata, null, 4));
    },

    collectForm: function(el) {
        this.data.options = {
            manual_callback: el.find('[name=manual_callback]').prop('checked'),
            custom_height: el.find('[name=custom_height]').val(),
            answer: el.find('[name=answer]').val(),
            state: el.find('[name=state]').val(),
        }
        this.data.views = JSON.parse(el.find('[name=views]').val());
        this.data.metadata = JSON.parse(el.find('[name=metadata]').val());
    }

}



var test_tool = {

    active_method: null,
    stack: [],
    method_counters: {
        getAnswer: 0,
        getHeight: 0,
        getState: 0
    },

    formatStack: function() {
        return this.stack.length == 0 ? '' : 'Calls stack: ' + this.stack.join(' &gt;  ');
    },

    removeStackItems: function(names) {
        return this.stack.filter(function(name, index){
            return names.indexOf(name) == -1;
        })
    },

    isStackContain: function(method) {
        return this.stack.indexOf(method) !== -1;
    },

    testStackIssues: function(method) {
        if(this.active_method !== null) {
            output.error('task.' + method + ' called before task.' + this.active_method + ' callback');
        }

        if(this.stack.length > 0 && this.isStackContain('unload')) {
            output.error('Called after task.unload');
        }

        switch(method) {
            case 'load':
                if(!this.isStackContain('getViews')) {
                    output.error('task.getViews has not been called');
                } else if(this.stack.length > 1) {
                    output.error('Only task.getViews must be called before.');
                }
                break;
            case 'getViews':
                if(this.isStackContain('load')) {
                    output.error('Called after task.load');
                }
                break;
            case 'getState':
                if(this.isStackContain('unload')) {
                    output.error('Called after task.unload');
                }
                break;
            case 'unload':
                if(!this.isStackContain('getState')) {
                    output.error('task.getState has not been called');
                }
                if(!this.isStackContain('getAnswer')) {
                    output.error('task.getAnswer has not been called');
                }
                break;
        }
    },


    testViews: function(views) {
        if(typeof views != "object") {
            output.error(fn + ': views must be an object');
        } else {
            for(var view in views) {
                if(!settings.data.views.hasOwnProperty(view)) {
                    output.error('Unknown view: ' + view);
                }
            }
        }
    },


    updateMethodCounter: function(method) {
        if(this.method_counters.hasOwnProperty(method)) {
            this.method_counters[method]++;
        }
        $('#counters').html('Counters: ' + JSON.stringify(this.method_counters));
    },


    beginFunc: function(method, callback, errorCallback) {
        output.log('Call task.' + method);
        this.updateMethodCounter(method);
        if(typeof errorCallback != 'function') {
            output.warning('errorCallback is not a function');
        }
        this.testStackIssues(method);
        this.stack.push(method);
        this.active_method = method;
    },

    endFunc: function(method, callback, errorCallback) {
        if(!settings.data.options.manual_callback) {
            this.active_method = null;
            callback();
            return
        }
        bootbox.dialog({
            message: 'Choose callback for the test.' + method + ' method:',
            closeButton: false,
            buttons: {
                callback: {
                    label: 'callback',
                    className: 'btn-success',
                    callback: function() {
                        try { callback() } catch(e) { output.error('callback error: ' + e.message) }
                    }
                },
                error: {
                    label: 'errorCallback',
                    className: 'btn-danger',
                    callback: function() {
                        try { errorCallback() } catch(e) { output.error('errorCallback error: ' + e.message) }
                    }
                }
            }
        });
    }
}



var task = {

    flags: {
        is_metadata_loaded: false,
        is_grader_loaded: false,
        token: null
    },



    load: function(views, callback, errorCallback) {
        var fn = 'load';
        test_tool.beginFunc(fn, callback, errorCallback);
        output.log('.load views: ' + JSON.stringify(views))
        test_tool.testViews(views);
        this.flags.is_metadata_loaded = views.hasOwnProperty('metadata')
        this.flags.is_grader_loaded = views.hasOwnProperty('grader')
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getViews: function(callback, errorCallback) {
        var fn = 'getViews';
        test_tool.beginFunc(fn, callback, errorCallback);
        test_tool.endFunc(fn, function() { callback(settings.data.views) }, errorCallback);
    },

    showViews: function(views, callback, errorCallback) {
        var fn = 'showViews'
        test_tool.beginFunc(fn, callback, errorCallback);
        output.log('.showViews views: ' + JSON.stringify(views))
        test_tool.testViews(views);

        if(test_tool.removeStackItems(['getViews', 'load', 'getMetaData']).length > 0) {
            output.warning('Methods other than task.getViews, task.load and task.getMetaData has been called before task.showViews');
        }
        test_tool.endFunc(fn, callback, errorCallback);
    },

    unload: function(callback, errorCallback) {
        var fn = 'unload'
        test_tool.beginFunc(fn, callback, errorCallback);
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getAnswer: function(callback, errorCallback) {
        var fn = 'getAnswer'
        test_tool.beginFunc(fn, callback, errorCallback);
        var res = settings.data.options.answer;
        test_tool.endFunc(fn, function() { callback(res) }, errorCallback);
    },

    reloadAnswer: function(answer, callback, errorCallback) {
        var fn = 'reloadAnswer'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(typeof answer != 'string') {
            output.error('answer param is not a string');
        } else if(answer !== settings.data.options.answer) {
            output.error('answer param does not corresponds to what task.getAnswer previously sent');
        }
        test_tool.endFunc(fn, callback, errorCallback);
    },

    gradeAnswer: function(answer, answerToken, callback, errorCallback) {
        var fn = 'gradeAnswer'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(!this.flags.is_grader_loaded) {
            output.error('“grader” view has not been loaded')
        }
        if(typeof answer != 'string') {
            output.error('answer param is not a string');
        } else if(answer !== settings.data.options.answer) {
            output.error('answer param does not corresponds to what task.getAnswer previously sent');
        }
        output.log('token = ' + JSON.stringify(answerToken));

        $.getJSON('test-token.php', { token: window.task_token } , function(res) {
            if(res.success) {
                if(res.payload.bAllowGrading === true) {
                    $.getJSON('test-token.php', { token: answerToken } , function(res) {
                        if(res.success) {
                            output.log('Valid answer token');
                        } else {
                            output.error('Invalid answer token: ' + res.message);
                        }
                    });
                } else {
                    output.error('General token does not allows grading');
                }
            } else {
                output.error('Invalid main token: ' + res.message);
            }
            test_tool.endFunc(fn, callback, errorCallback);
        });


    },

    getHeight: function(callback, errorCallback) {
        var fn = 'getHeight'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(settings.data.metadata.autoHeight) {
            output.warning('Called when metadata.autoHeight is true');
        }
        var h = settings.data.options.custom_height == '' ? $(document).height() : settings.data.options.custom_height;
        test_tool.endFunc(fn, function() { callback(h); }, errorCallback);
    },

    updateToken: function(token, callback, errorCallback) {
        var fn = 'updateToken'
        test_tool.beginFunc(fn, callback, errorCallback);
        output.log('token = ' + JSON.stringify(token));
        window.task_token = token;
        $.getJSON('test-token.php', { token: token }, function(res) {
            if(res.success) {
                output.log('Valid token');
            } else {
                output.error('Invalid token: ' + res.message);
            }
            test_tool.endFunc(fn, callback, errorCallback);
        });
    },

    getState: function(callback, errorCallback) {
        var fn = 'getState'
        test_tool.beginFunc(fn, callback, errorCallback);
        var res = settings.data.options.state;
        test_tool.endFunc(fn, function() { callback(res) }, errorCallback);
    },

    reloadState: function(state, callback, errorCallback) {
        var fn = 'reloadState'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(typeof state != 'string') {
            output.error('state param is not a string');
        } else if(state !== settings.data.options.state) {
            output.error('state param does not corresponds to what task.getState previously sent');
        }
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getMetaData: function(callback, errorCallback) {
        var fn = 'getMetaData'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(!this.flags.is_metadata_loaded) {
            output.error('“metadata” view has not been loaded');
        }
        var metadata = settings.data.metadata;
        test_tool.endFunc(fn, function() { callback(metadata) }, errorCallback);
    }
}



$('document').ready(function() {
    settings.load();
    var re = new RegExp('[\?&]sToken=([^&#]*)').exec(window.location.href);
    window.task_token = re && re.length && re[0] ? re[0] : '';
    platform.initWithTask(task);
    $('#btn-settings').click(function() {
        settings.show()
    });
});