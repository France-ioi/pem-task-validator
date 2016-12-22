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
            output.error('Method .' + method + ' called before .' + this.active_method + ' callback.');
        }

        if(this.stack.length > 0 && this.isStackContain('unload')) {
            output.error('Called after .unload');
        }

        switch(method) {
            case 'load':
                if(!this.isStackContain('getViews')) {
                    output.error('.getViews has not been called');
                } else if(this.stack.length > 1) {
                    output.error('Only .getViews must be called before.');
                }
                break;
            case 'getViews':
                if(this.isStackContain('load')) {
                    output.error('Called after .load');
                }
                break;
            case 'getState':
                if(this.isStackContain('unload')) {
                    output.error('Called after .unload');
                }
                break;
            case 'unload':
                if(!this.isStackContain('getState')) {
                    output.error('.getState has not called');
                }
                if(!this.isStackContain('getAnswer')) {
                    output.error('.getAnswer has not called');
                }
                break;
        }
    },


    updateMethodCounter: function(method) {
        if(this.method_counters.hasOwnProperty(method)) {
            this.method_counters[method]++;
        }
        $('#counters').html('Calls counters: ' + JSON.stringify(this.method_counters));
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
        var self = this;
        setTimeout(function() {
            self.active_method = null;
            try {
                callback();
            } catch(e) {
                output.error('.' + method + ' callback error: ' + e.message);
            }
        }, 500)

    }
}



var task = {

    views: {
        task: {},
        solution: {},
        hint: {requires: 'task'},
        forum: {requires: 'task'},
        editor: {includes: ['submission']},
        submission: {}
    },

    flags: {
        is_metadata_loaded: false,
        is_grader_loaded: false,
        custom_height: false
    },

    constants: {
        answer: '{"a": "f8958112ad2156426434dac40915099a"}',
        state: '{"a": "589dc444dbcae69885ba71a7bcfdb939"}'
    },

    _setHeight: function(h) {
        this.flags.custom_height = h;
    },

    _testViews: function(views) {
        if(typeof views != "object") {
            output.error(fn + ': views must be an object');
        } else {
            for(var view in views) {
                if(!this.views.hasOwnProperty(view)) {
                    output.error('Unknown view: ' + view);
                }
            }
        }
    },

    load: function(views, callback, errorCallback) {
        var fn = 'load';
        test_tool.beginFunc(fn, callback, errorCallback);
        output.log('.load views: ' + JSON.stringify(views))
        this._testViews(views);
        this.flags.is_metadata_loaded = views.hasOwnProperty('metadata')
        this.flags.is_grader_loaded = views.hasOwnProperty('grader')
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getViews: function(callback, errorCallback) {
        var fn = 'getViews';
        test_tool.beginFunc(fn, callback, errorCallback);
        var self = this;
        test_tool.endFunc(fn, function() { callback(self.views) }, errorCallback);
    },

    showViews: function(views, callback, errorCallback) {
        var fn = 'showViews'
        test_tool.beginFunc(fn, callback, errorCallback);
        output.log('.showViews views: ' + JSON.stringify(views))
        this._testViews(views);
        if(test_tool.removeStackItems(['getViews', 'load', 'getMetaData']).length > 0) {
            output.warning('Methods called before, other than .getViews, .load and .getMetaData');
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
        var res = this.constants.answer;
        test_tool.endFunc(fn, function() { callback(res) }, errorCallback);
    },

    reloadAnswer: function(answer, callback, errorCallback) {
        var fn = 'reloadAnswer'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(typeof answer != 'string') {
            output.error('answer param is not a string');
        } else if(answer !== this.constants.answer) {
            output.error('answer param does not corresponds to what .getAnswer previously sent');
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
        } else if(answer !== this.constants.answer) {
            output.error('answer param does not corresponds to what .getAnswer previously sent');
        }
        output.log('token = ' + JSON.stringify(answerToken));
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getHeight: function(callback, errorCallback) {
        var fn = 'getHeight'
        test_tool.beginFunc(fn, callback, errorCallback);
        var h = this.flags.custom_height === false ? $(document).height() : this.flags.custom_height;
        test_tool.endFunc(fn, function() { callback(h); }, errorCallback);
    },

    updateToken: function(token, callback, errorCallback) {
        var fn = 'updateToken'
        test_tool.beginFunc(fn, callback, errorCallback);
        output.log('token = ' + JSON.stringify(token));
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getState: function(callback, errorCallback) {
        var fn = 'getState'
        test_tool.beginFunc(fn, callback, errorCallback);
        var res = this.constants.state;
        test_tool.endFunc(fn, function() { callback(res) }, errorCallback);
    },

    reloadState: function(state, callback, errorCallback) {
        var fn = 'reloadState'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(typeof state != 'string') {
            output.error('state param is not a string');
        } else if(state !== this.constants.state) {
            output.error('state param does not corresponds to what .getState previously sent');
        }
        test_tool.endFunc(fn, callback, errorCallback);
    },

    getMetaData: function(callback, errorCallback) {
        var fn = 'getMetaData'
        test_tool.beginFunc(fn, callback, errorCallback);
        if(!this.flags.is_metadata_loaded) {
            output.error('“metadata” view has not been loaded');
        }
        test_tool.endFunc(fn, callback, errorCallback);
    }
}



$('document').ready(function() {
    platform.initWithTask(task);

    $('#btn-task-random-height').click(function() {
        task._setHeight(200 + Mth.round(Math.random() * 1000));
    })

    $('#btn-task-actual-height').click(function() {
        task._setHeight(false);
    })
});