/**
 * Create a sliding value range input visualized as a draggable thumb on a
 * background element.
 * 
 * @module slider
 */

var SLIDER = 'slider',
    RAIL   = 'rail',
    THUMB  = 'thumb',
    VALUE  = 'value',
    MIN    = 'min',
    MAX    = 'max',
    MIN_GUTTER = 'minGutter',
    MAX_GUTTER = 'maxGutter',
    THUMB_IMAGE = 'thumbImage',
    RAIL_SIZE   = 'railSize',
    CONTENT_BOX = 'contentBox',

    SLIDE_START = 'slideStart',
    SLIDE_END   = 'slideEnd',

    THUMB_DRAG  = 'thumbDrag',
    SYNC        = 'sync',
    POSITION_THUMB = 'positionThumb',
    RENDERED    = 'rendered',
    DISABLED    = 'disabled',
    DISABLED_CHANGE = 'disabledChange',

    DOT      = '.',
    PX       = 'px',
    WIDTH    = 'width',
    HEIGHT   = 'height',
    COMPLETE = 'complete',

    L = Y.Lang,
    isBoolean= L.isBoolean,
    isString = L.isString,
    isNumber = L.isNumber,
    
    getCN    = Y.ClassNameManager.getClassName,

    IMAGE         = 'image',
    C_RAIL        = getCN(SLIDER,RAIL),
    C_THUMB       = getCN(SLIDER,THUMB),
    C_THUMB_IMAGE = getCN(SLIDER,THUMB,IMAGE),
    C_IMAGE_ERROR = getCN(SLIDER,IMAGE,'error'),

    M        = Math,
    max      = M.max,
    round    = M.round,
    floor    = M.floor;

/**
 * Create a slider to represent an integer value between a given minimum and
 * maximum.
 *
 * @class Slider
 * @extends Widget
 * @param config {Object} Configuration object
 * @constructor
 */
function Slider() {
    Slider.superclass.constructor.apply(this,arguments);
}

Y.mix(Slider, {

    /**
     * The identity of the widget.
     *
     * @property Slider.NAME
     * @type String
     * @static
     */
    NAME : SLIDER,

    /**
     * Object property names used for respective X and Y axis Sliders (e.g.
     * &quot;left&quot; vs. &quot;top&quot; for placing the thumb according to
     * its representative value).
     *
     * @property Slider.AXIS_KEYS
     * @type Object
     * @static
     */
    AXIS_KEYS : {
        x : {
            dim           : WIDTH,
            offAxisDim    : HEIGHT,
            eventPageAxis : 'pageX',
            ddStick       : 'stickX',
            xyIndex       : 0
        },
        y : {
            dim           : HEIGHT,
            offAxisDim    : WIDTH,
            eventPageAxis : 'pageY',
            ddStick       : 'stickY',
            xyIndex       : 1
        }
    },

    /**
     * Static Object hash used to capture existing markup for progressive
     * enhancement.  Keys correspond to config attribute names and values
     * are selectors used to inspect the contentBox for an existing node
     * structure.
     *
     * @property Slider.HTML_PARSER
     * @Type Object
     * @static
     */
    HTML_PARSER : {
        rail       : DOT + C_RAIL,
        thumb      : DOT + C_THUMB,
        thumbImage : DOT + C_THUMB_IMAGE
    },

    /**
     * Static property used to define the default attribute configuration of
     * the Widget.
     *
     * @property Slider.ATTRS
     * @Type Object
     * @static
     */
    ATTRS : {

        /**
         * Axis upon which the Slider's thumb moves.  &quot;x&quot; for
         * horizontal, &quot;y&quot; for vertical.
         *
         * @attribute axis
         * @type String
         * @default &quot;x&quot;
         * @writeOnce
         */
        axis : {
            value : 'x',
            writeOnce : true,
            validator : function (v) {
                return this._validateNewAxis(v);
            },
            setter : function (v) {
                return this._setAxisFn(v);
            }
        },

        /**
         * Integer value associated with the left or top terminus of the
         * Slider's rail, depending on the configured axis.
         *
         * @attribute min
         * @type Number
         * @default 0
         */
        min : {
            value : 0,
            validator : function (v) {
                return this._validateNewMin(v);
            }
        },

        /**
         * Integer value associated with the right or bottom terminus of the
         * Slider's rail, depending on the configured axis.
         *
         * @attribute max
         * @type Number
         * @default 100
         */
        max : {
            value : 100,
            validator : function (v) {
                return this._validateNewMax(v);
            }
        },

        /**
         * The current value of the Slider.  This value is interpretted into a
         * position for the thumb along the Slider's rail.
         *
         * @attribute value
         * @type Number
         * @default 0
         */
        value : {
            value : 0,
            validator : function (v) {
                return this._validateNewValue(v);
            },
            setter : function (v) {
                return this._setValueFn(v);
            }
        },

        /**
         * The Node representing the Slider's rail, usually visualized as a
         * bar of some sort using a background image, along which the thumb
         * moves.  This Node contains the thumb Node.
         *
         * @attribute rail
         * @type Node
         * @default null
         */
        rail : {
            value : null,
            validator : function (v) {
                return this._validateNewRail(v);
            },
            setter : function (v) {
                return this._setRailFn(v);
            }
        },

        /**
         * The Node representing the Slider's thumb, usually visualized as a
         * pointer using a contained image Node (see thumbImage).  The current
         * value of the Slider is calculated from the centerpoint of this
         * Node in relation to the rail Node.  If provided, the thumbImage
         * Node is contained within this Node.
         *
         * If no thumbImage is provided and the Node passed as the thumb is an
         * <code>img</code> element, the assigned Node will be allocated to the
         * thumbImage and the thumb container defaulted.
         *
         * @attribute thumb
         * @type Node
         * @default null
         */
        thumb : {
            value : null,
            validator : function (v) {
                return this._validateNewThumb(v);
            },
            setter : function (v) {
                return this._setThumbFn(v);
            }
        },

        /**
         * The Node representing the image element to use for the Slider's
         * thumb.
         *
         * Alternately, an image URL can be passed and an <code>img</code>
         * Node will be generated accordingly.
         *
         * If no thumbImage is provided and the Node passed as the thumb is an
         * <code>img</code> element, the assigned Node will be allocated to the
         * thumbImage and the thumb container defaulted.
         *
         * If thumbImage is provided but its URL resolves to a 404, a default
         * style will be applied to maintain basic functionality.
         *
         * @attribute thumbImage
         * @type Node|String
         * @default null
         */
        thumbImage : {
            value : null,
            validator : function (v) {
                return this._validateNewThumbImage(v);
            },
            setter : function (v) {
                return this._setThumbImageFn(v);
            }
        },

        /**
         * The width or height of the rail element representing the physical
         * space along which the thumb can move.  CSS size values (e.g. '30em')
         * accepted but converted to pixels during render.
         *
         * Alternately, but not recommended, this attribute can be left
         * unassigned in favor of specifying height or width.
         *
         * @attribute railSize
         * @type String
         * @default '0'
         */
        railSize : {
            value : '0',
            validator : function (v) {
                return this._validateNewRailSize(v);
            }
        },

        /**
         * Boolean indicating whether clicking and dragging on the rail will
         * trigger thumb movement.
         *
         * @attribute railEnabled
         * @type Boolean
         * @default true
         */
        railEnabled : {
            value : true,
            validator : isBoolean
        },

        /**
         * Like CSS padding, the distance in pixels from the inner top left
         * corner of the rail node within which the thumb can travel.  Negative
         * values allow the edge of the thumb to escape the rail node
         * boundaries.
         *
         * @attribute minGutter
         * @type Number
         * @default 0
         */
        minGutter : {
            value : 0,
            validator : isNumber
        },

        /**
         * Like CSS padding, the distance in pixels from the inner bottom right
         * corner of the rail node within which the thumb can travel.  Negative
         * values allow the edge of the thumb to escape the rail node
         * boundaries.
         *
         * @attribute maxGutter
         * @type Number
         * @default 0
         */
        maxGutter : {
            value : 0,
            validator : isNumber
        }
    }
});

Y.extend(Slider, Y.Widget, {

    /**
     * Collection of object property names from the appropriate hash set in
     * Slider.AXIS_KEYS.
     *
     * @property _key
     * @type Object
     * @protected
     */
    _key : null,

    /**
     * Factor used to translate positional coordinates (e.g. left or top) to
     * the Slider's value.
     *
     * @property _factor
     * @type Number
     * @protected
     */
    _factor : 1,

    /**
     * Pixel dimension of the rail Node's width for X axis Sliders or height
     * for Y axis Sliders.  Used with _factor to calculate positional
     * coordinates for the thumb.
     *
     * @property _railSize
     * @type Number
     * @protected
     */
    _railSize : null,

    /**
     * Pixel dimension of the thumb Node's width for X axis Sliders or height
     * for Y axis Sliders.  Used with _factor to calculate positional
     * coordinates for the thumb.
     *
     * @property _thumbSize
     * @type Number
     * @protected
     */
    _thumbSize : null,

    /**
     * Pixel offset of the point in the thumb element from its top/left edge
     * to where the value calculation should take place.  By default, this is
     * calculated to half the width of the thumb, causing the value to be
     * marked from the center of the thumb.
     *
     * @property _thumbOffset
     * @type Number
     * @protected
     */
    _thumbOffset : 0,

    /**
     * Object returned from temporary subscription to disabledChange event to
     * defer setting the disabled state while Slider is loading the thumb
     * image.
     *
     * @property _stall
     * @type Object
     * @protected
     */
    _stall : false,

    /**
     * Deferred value for the disabled attribute when stalled (see _stall
     * property).
     *
     * @property _disabled
     * @type Boolean
     * @protected
     */
    _disabled : false,

    /**
     * Construction logic executed durint Slider instantiation. Subscribe to
     * after events for min, max, and railSize.  Publish custom events
     * including slideStart and slideEnd.
     *
     * @method initializer
     * @protected
     */
    initializer : function () {
        this._key = Slider.AXIS_KEYS[this.get('axis')];

        this.after('minChange',      this._afterMinChange);
        this.after('maxChange',      this._afterMaxChange);

        this.after('railSizeChange', this._afterRailSizeChange);

        /**
         * Signals the beginning of a thumb drag operation.  Payload includes
         * the DD.Drag instance's drag:start event under key ddEvent.
         *
         * @event slideStart
         * @param event {Event.Facade} An Event Facade object with the following attribute specific properties added:
         *  <dl>
         *      <dt>ddEvent</dt>
         *          <dd><code>drag:start</code> event from the managed DD.Drag instance</dd>
         *  </dl>
         */
        this.publish(SLIDE_START);

        /**
         * Signals the end of a thumb drag operation.  Payload includes
         * the DD.Drag instance's drag:end event under key ddEvent.
         *
         * @event slideEnd
         * @param event {Event.Facade} An Event Facade object with the following attribute specific properties added:
         *  <dl>
         *      <dt>ddEvent</dt>
         *          <dd><code>drag:end</code> event from the managed DD.Drag instance</dd>
         *  </dl>
         */
        this.publish(SLIDE_END);

        /**
         * Communicates a request to synchronize the Slider UI with the
         * attribute state.  Links the sync request with the default sync
         * logic in the default function _defSyncFn.
         *
         * @event sync
         * @param event {Event.Facade} Event Facade object
         * @preventable _defSyncFn
         */
        this.publish(SYNC, { defaultFn: this._defSyncFn });

        /**
         * Signals a value change via API, requiring the thumb position to be
         * updated.  Triggers the thumb placement logic in the default function
         * _defSetThumbPosition.
         *
         * @event valueSet
         * @param event {Event.Facade} An Event Facade object with the following attribute specific properties added:
         *  <dl>
         *      <dt>changeEv</dt>
         *          <dd><code>valueChange</code> event fired in response to the change in the value attribute</dd>
         *  </dl>
         * @preventable _defPositionThumbFn
         */
        this.publish(POSITION_THUMB, { defaultFn: this._defPositionThumbFn });
    },

    /**
     * Create the DOM structure for the Slider.  Calls _initRail and _initThumb.
     *
     * @method renderUI
     * @protected
     */
    renderUI : function () {
        this._initRail();
        this._initThumb();
    },

    /**
     * Creates the rail element if not provided or discovered via HTML_PARSER.
     *
     * @method _initRail
     * @protected
     */
    _initRail : function () {
        var cb   = this.get(CONTENT_BOX),
            rail = this.get(RAIL);

        // Create rail if necessary. Make sure it's in the contentBox
        if (!rail) {
            rail = cb.appendChild(
                Y.Node.create('<div class="'+C_RAIL+'"></div>'));

            this.set(RAIL,rail);
        } else if (!cb.contains(rail)) {
            cb.appendChild(rail);
        }

        rail.addClass(C_RAIL);
        rail.addClass(this.getClassName(RAIL,this.get('axis')));
    },

    /**
     * Creates the thumb element (not image) if not provided or discovered via
     * HTML_PARSER.  If thumb is present and an <code>img</code> element
     * <em>and</em> no thumbImage provided, reassigns the thumb element to the
     * thumbImage and defaults the thumb element as a div.
     *
     * Makes sure the thumb is a child of the rail element and calls
     * _initThumbImage if thumbImage is provided.
     *
     * @method _initThumb
     * @protected
     */
    _initThumb : function () {
        var rail    = this.get(RAIL),
            thumb   = this.get(THUMB);

        // Passed an img element as the thumb
        if (thumb && !this.get(THUMB_IMAGE) &&
            thumb.get('nodeName').toLowerCase() === 'img') {
            this.set(THUMB_IMAGE, thumb);
            this.set(THUMB,null);
            thumb = null;
        }

        if (!thumb) {
            thumb = Y.Node.create(
                '<div class="'+C_THUMB+'"></div>');

            this.set(THUMB,thumb);
        }

        thumb.addClass(C_THUMB);

        if (!rail.contains(thumb)) {
            rail.appendChild(thumb);
        }

        if (this.get(THUMB_IMAGE)) {
            this._initThumbImage();
        }
    },

    /**
     * Ensures the thumbImage is a child of the thumb element.
     *
     * @method _initThumbImage
     * @protected
     */
    _initThumbImage : function () {
        var thumb = this.get(THUMB),
            img   = this.get(THUMB_IMAGE);

        if (img) {
            img.replaceClass(C_THUMB,C_THUMB_IMAGE);

            if (!thumb.contains(img)) {
                thumb.appendChild(img);
            }
        }
    },

    /**
     * Calls _bindThumbDD to create the Y.DD instance used to handle the thumb
     * movement and binds Slider interaction to the configured value model.
     *
     * @method bindUI
     * @protected
     */
    bindUI : function () {
        /**
         * Communicates user interaction with the thumb.  Triggers the logic
         * to update the value via the default function _defUpdateValueFromDD.
         *
         * @event thumbDrag
         * @param event {Event.Facade} An Event Facade object with the following attribute specific properties added:
         *  <dl>
         *      <dt>ddEvent</dt>
         *          <dd><code>drag:drag</code> event from the managed DD.Drag instance</dd>
         *  </dl>
         * @preventable _defUpdateValueFromDD
         */
        this.publish(THUMB_DRAG, {defaultFn: this._defUpdateValueFromDD});

        this._bindThumbDD();

        this.after('valueChange',      this._afterValueChange);
        this.after('thumbImageChange', this._afterThumbImageChange);
        this.after(DISABLED_CHANGE,    this._afterDisabledChange);
    },

    /**
     * Creates the Y.DD instance used to handle the thumb interaction.
     * 
     * @method _bindThumbDD
     * @protected
     */
    _bindThumbDD : function () {
        var ddConf = { node : this.get(THUMB) };

        ddConf[this._key.ddStick] = true;

        this._dd = new Y.DD.Drag(ddConf).plug(Y.plugin.DDConstrained, {
            constrain2node : this.get(RAIL)
        });

        this._dd.on('drag:start', Y.bind(this._onDDStartDrag, this));
        this._dd.on('drag:drag',  Y.bind(this._onDDDrag,      this));
        this._dd.on('drag:end',   Y.bind(this._onDDEndDrag,   this));

        this._initRailDD();
    },

    /**
     * Subscribes to the rail Node's mousedown event to actuate the thumb when
     * backgroundEnabled is true.
     *
     * @method _initRailDD
     * @protected
     */
    _initRailDD : function () {
        this.get(RAIL).on('mousedown',Y.bind(this._handleRailMouseDown,this));
    },

    /**
     * Moves the thumb to the mousedown position and hands control over to DD
     * if the Slider is not disabled and railEnabled is true.
     *
     * @method _handleRailMouseDown
     * @param e {Event} Mousedown event facade
     * @protected
     */
    _handleRailMouseDown : function (e) {
        if (this.get('railEnabled') && !this.get(DISABLED)) {
            var dd      = this._dd,
                xyIndex = this._key.xyIndex,
                xy;

            if (dd.get('primaryButtonOnly') && e.button > 1) {
                Y.log('Mousedown was not produced by the primary button',
                      'warn', 'dd-drag');
                return false;
            }

            dd._dragThreshMet = true;

            dd._fixIEMouseDown();
            e.halt();

            Y.DD.DDM.activeDrag = dd;

            // Adjust registered starting position by half the thumb's x/y
            xy = dd.get('dragNode').getXY();
            xy[xyIndex] += this._thumbOffset;

            dd._setStartPosition(xy);
            dd.set('activeHandle',dd.get('dragNode'));

            dd.start();
            dd._alignNode([e.pageX,e.pageY]);
        }
    },

    /**
     * Synchronizes the DOM state with the attribute settings (most notably
     * railSize and value).  If thumbImage is provided and is still loading,
     * sync is delayed until it is complete, since the image's dimensions are
     * taken into consideration for calculations.
     *
     * @method syncUI
     */
    syncUI : function () {
        var img = this.get(THUMB_IMAGE);

        if (this._isImageLoading(img)) {
            Y.log('Thumb image loading. Scheduling sync.','info','slider');
            // Schedule the sync for when the image loads/errors
            this._scheduleSync();
        } else {
            Y.log('No thumb image, or image already loaded. Syncing immediately.','info','slider');
            this._ready(img,!this._isImageLoaded(img));
        }
    },

    /**
     * Binds to the load and error event on the thumbImage to sync the DOM
     * state with the attribute settings when the image resource is resolved.
     * The Slider is disabled while it waits.
     *
     * @method _scheduleSync
     * @protected
     */
    _scheduleSync : function () {
        var img, handler;

        if (!this._stall) {
            // disable the control until the image is loaded
            this._disabled = this.get(DISABLED);
            this.set(DISABLED,true);
            this._stall    = this.on(DISABLED_CHANGE,this._stallDisabledChange);

            img     = this.get(THUMB_IMAGE);
            handler = Y.bind(this._imageLoaded,this,img);
            img.on('load', handler);
            img.on('error',handler);
        }
    },

    /**
     * Method subscribed to the disabledChange event when thumbImage is being
     * loaded.  Prevents manually enabling the Slider until the thumbImage
     * resource is resolved.  Intended value is stored during load and set upon
     * completion.
     *
     * @method _stallDisabledChange
     * @param e {Event} Change event for the disabled attribute
     * @protected
     */
    _stallDisabledChange : function (e) {
        this._disabled = e.newVal;
        e.preventDefault();
    },

    /**
     * Event handler assigned to the thumbImage's load and error event if it
     * was not loaded prior to instantiation.  Calls _ready method and restores
     * the Slider's disabled attribute.
     *
     * @method _imageLoaded
     * @param img {Node} The thumbImage Node
     * @param e {Event} load or error event fired by the thumbImage
     * @protected
     */
    _imageLoaded : function (img,e) {
        var error = (e.type.toLowerCase().indexOf('error') > -1);

        if (this._stall) {
            this._stall.detach();
        }

        Y.log('Thumb image '+e.type+'ed.  Syncing','info','slider');

        this._stall = false;

        this._ready(img,error);

        this.set(DISABLED,this._disabled);
    },

    /**
     * Fires the internal sync event, which barring preventDefault should
     * execute _defSyncFn.
     *
     * @method _ready
     * @param img {Node} the thumbImage Node
     * @param error {Boolean} Indicates an error while loading the thumbImage
     * @protected
     */
    _ready : function (img,error) {
        var method = error ? 'addClass' : 'removeClass';

        // If the thumb image url results in 404, assign a class to provide
        // default thumb dimensions/UI
        this.get(CONTENT_BOX)[method](C_IMAGE_ERROR);

        this.fire(SYNC);
    },

    /**
     * The default synchronization behavior, updating the Slider's DOM state to
     * match the current attribute values.
     *
     * @method _defSyncFn
     * @param e {Event} Internal sync event
     * @protected
     */
    _defSyncFn : function (e) {
        this._uiSetThumbSize();

        this._setThumbOffset();

        this._uiSetRailSize();

        this._setRailOffsetXY();

        this._setDDGutter();

        this._setFactor();

        var val = this.get(VALUE);

        this.fire(POSITION_THUMB, {
            value  : val,
            offset : this._convertValueToOffset(val)
        });
    },

    /**
     * Captures the thumbs pixel height or width, depending on the Slider's
     * axis, for use in positioning calculations.
     *
     * @method _uiSetThumbSize
     * @protected
     */
    _uiSetThumbSize : function () {
        var thumb = this.get(THUMB),
            dim   = this._key.dim,
            img   = this.get(THUMB_IMAGE),
            size;

        // offsetWidth fails in hidden containers
        size = parseInt(thumb.getComputedStyle(dim),10);

        Y.log('thumb '+dim+': '+size+'px','info','slider');

        if (img && this._isImageLoaded(img)) {
            Y.log('using thumbImage '+dim+' ('+img.get(dim)+') for _thumbSize','info','slider');

            size = img.get(dim);
        }

        this._thumbSize = size;
    },

    /**
     * Sets the _thumbOffset property for use in establishing the point in the
     * thumb that should align to the rail position representing the calculated
     * value.
     *
     * @method _setThumbOffset
     * @protected
     */
    _setThumbOffset : function () {
        this._thumbOffset = floor(this._thumbSize / 2);
        Y.log('_thumbOffset calculated to '+this._thumbOffset+'px','info','slider');
    },

    /**
     * Stores the rail Node's pixel height or width, depending on the Slider's
     * axis, for use in calculating thumb position from the value.
     *
     * @method _uiSetRailSize
     * @protected
     */
    _uiSetRailSize : function () {
        var rail  = this.get(RAIL),
            thumb = this.get(THUMB),
            img   = this.get(THUMB_IMAGE),
            dim   = this._key.dim,
            size  = this.get(RAIL_SIZE),
            setxy = false;

        if (parseInt(size,10)) {
            Y.log('railSize provided: '+size,'info','slider');

            // Convert to pixels
            rail.setStyle(dim,size);
            size = parseInt(rail.getComputedStyle(dim),10);

            Y.log('pixel '+dim+' of railSize: '+size+'px', 'info', 'slider');
        } else {
            Y.log('defaulting railSize from max of computed style and configured '+dim+' attribute value', 'info', 'slider');
            // Default from height or width (axis respective), or dims assigned
            // via css to the rail or thumb, whichever is largest.
            // Dear implementers, please use railSize, not height/width to
            // set the rail dims
            size = this.get(dim);
            if (parseInt(size,10)) {
                setxy = true;
                rail.setStyle(dim,size);
                size = parseInt(rail.getComputedStyle(dim),10);
            }
            size = max(
                    size|0,
                    parseInt(thumb.getComputedStyle(dim),10),
                    parseInt(rail.getComputedStyle(dim),10));

            Y.log('pixel '+dim+' of rail: '+size+'px', 'info', 'slider');

            if (img && this._isImageLoaded(img)) {
                Y.log('using max of thumbImage '+dim+' ('+img.get(dim)+' and '+size+' for railSize', 'info', 'slider');

                size = max(img.get(dim),size);
            }
        }

        rail.setStyle(dim, size + PX);

        this._railSize = size;

        // handle the (not recommended) fallback case of setting rail size via
        // widget height/width params.  This is the only case that sets the
        // off-axis rail dim in the code.
        if (setxy) {
            dim = this._key.offAxisDim;
            size = this.get(dim);
            if (size) {
                rail.set(dim,size);
            }
        }
    },

    /**
     * Store the current XY position of the rail Node on the page.  For use in calculating thumb position from value.
     *
     * @method _setRailOffsetXY
     * @protected
     */
    _setRailOffsetXY : function () {
        this._offsetXY = this.get(RAIL).getXY()[this._key.xyIndex] +
                         this.get(MIN_GUTTER);
    },

   /**
    * Passes the gutter attribute value to the DDConstrain gutter attribute.
    *
    * @method _setDDGutter
    * @protected
    */
    _setDDGutter : function () {
        var gutter = this._key.xyIndex ?
            this.get(MIN_GUTTER) + " 0 " + this.get(MAX_GUTTER) :
            "0 " + this.get(MAX_GUTTER) + " 0 " + this.get(MIN_GUTTER);

        Y.log('setting DDConstrain gutter "'+gutter+'"','info','slider');

        this._dd.con.set('gutter', gutter);
    },

    /**
     * Calculates the multiplier used to translate the value into a thumb
     * position.
     *
     * @method _setFactor
     * @protected
     */
    _setFactor : function () {
        var range = this._railSize - this._thumbSize -
                    this.get(MIN_GUTTER) - this.get(MAX_GUTTER);

        this._factor = this._railSize ?
            (this.get(MAX) - this.get(MIN)) / range :
            1;

        Y.log('_factor set to '+this._factor,'info','slider');
    },

    /**
     * Convenience method for accessing the current value of the Slider.
     * Equivalent to <code>slider.get(&quot;value&quot;)</code>.
     *
     * @method getValue
     * @return {Number} the value
     */
    getValue : function () {
        return this.get(VALUE);
    },

    /**
     * Convenience method for updating the current value of the Slider.
     * Equivalent to <code>slider.set(&quot;value&quot;,val)</code>.
     *
     * @method setValue
     * @param val {Number} the new value
     */
    setValue : function (val) {
        this.set(VALUE,val);
    },

    /**
     * Validator applied to new values for the axis attribute. Only
     * &quot;x&quot; and &quot;y&quot; are permitted.
     *
     * @method _validateNewAxis
     * @param v {String} proposed value for the axis attribute
     * @return Boolean
     * @protected
     */
    _validateNewAxis : function (v) {
        return isString(v) && 'xXyY'.indexOf(v.charAt(0)) > -1;
    },

    /**
     * Validator applied to the min attribute. Only numbers are allowed.
     *
     * @method _validateNewMin
     * @param v {String} proposed value for the min attribute
     * @return Boolean
     * @protected
     */
    _validateNewMin : function (v) {
        return isNumber(v);
    },

    /**
     * Validator applied to the max attribute. Only numbers are allowed.
     *
     * @method _validateNewMax
     * @param v {String} proposed value for the max attribute
     * @return Boolean
     * @protected
     */
    _validateNewMax : function (v) {
        return isNumber(v);
    },

    /**
     * Validator applied to the value attribute. Only numbers between the min
     * and max are allowed.
     *
     * @method _validateNewValue
     * @param v {String} proposed value for the value attribute
     * @return Boolean
     * @protected
     */
    _validateNewValue : function (v) {
        var min    = this.get(MIN),
            max    = this.get(MAX);

        return isNumber(v) &&
                (min < max ? (v >= min && v <= max) : (v >= max && v <= min));
    },

    /**
     * Validator applied to the rail attribute. Only allows values through
     * before the Slider is rendered.
     *
     * @method _validateNewRail
     * @param v {String} proposed value for the rail attribute
     * @return Boolean
     * @protected
     */
    _validateNewRail : function (v) {
        return !this.get(RENDERED) || v;
    },

    /**
     * Validator applied to the thumb attribute. Only allows values through
     * before the Slider is rendered.
     *
     * @method _validateNewThumb
     * @param v {String} proposed value for the thumb attribute
     * @return Boolean
     * @protected
     */
    _validateNewThumb : function (v) {
        return !this.get(RENDERED) || v;
    },

    /**
     * Validator applied to the thumbImage attribute. Only allows values through
     * before the Slider is rendered.
     *
     * @method _validateNewThumbImage
     * @param v {String} proposed value for the thumbImage attribute
     * @return Boolean
     * @protected
     */
    _validateNewThumbImage : function (v) {
        return !this.get(RENDERED) || v;
    },

    /**
     * Validator applied to the railSize attribute. Only css size values (e.g.
     * '200px' are allowed.
     *
     * @method _validateNewRailSize
     * @param v {String} proposed value for the railSize attribute
     * @return Boolean
     * @protected
     */
    _validateNewRailSize : function (v) {
        return isString(v) &&
            (v === '0' || /^\d+(?:p[xtc]|%|e[mx]|in|[mc]m)$/.test(v));
    },

    /**
     * Setter applied to the input when updating the railSize attribute.
     *
     * @method _setAxisFn
     * @param v {String} proposed value for the axis attribute
     * @return {String} lowercased first character of the input string
     * @protected
     */
    _setAxisFn : function (v) {
        return v.charAt(0).toLowerCase();
    },

    /**
     * Setter applied to the input when updating the value attribute.
     *
     * @method _setValueFn
     * @param v {Number} proposed new value for the Slider
     * @return {Number} rounded value or configured min if non-number input
     * @protected
     */
    _setValueFn : function (v) { return v; },

    /**
     * Setter applied to the input when updating the rail attribute.  Input can
     * be a Node, raw HTMLElement, or a selector string to locate it.
     *
     * @method _setRailFn
     * @param v {Node|String|HTMLElement} The rail element Node or selector
     * @return {Node} The Node if found.  Otherwise null.
     * @protected
     */
    _setRailFn : function (v) {
        return Y.get(v) || null;
    },

    /**
     * Setter applied to the input when updating the thumb attribute.  Input can
     * be a Node, raw HTMLElement, or a selector string to locate it.
     *
     * @method _setThumbFn
     * @param v {Node|String|HTMLElement} The thumb element Node or selector
     * @return {Node} The Node if found.  Otherwise null.
     * @protected
     */
    _setThumbFn : function (v) {
        return Y.get(v) || null;
    },

    /**
     * Setter applied to the input when updating the thumbImage attribute.
     * Input can be a Node, raw HTMLElement, selector string to locate it, or
     * the URL for an image resource.
     *
     * String input will be treated as a selector.  If no element is found using
     * the selector, an <code>img</code> Node will be created with the string
     * used as the <code>src</code> attribute.
     *
     * @method _setThumbImageFn
     * @param v {Node|String|HTMLElement} The thumbImage element Node, selector,
     *          or image URL
     * @return {Node} The Node if found or created.  Otherwise null.
     * @protected
     */
    _setThumbImageFn : function (v) {
        return v ? Y.get(v) ||
                Y.Node.create('<img src="'+v+'" alt="Slider thumb">') :
                null;
    },



    /**
     * Caches the current page position of the rail element and fires the
     * slideStart event in response to the DD's drag:start.
     *
     * @method _onDDStartDrag
     * @param e {Event} the DD instance's drag:start custom event
     * @protected
     */
    _onDDStartDrag : function (e) {
        Y.log('slide start','info','slider');
        this._setRailOffsetXY();
        this.fire(SLIDE_START,{ ddEvent: e });
    },

    /**
     * Fires the thumbDrag event to queue Slider value update.
     *
     * @method _onDDDrag
     * @param e {Event} the DD instance's drag:drag custom event
     * @protected
     */
    _onDDDrag : function (e) {
        Y.log('thumb drag','info','slider');
        this.fire(THUMB_DRAG, { ddEvent: e });
    },

    /**
     * The default value update behavior in response to Slider thumb
     * interaction.  Calculates the value using stored offsets, the _factor
     * multiplier and the min value.
     *
     * @method _defUpdateValueFromDD
     * @param e {Event} the internal thumbDrag event
     * @protected
     */
    _defUpdateValueFromDD : function (e) {
        var before = this.get(VALUE),
            val    = e.ddEvent[this._key.eventPageAxis] - this._offsetXY;

        Y.log('setting value from thumb drag: before('+before+') raw('+val+') factored('+round(this.get(MIN) + (val * this._factor))+')', 'info','slider');

        val = round(this.get(MIN) + (val * this._factor));

        if (before !== val) {
            this.set(VALUE, val, { ddEvent: e.ddEvent });
        }
    },

    /**
     * Fires the slideEnd event.
     *
     * @method _onDDEndDrag
     * @param e {Event} the DD instance's drag:end custom event
     * @protected
     */
    _onDDEndDrag : function (e) {
        Y.log('slide end','info','slider');
        this.fire(SLIDE_END,{ ddEvent: e });
    },




    /**
     * Calls _uiPositionThumb with the value of the custom event's
     * &quot;offset&quot; property.
     *
     * @method _defPositionThumbFn
     * @param e {Event} the positionThumb custom event
     * @protected
     */
    _defPositionThumbFn : function (e) {
        Y.log('setting thumb offset ('+e.offset+') from value attribute update ('+e.value+')', 'info', 'slider');

        this._uiPositionThumb(e.offset);
    },

    /**
     * Places the thumb at a particular X or Y location based on the configured
     * axis.
     *
     * @method _uiPositionThumb
     * @param xy {Number} the desired left or top pixel position of the thumb
     *           in relation to the rail Node.
     * @protected
     */
    _uiPositionThumb : function (xy) {
        var dd  = this._dd;

        dd._setStartPosition(dd.get('dragNode').getXY());

        // stickX/stickY config on DD instance will negate off-axis move
        dd._alignNode([xy,xy],true);
    },



    /**
     * Fires the internal valueSet event in response to a change in the value
     * attribute.
     *
     * @method _afterValueChange
     * @param e {Event} valueChange custom event
     * @protected
     */
    _afterValueChange : function (e) {
        if (!e.ddEvent) {
            var xy = this._convertValueToOffset(e.newVal);

            Y.log('firing positionThumb to position thumb', 'info', 'slider');

            this.fire(POSITION_THUMB,{ value: e.newVal, offset: xy });
        }
    },

    /**
     * Converts a value to an integer offset for the thumb position on the rail.
     *
     * @method _convertValueToOffset
     * @param v {Number} value between the Slider's min and max
     * @protected
     */
    _convertValueToOffset : function (v) {
        return round((v - this.get(MIN)) / this._factor) + this._offsetXY;
    },

    /**
     * Replaces the thumb Node in response to a change in the thumb attribute.
     * This only has effect before the Slider is rendered.
     *
     * @method _afterThumbChange
     * @param e {Event} thumbChange custom event
     * @protected
     */
    _afterThumbChange : function (e) {
        var thumb;

        if (this.get(RENDERED)) {
            if (e.prevValue) {
                e.prevValue.get('parentNode').removeChild(e.prevValue);
            }

            this._initThumb();
            
            thumb = this.get(THUMB);
            this._dd.set('node',thumb);
            this._dd.set('dragNode',thumb);

            this.syncUI();
        }
    },

    /**
     * Sets or replaces the thumb's contained <code>img</code> Node with the
     * new Node in response to a change in the thumbImage attribute.  This only
     * has effect before the Slider is rendered.
     *
     * @method _afterThumbImageChange
     * @param e {Event} thumbImageChange custom event
     * @protected
     */
    _afterThumbImageChange : function (e) {
        if (this.get(RENDERED)) {
            if (e.prevValue) {
                e.prevValue.get('parentNode').removeChild(e.prevValue);
            }

            this._initThumbImage();
            
            this.syncUI();
        }
    },

    /**
     * Calls syncUI to update the Slider UI in response to change in the min
     * attribute.
     *
     * @method _afterMinChange
     * @param e {Event} minChange custom event
     * @protected
     */
    _afterMinChange : function (e) {
        this._refresh(e);
    },

    /**
     * Calls syncUI to update the Slider UI in response to change in the max
     * attribute.
     *
     * @method _afterMaxChange
     * @param e {Event} maxChange custom event
     * @protected
     */
    _afterMaxChange : function (e) {
        this._refresh(e);
    },

    /**
     * Calls syncUI to update the Slider UI in response to change in the
     * railSize attribute.
     *
     * @method _afterRailSizeChange
     * @param e {Event} railSizeChange custom event
     * @protected
     */
    _afterRailSizeChange : function (e) {
        this._refresh(e);
    },

    /**
     * Locks or unlocks the DD instance in response to a change in the disabled
     * attribute.
     *
     * @method _afterDisabledChange
     * @param e {Event} disabledChange custom event
     * @protected
     */
    _afterDisabledChange : function (e) {
        if (this._dd) {
            this._dd.set('lock',e.newVal);
        }
    },

    /**
     * Common handler to call syncUI in response to change events that occurred
     * after the Slider is rendered.
     *
     * @method _refresh
     * @param e {Event} An attribute change event
     * @protected
     */
    _refresh : function (e) {
        if (e.newVal !== e.prevVal && this.get(RENDERED)) {
            this.syncUI();
        }
    },

    /**
     * Used to determine if there is a current or pending request for the
     * thumbImage resource.
     *
     * @method _isImageLoading
     * @param img {Node} <code>img</code> Node
     * @return Boolean
     * @protected
     */
    _isImageLoading : function (img) {
        return img && !img.get(COMPLETE);
    },

    /**
     * Used to determine if the image resource loaded successfully or there was
     * an error.
     *
     * NOTES:
     * <ul>
     *    <li>img load error fired xbrowser for image resources not yet resolved</li>
     *    <li>img.complete reports false in IE for images not yet loaded as well as images that failed to load</li>
     *    <li>img.complete true && img.naturalWidth == 0 in FF and Safari indicate image failed to load</li>
     *    <li>img.complete && img.width == 0 in Opera indicates image failed to load</li>
     * </ul>
     *
     * @method _isImageLoaded
     * @param img {Node} <code>img</code> Node
     * @return Boolean
     * @protected
     */
    _isImageLoaded : function (img) {
        if (img) {
            var w = img.get('naturalWidth');
            return img.get(COMPLETE) && (!isNumber(w) ? img.get(WIDTH) : w);
        }

        return true;
    }

});

Y.Slider = Slider;
