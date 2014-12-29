
include("prototype_triton.js");
include("Logger.js");
include("HttpServlet.js");
include("HttpRequestProcessor.js");


var FileHandler_Logger = Class.create(Generic_Logger, {});
var FileHandler_Logger_Instance = new FileHandler_Logger($H({"LOG_LEVEL" : "info"}));


/**
 * FileHandler Config
 */
var FileHandlerConfig = {
    BUFSIZE         : 256*1024,
    CHAN_OPT        : 'webOS.IOChannel.FLAG_NONBLOCK',
};


/**
 * FileHandler 
 */
var FileHandler = Class.create(HttpServlet.AbstractServlet, {
        
        /**
         * initialize - Constructor
         */
        initialize: function(config) {
            FileHandler_Logger_Instance.write("log", "<<< FileHandler - initialize() >>>");
                        
            this.chan_opt = (config && config.get('CHAN_OPT')) || FileHandlerConfig.CHAN_OPT;
            
            this.normalized_doc_root = null;
            this.readHandler = null;
            
            this.bufsize = (config && config.get('BUFSIZE')) || FileHandlerConfig.BUFSIZE;
            
            FileHandler_Logger_Instance.write("log", "*** chan_opt: (" + this.chan_opt + "), bufsize: (" + this.bufsize + ") ***");
            
            FileHandler_Logger_Instance.write("log", ">>> FileHandler - initialize() <<<");
        },
        
        
        /**
         * _onRead - private
         */
        _onRead: function(req, res) {
            if (!req || !res) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._onRead - req: (" + Object.toJSON(req) + "), res: (" + Object.toJSON(res) + ") XXX");
                return;   
            }
            
            try {
                var readBuffer = new webOS.Buffer();
                readBuffer.position = 0;
     
                var rfile = res.get('rfile');
                var ret = rfile.readUsingBuffer(readBuffer, this.bufsize);
                var bytesRead = res.get('bytesRead');
                bytesRead += ret; 
                res.set('bytesRead', bytesRead);
                 
                FileHandler_Logger_Instance.write("log", " ... read: (" + ret + ") byte ...");
                 
                // slurp in buffer content and append to write buffer
                readBuffer.position = 0;
                var wfile = res.get('wfile');
                readBuffer.copyTo(wfile, ret);
                res.set('wfile', wfile);
                 
                if (ret === 0) {
                    rfile.shutdown(true);
                    rfile.onread = undefined;
                    this._onReadDone(req, res);
                }
            } catch (err) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._onRead: (" + err + ") trying to process: (" + Object.toJSON(res) + ") XXX");   
            }
        },
        
        
        /**
         * _onReadDone - private
         */
        _onReadDone: function(req, res) {
            if (!req || !res) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._onReadDone - req: (" + Object.toJSON(req) + "), res: (" + Object.toJSON(res) + ") XXX");
                return;   
            }
            
            var uri = res.get('uri'), bytesRead = res.get('bytesRead'), wfile = res.get('wfile');
            FileHandler_Logger_Instance.write("log", " +++ uri: (" + uri + "), bytesRead: (" + bytesRead + "), wfile.length: (" + wfile.length + ") +++");
           
            try {
                if (wfile) {
                    // return file by Http
                    HttpRequestProcessor.sendResponse(res, 200, null);
                    HttpRequestProcessor.sendHeader(res, "Content-Type", (uri.lastIndexOf('.')!==-1 && HttpUtils.DefaultMimeTypes[uri.substring(uri.lastIndexOf('.')+1,uri.length)] ? HttpUtils.DefaultMimeTypes[uri.substring(uri.lastIndexOf('.')+1,uri.length)] : ""));
                    HttpRequestProcessor.sendHeader(res, "Content-Length", bytesRead);
                    HttpRequestProcessor.endBlock(res);
                    HttpRequestProcessor.flushBuffer(res, res.get('headers'), res.get('wfile'));
                }
            } catch (err) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._onReadDone: (" + err + ") trying to process: (" + Object.toJSON(res) + ") XXX"); 
            }            
        },
         
        
        /**
         * doGET - GET handler
         */
        doGET: function(req, res) {
            FileHandler_Logger_Instance.write("log", "<<< FileHandler - doGET() >>>");
            
            var uri = res.get('uri');
            var query = res.get('query');

            //TODO: Refactor me?
            // we handle differently here based on query (possible options are: {'device':'pre'} and {'device':'pixi'})
            //
            // Page layout served by this handler is as follows:
            //
            //             ------------------------------------------
            //             |
            //          ------------------------------------------
            //          |
            //          |            window.parent.comet
            //          |      [ xhr, sessionID, responseText, serviceBridgeManager ]
            //          |
            //          |
            //          |            iframe - comet_obj
            //          |      ================================
            //          |      =   /bridge/connect/           =
            //          |      ================================
            //          |
            //          |            iframe - mojo_app
            //          |      ================================
            //          |      =   mojo app lives here        =
            //          |      ================================
            //
            // Note:
            // -----
            //
            // * Long polling / comet object is accessed via window.parent.comet
            //   We store XMLHttpRequest object, unique session id, service response text,
            //   and service bridge manager with stored callbacks here.
            // * comet_obj iframe redirects to /bridge/connect which redirects to an Ajax GET to
            //   /bridge/listen?sessionID={some_session_id_generated_by_servlet}.
            //   This /bridge/listen/ channel will then be perpetually called to create a long-polling
            //   cycle that mimics a server push. All return callbacks to Mojo app will be effected via 
            //   the listen channel.
            // * Mojo app is restricted to mojo_app iframe. The iframe size will be customized for Pre or 
            //   Pixi resolution.
            // * /bridge/disconnect/ channel will be caused by browser window or browser tab close.
            //   Browser-initiated socket connection close (by pressing Esc) will remove old session callback and 
            //   create a new callback in PalmServiceHandler session_map hash table. Servlet does not remove
            //   client sessions due to app initiated subscriptions. Removal has to be explicit via the 
            //   disconnect channel.
            //
            if (query) {
                if (uri && uri.length>0 && uri[uri.length-1]==='/' && query.device) {
                    var height = {'pre':452, 'pixi':372};
                    var iframe = "<html>" + 
                                     "<head>" + 
                                         "<meta http-equiv='Content-Type' content='text/html; charset=ISO-8859-1' />" +
                                         "<meta http-equiv='pragma' content='no-cache' />" +
                                         "<meta http-equiv='expires' content='-1' />" +
                                         "<script type='text/javascript'>" + 
                                         
                                            // here we create the Comet object (IE's not supported!)
                                            "function createXHR() {" +
                                                "try { return new XMLHttpRequest(); } catch (e) { alert(e); }" +
                                                "alert('Warning: XMLHttpRequest not supported in this browser! Use Safari (http://www.apple.com/safari/) ');" +
                                                "return null;" +
                                            "};" +
                                            "xhr = createXHR();" +
                                            "if (!xhr) { throw 'XXX  Fatal Error: xhr == null  XXX'; }" +
                                            "comet = { xhr: xhr, sessionID: undefined, responseText: undefined, serviceBridgeManager: undefined };" +
                                         
                                         "</script>" +
                                     "</head>" + 
                                     "<body> " +
                                         "<iframe id='comet_obj' name='comet_obj' src='/bridge/connect/' height='0' width='0' frameborder='0'></iframe>" +
                                         "<iframe id='mojo_app' name='mojo_app' width='320' height='" + height[query.device] + "' noresize scrolling='no' frameborder='0'></iframe>" +
                                     "</body>" + 
                                 "</html>";
                    
                    HttpRequestProcessor.sendResponse(res, 200, null);
                    HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['html']);
                    HttpRequestProcessor.sendHeader(res, "Content-Length", iframe.length);
                    //HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache, must-revalidate");
                    HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                    HttpRequestProcessor.endBlock(res);
                    HttpRequestProcessor.sendResponse(res, -1, iframe);
                    HttpRequestProcessor.endBlock(res);
                    HttpRequestProcessor.flushBuffer(res);
                    return;
                }
            }
            
            this.normalized_doc_root = (!this.normalized_doc_root) ? this._normalizePath(this.options.get('DOCUMENT_ROOT')) : this.normalized_doc_root;
            
            var path = unescape(this._translatePath(this.normalized_doc_root, uri));
            var inputfile;
            
            //FileHandler_Logger_Instance.write("log", "path: " + path);
            
            if (this._isPathDir(path)) { 
                var indexfile = ((path && path.length>0 && path[path.length-1]==='/') ? path + this.options.get('DIRECTORY_INDEX') : path);
                
                if (this._doesFileExist(indexfile)) {
                    inputfile = indexfile;
                } else {
                    this.listDirectory(req, res);
                    return;
                }
            } else {
                if (path.endsWith('/')) {
                    if (this._doesFileExist(path.substring(0, path.length-1))) {
                        path = path.substring(0, path.length-1);
                    }
                }
            }
            
            if (!inputfile) {
                inputfile = path;
            }
            
            FileHandler_Logger_Instance.write("log", " *** inputfile: (" + inputfile + ") ***");
            
            var rfile;
            try {
                rfile = new webOS.IOChannel.Channel(inputfile, "r");
            } catch (err) {
                FileHandler_Logger_Instance.write("error", " #### 404 - req: (" + req.get('Request-Line') + ")" + ", [" + uri + "] does not exist! (" + err + ") ####");
                HttpRequestProcessor.sendError(res, 404, "File: (" + uri + ") does not exist!");
            }
            
            if (rfile) {
                res.set('rfile', rfile);
                
                if (this.chan_opt == 'webOS.IOChannel.FLAG_NONBLOCK') {
                    rfile.flags |= eval(this.chan_opt);
                    
                    rfile.onread = this._onRead.curry(req, res).bind(this);
                } else {
                    this._onRead(req, res);
                }
            }
            
            FileHandler_Logger_Instance.write("log", ">>> FileHandler - doGET() <<<");
        },
        
        
        /**
         * listDirectory - 
         */
        listDirectory: function(req, res) {
            FileHandler_Logger_Instance.write("log", "<<< FileHandler - listDirectory() >>>");
             
            if (!req || !res) {
               FileHandler_Logger_Instance.write("error", "XXX FileHandler.listDirectory - req: (" + req + "), res: (" + res + ") XXX");
               return;   
            }
             
            var uri = res.get('uri');
            
            if (uri) {
                var start = (new Date()).getMilliseconds();
                var files = this._getDirListing(this._translatePath(this.normalized_doc_root, uri));
                var end = (new Date()).getMilliseconds();
                
                var str = "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\">" +
                          "<html><title>Directory listing for " + uri + "</title>" +
                          "<style type='text/css'>.sp {font-size:0.8em;color:#777;padding-left:0.5%;text-align:left;}</style>" +
                          "<body><h2>Directory listing for " + uri + "</h2>" +
                          "<hr><ul>";
                        
                if (files && files.length) {          
                    files.each(function(file) { if (file.isdir) { file.name=file.name+'/'; }; str += "<li><a href='" + (uri+file.name) + "'>" + file.name + "</a></li>"; });
                } 
                
                str += "</ul><hr></body><div class='sp'>" + new Date() + "</div><div class='sp'>Powered by webOS (centaur). Generated in: " + (end-start) + " ms.</div></html>";
         
                HttpRequestProcessor.sendResponse(res, 200, null);
                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['html']);
                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                HttpRequestProcessor.endBlock(res);
                HttpRequestProcessor.sendResponse(res, -1, str);
                HttpRequestProcessor.endBlock(res);
                HttpRequestProcessor.flushBuffer(res);
            }
            
            FileHandler_Logger_Instance.write("log", ">>> FileHandler - listDirectory() <<<");
        },
        
        
        /**
         * _fileSize - private
         * 
         * Retrieve file size in bytes
         */
        _fileSize: function(url) {
            if (url) {
                return new webOS.FTS(url, webOS.FTS.FTS_DEFAULT).read().stat.size;
            }
            return undefined;
        },
        
        
        /**
         * _normalizePath - private
         *
         * Normalize relative path into absolute
         */
        _normalizePath: function(path) {
            if (!path || (path.match(/~/g)&&!path.startsWith('~')) || (path.match(/~/g)&&path.match(/~/g).length>1) || (path.match(/\.\./g)&&!path.startsWith('..')) || (path.match(/\.\./g)&&path.match(/\.\./g).length>1) || (path.match(/\./g)&&!path.startsWith('.')) || (path.match(/\./g)&&path.match(/\./g).length>1)) {
                throw "!!! FileHandler._normalizePath: Abnormal path: " + path + " !!!";   
            }
            
            if (path.startsWith('..')) {
                path = path.replace(/\.\./, getenv('PWD'));
            } else if (path.startsWith('.')) {
                path = path.replace(/\./, getenv('PWD'));
            } else if (path.startsWith('~')) {
                path = path.replace(/~/, getenv('HOME'));
            }
            
            return path;
        },
        
        
        /**
         * _translatePath - private
         *
         * remove the extra '/' so we don't end up with '//' in the url string
         */
        _translatePath: function(root, path) {
            return (root&&root.endsWith('/') ? root.substring(0,root.length-1) : root) + path;
        },
         
        
        /**
         * _parent - private
         *
         * path must be normalized 
         */
        _parent: function(path) {
            if (!path) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._parent path == null! XXX");
                return undefined;
            }
            
            if (path === '/') { return '/'; }
            
            var parent = '';
            var p = path.split('/');
            if (!p) return '/';
            
            p = p.findAll(function(i){return i!=='';});
            p.pop();
            p.each(function(i){parent+='/'+i});
            
            return parent===''?'/':parent+'/';
        },
        
        
        /**
         * _isPathDir - private
         *
         */
        _isPathDir: function(path) {
            var fts = new webOS.FTS(path, webOS.FTS.FTS_LOGICAL | webOS.FTS.FTS_NOSTAT);
            var f = fts.read();
            return (f.directory && f.errno===0)
        },
        
        
        /**
         * __isPathDir - private (deprecated)
         *
         * This helper function does not care if path ends with or without /.
         * It will still process path by looking for parent dir and then searching
         * for the child from parent's listing.
         */
        __isPathDir: function(path) {
            if (!path) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._isPathDir path == null! XXX");
                return false;
            }
            
            if (path === '/') { return true; }
            
            var parent = this._parent(path);
            
            var found = false;
            var files = this._getDirListing(parent);
            
            if (files && files.length) {
                //files.each(function(f){ if (f.path.startsWith(path)) found=f.isdir; });
                for (var i=0, f; f=files[i]; i++) {
                    if (f.path.startsWith(path)) { found=f.isdir; break; } 
                }
            }
            return found;
        },
        
        
        /**
         * _doesFileExist - private
         *
         */
        _doesFileExist: function(file) {
            var fts = new webOS.FTS(file, webOS.FTS.FTS_LOGICAL | webOS.FTS.FTS_NOSTAT);
            var f = fts.read();
            return (f.errno===0);
        },
        
        
        /**
         * __doesFileExist - private (deprecated)
         *
         * This helper will short return if file ends with '/' for obvious reasons.
         * dir != file
         */
        __doesFileExist: function(file) {
            // Special case we don't even bother doing anything if file ends with /
            if (file.charAt(file.length-1)==='/') return false;
            
            var parent = this._parent(file);
            
            var found = false;
            var files = this._getDirListing(parent);
            
            if (files && files.length) {
                //files.each(function(f){ if (f.path === file) found=true; });
                for (var i=0, f; f=files[i]; i++) {
                    if (!f.isdir && f.path===file) { found=true; break; }
                }
            }
                
            return found;
        },
        
        
        /**
         * _getDirListing - private
         *
         * retrieves directory listing as an array
         */
        _getDirListing: function(path) {
            //console.log("_getDirListing: path - " + path);
            if (!path) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._getDirListing path == null! XXX");
                return undefined;   
            }
            
            var files = [];
            
            try {
                var fts = new webOS.FTS(path, webOS.FTS.FTS_LOGICAL | webOS.FTS.FTS_NOSTAT);
                if (!fts.read()) { 
                    FileHandler_Logger_Instance.write("error", "XXX FileHandler._getDirListing: fts.read() - directory (" + path + ") not found! XXX");
                    return undefined;
                }
                
                while (true) {
                    var file = fts.read();
                    
                    if (!file) {
                        break;
                    }
                    
                    if (file.directory) {
                        fts.set(webOS.FTS.FTS_SKIP);
                    }
                    
                    if (!file.postorderDirectory) {
                        if (file.directory) {
                            file.path += '/';
                        }
                        files.push({name:file.name, path:file.path, isdir:file.directory});
                    }
                }
            } catch (err) {
                FileHandler_Logger_Instance.write("error", "XXX FileHandler._getDirListing threw an Exception: (" + err + "), path: (" + path + ") XXX");
                return undefined;
            }
            
            files.each(function(file){ file.path=file.path.replace(/\/\//g, '\/'); });
            
            //FileHandler_Logger_Instance.write("log", " *** FileHandler._getDirListing: " + Object.toJSON(files) + " ***");
            return files;
        },
        
});



