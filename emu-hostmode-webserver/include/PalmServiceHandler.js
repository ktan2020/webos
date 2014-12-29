
include("prototype_triton.js");
include("Logger.js");
include("HttpServlet.js");
include("HttpRequestProcessor.js");


var PalmServiceHandler_Logger = Class.create(Generic_Logger, {});
var PalmServiceHandler_Logger_Instance = new PalmServiceHandler_Logger($H({"LOG_LEVEL" : "info"}));


/**
 * PalmServiceHandler Config
 */
var PalmServiceHandlerConfig = {
    // enumerate all palm services here with their public/private bus settings
    
};


/**
 * PalmServiceHandler - 
 */
var PalmServiceHandler = Class.create(HttpServlet.AbstractServlet, {
        
        /**
         * initialize - Constructor
         */
        initialize: function(config) {
            PalmServiceHandler_Logger_Instance.write("log", "<<< PalmServiceHandler - initialize() >>>");
            
            this.session_map = $H({});
            
            PalmServiceHandler_Logger_Instance.write("log", ">>> PalmServiceHandler - initialize() <<<");
        },
        
        
        /**
         * _createUUID - private
         * A crude and approximate GUID generator (http://www.ietf.org/rfc/rfc4122.txt)
         */
        _createUUID: function() {
            var s = [];
            var hexDigits = "0123456789ABCDEF";
            for (var i = 0; i < 32; i++) {
                s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
            s[12] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
            s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        
            return s.join("");
        },
        
        
        /**
         * doGET - GET handler
         *
         * The transport protocol is as follows:
         * 
         * 1) FileHandler.js's doGET method returns an embedded iframe with URL (/bridge/connect/). This initiates immediate connection request from 
         *    client browser to our server.
         *    
         * 2) When server gets a URL request to /bridge/connect/, the servlet module will create a unique GUID. This GUID will be used to 
         *    uniquely identify the client's session (e.g. different browser tabs or browser windows). The servlet will also return an embedded Comet object 
         *    (javascript code fragment) that implements 'servlet push' or 'long polling'.
         *     
         * 3) When client browser receives javascript fragment, it will generate an Ajax call to the /bridge/listen/ channel with its 
         *    associated sessionID and effectively latch onto the listen channel indefinitely for a callback. When this callback is received, another
         *    Ajax call is made to reconnect and latch onto the listen channel again and waits again for another callback. This loop creates a long-polling cycle.
         *
         * 4) When the client browser tab or window is closed, the onUnload callback from browser is used to create a different Ajax call to
         *    the /bridge/disconnect/ channel to remove or unregister the callback. 
         *
         *
         *
         *      client                                                    server
         *      ------                                                    ------
         *
         * [0]
         *        GET /
         *        ----------------------------------------------------------->
         *
         *
         * [1]
         *        (embedded iframe with URL src='/bridge/connect/')
         *        <-----------------------------------------------------------
         *
         *
         * [2]
         *        GET /bridge/connect/
         *        ----------------------------------------------------------->
         *
         *        Comet obj with sessionID
         *        <-----------------------------------------------------------
         *
         *
         * [3]
         *        XMLHttpRequest.open(GET, /bridge/listen/?sessionID=sessionID)
         *        ----------------------------------------------------------->
         *        
         *                                 ...
         *                                 ...
         * 
         * 
         *        XMLHttpRequest.onreadystatechange callback
         *        <-----------------------------------------------------------
         *
         *        XMLHttpRequest.open(GET, /bridge/listen/?sessionID=sessionID)
         *        ----------------------------------------------------------->
         *
         *                                 ...
         *                                 ...
         *
         *
         * [4]
         *        browser's onUnload
         *        XMLHttpRequest.open(GET, /bridge/disconnect/?sessionID=sessionID)
         *        ----------------------------------------------------------->
         *
         *        server sends socket channel close and FIN
         *        <-----------------------------------------------------------
         *
         *
         */
        doGET: function(req, res) {
            PalmServiceHandler_Logger_Instance.write("log", "<<< PalmServiceHandler - doGET() >>>");
            
            var query = res.get('query');
            //PalmServiceHandler_Logger_Instance.write("log", "======> Query obj: " + Object.toJSON(query) + " <======");

            if (query) {
                // make sure we're dealing with a valid query hash object
                if (typeof query === "object") {
                    var uri = res.get('uri');
                    PalmServiceHandler_Logger_Instance.write("log", "======> uri: " + uri + " <======");
                    
                    // we handle differently depending on what service bridge request uri string ends with: connect, disconnect, listen, handle_method.js
                    if (uri) {
                        if (uri.endsWith('/bridge/connect/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/connect/ called! ***");
                            
                            // generate a GUID. each connect request will be given a unique GUID
                            var guid = this._createUUID(); 
                            
                            //TODO: add reconnect and disconnect code here ...
                            // we keep the 'session' variable alive across same page reloads by stashing it into a window.name attribute.
                            // (Idea and inspiration from http://www.thomasfrank.se/sessionvars.html)
                            var js = "<script type='text/javascript'>" + 
                                        
                                        "function confirmClose() {" +
                                            "if (confirm('Close this window?')) {" +
                                                "window.parent.comet.xhr.open('GET', '/bridge/disconnect/?sessionID='+window.parent.top.name, false);" +
                                                "window.parent.comet.xhr.send(null);" +
                                                "var dummy = window.parent.comet.xhr.responseText;" +
                                                "window.parent.close();" +
                                            "}" +                                      
                                        "}" +
                                        
                                        "function listenCallback() {" +
                                            "console.log('&&& xhr.readyState: ' + window.parent.comet.xhr.readyState + ' &&&'); " +
                                            "if (window.parent.comet.xhr.readyState != 4) { setTimeout('listen()', 500); return; }" +
                                                
                                            "window.parent.comet.responseText = window.parent.comet.xhr.responseText;" +
                                            "console.log('### received onreadystatechange callback => sessionID: (' + window.parent.comet.sessionID + '), responseText: (' + window.parent.comet.responseText + ') ###');" +
                                            "if (window.parent.comet.responseText) { window.parent.comet.serviceBridgeManager.callback(window.parent.comet.responseText); }" + 
                                            
                                            "listen();" +
                                        "}" +
                                        
                                        "function listen() {" +
                                            "if (!window.parent.top.name) {" +
                                                "window.parent.comet.sessionID = '" + guid + "';" +
                                                "window.parent.top.name = window.parent.comet.sessionID;" +
                                                "console.log('XXX sessionID: (' + window.parent.comet.sessionID + ')');" +
                                            "} else {" +
                                                "window.parent.comet.sessionID = window.parent.top.name;" + 
                                                "console.log('YYY found previous sessionID (!= null), so reconnecting ... (' + window.parent.top.name + ') YYY');" +
                                            "}" +
                                                
                                            "window.parent.comet.xhr.open('GET', '/bridge/listen/?sessionID='+window.parent.top.name, true);" + 
                                            "window.parent.comet.xhr.onreadystatechange = listenCallback;" +
                                            "window.parent.comet.xhr.send(null);" +
                                        "}" +
                                        
                                        "window.parent.onbeforeunload = confirmClose;" +
                                        "listen();" +

                                     "</script>";
                            
                            // write this chunk of JS back to client socket. Let client latch onto the listen channel upon receiving javascript fragment
                            HttpRequestProcessor.sendResponseUsingString(res, js);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.done(res);
                            
                        } else if (uri.endsWith('/bridge/disconnect/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/disconnect/ called! ***");
                            PalmServiceHandler_Logger_Instance.write("log", "    ======> Query obj: " + Object.toJSON(query) + " <======");
                                                       
                            if (!query.sessionID) { PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/disconnect/: query.sessionID == null XXX"); }
                            else {
                                // remove session object from session_map but first we need to close the socket channel connection associated with this particular session
                                var oldres = this.session_map.get(query.sessionID);      
                                PalmServiceHandler_Logger_Instance.write("log", "    -----> Previous HTTPResponse obj: (" + Object.toJSON(oldres) + ") <-----");
                                
                                if (oldres && oldres.channel) {
                                    oldres.channel.shutdown(true);
                                    oldres.channel.onread = undefined;
                                    oldres.channel = undefined;
                                    oldres = undefined;
                                    gc();
                                }
                                                               
                                PalmServiceHandler_Logger_Instance.write("log", "    -----> before unset - sizeof(session_map): " + this.session_map.size() + " <-----");
                                this.session_map.unset(query.sessionID);  
                                PalmServiceHandler_Logger_Instance.write("log", "    -----> after unset - sizeof(session_map): " + this.session_map.size() + " <-----");
                                
                                HttpRequestProcessor.sendResponse(res, 200, null);
                                HttpRequestProcessor.endHeaders(res);
                                HttpRequestProcessor.sendResponse(res, -1, '');
                                HttpRequestProcessor.done(res);
                            }
                            
                        } else if (uri.endsWith('/bridge/listen/')) {
                            PalmServiceHandler_Logger_Instance.write("log","  *** /bridge/listen/ called! ***");
                            PalmServiceHandler_Logger_Instance.write("log", "    ======> Query obj: " + Object.toJSON(query) + " <======");
                           
                            if (!query.sessionID) { PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/listen/: query.sessionID == null XXX"); }
                            else {
                                // we need to establish a callback for this channel, so we store sessionID and HttpResponse object in session_map for 
                                // invoking later when service calls are done. Update HTTPResponse object if needed.
                                var oldres = this.session_map.get(query.sessionID);
                                if (oldres !== res) {
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> replacing (" + Object.toJSON(oldres) + ") with (" + Object.toJSON(res) + ") <-----");
                                }
                                this.session_map.set(query.sessionID, res);
                                PalmServiceHandler_Logger_Instance.write("log", "    -----> sizeof(session_map): " + this.session_map.size() + " <-----");
                                
                                // NOTE: do NOT return anything here! we need to keep the socket channel open! 
                                //       socket channel will be closed by the callback
                            }
                            
                        } else if (uri.endsWith('/bridge/handle_method.js')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/handle_method.js called! ***");
                            PalmServiceHandler_Logger_Instance.write("log", "    ======> Query obj: " + Object.toJSON(query) + " <======");
                            
                            // verify the following properties are defined 
                            var props = ['sessionID','serviceName','serviceMethod','methodParams'];
                            for (var i=0, l=props.length; i<l; i++) {
                                if (!query[props[i]]) {
                                    PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/handle_method.js: query." + props[i] + " == null XXX");
                                    // short exit if any of the required properties are not defined 
                                    return;
                                }
                            }
                            
                            var lunaUrl = "palm://" + query.serviceName + "/" + query.serviceMethod;
                            var methodParams = query.methodParams;
                            
                            // call webOS service
                            PalmServiceHandler_Logger_Instance.write("info", " [ calling luna service - " + lunaUrl + " ]");
                            var handle;
                            
                            try {
                                handle = new webOS.Handle("", true); // defaults to true for public & private bus 
                                
                                if (handle && handle.call) {
                                    var token;
                                    
                                    try {
                                        var tokenObj = {};
                                        
                                        token = handle.call(lunaUrl, methodParams, this._passCallback.curry(tokenObj, query.sessionID).bind(this), this._failCallback.curry(tokenObj, query.sessionID).bind(this));
                                        //handle.callOneReply
                                        //token = handle.call(lunaUrl, methodParams, function(m){console.log("passed callback: (" + m.payload() + ")");}, function(m){console.log("failed callback: (" + m.payload() + ")");});
                                        
                                        tokenObj.token = token;
                                    } catch (err) {
                                        PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - handle.call threw an Exception: (" + err + ") XXX");
                                    }
                                    
                                    // make damn well sure that the token returned from service call != null
                                    if (!token) throw "!!! Anomaly detected: PalmServiceHandler.doGET - Service call returned a NULL token !!!";
                                    
                                    //TODO: what else to do here ...
                                    var hash = { token: token };
                                    var str = Object.toJSON(hash);
                                    
                                    PalmServiceHandler_Logger_Instance.write("log", "  *** Service call returned token: (" + str + ") ***");
                                
                                    HttpRequestProcessor.sendResponse(res, 200, null);
                                    HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                                    HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                    HttpRequestProcessor.endHeaders(res);
                                    HttpRequestProcessor.sendResponseUsingString(res, str);
                                    HttpRequestProcessor.endHeaders(res);
                                    HttpRequestProcessor.done(res);
                                    
                                } else {
                                    PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - Service handle == null XXX");
                                }
                            } catch (err) {
                                PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - Service threw an Exception: (" + err + ") XXX");
                            }
                                        
                        } else if (uri.endsWith('/bridge/internal/query/session_map/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/internal/query/session_map/ called! ***");
                            
                            var str = Object.toJSON(this.session_map);
                            
                            PalmServiceHandler_Logger_Instance.write("info", "   ===> /bridge/internal/query/session_map/:" + str + " <===");
                            
                            HttpRequestProcessor.sendResponse(res, 200, null);
                            HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.sendResponseUsingString(res, str);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.done(res);
                            
                        } else if (uri.endsWith('/bridge/internal/query/session_map/size/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/internal/query/session_map/size/ called! ***");
                            
                            var size = this.session_map.size();
                            var hash = { size: size };
                            var str = Object.toJSON(hash);
                            
                            PalmServiceHandler_Logger_Instance.write("info", "   ===> /bridge/internal/query/session_map/size/: " + str + " <===");
                            
                            HttpRequestProcessor.sendResponse(res, 200, null);
                            HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.sendResponseUsingString(res, str);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.done(res);
                            
                        } else if (uri.endsWith('/bridge/internal/debug/test/'))  {
                            console.log("**** DEBUG MODE ****");
                            try {
                                var handle = new webOS.Handle("", true);
                                var token = handle.call("palm://com.palm.triton_js_service/test", "{}", function(m){console.log('passed callback: (' + m.payload() + ')');}, function(m){console.log('failed callback: (' + m.payload() + ')');});
                            } catch (err) {
                                console.log(err);   
                            }
                            
                            var hash = { token: token };
                            var str = Object.toJSON(hash);
                            
                            HttpRequestProcessor.sendResponse(res, 200, null);
                            HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.sendResponseUsingString(res, str);
                            HttpRequestProcessor.endHeaders(res);
                            HttpRequestProcessor.done(res);
                            
                        } else {
                            PalmServiceHandler_Logger_Instance.write("warn", "!!! Anomaly detected: PalmServiceHandler.doGET - Unmapped uri found (" + uri + "). Provide implementation for this uri! !!!");
                        }                   
                    } else {
                        PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - (uri == null) XXX");
                    } 
                } else {
                    PalmServiceHandler_Logger_Instance.write("warn", "!!! Anomaly detected: PalmServiceHandler.doGET - Invalid res.query object (typeof query !== object) !!!");
                }
            } else {
                PalmServiceHandler_Logger_Instance.write("warn","!!! Anomaly detected: PalmServiceHandler.doGET - Invalid res.query object (query == null) !!!");
            }
            
            PalmServiceHandler_Logger_Instance.write("log", ">>> PalmServiceHandler - doGET() <<<"); 
            
        },
        
        
        /**
         * _passCallback - private
         */
        _passCallback: function(tokenObj, sessionID, message) {
            PalmServiceHandler_Logger_Instance.write("log", "*** PalmServiceHandler._passCallback called! ***");
            if (!tokenObj || !sessionID || !message) {
                PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler._passCallback null detected! tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + Object.toJSON(sessionID) + "), message: (" + Object.toJSON(message) + ") XXX");
                return;
            }
            
            PalmServiceHandler_Logger_Instance.write("info", " [ luna service call for service handle: (" + tokenObj.token + ") done ]");
            PalmServiceHandler_Logger_Instance.write("log", "+++ == tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + sessionID + "), payload: (" + message.payload() + "), unique_token: (" + message.uniqueToken() + "), token: (" + message.token() + ") == +++");
            
            var jsonPayload = Object.toJSON(message.payload());
            
            var res = this.session_map.get(sessionID);
            var hash = { token: tokenObj.token, sessionID: sessionID, payload: jsonPayload };
            var str = Object.toJSON(hash);
            
            // make sure stored HttpResponse object is not null before invoking write on the stored socket channel 
            if (res) {
                HttpRequestProcessor.sendResponse(res, 200, null);
                HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                HttpRequestProcessor.endHeaders(res);
                HttpRequestProcessor.sendResponseUsingString(res, str);
                HttpRequestProcessor.endHeaders(res);
                HttpRequestProcessor.done(res);
            } else {
                PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler._passCallback Stored HttpResponse obj == null XXX");   
            }
            
        },        
        
        
        /**
         * _failCallback - private
         */
        _failCallback: function(tokenObj, sessionID, message) {
            PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler._failCallback called! XXX");

            PalmServiceHandler_Logger_Instance.write("error", "--- == tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + sessionID + "), payload: (" + message.payload() + "), unique_token: (" + message.uniqueToken() + "), token: (" + message.token() + ") == ---");
            
        },
        
});


