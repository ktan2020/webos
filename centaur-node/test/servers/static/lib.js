
var http = require('http'),
    fs = require('fs'),
    pathlib = require('path'),
    uri = require('url'),
    sys = require('sys'),
    mime = require('./content-type'),
    log = require('./log');
    _ = require("./underscore")._;

    
exports.default_settings = {
    "PORT"              : process.env['PORT'] || 8080, 
    "DOC_ROOT"          : process.env['DOC_ROOT'] || process.cwd(),
    "LOG_LEVEL"         : log.levels.DEBUG,
    "DIRECTORY_INDEX"   : "index.html",
};
exports.log_levels = log.levels;

var settings;
var server;


/* default preprocessor - just send the file out */
var dispatch = route; 

exports.start = function(custom_settings, callback) {
    settings = custom_settings || {};
    settings.__proto__ = exports.default_settings;
    

    log.level = settings.LOG_LEVEL;
    log.info( "Starting server on port", settings.PORT, " root", settings.DOC_ROOT);
    
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

exports.stop = function(callback) {
    if (server) {
        if (callback) server.addListener('close', callback);
        server.close();
    }
};


function route(req, resp) {
    var url = uri.parse(req.url);
    //if the parsed url doesn't have a pathname, default to '/'
    var pathname = (url.pathname || '/');
    
    // redirect
    if (pathname.lastIndexOf('.')===-1 && pathname[pathname.length-1]!=='/') {
        resp.writeHead(301, {'Location' : pathname+'/'});
        resp.end('');
        return;
    }
    
    var path = pathlib.join(settings.DOC_ROOT, pathlib.normalize(pathname));
    
    serve_static_file(path, req, resp);
}

function serve_static_file(path, req, resp) {
    function send_headers(httpstatus, length, content_type, modified_time) {
        var headers = {
            "Server"        : "centaur - Node.js/" + process.version,
            "Date"          : (new Date()).toUTCString(),
            "Cache-Control" : "no-cache, must-revalidate",
        };
        if (length) {
            headers["Content-Length"] = length;
        }
        if (content_type) {
            headers["Content-Type"] = content_type || "application/octet-stream";
        }
        if (modified_time) { 
            headers["Last-Modified"] = modified_time.toUTCString(); 
        }
        resp.writeHead(httpstatus, headers);
        
        log.info("REQ: " + req.connection.remoteAddress, req.method, path, httpstatus, length);
    }

    fs.stat(path, function (err, stats) {
        if (err) {
            // ENOENT is normal on 'file not found'
            if (err.errno != process.ENOENT) { 
                // any other error is abnormal - log it
                log.error("XXX fs.stat(",path,") failed: ", err, " XXX");
            }
            return file_not_found();
        }
        if (stats.isDirectory()) {
            pathlib.exists(pathlib.join(path, settings['DIRECTORY_INDEX']), function(exists) {
                    if (exists) return serve_static_file(pathlib.join(path, settings['DIRECTORY_INDEX']), req, resp);
                    else return get_dir_listing(path, req, resp);
            });
            
            return;
        }
        
        if (!stats.isFile()) {
            return file_not_found();
        } else {
            var if_modified_since = req.headers['if-modified-since'];
            if (if_modified_since) {
                var req_date = new Date(if_modified_since);
                if (stats.mtime <= req_date && req_date <= Date.now()) {
                    return not_modified();
                }
                else stream_file(path, stats);
            } else if (req.method == 'HEAD') {
                send_headers(200, stats.size, mime.mime_type(path), stats.mtime);
                resp.end('');
            } else {
                return stream_file(path, stats);
            }
        }
    });

    function stream_file(file, stats) {
        try {
            var readStream = fs.createReadStream(file);
        } 
        catch (err) {
            log.debug("fs.createReadStream(",file,") error: ",sys.inspect(err,true));
            return file_not_found();
        }

        send_headers(200, stats.size, mime.mime_type(file), stats.mtime);
        sys.pump(readStream, resp, function() {
            log.debug('pumped',file);
        });

        req.connection.addListener('timeout', function() {
            /* dont destroy it when the fd's already closed */
            if (readStream.readable) {
                log.debug('timed out. destroying file read stream');
                readStream.destroy();
            }
        });

        readStream.addListener('fd', function(fd) {
            log.debug("opened",path,"on fd",fd);
        });

        readStream.addListener('error', function (err) {
            log.error('error reading',file,sys.inspect(err));
            resp.end('');
        });
        resp.addListener('error', function (err) {
            log.error('error writing',file,sys.inspect(err));
            readStream.destroy();
        });
    }
    
    function get_dir_listing(path, req, resp) {
        var url = uri.parse(req.url).pathname;
        var str = "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\">" +
                  "<html><title>Directory listing for " + url + "</title>" +
                  "<style type='text/css'>.sp {font-size:0.8em;color:#777;padding-left:0.5%;text-align:left;}</style>" +
                  "<body><h2>Directory listing for " + url + "</h2>" +
                  "<hr><ul>";
        var start = (new Date()).getMilliseconds();
        var ls = fs.readdir(path, function(err, files) {
            if (err) throw err;
          
            var end = (new Date()).getMilliseconds();
          
            if (files && files.length) {
                _.each(files, function(file) {
                    str += "<li><a href='" + pathlib.join(url, file) + "'>" + file + "</a></li>";
                });
            }
            str += "</ul><hr></body><div class='sp'>" + new Date() + "</div><div class='sp'>Powered by nodejs. Generated in: " + (end-start) + " ms.</div></html>";
          
            resp.writeHead(200, {'Content-Type':'text/html', 'Content-Length':str.length});
            resp.end(str);
        });
    }

    function not_modified() {
        // no need to send content length or type
        log.debug("304 for resource ", path);
        send_headers(304);
        resp.end('');
    }

    function file_not_found() {
        log.debug("404 opening path: '"+path+"'");
        var body = "404: " + req.url + " not found.\n";
        send_headers(404,body.length,"text/plain");
        if (req.method != 'HEAD') {
            resp.end(body, 'utf-8');
        } else {
            resp.end('');
        }
    }

    function server_error(message) {
        log.error(message);
        send_headers(500, message.length, "text/plain");
        if (req.method !== 'HEAD') {
            resp.end(message,'utf-8');
        }
    }
}

function close(fd) {
    fs.close(fd);
    log.debug("closed fd",fd);
}
