var EXEC  = 'executeCallback',
    SHIFT = 'shiftCallback';

/**
 * Mechanism for executing a series of callbacks in sequential order.  Supports
 * simple synchronous queueing as well as queuing callbacks across setTimeout.
 * Callback iteration, specifying context and callback arguments, retrieval,
 * removal, and promotion of queued callbacks.
 *
 * Pass in a configuration object with the same keys as a callback object (see
 * the add method) to set the default values for those keys on all callbacks
 * added to this Queue. E.g. <code>Y.Queue({ timeout : 50 });</code>
 *
 * @module queue
 * @submodule queue-full
 * @for Queue
 */


Y.mix(Y.Queue.defaults, {
    iterations : 1,
    timeout    : -1,
    until      : function () {
        this.iterations |= 0;
        return this.iterations <= 0;
    }
},true);

Y.mix(Y.Queue.prototype, {

    /**
     * Flag used to indicate the Queue is currently executing a callback.
     *
     * @property _tId
     * @type {Number}
     * @protected
     */
    _tId : 0,
    
    run : function () {
        this.active = true;

        // A callback is present and not currently executing/scheduled
        while (this._q.length && this.active && this.isReady()) {
            // Grab the first callback in the queue
            var callback = this._q[0];

            if (callback.until()) {
                this.fire(SHIFT);
            } else {
                if (callback.timeout < 0) {
                    this._processSync(callback);
                } else {
                    this._processAsync(callback);
                    break;
                }
            }
        }

        if (!this._q.length) {
            this.active = false;

            /**
             * Event fired after the last queued callback is executed.
             * @event complete
             */
            this.fire('complete');
        }

        return this;
    },

    /**
     * Determines if the Queue is in a state that will allow for callback
     * execution.
     *
     * @method isReady
     * @return {Boolean} true if callbacks can be run now
     */
    isReady : function () {
        return !this._tId;
    },

    /**
     * Handles the execution of synchronous callbacks.
     *
     * @method _processSync
     * @param callback {Object} the callback object to execute
     * @protected
     */
    _processSync : function (callback) {
        callback.iterations--;
        this._tId = -1;
        this.fire(EXEC,callback);
        this._tId = 0;
    },

    /**
     * Handles the execution of asynchronous callbacks.
     *
     * @method _processAsync
     * @param callback {Object} the callback object to execute
     * @protected
     */
    _processAsync : function (callback) {
        var self = this;

        // Set to execute after the configured timeout
        this._tId = setTimeout(function () {
            callback.iterations--;

            self.fire(EXEC,callback);

            self._tId = 0;

            // Loop unless the Queue was paused from inside the callback
            if (self.active) {
                self.run();
            }
        }, callback.timeout);
    },

    /**
     * Shifts the first callback off the Queue
     * @method _defShiftFn
     * @protected
     */
    _defShiftFn : function () {
        this._q.shift();
    },
    
    pause: function () {
        clearTimeout(this._tId);
        this._tId = 0;

        this.active = false;

        /**
         * Fired after Queue is paused
         * @event pause
         */
        this.fire('pause');

        return this;
    },

    stop : function () { 
        clearTimeout(this._tId);
        this._tId = 0;

        this.active = false;
        this._q = [];

        /**
         * Fired after Queue is stopped
         * @event stop
         */
        this.fire('stop');

        return this;
    },

    /**
     * Retrieve a callback by its name.  Useful to modify the configuration
     * while the Queue is running.
     *
     * @method getCallback
     * @param name {String} the name assigned to the callback
     * @return {Object} the callback object
     */
    getCallback : function (name) {
        for (var i = 0, len = this._q.length; i < len; ++i) {
            if (this._q[i].name === name) {
                return this._q[i];
            }
        }

        return null;
    },

    /**
     * Promotes the named callback to the top of the queue. If a callback is
     * currently executing or looping (via until or iterations), the promotion
     * is scheduled to occur after the current callback has completed.
     *
     * @method promote
     * @param name {String|Object} the callback object or a callback's name
     * @return {Queue} the Queue instance
     */
    promote : function (name) {
        if (!this.isReady()) {
            var e = this.after(SHIFT, function () {
                        this._promote(name);
                        e.detach();
                    },this);
        } else {
            this._promote(name);
        }

        return this;
    },

    /**
     * Promotes the named callback to the top of the queue.
     *
     * @method _promote
     * @param name {String|Object} the callback object or a callback's name
     * @return {Queue} the Queue instance
     * @protected
     */
    _promote : function (name) {
        var i,len,c;

        for (i = 0, len = this._q.length; i < len; ++i) {
            if (this._q[i] === name || this._q[i].name === name) {
                c = this._q.splice(i,1)[0];
                this._q.unshift(c);
                this.fire('promoteCallback', c);
                break;
            }
        }
    },

    /**
     * Removes the callback from the queue.  If the Queue is active, the
     * removal is scheduled to occur after the current callback has completed.
     *
     * @method remove
     * @param name {String|Object} the callback object or a callback's name
     * @return {Queue} the Queue instance
     */
    remove : function (name) {
        // Can't return the removed callback because of the deferral until
        // current callback is complete
        if (!this.isReady()) {
            var e = this.after(SHIFT, function () {
                        this._remove(name);
                        e.detach();
                    },this);
        } else {
            this._remove(name);
        }

        return this;
    },

    /**
     * Removes the callback from the queue.
     *
     * @method remove
     * @param name {String|Object} the callback object or a callback's name
     * @return {Object} the callback object or null if not found
     * @protected
     */
    _remove : function (name) {
        for (var i = 0, len = this._q.length; i < len; ++i) {
            if (this._q[i] === name || this._q[i].name === name) {
                this.fire('removeCallback',this._q.splice(i,1));
                len--;
            }
        }
    }
},true);

Y.augment(Y.Queue,Y.Event.Target,true);

// APIdoc changes made applicable by this module

/**
 * Event used to trigger the execution of the callback.  Subscribe to this
 * event and call e.preventDefault() to prevent the callback execution.  Doing
 * so will not stop or pause the Queue.
 *
 * @event executeCallback
 * @param callback {Object} the callback object that will be executed
 */

/**
 * Event fired after a callback is shifted from the Queue
 * @event shiftCallback
 * @param callback {Function|Object} The callback passed to <code>add(..)</code>
 */

/**
 * Event fired when callbacks are added to the Queue.
 *
 * @event addCallback
 * @param callbacks {Array} array of added callback objects
 */

/**
 * Add any number of callbacks to the end of the queue.  Callbacks passed
 * in as functions will be wrapped in a callback object.
 *
 * Callbacks can be function references or object literals with these keys:
 * <dl>
 *    <dt>fn</dt>
 *      <dd>{Function} REQUIRED the callback function.</dd>
 *    <dt>name</dt>
 *      <dd>{String} a reference name to use for promotion or access</dd>
 *    <dt>context</dt>
 *      <dd>{Object} the context from which to call the callback function.</dd>
 *    <dt>timeout</dt>
 *      <dd>{number} millisecond delay to wait after previous callback
 *          completion before executing this callback.  Negative
 *          values cause immediate blocking execution.  Default 0.</dd>
 *    <dt>until</dt>
 *      <dd>{Function} boolean function executed before each iteration.
 *          Return true to indicate callback completion.</dd>
 *    <dt>iterations</dt>
 *      <dd>{Number} number of times to execute the callback before
 *          proceeding to the next callback in the queue.
 *          Incompatible with <code>until</code>.</dd>
 *    <dt>args</dt>
 *      <dd>{Array} array of arguments passed to callback function</dd>
 * </dl>
 *
 * @method add
 * @param callback* {Function|Object} Any number of callbacks
 * @return {Queue} the Queue instance
 */

