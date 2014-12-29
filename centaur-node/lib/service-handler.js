

var http = require('http'),
    fs = require('fs'),
    pathlib = require('path'),
    uri = require('url'),
    sys = require('sys'),
    mime = require('./content-type'),
    log = require('./log'),
    settings = require('./settings').default_settings,
    servicebus = require('/usr/palm/nodejs/palmbus'), 
    _ = require("./underscore")._;
    


var _session_map = {};   
var _response_map = {};    
var _null_handle = new servicebus.Handle("", false);
_null_handle.pushRole("/usr/share/ls2/roles/prv/com.palm.service.centaur.json");
var _service_handle = new servicebus.Handle("com.palm.service.centaur", false); 



/**
 * _createUUID - private
 * A crude and approximate GUID generator (http://www.ietf.org/rfc/rfc4122.txt)
 */
function _createUUID() {
    var s = [];
    var hexDigits = "0123456789ABCDEF";
    for (var i = 0; i < 32; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[12] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    
    return s.join("");
}


function _endsWith(string, pattern) {
    var d = string.length - pattern.length;
    return d>=0 && string.lastIndexOf(pattern)===d;
}


function palm_service_handler(req, resp) {
        
    
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
    
    var url = uri.parse(req.url).pathname;
    var query = uri.parse(req.url, true).query;
    log.info(" ### palm_service_handler - url: (" + url + "), query: (" + JSON.stringify(query) + ") ###");
    
    if (url) {
        
        // connect
        if (_endsWith(url, "/bridge/connect/")) {
            (function(){
                // generate a GUID. each connect request will be given a unique GUID
                var guid = _createUUID(); 
                
                // we keep the 'session' variable alive across same page reloads by stashing it into a window.name attribute.
                // (Idea and inspiration from http://www.thomasfrank.se/sessionvars.html)
                var js = "<script type='text/javascript'>" + 
                
                        "function confirmClose() {" +
                            "window.parent.top.log('Exiting app ...');" +
                            "window.parent.comet.xhr.open('GET', '/bridge/disconnect/?sessionID='+window.parent.top.name, false);" +
                            "window.parent.comet.xhr.send(null);" +
                            "var dummy = window.parent.comet.xhr.responseText;" +
                            "window.parent.close();" +                                     
                        "}" +
                                                                    
                        "function listenCallback() {" +
                            "window.parent.top.logDebug('&&& xhr.readyState: ' + window.parent.comet.xhr.readyState + ' &&&'); " +
                            "if (window.parent.comet.xhr.readyState !== 4) { setTimeout(listen, 1000); return; };" +
                                
                            "window.parent.comet.responseText = window.parent.comet.xhr.responseText;" +
                            "window.parent.top.logDebug('### received onreadystatechange callback => sessionID: (' + window.parent.comet.sessionID + '), responseText: (' + window.parent.comet.responseText + ') ###');" +
                            "if (window.parent.comet.responseText && window.parent.comet.responseText!='') { window.parent.comet.serviceBridgeManager.callback(JSON.parse(window.parent.comet.responseText)); };" + 
                            
                            "listen();" +
                        "}" +
                        
                        "function listen() {" +
                            "if (!window.parent.top.name) {" +
                                "window.parent.comet.sessionID = '" + guid + "';" +
                                "window.parent.top.name = window.parent.comet.sessionID;" +
                                "window.parent.top.logDebug('XXX sessionID: (' + window.parent.comet.sessionID + ')');" +
                            "} else {" +
                                "window.parent.comet.sessionID = window.parent.top.name;" + 
                                "window.parent.top.logWarning('YYY found previous sessionID (!= null), so reconnecting ... (' + window.parent.top.name + ') YYY');" +
                            "};" +
                                
                            "window.parent.comet.xhr.onreadystatechange = listenCallback;" +                                           
                            "window.parent.comet.xhr.open('GET', '/bridge/listen/?sessionID='+window.parent.top.name, true);" + 
                            "window.parent.comet.xhr.send(null);" +
                        "}" +
                        
                        "function ServiceBridgeManager() {" +
                            "window.parent.top.logDebug('*** Creating PalmServiceBridgeManager ***');" +
                            "this.requests = {};" +
                        "}" +
                        
                        // create servicebridge manager ...
                        "window.parent.comet.serviceBridgeManager = new ServiceBridgeManager();" +
                        // Note: Data structure of response object: { token : [responses], limit : 5, backoff : 500 }, (limit, backoff - optional)
                        "window.parent.comet.serviceBridgeManager.callback = function(response) {" +
                            "var timeout;" +
                            "window.parent.top.logDebug('PalmServiceBridgeManager received callback - response: ', response);" +
                            "var tokens = (function(r){ var l=[]; for (var t in r){ if (t!=='limit'&&t!=='backoff') l.push(t); } return l.sort(); })(response);" +
                            "window.parent.top.logDebug('# of tokens in onreadystatechange callback response: ' + tokens.length + '', tokens);" + 
                            
                            "for (var i=0, token; token=tokens[i]; i++) {" +
                                "for (var j=0, payload; payload=response[token][j]; j++) {" +
                                    "var req = window.parent.comet.serviceBridgeManager.requests[token];" + 
                                    "window.parent.top.logWarning('token: (', token, '), payload: (', payload, ')');" +
                                
                                    "if (!(token in window.parent.comet.serviceBridgeManager.requests)) {" + 
                                        "window.parent.top.logWarning('WARNING !!! : (' + token + ') not in requests callback array! Will try to defer ...'); " + 
                                        
                                        // create a new response object and defer processing it since it's token entry is not yet in ServiceBridgeManager's requests obj. also clamp recursion limit with exp backoff ...
                                        "var resp = {}; resp[token]=[]; resp[token].push(payload); if ('limit' in response) resp['limit']=response['limit']-1; else resp['limit']=5; if ('backoff' in response) resp['backoff']=response['backoff']*2; else resp['backoff']=500;" +
                                        "timeout = setTimeout((function(resp){return function() { if (!resp.limit) return; window.parent.comet.serviceBridgeManager.callback.call(null, resp); }})(resp), resp.backoff);" +                                           
                                        "return;" +
                                    "};" +
                                
                                    "if (req) {" +
                                        "window.parent.top.logWarning('Got it !!! dispatching (' + token + ') to:', req);" +
                                        "try { req.onservicecallback(payload); }" +
                                        "catch (err) { window.parent.top.logFatal('Exception in service callback: ', err); }" +
                                    "};" +
                                "};" +
                            "};" +
                        "};" +
                        
                        "window.parent.onbeforeunload = confirmClose;" +
                        "listen();" +
                        
                        // XXX: appinfo.json 
                        "window.parent.top.logDebug('Sourcing in " + settings['DIRECTORY_INDEX'] + " ...');" +
                        "window.parent.document.getElementById('mojo_app').src='" + settings['DIRECTORY_INDEX'] + "';" + 
                        "window.parent.document.getElementById('mojo_app').focus();" + 
                        "window.parent.top.logDebug('App loading / Long-poll in progress.');" +
                  
                        "</script>";
                        
                        resp.writeHead(200, {'Content-Type': 'text/html'});
                        resp.end(js); 
            })();
        } 
        
        // disconnect
        else if (_endsWith(url, "/bridge/disconnect/")) {
            (function(){
                if (!query.sessionID) {
                    log.error("XXX service-handler - /bridge/disconnect/:  query.sessionID == null XXX");
                    resp.end();
                    return;
                } else {
                    var oldresp = _session_map[query.sessionID];
                    if (oldresp) {
                        oldresp.end();
                    }
                }
                
                delete _session_map[query.sessionID];
                delete _response_map[query.sessionID];
                
                resp.writeHead(200, {"Content-Type": "text/plain"});
                resp.end(JSON.stringify({Disconnect: true}));
            })();
        }
        
        // listen
        else if (_endsWith(url, "/bridge/listen/")) {
            (function(){
               // we need to establish a callback for this channel, so we store sessionID and HttpResponse object in session_map for 
               // invoking later when service calls are done. But first check to see if there are pending cached responses from previous service call callbacks
                                    
               var oldresp = _session_map[query.sessionID];     
               if (oldresp) {
                   oldresp.end();
               }
               
               var pending_token_hash = _response_map[query.sessionID];
               if (pending_token_hash) {
                   // there is a pending hash of responses, we need to send this back to client asap
                   var str = "";
                   for (var tok in pending_token_hash) { str+=tok+","; }
   
                   log.info(" @@@ service-handler - /bridge/listen detected cached responses. Retrieving ... (" + str + ") @@@");
                   var str = JSON.stringify(pending_token_hash);
                   
                   resp.writeHead(200, {"Content-Type": "text/plain", "Content-Length": str.length});
                   resp.end(str);
                   
                   delete _response_map[query.sessionID]; // remember to clear the pending response hash object from response_map
               } else {
                   // no pending responses to be returned so we do not return anything here. Just keep the socket channel open for service callback to return and close
                   _session_map[query.sessionID] = resp;
                   log.info(" @@@ service-handler - /bridge/listen will leave this socket hanging @@@");
                   
                   // NOTE: do NOT return anything here! we need to keep the socket channel open! 
                   //       socket channel will be closed by the callback   
               }
            })();
        }
        
        // handle_method
        else if (_endsWith(url, "/bridge/handle_method.js")) {
            (function(){
                // verify the following properties are defined 
                var props = ['sessionID','serviceName','serviceMethod','methodParams','token']; 
                for (var i=0, l=props.length; i<l; i++) {
                    if (!query[props[i]]) {
                        log.error("XXX service-handler - /bridge/handle_method.js: query." + props[i] + " == null XXX");
                        
                        // short exit if any of the required properties are not defined 
                        resp.writeHead(403, {"Content-Type": "text/plain"});
                        resp.end("Invalid service request format.");
                        return; 
                    }
                }
                    
                var sessionID = query.sessionID;
                var lunaUrl = "palm://" + query.serviceName + "/" + query.serviceMethod;
                var methodParams = query.methodParams;
                var token = query.token;
                
                var call = _service_handle.call(lunaUrl, methodParams);
                call.addListener('response', _.bind(function(mesg) {
                    log.info(" ==>> token: (" + this.token + "), luna service call for service url: (" + this.lunaUrl + ") done. Returned => (" + mesg.payload() + ") ] <<==");
                    var res = _session_map[sessionID];
                    
                    if (res) {
                        // make sure to get rid of the old socket when writes to it is done ...
                        delete _session_map[sessionID];
                        
                        // check to see if there are any leftover results from previous call that were not returned in time via the previous listen channel ...
                        var pending_token_hash = _response_map[sessionID];
            
                        if (pending_token_hash) {
                            var str = "";
                            for (var tok in pending_token_hash) { str+=tok+","; } 
                            log.info(" @@@ service-handler - response handler detected cached responses from previous service callbacks ... (" + str + ") @@@"); 
                            delete _response_map[sessionID]; // remember to clear the previous hash entry!
                        }
                                    
                        var hash = (!pending_token_hash) ? {} : pending_token_hash;
                        
                        hash[this.token] = (hash[this.token]) ? hash[this.token] : []; // initialize to empty array if hash's responses entry is not set 
                        hash[this.token].push(mesg.payload());     
                        
                        var str = JSON.stringify(hash);
                        
                        log.info("Writing response back for token: " + this.token);
                        res.writeHead(200, {"Content-Length": str.length, "Cache-Control": "no-cache"});
                        res.end(str);
                    } else {
                        log.info(" @@@ service-handler - Stored HttpResp obj == null, will cache this message for the next listen @@@");

                        // response socket not in session_map ... so need to cache the result ...
                        // Note: _response_map structure layout - Hash({session_id, {handle_token, [json responses]})
                        var token_hash = _response_map[sessionID];                
                        
                        if (!token_hash) {
                            token_hash = {};
                            token_hash[this.token] = [];
                            token_hash[this.token].push(mesg.payload()); 
                            _response_map[sessionID] = token_hash;
                        } else {
                            if (!token_hash[this.token]) {
                                // array does not exist, so need to create a new array ...
                                token_hash[this.token] = [];
                                token_hash[this.token].push(mesg.payload());
                            } else {
                                // array does exists, just append to it ...
                                token_hash[this.token].push(mesg.payload());
                            }
                            _response_map[sessionID] = token_hash; // set token_hash back to response_map to be cached for the next listen callback                
                        }
                    }
                }, {token: token, lunaUrl: lunaUrl}));
                
                var str = JSON.stringify({token: token});
                
                log.info(" *** Service call returned token: (" + str + ") ***");
                
                resp.writeHead(200, {"Cache-Control": "no-cache", "Content-Length": str.length});
                resp.end(str);
            })();
        } 
        
        // for internal use only
        else if (_endsWith(url, "/bridge/internal/query/maps/")) {
            (function(){
                var s = "_session_map size: " + _.size(_session_map) + "\n"; 
                s += "\n\n";
                s += "_response_map size: \n";
                s += "Session ID: \n\tToken: # responses\n";
                s += "==================================\n\n";
                _.each(_response_map, function (v,k) { s += k + ":\n"; if (v) { for (var i in v) { s += "\t" + i + ": " + v[i].length + "\n"; }} else { s += "\n";} });
                
                resp.writeHead(200, {"Content-Length": s.length});
                resp.end(s);
            })();
        }  
        
        else if (_endsWith(url, "/bridge/internal/debug/getSystemTime/")) {
            (function(){
                var handle = new servicebus.Handle("", false);
                //var handle = _service_handle;
                var call = handle.call("palm://com.palm.systemservice/time/getSystemTime", "{}");
                call.addListener("response", function(mesg){ 
                    var s = "token: " + mesg.responseToken() + "\n";    
                    s += "payload: " + mesg.payload();
                        
                    resp.writeHead(200, {"Content-Length": s.length});
                    resp.end(s);
                });
            })();
        } 
        // end of internal use
    }
    
}
    


    
exports.service_handler = service_handler = function(path, req, resp) {
    
    palm_service_handler(req, resp);
    
}



