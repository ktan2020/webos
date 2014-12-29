
include("prototype_triton.js");
include("Logger.js");
include("HtmlUtils.js");
include("HttpUtils.js");


var HttpRequestProcessor_Logger = Class.create(Generic_Logger, {});
var HttpRequestProcessor_Logger_Instance = new HttpRequestProcessor_Logger($H({"LOG_LEVEL" : "info"}));


var HttpRequestProcessor = {};


/**
 * HttpRequestProcessor Config
 */
var HttpRequestProcessorConfig = {
    BUFSIZE         : 256*1024,
};


HttpRequestProcessor.sendResponse = function(res, code, mesg) {
    if (!res) { return; }
    
    var h = res.get('headers');
    if (!h) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendResponse: headers buffer == null XXX");
        return; 
    }
    
    if (code !== -1) {
        h.writeString(res.get('protocol') + " " + code + " " + HttpUtils.HttpStatus[code] + HttpUtils.CRLF);
        
        HttpRequestProcessor.sendHeader(res, "Server", res.get('server'));
        HttpRequestProcessor.sendHeader(res, "Date", new Date());
    } else {
        h.writeString(mesg + HttpUtils.CRLF);
    }
};


HttpRequestProcessor.sendHeader = function(res, key, value) {
    if (!res) { return; }
    var h = res.get('headers');
    if (!h) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendHeader: headers buffer == null XXX");
        return; 
    }
    
    h.writeString(key + ":" + value + HttpUtils.CRLF);
};


HttpRequestProcessor.endBlock = function(res) {
    if (!res) { return; }
    var h = res.get('headers');
    if (!h) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.endBlock: headers buffer == null XXX");
        return; 
    }
    
    h.writeString(HttpUtils.CRLF);
};


HttpRequestProcessor.sendError = function(res, code, mesg) {
    if (!res) { return; }
   
    var sanitized_str = HtmlUtils.quoteHtml(mesg);
    var error_str = "<title>Error!!!!!</title><h1>" + code + ": " + HttpUtils.HttpStatus[code] + "</h1><h2>" + sanitized_str + "</h2>";
    
    try {
        HttpRequestProcessor.sendResponse(res, code, '');
        HttpRequestProcessor.sendHeader(res, "Content-Type", "text/html");
        HttpRequestProcessor.sendHeader(res, "Content-Length", error_str.length);
        HttpRequestProcessor.endBlock(res);
        
        HttpRequestProcessor.sendResponse(res, -1, error_str);
        HttpRequestProcessor.endBlock(res);
        
        HttpRequestProcessor.flushBuffer(res, res.get('headers'));
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendError threw an Exception: " + err + " XXX");
        throw err;
    }
};


HttpRequestProcessor.flushBuffer = function(res, h, w) {
    if (!res) { return; }
    var chan = res.get('channel');
    if (!chan) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.flushBuffer: socket channel == null XXX");
        return; 
    }
    
    if (!h) { h = res.get('headers'); }
    /*
    h.position = 0;
    HttpRequestProcessor_Logger_Instance.write("log", " ### h: " + Object.toJSON(h.readString()) + ", Length: " + h.length + " ###");
    */
    h.position = 0;
    var wrote = 0;
    
    function writeReady() {
        if (wrote === h.length) {
            HttpRequestProcessor_Logger_Instance.write("log", " @@@@ Write buffer to Socket complete!!! wrote: " + wrote + ", buf.length: " + h.length + " @@@@");
            chan.onwrite = undefined;
            
            try {
                if (w) {
                    HttpRequestProcessor.flushBuffer(res, w);
                } else {
                    if (chan.flags & webOS.IOChannel.FLAG_IS_WRITEABLE) {
                        chan.write(HttpUtils.CRLF);
                        chan.shutdown(true); 
                        chan.onread = undefined;
                        return;
                    } else {
                        chan.onwrite = writeReady;   
                    }
                }
            } catch (err) {
                HttpRequestProcessor_Logger_Instance.write("warn", "! HttpRequestProcessor.flushBuffer.writeReady threw an Exception: " + err + ", client side closed socket prematurely !");
                chan.onwrite = chan.onread = undefined;
                //h.position = wrote = h.length;
            }
            
            return;
        }
        
        try {
            if (chan.flags & webOS.IOChannel.FLAG_IS_WRITEABLE) {
                chan.flush();
                var writeCount = chan.writeUsingBuffer(h, HttpRequestProcessorConfig['BUFSIZE']);
                HttpRequestProcessor_Logger_Instance.write("log", " ::: buffer write to channel: (" + writeCount + ") out of: (" + HttpRequestProcessorConfig['BUFSIZE'] +") :::");
                h.position += writeCount;
                wrote += writeCount;
            }
        } catch (err) {
            HttpRequestProcessor_Logger_Instance.write("warn", "! HttpRequestProcessor.flushBuffer.writeUsingBuffer threw an Exception: " + err + ", client side closed socket prematurely !");
            chan.onwrite = chan.onread = undefined;  
            //h.position = wrote = h.length;
            
            return;
        }
        
    }
    
    chan.onwrite = writeReady;
}


