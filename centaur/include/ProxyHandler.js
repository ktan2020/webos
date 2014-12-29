
include("prototype_triton.js");
include("Logger.js");
include("HttpServlet.js");
include("HttpRequestProcessor.js");


var ProxyHandler_Logger = Class.create(Generic_Logger, {});
var ProxyHandler_Logger_Instance = new ProxyHandler_Logger($H({"LOG_LEVEL" : "log"}));


/**
 * ProxyHandler Config
 *
 * ...
 */
var ProxyHandlerConfig = {
    
};


/**
 * ProxyHandler 
 *
 * Not a real proxy more like a fetcher. Only for feeds. (https, cookies ???)
 */
var ProxyHandler = Class.create(HttpServlet.AbstractServlet, {
        
        /**
         * initialize - Constructor
         */
        initialize: function(config) {
            ProxyHandler_Logger_Instance.write("log", "<<< ProxyHandler - initialize() >>>");
            
            ProxyHandler_Logger_Instance.write("log", ">>> ProxyHandler - initialize() <<<");
        },
        
        
        /**
         * doPOST - POST handler
         */
        doPOST: function(req, res) {            
            ProxyHandler_Logger_Instance.write("log", "<<< ProxyHandler - doPOST() >>>");
            
            var query = res.get('query'), post_data = req.get('Data') ? req.get('Data') : "";
                        
            if (query && query.proxy) {
                
                // URI decode the proxy request first. query request url must be uri encoded ...
                var proxy = decodeURIComponent(query.proxy);       
                
                ProxyHandler_Logger_Instance.write("log", " Incoming proxy request for URL: (" + proxy  + ")");
                            
                var curlHandle = new webOS.Curl(proxy);        
                curlHandle.setOption(webOS.Curl.FOLLOWLOCATION, 1);
                //curlHandle.setOption(webOS.Curl.RETURNTRANSFER, 1);
                               
                if (post_data) {
                    curlHandle.post(post_data, function(result) {
                        // passed here ...
                        ProxyHandler_Logger_Instance.write("log", " doPOST - curl.post returned: (" + Object.toJSON(result)  + ")"); // XXX
                         
                        if (!result || result=='') ProxyHandler_Logger_Instance.write("warn", "!! Anomaly detected: doPOST - curl.post returned result == null !!");
                        
                        if (res) {                   
                            HttpRequestProcessor.sendResponse(res, 200, null);
                            HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                            HttpRequestProcessor.sendHeader(res, "Content-Length", result.length);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.sendResponse(res, -1, result);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.flushBuffer(res);
                        }
                            
                    }, function(errorCode, errorMessage) {
                        // failed here ...
                        ProxyHandler_Logger_Instance.write("error", "XXX ProxyHandler.doPOST - curl.post failed errorCode: (" + errorCode + "), errorMessage: (" + errorMessage + ") XXX");
                        
                        if (res) {
                            var reply = "Curl error! errorCode:(" + errorCode + "), errorMessage: (" + errorMessage + ")";
                            
                            HttpRequestProcessor.sendResponse(res, 400, null);
                            HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                            HttpRequestProcessor.sendHeader(res, "Content-Length", reply.length);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.sendResponse(res, -1, reply);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.flushBuffer(res);
                        }
                        
                    });
                } else {
                    curlHandle.get(function(result) {
                        // passed here ...
                        ProxyHandler_Logger_Instance.write("log", " doPOST - curl.get returned: (" + Object.toJSON(result)  + ")"); // XXX
                        
                        if (!result || result=='') ProxyHandler_Logger_Instance.write("warn", "!! Anomaly detected: doPOST - curl.get returned result == null !!");
                        
                        if (res) {                   
                            HttpRequestProcessor.sendResponse(res, 200, null);
                            HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                            HttpRequestProcessor.sendHeader(res, "Content-Length", result.length);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.sendResponse(res, -1, result);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.flushBuffer(res);
                        }
                            
                    }, function(errorCode, errorMessage) {
                        // failed here ...
                        ProxyHandler_Logger_Instance.write("error", "XXX ProxyHandler.doPOST - curl.get failed errorCode: (" + errorCode + "), errorMessage: (" + errorMessage + ") XXX");
                        
                        if (res) {
                            var reply = "Curl error! errorCode:(" + errorCode + "), errorMessage: (" + errorMessage + ")";
                            
                            HttpRequestProcessor.sendResponse(res, 400, null);
                            HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                            HttpRequestProcessor.sendHeader(res, "Content-Length", reply.length);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.sendResponse(res, -1, reply);
                            HttpRequestProcessor.endBlock(res);
                            HttpRequestProcessor.flushBuffer(res);
                        }
                        
                    });
                }
            } else {
                ProxyHandler_Logger_Instance.write("error", "XXX ProxyHandler.doPOST - query.proxy == null or post_data == null trying to process req: (" + Object.toJSON(req) + "), res: (" + Object.toJSON(res) + ")  XXX");
            }    
                
            ProxyHandler_Logger_Instance.write("log", ">>> ProxyHandler - doPOST() <<<");
        },
        
        
        /**
         * doGET - GET handler
         */
        doGET: function(req, res) {
            ProxyHandler_Logger_Instance.write("log", "<<< ProxyHandler - doGET() >>>");
            
            var query = res.get('query');
            
            if (query && query.proxy) {
                
                // URI decode the proxy request first. query request url must be uri encoded ...
                var proxy = decodeURIComponent(query.proxy);       
                
                ProxyHandler_Logger_Instance.write("log", " Incoming proxy request for URL: (" + proxy  + ")");
                
                var curlHandle = new webOS.Curl(proxy);        
                curlHandle.setOption(webOS.Curl.FOLLOWLOCATION, 1);
                //curlHandle.setOption(webOS.Curl.RETURNTRANSFER, 1);
                
                curlHandle.get(function(result) {
                    // passed here ...
                    ProxyHandler_Logger_Instance.write("log", " doGET - curl.get returned: (" + Object.toJSON(result)  + ")"); // XXX
                    
                    if (!result || result=='') ProxyHandler_Logger_Instance.write("warn", "!! Anomaly detected: doGET - curl.get returned result == null !!");
                    
                    if (res) {                   
                        HttpRequestProcessor.sendResponse(res, 200, null);
                        HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                        HttpRequestProcessor.sendHeader(res, "Content-Length", result.length);
                        HttpRequestProcessor.endBlock(res);
                        HttpRequestProcessor.sendResponse(res, -1, result);
                        HttpRequestProcessor.endBlock(res);
                        HttpRequestProcessor.flushBuffer(res);
                    }
                        
                }, function(errorCode, errorMessage) {
                    // failed here ...
                    ProxyHandler_Logger_Instance.write("error", "XXX ProxyHandler.doGET - curl.get failed errorCode: (" + errorCode + "), errorMessage: (" + errorMessage + ") XXX");
                    
                    if (res) {
                        var reply = "Curl error! errorCode:(" + errorCode + "), errorMessage: (" + errorMessage + ")";
                        
                        HttpRequestProcessor.sendResponse(res, 400, null);
                        HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                        HttpRequestProcessor.sendHeader(res, "Content-Length", reply.length);
                        HttpRequestProcessor.endBlock(res);
                        HttpRequestProcessor.sendResponse(res, -1, reply);
                        HttpRequestProcessor.endBlock(res);
                        HttpRequestProcessor.flushBuffer(res);
                    }
                    
                });
                
            } else {
                ProxyHandler_Logger_Instance.write("error", "XXX ProxyHandler.doGET - query.proxy == null trying to process: (" + Object.toJSON(res) + ") XXX");
            }
            
            ProxyHandler_Logger_Instance.write("log", ">>> ProxyHandler - doGET() <<<");
        },
        
});
