
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
    Services : {
        
    // Public bus
        "com.palm.applicationManager"               : true,
        
        // CRUD
        "com.palm.accounts/crud"                    : true,
        "com.palm.contacts/crud"                    : true,
        "com.palm.calendar/crud"                    : true,
        
        "com.palm.power/timeout"                    : true,
        "com.palm.location"                         : true,
        "com.palm.connectionmanager"                : true,
        "com.palm.preferences/systemProperties"     : true,
        "com.palm.systemservice/time"               : true,
        "com.palm.audio/systemsounds"               : true,
        "com.palm.pubsubservice"                    : true,
        
    // Private bus
        "com.palm.logctld/private"                  : false, 
        "com.palm.OnDevLogger"                      : false,
        "com.palm.accountservices"                  : false,
        "com.palm.backup"                           : false,
        "com.palm.btcontacts"                       : false,
        "com.palm.certificatemanager"               : false,
        "com.palm.contextupload"                    : false,
        "com.palm.crotest"                          : false,
        "com.palm.customization"                    : false,
        "com.palm.data.carriernetworksettings"      : false,
        "com.palm.dataimport"                       : false,
        "com.palm.deviceprofile"                    : false,
        "com.palm.devicewipe"                       : false,
        "com.palm.dhcp"                             : false,
        "com.palm.facebook"                         : false,
        "com.palm.findapps"                         : false,
        "com.palm.mail"                             : false,
        "com.palm.mediaevents"                      : false,
        "com.palm.messaging"                        : false,
        "com.palm.messagingrouter"                  : false,
        "com.palm.notes"                            : false,
        "com.palm.oddService"                       : false,
        "com.palm.packageinfo"                      : false,
        "com.palm.photo.facebook"                   : false,
        "com.palm.photos"                           : false,
        "com.palm.pimsync"                          : false,
        "com.palm.pubsubservice"                    : false,
        "com.palm.superlog"                         : false,
        "com.palm.tasks"                            : false,
        "com.palm.transcode"                        : false,
        "com.palm.vm"                               : false,
        "com.palm.zeroconf"                         : false,
        
    },
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
            
            // Note: response_map structure layout (this data structure is used to buffer Luna service 
            // responses that were not returned in time via the previous listen channel.) - 
            // $H({session_id, {handle_token, [json responses]})
            this.response_map = $H({});
            
            // Note: reuse the same handle for all service calls. Service calls defaults to private bus.
            this.service_handle = new webOS.Handle("", false);
            
            //this.message_tokens = [];
            
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
                            (function(that) {
                                PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/connect/ called! ***");
                                
                                // generate a GUID. each connect request will be given a unique GUID
                                var guid = that._createUUID(); 
                                
                                // we keep the 'session' variable alive across same page reloads by stashing it into a window.name attribute.
                                // (Idea and inspiration from http://www.thomasfrank.se/sessionvars.html)
                                var js = "<script type='text/javascript'>" + 
                                            
                                            "function confirmClose() {" +
                                                "window.parent.comet.xhr.open('GET', '/bridge/disconnect/?sessionID='+window.parent.top.name, false);" +
                                                "window.parent.comet.xhr.send(null);" +
                                                "var dummy = window.parent.comet.xhr.responseText;" +
                                                "window.parent.close();" +                                     
                                            "}" +
                                                                                        
                                            "function listenCallback() {" +
                                                "console.log('&&& xhr.readyState: ' + window.parent.comet.xhr.readyState + ' &&&'); " +
                                                "if (window.parent.comet.xhr.readyState !== 4) { setTimeout(listen, 500); return; };" +
                                                    
                                                "window.parent.comet.responseText = window.parent.comet.xhr.responseText;" +
                                                "console.log('### received onreadystatechange callback => sessionID: (' + window.parent.comet.sessionID + '), responseText: (' + window.parent.comet.responseText + ') ###');" +
                                                "if (window.parent.comet.responseText && window.parent.comet.responseText!='') { window.parent.comet.serviceBridgeManager.callback(JSON.parse(window.parent.comet.responseText)); };" + 
                                                
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
                                                "};" +
                                                    
                                                "window.parent.comet.xhr.onreadystatechange = listenCallback;" +                                           
                                                "window.parent.comet.xhr.open('GET', '/bridge/listen/?sessionID='+window.parent.top.name, true);" + 
                                                "window.parent.comet.xhr.send(null);" +
                                            "}" +
                                            
                                            "function ServiceBridgeManager() {" +
                                                "console.log('*** Creating PalmServiceBridgeManager ***');" +
                                                "this.requests = {};" +
                                            "}" +
                                            
                                            // create servicebridge manager ...
                                            "window.parent.comet.serviceBridgeManager = new ServiceBridgeManager();" +
                                            // Note: Data structure of response object: { token : [responses], limit : 5, backoff : 500 }, (limit, backoff - optional)
                                            "window.parent.comet.serviceBridgeManager.callback = function(response) {" +
                                                "var timeout;" +
                                                "console.log('PalmServiceBridgeManager received callback - response: ', response);" +
                                                "var tokens = (function(r){ var l=[]; for (var t in r){ if (t!=='limit'&&t!=='backoff') l.push(t); } return l.sort(); })(response);" +
                                                "console.log('# of tokens in onreadystatechange callback response: ' + tokens.length + '', tokens);" + 
                                                
                                                "for (var i=0, token; token=tokens[i]; i++) {" +
                                                    "for (var j=0, payload; payload=response[token][j]; j++) {" +
                                                        "var req = window.parent.comet.serviceBridgeManager.requests[token];" + 
                                                        "console.error('token: (', token, '), payload: (', payload, ')');" +
                                                    
                                                        "if (!(token in window.parent.comet.serviceBridgeManager.requests)) {" + 
                                                            "console.warn('WARNING !!! : (' + token + ') not in requests callback array! Will try to defer ...'); " + 
                                                            
                                                            // create a new response object and defer processing it since it's token entry is not yet in ServiceBridgeManager's requests obj. also clamp recursion limit with exp backoff ...
                                                            "var resp = {}; resp[token]=[]; resp[token].push(payload); if ('limit' in response) resp['limit']=response['limit']-1; else resp['limit']=5; if ('backoff' in response) resp['backoff']=response['backoff']*2; else resp['backoff']=500;" +
                                                            "timeout = setTimeout((function(resp){return function() { if (!resp.limit) return; window.parent.comet.serviceBridgeManager.callback.call(null, resp); }})(resp), resp.backoff);" +                                           
                                                            "return;" +
                                                        "};" +
                                                    
                                                        "if (req) {" +
                                                            "console.warn('Got it !!! dispatching (' + token + ') to:', req);" +
                                                            "try { req.onservicecallback(payload); }" +
                                                            "catch (err) { console.error('Exception in service callback: ', err); }" +
                                                        "};" +
                                                    "};" +
                                                "};" +
                                            "};" +
                                            
                                            "window.parent.onbeforeunload = confirmClose;" +
                                            "listen();" +
                                            "window.parent.document.getElementById('mojo_app').src='" + that.options.get('DIRECTORY_INDEX') + "';" + 
                                            "window.parent.document.getElementById('mojo_app').focus();" +
                                      
                                         "</script>";
                                
                                // write this chunk of JS back to client socket. Let client latch onto the listen channel upon receiving javascript fragment
                                HttpRequestProcessor.sendResponse(res, -1, js);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/disconnect/')) {
                            (function(that) {
                                PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/disconnect/ called! ***");
                                PalmServiceHandler_Logger_Instance.write("log", "    ======> Query obj: " + Object.toJSON(query) + " <======");
                                                           
                                if (!query.sessionID) { PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/disconnect/: query.sessionID == null XXX"); }
                                else {
                                    // remove session object from session_map and cached responses from response_map but first we need to close the socket channel connection 
                                    // associated with this particular session
                                    var oldres = that.session_map.get(query.sessionID); 
                                    if (oldres) {
                                        HttpRequestProcessor.flushBuffer(oldres);
                                    }
                                                                   
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> before unset - sizeof(session_map): " + that.session_map.size() + ", sizeof(response_map): " + that.response_map.size() + " <-----");
                                    that.session_map.unset(query.sessionID);  
                                    that.response_map.unset(query.sessionID);
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> after unset - sizeof(session_map): " + that.session_map.size() + ", sizeof(response_map): " + that.response_map.size() + " <-----");
                                    
                                    /*
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> before cancel'ing - message.tokens.length: " + that.message_tokens.length + " <-----");
                                    for (var i=0, j=that.message_tokens.length; i<j; i++) {
                                        that.service_handle.cancel(that.message_tokens[i]);
                                    }
                                    that.message_tokens = [];
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> after cancel'ing - message.tokens.length: " + that.message_tokens.length + " <-----");
                                    */
                                    
                                    HttpRequestProcessor.sendResponse(res, 200, null);
                                    HttpRequestProcessor.endBlock(res);
                                    HttpRequestProcessor.sendResponse(res, -1, Object.toJSON({Disconnect: true}));
                                    HttpRequestProcessor.endBlock(res);
                                    HttpRequestProcessor.flushBuffer(res);
                                }
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/listen/')) {
                            (function(that) {
                                PalmServiceHandler_Logger_Instance.write("log","  *** /bridge/listen/ called! ***");
                                PalmServiceHandler_Logger_Instance.write("log", "    ======> Query obj: " + Object.toJSON(query) + " <======");
                               
                                if (!query.sessionID) { PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/listen/: query.sessionID == null XXX"); }
                                else {
                                    // we need to establish a callback for this channel, so we store sessionID and HttpResponse object in session_map for 
                                    // invoking later when service calls are done. But first check to see if there are pending cached responses from previous service call callbacks
                                    
                                    var oldres = that.session_map.get(query.sessionID);
                                    if (oldres) {
                                        HttpRequestProcessor.flushBuffer(oldres);
                                    }
                                    
                                    var pending_token_hash = that.response_map.get(query.sessionID);
                                    
                                    if (pending_token_hash) {
                                        // there is a pending hash of responses, we need to send this back to client asap
                                        PalmServiceHandler_Logger_Instance.write("warn", "@@@ PalmServiceHandler.doGET - PalmServiceHandler /bridge/listen detected cached responses. Retrieving ... @@@"); 
                                            
                                        var str = JSON.stringify(pending_token_hash);
                                        
                                        HttpRequestProcessor.sendResponse(res, 200, null);
                                        HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                                        HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                        HttpRequestProcessor.endBlock(res);
                                        HttpRequestProcessor.sendResponse(res, -1, str);
                                        HttpRequestProcessor.endBlock(res);
                                        HttpRequestProcessor.flushBuffer(res);
                                        
                                        that.response_map.unset(query.sessionID); // remember to clear the pending response hash object from response_map
                                    } else {             
                                        // no pending responses to be returned so we do not return anything here. Just keep the socket channel open for service callback to return and close
                                        that.session_map.set(query.sessionID, res);
                                        PalmServiceHandler_Logger_Instance.write("log", "    -----> sizeof(session_map): " + that.session_map.size() + " <-----");
                                        
                                        // NOTE: do NOT return anything here! we need to keep the socket channel open! 
                                        //       socket channel will be closed by the callback   
                                    }                                                                       
                                }
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/handle_method.js')) {
                            (function(that) {
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
                                //PalmServiceHandler_Logger_Instance.write("info", " [ calling luna service - (" + lunaUrl + ") with params - (" + methodParams + ") over (private) bus ]");

                                try {
                                    if (that.service_handle) {
                                        var token;
                                        
                                        try {
                                            var tokenObj = {};
                                            
                                            token = that.service_handle.call(lunaUrl, methodParams, that._passCallback.curry(lunaUrl, tokenObj, query.sessionID).bind(that), that._failCallback.curry(lunaUrl, tokenObj, query.sessionID).bind(that));
                                            //handle.callOneReply
                                            //token = that.service_handle.call(lunaUrl, methodParams, function(m){console.log("passed callback: (" + m.payload() + ")");}, function(m){console.log("failed callback: (" + m.payload() + ")");});
                                            PalmServiceHandler_Logger_Instance.write("info", " [ token: (" + token + "), called luna service - (" + lunaUrl + ") with params - (" + methodParams + ") over (private) bus ]");
                                            
                                            tokenObj.token = token;
                                        } catch (err) {
                                            PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - handle.call threw an Exception: (" + err + ") XXX");
                                        }
                                        
                                        // make damn well sure that the token returned from service call != null
                                        if (!token) throw "!!! Anomaly detected: PalmServiceHandler.doGET - Service call returned a NULL token !!!";
                                        
                                        var hash = { token: token };
                                        var str = Object.toJSON(hash);
                                        //that.message_tokens.push(token);
                                        
                                        PalmServiceHandler_Logger_Instance.write("log", "  *** Service call returned token: (" + str + ") ***");
                                    
                                        HttpRequestProcessor.sendResponse(res, 200, null);
                                        HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                                        HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                        HttpRequestProcessor.endBlock(res);
                                        HttpRequestProcessor.sendResponse(res, -1, str);
                                        HttpRequestProcessor.endBlock(res);
                                        HttpRequestProcessor.flushBuffer(res);
                                        
                                    } else {
                                        PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - Service handle == null XXX");
                                    }
                                } catch (err) {
                                    PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - Service threw an Exception: (" + err + ") XXX");
                                }
                            })(this);
                                        
                        } else if (uri.endsWith('/bridge/internal/query/session_map/')) {
                            (function(that) {
                                PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/internal/query/session_map/ called! ***");
                               
                                var str = "session_map: \n";
                                str += Object.toJSON(that.session_map);
                                str += "\n\n\n";
                                str += "response_map: \n";
                                str += Object.toJSON(that.response_map);
                                
                                PalmServiceHandler_Logger_Instance.write("info", "   ===> /bridge/internal/query/session_map/: \n" + str + ", len: " + str.length + " <===");
                                
                                HttpRequestProcessor.sendResponse(res, 200, null);
                                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['txt']);
                                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.sendResponse(res, -1, str);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/internal/query/session_map/size/')) {
                            (function(that) {
                                PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/internal/query/session_map/size/ called! ***");
                                
                                var size = that.session_map.size();
                                var hash = { size: size };
                                var str = "session_map size: \n";
                                str += Object.toJSON(hash);
                                str += "\n\n\n";
                                str += "response_map size: \n";
                                str += "Session ID: \n\tToken: # responses\n";
                                str += "==================================\n\n";
                                
                                that.response_map.each(function (p) { str += p.key + ":\n"; if (p.value) { for (var i in p.value) { str += "\t" + i + ": " + p.value[i].length + "\n"; }} else { str += "\n";} });
    
                                PalmServiceHandler_Logger_Instance.write("info", "   ===> /bridge/internal/query/session_map/size/: \n" + str + ", len: " + str.length + " <===");
                                
                                HttpRequestProcessor.sendResponse(res, 200, null);
                                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['txt']);
                                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.sendResponse(res, -1, str);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/internal/debug/test/time/handle/')) {
                            (function() {
                                console.log("**** DEBUG MODE: RETURN getSystemTime SERVICE CALL HANDLE ****");
                                try {
                                    var handle = new webOS.Handle("", true);
                                    var token = handle.call("palm://com.palm.systemservice/time/getSystemTime", "{}", function(){}, function(){});
                                } catch (err) {
                                    console.log("XXX Service call: palm://com.palm.systemservice/time/getSystemTime threw an Exception:  " + err + " XXX");   
                                }
                                
                                var hash = { token: token };
                                var str = Object.toJSON(hash);
                                
                                HttpRequestProcessor.sendResponse(res, 200, null);
                                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.sendResponse(res, -1, str);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })();
                            
                        } else if (uri.endsWith('/bridge/internal/debug/test/time/result/')) {
                            (function() {
                                console.log("**** DEBUG MODE: RETURN getSystemTime SERVICE CALL RESULT ****");
                                var r = res;
                                
                                try {
                                    function cb(m) {
                                        var s = Object.toJSON(m.payload());
                                        console.log("**** callback message.payload: (" + s + ") ****");
                                        
                                        if (r) {
                                            HttpRequestProcessor.sendResponse(r, 200, null);
                                            HttpRequestProcessor.sendHeader(r, "Content-Length", s.length);
                                            HttpRequestProcessor.endBlock(r);
                                            HttpRequestProcessor.sendResponse(r, -1, s);
                                            HttpRequestProcessor.endBlock(r);
                                            HttpRequestProcessor.flushBuffer(r);
                                        } else {
                                            console.error("XXX Serious Error!: Response obj == null XXX ");   
                                        }
                                    }
                                    
                                    var handle = new webOS.Handle("", true);
                                    var token = handle.call("palm://com.palm.systemservice/time/getSystemTime", "{}", cb, cb);
                                } catch (err) {
                                    console.log("XXX Service call: palm://com.palm.systemservice/time/getSystemTime threw an Exception:  " + err + " XXX");   
                                }
                            })();
                            
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
        _passCallback: function(lunaUrl, tokenObj, sessionID, message) {
            PalmServiceHandler_Logger_Instance.write("log", "*** PalmServiceHandler._passCallback called! ***");
            if (!tokenObj || !tokenObj.token || !sessionID || !message || !message.payload || message.payload()=='') {
                PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler._passCallback null detected! tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + Object.toJSON(sessionID) + "), message: (" + Object.toJSON(message) + ") XXX");
                return;
            }
            
            PalmServiceHandler_Logger_Instance.write("info", " ==>> token: (" + tokenObj.token + "), luna service call for service url: (" + lunaUrl + ") done. Returned => (" + message.payload() + ") ] <<==");
            //PalmServiceHandler_Logger_Instance.write("log", "+++ == lunaUrl: (" + lunaUrl  + "), tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + sessionID + "), payload: (" + message.payload() + "), unique_token: (" + message.uniqueToken() + "), token: (" + message.token() + ") == +++");
            
            // check to see if there are any leftover results from previous call that were not returned in time via the previous listen channel ...
            var pending_token_hash = this.response_map.get(sessionID);
            
            if (pending_token_hash) {
                PalmServiceHandler_Logger_Instance.write("warn", "@@@ PalmServiceHandler._passCallback - PalmServiceHandler detected cached responses from previous service callbacks @@@"); 
            }
                        
            var hash = (!pending_token_hash) ? {} : pending_token_hash;
            
            hash[tokenObj.token] = (hash[tokenObj.token]) ? hash[tokenObj.token] : []; // initialize to empty array if hash's responses entry is not set 
            hash[tokenObj.token].push(message.payload());    
            this.response_map.unset(sessionID); // remember to clear the previous hash entry!
            
            var res = this.session_map.get(sessionID);
            var str = JSON.stringify(hash);
                        
            // make sure stored HttpResponse object is not null before invoking write on the stored socket channel 
            if (res) {
                this.session_map.unset(sessionID); // make sure to get rid of the old socket when writes to it is done ...
                
                PalmServiceHandler_Logger_Instance.write("info", "Writing response back for token: " + tokenObj.token);
                HttpRequestProcessor.sendResponse(res, 200, null);
                HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                HttpRequestProcessor.endBlock(res);
                HttpRequestProcessor.sendResponse(res, -1, str);
                HttpRequestProcessor.endBlock(res);
                HttpRequestProcessor.flushBuffer(res);
                
            } else {
                PalmServiceHandler_Logger_Instance.write("warn", "@@@ PalmServiceHandler._passCallback Stored HttpResponse obj == null. PalmServiceHandler will cache this message until the next listen @@@"); 
                
                // response socket not in session_map ... so need to cache the result ...
                // Note: response_map structure layout - $H({session_id, {handle_token, [json responses]})
                var token_hash = this.response_map.get(sessionID);                
                
                if (!token_hash) {
                    token_hash = {};
                    token_hash[tokenObj.token] = []
                    token_hash[tokenObj.token].push(message.payload()); 
                    this.response_map.set(sessionID, token_hash);
                } else {
                    if (!token_hash[tokenObj.token]) {
                        // array does not exist, so need to create a new array ...
                        token_hash[tokenObj.token] = []
                        token_hash[tokenObj.token].push(message.payload());
                    } else {
                        // array does exists, just append to it ...
                        token_hash[tokenObj.token].push(message.payload());
                    }
                    this.response_map.set(sessionID, token_hash); // set token_hash back to response_map to be cached for the next listen callback                
                }
            }
                        
        },        
        
        
        /**
         * _failCallback - private
         */
        _failCallback: function(lunaUrl, tokenObj, sessionID, message) {
            PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler._failCallback called! XXX");

            PalmServiceHandler_Logger_Instance.write("error", "--- == lunaUrl: (" + lunaUrl  + "), tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + sessionID + "), payload: (" + message.payload() + "), unique_token: (" + message.uniqueToken() + "), token: (" + message.token() + ") == ---");
            
        },
        
});

