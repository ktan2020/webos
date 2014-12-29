
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
            
            // Note: session_map structure layout - 
            // $H({session_id, $H({handle_token, $A([JSON responses])})})
            this.session_map = $H({});
            this.service_handle = new webOS.Handle("", false);
            
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
            PalmServiceHandler_Logger_Instance.write("log", "======> Query obj: " + Object.toJSON(query) + " <======");

            if (query) {
                // make sure we're dealing with a valid query hash object
                if (typeof query === "object") {
                    var uri = res.get('uri');
                    //PalmServiceHandler_Logger_Instance.write("log", "======> uri: " + uri + " <======");
                    
                    // we handle differently depending on what service bridge request uri string ends with: connect, disconnect, listen, handle_method.js
                    if (uri) {
                        if (uri.endsWith('/bridge/connect/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/connect/ called! ***");
                            (function(that) {
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
                                                "if (window.parent.comet.xhr.readyState !== 4) { setTimeout(listen, 1500); return; };" +
                                                                                                    
                                                // XXX
                                                "console.log('### received onreadystatechange callback => sessionID: (', window.parent.comet.sessionID, '), responseText: (', window.parent.comet.xhr.responseText, ') ###');" +
                                                "if (window.parent.comet.xhr.status===200 && window.parent.comet.xhr.responseText && (window.parent.comet.xhr.responseText.length!==0||window.parent.comet.xhr.responseText!='')) {" +
                                                    "console.log('### received onreadystatechange callback => sessionID: (', window.parent.comet.sessionID, '), responseText: (', window.parent.comet.xhr.responseText, ') ###');" +
                                                    "window.parent.comet.responseText.push(window.parent.comet.xhr.responseText);" +      
                                                    "console.error('window.parent.comet.responseText: ', window.parent.comet.responseText, ', len: ', window.parent.comet.responseText.length);" + // XXX
                                                    "window.parent.comet.serviceBridgeManager.process();" +
                                                "};" + 
                                                
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
                                                    
                                                "window.parent.comet.xhr.open('GET', '/bridge/listen/?sessionID='+window.parent.top.name, true);" + 
                                                "window.parent.comet.xhr.onreadystatechange = listenCallback;" +
                                                "window.parent.comet.xhr.send(null);" +
                                            "}" +
                                            
                                            "function init() {" +
                                                "if (!window.parent.top.name) {" +
                                                    "window.parent.comet.sessionID = '" + guid + "';" +
                                                    "window.parent.top.name = window.parent.comet.sessionID;" +
                                                    "console.log('XXX sessionID: (' + window.parent.comet.sessionID + ')');" +
                                                 "} else {" +
                                                    "window.parent.comet.sessionID = window.parent.top.name;" + 
                                                    "console.log('YYY found previous sessionID (!= null), so reusing same sessionID ... (' + window.parent.top.name + ') YYY');" +
                                                 "};" +
                                            "}" +
                                            
                                            "function ServiceBridgeManager() {" +
                                                "console.log('*** Creating PalmServiceBridgeManager ***');" +
                                                "this.requests = {};" +
                                            "}" +
                                            
                                            // create servicebridge manager ...
                                            "window.parent.comet.responseText = [];" +
                                            "window.parent.comet.serviceBridgeManager = new ServiceBridgeManager();" +
                                            
                                            "window.parent.comet.serviceBridgeManager.process = function() {" +
                                                "for (var i=0, j=window.parent.comet.responseText.length; i<j; i++) {" +
                                                    "var resp = window.parent.comet.responseText.shift();" +
                                                    "console.error('resp: ', resp);" +
                                                    "if (resp && resp!='{}') { window.parent.comet.serviceBridgeManager.callback(resp); };" + // XXX
                                                "};" +
                                            "};" +
                                            
                                            "window.parent.comet.serviceBridgeManager.callback = function(response) {" +
                                                "response = JSON.parse(response);" + 
                                                "console.log('PalmServiceBridgeManager received callback - response: ', response);" +
                                                
                                                "var tokens = (function(r){ var l=[]; for (var t in r) { l.push(t); }; return l.sort(); })(response);" +
                                                "console.warn('### tokens: ', tokens, ' for response: ', response);" + // XXX
                                                "if (!tokens) return;" +
                                                
                                                "for (var i=0, token; token=tokens[i]; i++) {" +                                                    
                                                    "if (!(token in window.parent.comet.serviceBridgeManager.requests)) {" + 
                                                        "console.error('WARNING !!! : ' + token + ' not in requests callback array! Will defer for later ...'); " + 
                                                        //"var timeout = setTimeout((function(resp){return function() { window.parent.comet.serviceBridgeManager.callback.call(null, resp); }})({token: response[token]}), 500);" +                                                    
                                                        //"window.parent.comet.responseText.push(window.parent.comet.sessionID, {token: response[token]});" +
                                                        "return;" +                                                         
                                                    "};"+
                                                    
                                                    "var req = window.parent.comet.serviceBridgeManager.requests[token];" +
                                                    "var payloads = response[token];" +                                                    
                                                    "for (var j=0, payload; payload=payloads[j]; j++) {" +
                                                        "if (req) {" +
                                                            "console.error('Got it !!! dispatching to:', req, ' with token: ', token, ' with payload: ', payload);" +
                                                            //"try { req.onservicecallback(JSON.stringify(payload)); }" + // XXX
                                                            //"catch (err) { console.error('Exception in service callback: ', err); }" +
                                                        "};" +
                                                    "};" +                                                        
                                                "};" +                                                
                                            "};" +
                                            
                                            "window.parent.onbeforeunload = confirmClose;" +
                                            "listen();" +
                                            //"init(); " + 
                                            "window.parent.document.getElementById('mojo_app').src='" + that.options.get('DIRECTORY_INDEX') + "';" + 
    
                                         "</script>";
                                
                                // write this chunk of JS back to client socket. Let client latch onto listen channel upon receiving javascript fragment
                                HttpRequestProcessor.sendResponse(res, -1, js);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/disconnect/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/disconnect/ called! ***");
                            (function(that) {
                                if (!query.sessionID) { 
                                    PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/disconnect/: query.sessionID == null XXX"); 
                                
                                    HttpRequestProcessor.sendError(res, 400, "/bridge/disconnect: query.sessionID == null !!!");     
                                } else {                                                                   
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> before unset - sizeof(session_map): " + that.session_map.size() + " <-----");
                                    that.session_map.unset(query.sessionID);  
                                    PalmServiceHandler_Logger_Instance.write("log", "    -----> after unset - sizeof(session_map): " + that.session_map.size() + " <-----");
                                    
                                    HttpRequestProcessor.sendResponse(res, 200, null);
                                    HttpRequestProcessor.endBlock(res);
                                    HttpRequestProcessor.sendResponse(res, -1, Object.toJSON({Disconnect: true}));
                                    HttpRequestProcessor.endBlock(res);
                                    HttpRequestProcessor.flushBuffer(res);
                                }
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/listen/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/listen/ called! ***");
                            (function(that) {
                                if (!query.sessionID) { 
                                    PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler.doGET - /bridge/listen/: query.sessionID == null XXX");
                                    
                                    HttpRequestProcessor.sendError(res, 400, "/bridge/listen: query.sessionID == null !!!");                                                                        
                                } else {                                    
                                    var token_hash = that.session_map.get(query.sessionID);
                                    if (!token_hash) {                                        
                                        arguments.callee.curry(that).defer();                                        
                                    } else {                                        
                                        var str = Object.toJSON(token_hash);
                                        that.session_map.unset(query.sessionID);
                                        
                                        HttpRequestProcessor.sendResponse(res, 200, null);
                                        HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                                        HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                        HttpRequestProcessor.endBlock(res);
                                        HttpRequestProcessor.sendResponse(res, -1, str);
                                        HttpRequestProcessor.endBlock(res);
                                        HttpRequestProcessor.flushBuffer(res);
                                    }                                                                                                            
                                }
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/handle_method.js')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/handle_method.js called! ***");
                            (function(that) {
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
                                try {
                                    if (that.service_handle) {
                                        var token;
                                        
                                        try {
                                            var tokenObj = {};
                                            
                                            token = that.service_handle.call(lunaUrl, methodParams, that._passCallback.curry(lunaUrl, tokenObj, query.sessionID).bind(that), that._failCallback.curry(lunaUrl, tokenObj, query.sessionID).bind(that));
                                            //handle.callOneReply ???
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
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/internal/query/session_map/ called! ***");                                
                            (function(that) {                                
                                var str = Object.toJSON(that.session_map);
                                
                                //PalmServiceHandler_Logger_Instance.write("info", "   ===> /bridge/internal/query/session_map/:" + str + ", len: " + str.length + " <===");
                                
                                HttpRequestProcessor.sendResponse(res, 200, null);
                                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['txt']);
                                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.sendResponse(res, -1, str);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })(this);
                            
                        } else if (uri.endsWith('/bridge/internal/query/session_map/size/')) {
                            PalmServiceHandler_Logger_Instance.write("log", "  *** /bridge/internal/query/session_map/size/ called! ***");
                            (function(that) {
                                var str = "";
                                str += "Session ID: \n\tToken: # responses \n";
                                str += "=================================\n\n";
                                that.session_map.each(function (p) { str+=p.key+": \n"; if (p.value) { p.value.each(function (pp) { str+="\t"+pp.key+": "+pp.value.length+"\n"; }); } else { str+="\n"; } });
                                
                                //PalmServiceHandler_Logger_Instance.write("info", "   ===> /bridge/internal/query/session_map/size/: " + str + ", len: " + str.length + " <===");
                                
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
                                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['txt']);
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
                                        var s = Object.toJSON({payload: m.payload().evalJSON(true)});
                                        console.log("**** callback message.payload: (" + s + ") ****");
                                        
                                        if (r) {
                                            HttpRequestProcessor.sendResponse(r, 200, null);
                                            HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['txt']);
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
                            
                        } else if (uri.endsWith('/bridge/internal/debug/test/webconsole/')) {
                            /*
                            (function() {
                                var html = "<html>" + 
                                            "<script type='text/javascript'>" +
                                                "var ns = new XMLHttpRequest(), sm = new XMLHttpRequest(), ss = new XMLHttpRequest();" +
                                                "function nsf() { ns.open('GET', '/bridge/internal/query/session_map/size/', true); ns.send(null); };" +
                                                "function smf() { sm.open('GET', '/bridge/internal/query/session_map/', true); sm.send(null); };" +
                                                //"var ssf = function(u) { ss.open('GET', '/bridge/internal/debug/test/time/subscribe/'+(u?u:''), true); ss.send(null); };" +
                                                "nsf(); smf();" +
                                                //"ssf();" +
                                                "ns.onreadystatechange = function() { document.getElementById('num_session').innerText = ns.responseText; setTimeout('nsf()', 2000); };" +
                                                "sm.onreadystatechange = function() { document.getElementById('session_map').innerText = sm.responseText; setTimeout('smf()', 2000); };" +
                                                //"ss.onreadystatechange = function() { document.getElementById('subscription_test').innerText = ss.responseText; setTimeout('ssf(\"?listen=true\")', 1000); };" +
                                            "</script>" +
                                            "<body>" +
                                                "<hr/>" +
                                                "<h1>Session Map</h1>" +
                                                "<div>" +
                                                    "<div id='num_session'></div>" +
                                                    "<div id='session_map'></div>" +
                                                "</div>" +
                                                "<hr/>" +
                                                "<p/>" +
                                                "<hr/>" +
                                                "<h1>Subscription Test</h1>" +
                                                "<div id='subscription_test'>" +
                                                "</div>" +
                                                "<hr/>" +
                                            "</body>" +
                                         "</html>";
                                
                                HttpRequestProcessor.sendResponse(res, 200, null);
                                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['html']);
                                HttpRequestProcessor.sendHeader(res, "Content-Length", html.length);
                                HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.sendResponse(res, -1, html);
                                HttpRequestProcessor.endBlock(res);
                                HttpRequestProcessor.flushBuffer(res);
                            })();
                            */
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
         *
         * Message format: JSON.stringify({ token: tokenObj.token, sessionID: sessionID, payload: message.payload() })
         */        
        _passCallback: function(lunaUrl, tokenObj, sessionID, message) {
            PalmServiceHandler_Logger_Instance.write("log", "*** PalmServiceHandler._passCallback called! ***");
            if (!tokenObj || !sessionID || !message) {
                PalmServiceHandler_Logger_Instance.write("error", "XXX PalmServiceHandler._passCallback null detected! tokenObj: (" + Object.toJSON(tokenObj) + "), sessionID: (" + Object.toJSON(sessionID) + "), message: (" + Object.toJSON(message) + ") XXX");
                return;
            }
            
            PalmServiceHandler_Logger_Instance.write("info", " ==>> token: (" + tokenObj.token + "), luna service call for service url: (" + lunaUrl + ") done. Returned => (" + message.payload() + ") ] <<==");
              
            // session_map key'ed by sessionID. Retrieve session_map_value. session_map_val = $H(token, $A([message.payload]))
            var session_map_val = this.session_map.get(sessionID), session_map_val_val;
              
            if (!session_map_val) {
                // session_map entry is empty, so create new hash entry
                session_map_val = $H({});
                session_map_val.set(tokenObj.token, $A([message.payload().evalJSON(true)]));
                this.session_map.set(sessionID, session_map_val);
            } else {
                if (!Object.isHash(session_map_val)) throw "XXX PalmServiceHandler.session_map[" + sessionID +"] - val: (Not of type Hash !!!)  XXX"; 
                
                session_map_val_val = session_map_val.get(tokenObj.token);                
                if (!session_map_val_val) {
                    // array does not exist, so create new array entry
                    session_map_val.set(tokenObj.token, $A([message.payload().evalJSON(true)]));
                    this.session_map.set(sessionID, session_map_val);
                } else {                    
                    if (!Object.isArray(session_map_val_val)) throw "XXX PalmServiceHandler.session_map[" + sessionID + "][" + tokenObj.token + "] - val: (Not of type Array !!!) XXX";
                    
                    // append to existing array
                    session_map_val_val.push(message.payload().evalJSON(true));
                    session_map_val.set(tokenObj.token, session_map_val_val);
                    this.session_map.set(sessionID, session_map_val);
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

