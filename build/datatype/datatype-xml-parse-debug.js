YUI.add('datatype-xml-parse', function(Y) {

/**
 * The DataType utility provides a set of utility functions to operate on native
 * JavaScript data types.
 *
 * @module datatype
 */
var LANG = Y.Lang;

/**
 * Parse XML submodule.
 *
 * @class DataType.XML
 * @submodule datatype-xml-parse
 * @static
 */
 
Y.mix(Y.namespace("DataType.XML"), {
    /**
     * Converts data to type XMLDocument.
     *
     * @method parse
     * @param data {String} Data to convert.
     * @return {XMLDoc} XML Document.
     * @static
     */
    parse: function(data) {
        var xmlDoc = null;
        if(LANG.isString(data)) {
            try {
                if(!LANG.isUndefined(DOMParser)) {
                    xmlDoc = new DOMParser().parseFromString(data, "text/xml");
                }
            }
            catch(e) {
                try {
                    if(!LANG.isUndefined(ActiveXObject)) {
                            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                            xmlDoc.async = false;
                            xmlDoc.loadXML(data);
                    }
                }
                catch(ee) {
                    Y.log("Could not parse data " + Y.dump(data) + " to type XML Document: " + e.message, "warn", "DataType.XML");
                }
            }
        }
        return xmlDoc;
    }
});

// Add Parsers shortcut
Y.namespace("Parsers").xml = Y.DataType.XML.parse;



}, '@VERSION@' );
