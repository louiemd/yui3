/**
 * Provides dynamic loading for the YUI library.  It includes the dependency
 * info for the library, and will automatically pull in dependencies for
 * the modules requested.  It supports rollup files (such as utilities.js
 * and yahoo-dom-event.js), and will automatically use these when
 * appropriate in order to minimize the number of http connections
 * required to load all of the dependencies.
 */

/**
 * YUILoader provides dynamic loading for YUI.
 * @class Loader
 * @TODO version management
 */


// http://yui.yahooapis.com/combo?2.5.2/build/yahoo/yahoo-min.js&2.5.2/build/dom/dom-min.js&2.5.2/build/event/event-min.js&2.5.2/build/autocomplete/autocomplete-min.js"

YUI.add("loader", function(Y) {

    var BASE = 'base', 
        CSS = 'css',
        JS = 'js',
        PKG = 'pkg',

        ANIMATION = 'animation',
        RESET = 'reset',
        FONTS = 'fonts',
        GRIDS = 'grids',
        CONNECTION = 'connection',
        DRAGDROP = 'dragdrop',
        BUTTON = 'button',
        MENU = 'menu',
        CALENDAR = 'calendar',
        SLIDER = 'slider',
        JSON = 'json',
        DATASOURCE = 'datasource',
        SELECTOR = 'selector',
        RESIZE = 'resize',
        VERSION = '@VERSION@',
        ROOT = VERSION + '/build/';


Y.Env.meta = {

    version: VERSION,

    root: ROOT,

    base: 'http://yui.yahooapis.com/' + ROOT,

    comboBase: 'http://yui.yahooapis.com/combo?',

    skin: {
        defaultSkin: 'sam',
        base: 'assets/skins/',
        path: 'skin.css',
        after: [RESET, FONTS, GRIDS, BASE],
        rollup: 3
    },

    modules: {

        basecss: {
            type: CSS,
            after: [RESET, FONTS, GRIDS],
            path: 'base/base.css'
        },

        fonts: {
            type: CSS
        },

        grids: {
            type: CSS,
            requires: [FONTS],
            optional: [RESET]
        },

        log: {
            optional: [DRAGDROP],
            path: 'log/logreader-min.js',
            skinnable: 1
        },

        reset: {
            type: CSS
        },

        'reset-fonts-grids': {
            type: CSS,
            path: 'reset-fonts-grids/reset-fonts-grids.css',
            supersedes: [RESET, FONTS, GRIDS, 'reset-fonts'],
            rollup: 4
        },

        'reset-fonts': {
            type: CSS,
            path: 'reset-fonts/reset-fonts.css',
            supersedes: [RESET, FONTS],
            rollup: 2
        },

// node, dom, event included in the yui dist, so we are not including the metadata for PR1

        animation: {
            requires: ['base']
        },

        attribute: { },

        base: {
            requires: ['attribute']
        },
        
        classnamemanager: { },
        
        compat: { },
        
        cookie: { },

        css: { },

        dump: { },
        
        io: { },

        'json-parse': {
            path: 'json/json-parse-min.js'
        },

        'json-stringify': {
            path: 'json/json-stringify-min.js'
        },

        json: {
            supersedes: ['json-parse', 'json-stringify']
        },
        
        logreader: {
            requires: ['css']
        },

        profiler: { },

        queue: { },

        // @TODO evaluate this package
        substitute: {
            requires: ['dump'],
            path: 'i18n/substitute-min.js'
        },

        yuitestcore: { 
            path: 'yuitest/yuitest_core-min.js'
        },

        yuitest: {
            requires: ['log'],
            skinnable: 1,
            supersedes: ['yuitestcore'],
        }
    }
};


    var L=Y.Lang, env=Y.Env,
        PROV = "_provides", SUPER = "_supersedes",
        REQ = "expanded";

    var _Y = {

        // dupsAllowed: {'yahoo': true, 'get': true},
        dupsAllowed: {},

        /*
         * The library metadata for the current release
         * @property YUIInfo
         * @static
         */
        // info: '@yuiinfo@', 
        info: Y.Env.meta

    };

    Y.Loader = function(o) {

        /**
         * Internal callback to handle multiple internal insert() calls
         * so that css is inserted prior to js
         * @property _internalCallback
         * @private
         */
        this._internalCallback = null;

        /**
         * Use the YUI environment listener to detect script load.  This
         * is only switched on for Safari 2.x and below.
         * @property _useYahooListener
         * @private
         */
        this._useYahooListener = false;

        /*
         * Callback that will be executed when the loader is finished
         * with an insert
         * @method onSuccess
         * @type function
         */
        // this.onSuccess = null;

        /*
         * Callback that will be executed if there is a failure
         * @method onFailure
         * @type function
         */
        // this.onFailure = Y.log;

        /*
         * Callback that will be executed each time a new module is loaded
         * @method onProgress
         * @type function
         */
        // this.onProgress = null;

        /**
         * The execution scope for all callbacks
         * @property scope
         * @default this
         */
        this.scope = this;

        /**
         * Data that is passed to all callbacks
         * @property data
         */
        this.data = null;

        /**
         * Node reference or id where new nodes should be inserted before
         * @property insertBefore
         * @type string|HTMLElement
         */
        this.insertBefore = null;

        /**
         * The charset attribute for inserted nodes
         * @property charset
         * @type string
         * @default utf-8
         */
        this.charset = null;

        /**
         * The name of a script node 
         * (for external script support in Safari 2.x and earlier)
         * to reference when the load is complete.  If this variable 
         * is not available in the specified scripts, the operation will 
         * fail.  
         * @property varName
         * @type string
         */
        this.varName = null;

        /**
         * The base directory.
         * @property base
         * @type string
         * @default http://yui.yahooapis.com/[YUI VERSION]/build/
         */
        this.base = _Y.info.base;

        /**
         * A list of modules that should not be loaded, even if
         * they turn up in the dependency tree
         * @property ignore
         * @type string[]
         */
        this.ignore = null;

        /**
         * A list of modules that should always be loaded, even
         * if they have already been inserted into the page.
         * @property force
         * @type string[]
         */
        this.force = null;

        /**
         * Should we allow rollups
         * @property allowRollup
         * @type boolean
         * @default true
         */
        this.allowRollup = true;

        /**
         * A filter to apply to result urls.  This filter will modify the default
         * path for all modules.  The default path for the YUI library is the
         * minified version of the files (e.g., event-min.js).  The filter property
         * can be a predefined filter or a custom filter.  The valid predefined 
         * filters are:
         * <dl>
         *  <dt>DEBUG</dt>
         *  <dd>Selects the debug versions of the library (e.g., event-debug.js).
         *      This option will automatically include the logger widget</dd>
         *  <dt>RAW</dt>
         *  <dd>Selects the non-minified version of the library (e.g., event.js).
         * </dl>
         * You can also define a custom filter, which must be an object literal 
         * containing a search expression and a replace string:
         * <pre>
         *  myFilter: &#123; 
         *      'searchExp': "-min\\.js", 
         *      'replaceStr': "-debug.js"
         *  &#125;
         * </pre>
         * @property filter
         * @type string|{searchExp: string, replaceStr: string}
         */
        this.filter = null;

        /**
         * The list of requested modules
         * @property required
         * @type {string: boolean}
         */
        this.required = {};

        /**
         * The library metadata
         * @property moduleInfo
         */
        // this.moduleInfo = Y.merge(_Y.info.moduleInfo);
        this.moduleInfo = {};
        
        var defaults = _Y.info.modules;

        for (var i in defaults) {
            if (defaults.hasOwnProperty(i)) {
                this.addModule(defaults[i], i);
            }
        }

        /**
         * List of rollup files found in the library metadata
         * @property rollups
         */
        this.rollups = null;

        /**
         * Whether or not to load optional dependencies for 
         * the requested modules
         * @property loadOptional
         * @type boolean
         * @default false
         */
        this.loadOptional = false;

        /**
         * All of the derived dependencies in sorted order, which
         * will be populated when either calculate() or insert()
         * is called
         * @property sorted
         * @type string[]
         */
        this.sorted = [];

        /**
         * Set when beginning to compute the dependency tree. 
         * Composed of what YUI reports to be loaded combined
         * with what has been loaded by the tool
         * @propery loaded
         * @type {string: boolean}
         */
        this.loaded = {};

        /**
         * Flag to indicate the dependency tree needs to be recomputed
         * if insert is called again.
         * @property dirty
         * @type boolean
         * @default true
         */
        this.dirty = true;

        /**
         * List of modules inserted by the utility
         * @property inserted
         * @type {string: boolean}
         */
        this.inserted = {};

        /**
         * Provides the information used to skin the skinnable components.
         * The following skin definition would result in 'skin1' and 'skin2'
         * being loaded for calendar (if calendar was requested), and
         * 'sam' for all other skinnable components:
         *
         *   <code>
         *   skin: {
         *
         *      // The default skin, which is automatically applied if not
         *      // overriden by a component-specific skin definition.
         *      // Change this in to apply a different skin globally
         *      defaultSkin: 'sam', 
         *
         *      // This is combined with the loader base property to get
         *      // the default root directory for a skin. ex:
         *      // http://yui.yahooapis.com/2.3.0/build/assets/skins/sam/
         *      base: 'assets/skins/',
         *
         *      // The name of the rollup css file for the skin
         *      path: 'skin.css',
         *
         *      // The number of skinnable components requested that are
         *      // required before using the rollup file rather than the
         *      // individual component css files
         *      rollup: 3,
         *
         *      // Any component-specific overrides can be specified here,
         *      // making it possible to load different skins for different
         *      // components.  It is possible to load more than one skin
         *      // for a given component as well.
         *      overrides: {
         *          calendar: ['skin1', 'skin2']
         *      }
         *   }
         *   </code>
         *   @property skin
         */

        Y.on('yui:load', this.loadNext, this);

        // var self = this;

        // env.listeners.push(function(m) {
            // if (self._useYahooListener) {
                // //Y.log("YUI listener: " + m.name);
                // self.loadNext(m.name);
            // }
        // });

        this.skin = Y.merge(_Y.info.skin); 

        this._config(o);

    };

    Y.Loader.prototype = {

        FILTERS: {
            RAW: { 
                'searchExp': "-min\\.js", 
                'replaceStr': ".js"
            },
            DEBUG: { 
                'searchExp': "-min\\.js", 
                'replaceStr': "-debug.js"
            }
        },

        SKIN_PREFIX: "skin-",

        _config: function(o) {

            // apply config values
            if (o) {
                for (var i in o) {
                    if (Y.Object.owns(o, i)) {
                        if (i == "require") {
                            this.require(o[i]);
                        // support the old callback syntax
                        } else if (i.indexOf('on') === 0) {
                            this.subscribe(i.substr(2).toLowerCase(), o[i]);
                        } else {
                            this[i] = o[i];
                        }
                    }
                }
            }

            // fix filter
            var f = this.filter;

            if (L.isString(f)) {
                f = f.toUpperCase();

                // the logger must be available in order to use the debug
                // versions of the library
                if (f === "DEBUG") {
                    this.require("log");
                }

                // hack to handle a a bug where LogWriter is being instantiated
                // at load time, and the loader has no way to sort above it
                // at the moment.
                if (!Y.LogWriter) {
                    Y.LogWriter = function() {
                        return Y;
                    };
                }

                this.filter = this.FILTERS[f];
            }

        },

        /** Add a new module to the component metadata.         
         * <dl>
         *     <dt>name:</dt>       <dd>required, the component name</dd>
         *     <dt>type:</dt>       <dd>required, the component type (js or css)</dd>
         *     <dt>path:</dt>       <dd>required, the path to the script from "base"</dd>
         *     <dt>requires:</dt>   <dd>array of modules required by this component</dd>
         *     <dt>optional:</dt>   <dd>array of optional modules for this component</dd>
         *     <dt>supersedes:</dt> <dd>array of the modules this component replaces</dd>
         *     <dt>after:</dt>      <dd>array of modules the components which, if present, should be sorted above this one</dd>
         *     <dt>rollup:</dt>     <dd>the number of superseded modules required for automatic rollup</dd>
         *     <dt>fullpath:</dt>   <dd>If fullpath is specified, this is used instead of the configured base + path</dd>
         *     <dt>skinnable:</dt>  <dd>flag to determine if skin assets should automatically be pulled in</dd>
         * </dl>
         * @method addModule
         * @param o An object containing the module data
         * @param name the module name (optional), required if not in the module data
         * @return {boolean} true if the module was added, false if 
         * the object passed in did not provide all required attributes
         */
        addModule: function(o, name) {

            name = name || o.name;

            if (!o || !name) {
                return false;
            }

            if (!o.type) {
                o.type = JS;
            }

            if (!o.path && !o.fullpath) {
                o.path = name + "/" + name + "-min." + o.type;
            }

            o.ext = ('ext' in o) ? o.ext : true;
            o.requires = o.requires || [];

            this.moduleInfo[name] = o;
            this.dirty = true;

            //Y.log('New module ' + name);

            return o;
        },

        /**
         * Add a requirement for one or more module
         * @method require
         * @param what {string[] | string*} the modules to load
         */
        require: function(what) {
            var a = (typeof what === "string") ? arguments : what;
            this.dirty = true;
            //OU.appendArray(this.required, a);
            Y.mix(this.required, Y.Array.hash(a));
        },

        /**
         * Adds the skin def to the module info
         * @method _addSkin
         * @param skin {string} the name of the skin
         * @param mod {string} the name of the module
         * @return {string} the module name for the skin
         * @private
         */
        _addSkin: function(skin, mod) {

            // Add a module definition for the skin rollup css
            var name = this.formatSkin(skin), info = this.moduleInfo,
                sinf = this.skin, ext = info[mod] && info[mod].ext;

            // Y.log('ext? ' + mod + ": " + ext);
            if (!info[name]) {
                // Y.log('adding skin ' + name);
                this.addModule({
                    'name': name,
                    'type': 'css',
                    'path': sinf.base + skin + '/' + sinf.path,
                    //'supersedes': '*',
                    'after': sinf.after,
                    'rollup': sinf.rollup,
                    'ext': ext
                });
            }

            // Add a module definition for the module-specific skin css
            if (mod) {
                name = this.formatSkin(skin, mod);
                if (!info[name]) {
                    var mdef = info[mod], pkg = mdef.pkg || mod;
                    // Y.log('adding skin ' + name);
                    this.addModule({
                        'name': name,
                        'type': 'css',
                        'after': sinf.after,
                        'path': pkg + '/' + sinf.base + skin + '/' + mod + '.css',
                        'ext': ext
                    });
                }
            }

            return name;
        },

        /**
         * Returns an object containing properties for all modules required
         * in order to load the requested module
         * @method getRequires
         * @param mod The module definition from moduleInfo
         */
        getRequires: function(mod) {

            if (!mod) {
                Y.log('getRequires, no module');
                return [];
            }

            if (!this.dirty && mod.expanded) {
                Y.log('already expanded');
                return mod.expanded;
            }


            var i, d=[], r=mod.requires, o=mod.optional, 
                info=this.moduleInfo, m;

            for (i=0; i<r.length; i=i+1) {
                Y.log('requiring ' + r[i]);
                d.push(r[i]);
                m = this.getModule(r[i]);
                // AU.appendArray(d, this.getRequires(m));
                d.concat(this.getRequires(m));
                // Y.log(d);
            }

            if (o && this.loadOptional) {
                for (i=0; i<o.length; i=i+1) {
                    d.push(o[i]);
                    // AU.appendArray(d, this.getRequires(info[o[i]]));
                    d.concat(this.getRequires(info[o[i]]));
                }
            }

            // mod.expanded = AU.uniq(d);
            mod.expanded = Y.Object.keys(Y.Array.hash(d));

            // Y.log(mod.expanded);


            return mod.expanded;
        },


        /**
         * Returns an object literal of the modules the supplied module satisfies
         * @method getProvides
         * @param name{string} The name of the module
         * @param notMe {string} don't add this module name, only include superseded modules
         * @return what this module provides
         */
        getProvides: function(name, notMe) {
            var addMe = !(notMe), ckey = (addMe) ? PROV : SUPER,
                m = this.getModule(name), o = {};

            if (!m) {
                return o;
            }

            if (m[ckey]) {
// Y.log('cached: ' + name + ' ' + ckey + ' ' + L.dump(this.moduleInfo[name][ckey], 0));
                return m[ckey];
            }

            var s = m.supersedes, done={}, me = this;

            // use worker to break cycles
            var add = function(mm) {
                if (!done[mm]) {
                    Y.log(name + ' provides worker trying: ' + mm);
                    done[mm] = true;
                    // we always want the return value normal behavior 
                    // (provides) for superseded modules.
                    Y.mix(o, me.getProvides(mm));
                } 
                
                // else {
                // Y.log(name + ' provides worker skipping done: ' + mm);
                // }
            };

            // calculate superseded modules
            if (s) {
                for (var i=0; i<s.length; i=i+1) {
                    add(s[i]);
                }
            }

            // supersedes cache
            m[SUPER] = o;
            // provides cache
            m[PROV] = Y.merge(o);
            m[PROV][name] = true;

// Y.log(name + " supersedes " + L.dump(m[SUPER], 0));
Y.log(name + " provides " + L.dump(m[PROV], 0));

            return m[ckey];
        },


        /**
         * Calculates the dependency tree, the result is stored in the sorted 
         * property
         * @method calculate
         * @param o optional options object
         */
        calculate: function(o) {
            if (o || this.dirty) {
                this._config(o);
                this._setup();
                this._explode();
                if (this.allowRollup) {
                    this._rollup();
                }
                this._reduce();
                this._sort();

                Y.log("after calculate: " + this.sorted);

                this.dirty = false;
            }
        },

        /**
         * Investigates the current YUI configuration on the page.  By default,
         * modules already detected will not be loaded again unless a force
         * option is encountered.  Called by calculate()
         * @method _setup
         * @private
         */
        _setup: function() {

            var info = this.moduleInfo, name, i, j;

            // Create skin modules
            for (name in info) {
                if (info.hasOwnProperty(name)) {
                    var m = this.getModule(name);
                    if (m && m.skinnable) {
                        // Y.log("skinning: " + name);
                        var o=this.skin.overrides, smod;
                        if (o && o[name]) {
                            for (i=0; i<o[name].length; i=i+1) {
                                smod = this._addSkin(o[name][i], name);
                            }
                        } else {
                            smod = this._addSkin(this.skin.defaultSkin, name);
                        }

                        m.requires.push(smod);
                    }
                }

            }

            var l = Y.merge(this.inserted); // shallow clone
            
            // Y.log("Already loaded stuff: " + L.dump(l, 0));

            // add the ignore list to the list of loaded packages
            if (this.ignore) {
                // OU.appendArray(l, this.ignore);
                Y.mix(l, Y.Array.hash(this.ignore));
            }

            // remove modules on the force list from the loaded list
            if (this.force) {
                for (i=0; i<this.force.length; i=i+1) {
                    if (this.force[i] in l) {
                        delete l[this.force[i]];
                    }
                }
            }

            // expand the list to include superseded modules
            for (j in l) {
                // Y.log("expanding: " + j);
                if (Y.Object.owns(l, j)) {
                    Y.mix(l, this.getProvides(j));
                }
            }

            // Y.log("loaded expanded: " + L.dump(l, 0));

            this.loaded = l;

        },
        

        /**
         * Inspects the required modules list looking for additional 
         * dependencies.  Expands the required list to include all 
         * required modules.  Called by calculate()
         * @method _explode
         * @private
         */
        _explode: function() {

            var r=this.required, i, mod;

            for (i in r) {
                if (r.hasOwnProperty(i)) {
                    mod = this.getModule(i);
                    Y.log('exploding ' + i);

                    var req = this.getRequires(mod);

                    if (req) {
                        Y.log('via explode: ' + req);
                        Y.mix(r, Y.Array.hash(req));
                    }
                }
            }
        },

        getModule: function(name) {

            var m = this.moduleInfo[name];

            // create the default module
            if (!m) {
                Y.log('Module does not exist: ' + name + ', creating with defaults');
                m = this.addModule({}, name);
            }

            return m;
        },

        /**
         * Returns the skin module name for the specified skin name.  If a
         * module name is supplied, the returned skin module name is 
         * specific to the module passed in.
         * @method formatSkin
         * @param skin {string} the name of the skin
         * @param mod {string} optional: the name of a module to skin
         * @return {string} the full skin module name
         */
        formatSkin: function(skin, mod) {
            var s = this.SKIN_PREFIX + skin;
            if (mod) {
                s = s + "-" + mod;
            }

            return s;
        },
        
        /**
         * Reverses <code>formatSkin</code>, providing the skin name and
         * module name if the string matches the pattern for skins.
         * @method parseSkin
         * @param mod {string} the module name to parse
         * @return {skin: string, module: string} the parsed skin name 
         * and module name, or null if the supplied string does not match
         * the skin pattern
         */
        parseSkin: function(mod) {
            
            if (mod.indexOf(this.SKIN_PREFIX) === 0) {
                var a = mod.split("-");
                return {skin: a[1], module: a[2]};
            } 

            return null;
        },

        /**
         * Look for rollup packages to determine if all of the modules a
         * rollup supersedes are required.  If so, include the rollup to
         * help reduce the total number of connections required.  Called
         * by calculate()
         * @method _rollup
         * @private
         */
        _rollup: function() {
            var i, j, m, s, rollups={}, r=this.required, roll,
                info = this.moduleInfo;

            // find and cache rollup modules
            if (this.dirty || !this.rollups) {
                for (i in info) {
                    if (info.hasOwnProperty(i)) {
                        m = this.getModule(i);
                        // if (m && m.rollup && m.supersedes) {
                        if (m && m.rollup) {
                            rollups[i] = m;
                        }
                    }
                }

                this.rollups = rollups;
            }

            // make as many passes as needed to pick up rollup rollups
            for (;;) {
                var rolled = false;

                // go through the rollup candidates
                for (i in rollups) { 

                    // there can be only one
                    if (!r[i] && !this.loaded[i]) {
                        m =this.getModule(i); s = m.supersedes ||[]; roll=false;

                        if (!m.rollup) {
                            continue;
                        }

                        var skin = (m.ext) ? false : this.parseSkin(i), c = 0;

                        // Y.log('skin? ' + i + ": " + skin);
                        if (skin) {
                            for (j in r) {
                                if (r.hasOwnProperty(j)) {
                                    if (i !== j && this.parseSkin(j)) {
                                        c++;
                                        roll = (c >= m.rollup);
                                        if (roll) {
                                            // Y.log("skin rollup " + L.dump(r));
                                            break;
                                        }
                                    }
                                }
                            }

                        } else {

                            // check the threshold
                            for (j=0;j<s.length;j=j+1) {

                                // if the superseded module is loaded, we can't load the rollup
                                if (this.loaded[s[j]] && (!_Y.dupsAllowed[s[j]])) {
                                    roll = false;
                                    break;
                                // increment the counter if this module is required.  if we are
                                // beyond the rollup threshold, we will use the rollup module
                                } else if (r[s[j]]) {
                                    c++;
                                    roll = (c >= m.rollup);
                                    if (roll) {
                                        // Y.log("over thresh " + c + ", " + L.dump(r));
                                        break;
                                    }
                                }
                            }
                        }

                        if (roll) {
                            // Y.log("rollup: " +  i + ", " + L.dump(this, 1));
                            // add the rollup
                            r[i] = true;
                            rolled = true;

                            // expand the rollup's dependencies
                            this.getRequires(m);
                        }
                    }
                }

                // if we made it here w/o rolling up something, we are done
                if (!rolled) {
                    break;
                }
            }
        },

        /**
         * Remove superceded modules and loaded modules.  Called by
         * calculate() after we have the mega list of all dependencies
         * @method _reduce
         * @private
         */
        _reduce: function() {

            var i, j, s, m, r=this.required;
            for (i in r) {

                // remove if already loaded
                if (i in this.loaded) { 
                    delete r[i];

                // remove anything this module supersedes
                } else {

                    var skinDef = this.parseSkin(i);

                    if (skinDef) {
                        //Y.log("skin found in reduce: " + skinDef.skin + ", " + skinDef.module);
                        // the skin rollup will not have a module name
                        if (!skinDef.module) {
                            var skin_pre = this.SKIN_PREFIX + skinDef.skin;
                            //Y.log("skin_pre: " + skin_pre);
                            for (j in r) {
                                if (r.hasOwnProperty(j)) {
                                    m = this.getModule(j);
                                    var ext = m && m.ext;
                                    if (!ext && j !== i && j.indexOf(skin_pre) > -1) {
                                        // Y.log ("removing component skin: " + j);
                                        delete r[j];
                                    }
                                }
                            }
                        }
                    } else {

                         m = this.getModule(i);
                         s = m && m.supersedes;
                         if (s) {
                             for (j=0; j<s.length; j=j+1) {
                                 if (s[j] in r) {
                                     delete r[s[j]];
                                 }
                             }
                         }
                    }
                }
            }
        },
        
        /**
         * Sorts the dependency tree.  The last step of calculate()
         * @method _sort
         * @private
         */
        _sort: function() {
            // create an indexed list
            var s=Y.Object.keys(this.required), info=this.moduleInfo, loaded=this.loaded,
                me = this;

            // returns true if b is not loaded, and is required
            // directly or by means of modules it supersedes.
            var requires = function(aa, bb) {

                var mm=info[aa];

                if (loaded[bb] || !mm) {
                    return false;
                }

                var ii, rr = mm.expanded, 
                    after = mm.after, other=info[bb];

                // check if this module requires the other directly
                if (rr && Y.Array.indexOf(rr, bb) > -1) {
                    return true;
                }

                // check if this module should be sorted after the other
                if (after && Y.Array.indexOf(after, bb) > -1) {
                    return true;
                }

                // check if this module requires one the other supersedes
                var ss=info[bb] && info[bb].supersedes;
                if (ss) {
                    for (ii=0; ii<ss.length; ii=ii+1) {
                        if (requires(aa, ss[ii])) {
                            return true;
                        }
                    }
                }

                // external css files should be sorted below yui css
                if (mm.ext && mm.type == CSS && (!other.ext)) {
                    return true;
                }

                return false;
            };

            // pointer to the first unsorted item
            var p=0; 

            // keep going until we make a pass without moving anything
            for (;;) {
               
                var l=s.length, a, b, j, k, moved=false;

                // start the loop after items that are already sorted
                for (j=p; j<l; j=j+1) {

                    // check the next module on the list to see if its
                    // dependencies have been met
                    a = s[j];

                    // check everything below current item and move if we
                    // find a requirement for the current item
                    for (k=j+1; k<l; k=k+1) {
                        if (requires(a, s[k])) {

                            // extract the dependency so we can move it up
                            b = s.splice(k, 1);

                            // insert the dependency above the item that 
                            // requires it
                            s.splice(j, 0, b[0]);

                            moved = true;
                            break;
                        }
                    }

                    // jump out of loop if we moved something
                    if (moved) {
                        break;
                    // this item is sorted, move our pointer and keep going
                    } else {
                        p = p + 1;
                    }
                }

                // when we make it here and moved is false, we are 
                // finished sorting
                if (!moved) {
                    break;
                }

            }

            this.sorted = s;
        },

        /**
         * inserts the requested modules and their dependencies.  
         * <code>type</code> can be "js" or "css".  Both script and 
         * css are inserted if type is not provided.
         * @method insert
         * @param o optional options object
         * @param type {string} the type of dependency to insert
         */
        insert: function(o, type) {
            // if (o) {
            //     Y.log("insert: " + L.dump(o, 1) + ", " + type);
            // } else {
            //     Y.log("insert: " + this.toString() + ", " + type);
            // }

            // build the dependency list
            this.calculate(o);

            if (!type) {
                // Y.log("trying to load css first");
                var self = this;
                this._internalCallback = function() {
                            self._internalCallback = null;
                            self.insert(null, JS);
                        };
                this.insert(null, CSS);
                return;
            }

            // set a flag to indicate the load has started
            this._loading = true;

            // keep the loadType (js, css or undefined) cached
            this.loadType = type;

            // start the load
            this.loadNext();

        },

        /**
         * Executed every time a module is loaded, and if we are in a load
         * cycle, we attempt to load the next script.  Public so that it
         * is possible to call this if using a method other than
         * Y.register to determine when scripts are fully loaded
         * @method loadNext
         * @param mname {string} optional the name of the module that has
         * been loaded (which is usually why it is time to load the next
         * one)
         */
        loadNext: function(mname) {

            // It is possible that this function is executed due to something
            // else one the page loading a YUI module.  Only react when we
            // are actively loading something
            if (!this._loading) {
                return;
            }

            if (mname) {

                // if the module that was just loaded isn't what we were expecting,
                // continue to wait
                if (mname !== this._loading) {
                    return;
                }

                Y.log("loadNext executing, just loaded " + mname);

                // The global handler that is called when each module is loaded
                // will pass that module name to this function.  Storing this
                // data to avoid loading the same module multiple times
                this.inserted[mname] = true;

                // if (this.onProgress) {
                  //   this.onProgress.call(this.scope, );
                // }

                this.fire('progress', {
                    name: mname,
                    data: this.data
                });

                //var o = this.getProvides(mname);
                //this.inserted = Y.merge(this.inserted, o);
            }

            var s=this.sorted, len=s.length, i, m;

            for (i=0; i<len; i=i+1) {

                // this.inserted keeps track of what the loader has loaded.
                // move on if this item is done.
                if (s[i] in this.inserted) {
                    // Y.log(s[i] + " alread loaded ");
                    continue;
                }

                // Because rollups will cause multiple load notifications
                // from Y, loadNext may be called multiple times for
                // the same module when loading a rollup.  We can safely
                // skip the subsequent requests
                if (s[i] === this._loading) {
                    Y.log("still loading " + s[i] + ", waiting");
                    return;
                }

                // log("inserting " + s[i]);
                m = this.getModule(s[i]);

                if (!m) {
                    // this.onFailure.call(this.scope, {
                        // msg: "undefined module " + m,
                        // data: this.data
                    // });
                    var msg = "undefined module " + m;
                    Y.log(msg, 'warn', 'Loader');

                    this.fire('failure', {
                        msg: msg,
                        data: this.data
                    });

                    return;
                }


                // The load type is stored to offer the possibility to load
                // the css separately from the script.
                if (!this.loadType || this.loadType === m.type) {
                    this._loading = s[i];
                    Y.log("attempting to load " + s[i] + ", " + this.base);

                    var fn=(m.type === CSS) ? Y.Get.css : Y.Get.script,
                        url=m.fullpath || this._url(m.path), self=this, 
                        c=function(o) {
                            // Y.log('loading next, just loaded' + o.data);
                            self.loadNext(o.data);
                        };

                    // safari 2.x or lower, script, and part of YUI
                    if (Y.UA.webkit && Y.UA.webkit < 420 && m.type === JS && 
                          !m.varName) {
                          //YUI.info.moduleInfo[s[i]]) {
                          //Y.log("using Y env " + s[i] + ", " + m.varName);
                        c = null;
                        this._useYahooListener = true;
                    }

                    fn(url, {
                        data: s[i],
                        onSuccess: c,
                        insertBefore: this.insertBefore,
                        charset: this.charset,
                        varName: m.varName,
                        scope: self 
                    });

                    return;
                }
            }

            // we are finished
            this._loading = null;

            // internal callback for loading css first
            if (this._internalCallback) {

                var f = this._internalCallback;
                this._internalCallback = null;
                f.call(this);

            // } else if (this.onSuccess) {
            } else {
                this._pushEvents();

                // this.onSuccess.call(this.scope, {
                //       data: this.data
                // });

                this.fire('success', {
                        data: this.data
                });
            }

        },

        /**
         * In IE, the onAvailable/onDOMReady events need help when Event is
         * loaded dynamically
         * @method _pushEvents
         * @param {Function} optional function reference
         * @private
         */
        _pushEvents: function(ref) {
            var r = ref || Y;
            if (r.Event) {
                r.Event._load();
            }
        },

        /**
         * Generates the full url for a module
         * method _url
         * @param path {string} the path fragment
         * @return {string} the full url
         * @private
         */
        _url: function(path) {
            
            var u = this.base || "", f=this.filter;
            u = u + path;

            if (f) {
                // Y.log("filter: " + f + ", " + f.searchExp + 
                // ", " + f.replaceStr);
                u = u.replace(new RegExp(f.searchExp), f.replaceStr);
            }

            // Y.log(u);

            return u;
        }

    };

    Y.augment(Y.Loader, Y.Event.Target);


}, "@VERSION@");