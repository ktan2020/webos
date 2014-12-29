
include("prototype_triton.js");
include("Logger.js");
include("HtmlUtils.js");
include("HttpUtils.js");


var HttpRequestProcessor_Logger = Class.create(Generic_Logger, {});
var HttpRequestProcessor_Logger_Instance = new HttpRequestProcessor_Logger($H({"LOG_LEVEL" : "info"}));


var HttpRequestProcessor = {};


HttpRequestProcessor.sendResponse = function(res, code, mesg) {
    if (!res) { return; }
    
    var chan = res.get('channel');
    if (!chan) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendResponse: channel == null XXX");
        return; 
    }
    
    try {
        if (code != -1) {
            chan.write(res.get('protocol') + " " + code + " " + HttpUtils.HttpStatus[code] + HttpUtils.CRLF);
            HttpRequestProcessor.sendHeader(res, "Server", res.get('server'));
            HttpRequestProcessor.sendHeader(res, "Date", new Date());
        } else {
            chan.write(HttpUtils.CRLF);
            chan.write(mesg + HttpUtils.CRLF);
            chan.write(HttpUtils.CRLF);
        }
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendResponse: (" + err + ") XXX");
    }
};


HttpRequestProcessor.sendResponseUsingString = function(res, str) {
    if (!res || !str) { return; }
    
    try {
        var buf = new webOS.Buffer();
        buf.write(str);
        HttpRequestProcessor.sendResponseUsingBuffer(res, buf);
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendResponseUsingString: (" + err + ") XXX");
    }
};


HttpRequestProcessor.sendResponseUsingBuffer = function(res, buf) {
    if (!res) { return; }
    var chan = res.get('channel');
    if (!chan) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendResponseUsingBuffer: channel == null XXX");
        return; 
    }  
    
    try {
        buf.position = 0;
        while (buf.position != buf.length) {
            var writeCount = chan.writeUsingBuffer(buf, buf.length-buf.position);
            HttpRequestProcessor_Logger_Instance.write("log", " ::: buffer write to channel: (" + writeCount + ") bytes :::");
            buf.position += writeCount;
        }
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendResponseUsingBuffer: (" + err + ") XXX");
    }
};


HttpRequestProcessor.sendError = function(res, code, mesg) {
    if (!res) { return; }
   
    var sanitized_str = HtmlUtils.quoteHtml(mesg);
    var error_str = "<title>Error!!!!!</title><h1>" + code + ": " + HttpUtils.HttpStatus[code] + "</h1><h2>" + sanitized_str + "</h2>";
    
    HttpRequestProcessor.sendResponse(res, 404, '');
    HttpRequestProcessor.sendHeader(res, "Content-Type", "text/html");
    HttpRequestProcessor.sendHeader(res, "Content-Length", error_str.length);
    HttpRequestProcessor.endHeaders(res);
    
    HttpRequestProcessor.sendResponse(res, -1, error_str);
    HttpRequestProcessor.done(res);
};


HttpRequestProcessor.sendHeader = function(res, key, value) {
    if (!res) { return; }
    var chan = res.get('channel');
    if (!chan) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendHeader: channel == null XXX");
        return; 
    }
    
    try {
        chan.write(key + ": " + value + HttpUtils.CRLF);
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.sendHeader: (" + err + ") XXX");   
    }
};


HttpRequestProcessor.endHeaders = function(res) {
    if (!res) { return; }
    var chan = res.get('channel');
    if (!chan) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.endHeaders: channel == null XXX");
        return; 
    }
    
    try {
        chan.write(HttpUtils.CRLF);
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.endHeaders: (" + err + ") XXX");   
    }
};


HttpRequestProcessor.done = function(res) {
    if (!res) { return; }
    var chan = res.get('channel');
    if (!chan) { 
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.done: channel == null XXX");
        return; 
    }
    
    try {
        chan.flush();
    } catch (err) {
        HttpRequestProcessor_Logger_Instance.write("error", "XXX HttpRequestProcessor.done: (" + err + ") XXX");   
    }
    
    if (chan.shutdown) chan.shutdown(true);
    if (chan.onread) chan.onread = undefined;
    chan = undefined;
    gc();
};


