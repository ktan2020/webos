
var http = require('http'),
    fs = require('fs'),
    pathlib = require('path'),
    uri = require('url'),
    sys = require('sys'),
    settings = require('./settings').default_settings,
    mime = require('./content-type'),
    log = require('./log');
    _ = require("./underscore")._;

 

var server;


/* default preprocessor - just send the file out */
var dispatch = route; 
var mount_map = {};
var rsorted_keys = {};

log.level = settings.LOG_LEVEL;


exports.mount = mount = function(path, handler) {
    if (!path || !handler) {
        log.error("XXX null path / handler params XXX"); 
        throw "mount failed! (null path / handler)";
    }
    
    mount_map[path] = handler;
    var keys = _.keys(mount_map);
    keys = _.sortBy(keys, function(n){return n;});
    rsorted_keys = keys.reverse();
}


exports.start = start = function(custom_settings, callback) {

    for (var k in custom_settings) {
        settings[k] = custom_settings[k];
    }
    
    server = http.createServer(function(req, resp) {
            
        log.debug("Request from", req.connection.remoteAddress, "for", req.url);
        log.debug(JSON.stringify(req.headers));
        
        dispatch(req, resp);
    });
    server.listen(settings.PORT);
    
    server.addListener('listening', function() {
        if (callback) callback();
    });
    server.addListener('connection', function(connection) {
        connection.setTimeout(settings.timeout_milliseconds);
        connection.addListener('timeout', function() {
            log.debug("Connection from",connection.remoteAddress,"timed out. Closing it...");
            connection.destroy();
        });
    });
    
};


exports.stop = stop = function(callback) {
    if (server) {
        if (callback) server.addListener('close', callback);
        server.close();
    }
};


function preroute(req, resp) {
    var query;
    var height = {'pre':452, 'pixi':372};
    var str;
    
    if (req.url && uri.parse(req.url, true)) {
        query = uri.parse(req.url, true).query;
        
        str = "<html>" + 
              "<head>" + 
                 "<meta http-equiv='Content-Type' content='text/html; charset=ISO-8859-1' />" +
                 "<meta http-equiv='Cache-Control' content='no-cache' />" +
                 "<meta http-equiv='Pragma' content='no-cache' />" +
                 "<meta http-equiv='Expires' content='0' />" +
                 "<link href='/usr/palm/tools/centaur-node/dep/MochiKit/logging_pane.css' rel='stylesheet' type='text/css' />" +
                 "<script type='text/javascript' src='/usr/palm/tools/centaur-node/dep/MochiKit/MochiKit.js'></script>" +
                 "<script type='text/javascript'>" + 
                    
                    // here we create the Comet object (IE's not supported!)
                    "function createXHR() {" +
                        "try { return new XMLHttpRequest(); } catch (e) { alert(e); }" +
                        "alert('Warning: XMLHttpRequest not supported in this browser! Use Safari (http://www.apple.com/safari/) ');" +
                        "return null;" +
                    "};" +
                    
                    "logDebug('(1) Creating XHR ...');" +
                    "xhr = createXHR();" +
                    "logDebug('Done!');" +
                    "if (!xhr) { throw 'XXX  Fatal Error: xhr == null  XXX'; }" +
                    
                    "comet = { xhr: xhr, sessionID: undefined, responseText: undefined, serviceBridgeManager: undefined };" +
                  
                 "</script>" +
              "</head>" + 
              "<body>" +
                 "<script type='text/javascript'>createLoggingPane(true);</script>" +
                 
                 "<script type='text/javascript'>logDebug('(2) Creating mojo_app ...');</script>" + 
                 "<iframe id='mojo_app' name='mojo_app' width='320' height='" + height[query.device] + "' noresize scrolling='no' frameborder='0'></iframe>" +
                 "<script type='text/javascript'>logDebug('Done!');</script>" + 
                 
                 "<script type='text/javascript'>logDebug('(3) Creating comet_obj ...');</script>" + 
                 // XXX width & height
                 "<iframe id='comet_obj' name='comet_obj' src='/bridge/connect/' height='0' width='0' frameborder='0'></iframe>" + 
                 "<script type='text/javascript'>logDebug('Done!');</script>" + 
                 
                 "<div><a href='javascript:void(createLoggingPane(true));'>Display Inline LoggingPane</a></div>" + 
              "</body>" + 
              "</html>";
    
        resp.writeHead(200, {'Content-Length': str.length, 'Content-Type': 'text/html'});
        resp.end(str);
    } 
}


function route(req, resp) {
    log.info("==> Router: Method=(" + req.method + "), Url=(" + req.url + ") <==");
    
    // hook as preroute step
    if (req.url.indexOf('?device=')!==-1) return preroute(req, resp);
    
    var url = uri.parse(req.url);
    //if the parsed url doesn't have a pathname, default to '/'
    var pathname = (url.pathname || '/');
    // force redirect if root path is '/'
    if (pathname === '/') {
        resp.writeHead(301, {'Location' : '/Apps'});
        resp.end('');
        return;
    }
    pathname = pathlib.normalize(pathname);
    
    
    // redirect - do what apache does 
    if (pathname.lastIndexOf('.')===-1 && pathname[pathname.length-1]!=='/') {
        resp.writeHead(301, {'Location' : pathname+'/'});
        resp.end('');
        return;
    }
    
    
    // Do the routing here ...
    var handlerKey;
    
    if (rsorted_keys) {
        for (var i=0, k; k=rsorted_keys[i]; i++) {
            // startsWith
            if (pathname.indexOf(k) === 0) {
                handlerKey = k;
                break;
            }
        }
        
        if (handlerKey) {
            var handler = mount_map[handlerKey];
            if (handler) {
                
                // invoke the handler here ...
                handler(pathname, req, resp);
                
            } else {  
                log.error("XXX mount_map has a null Handler entry! XXX");
            }
        } else {
            log.error("XXX mount_map has a null Path entry! XXX");
        }
    } else {
        log.warn("### I seem to be missing a handler for path: (" + pathname + "). Can't service request without a proper handler. Please create one. ####");   
    }
    // 
    
}




