
include("prototype_triton.js");
include("GenericServer.js");
include("Logger.js");
include("HttpUtils.js");
include("HttpRequestProcessor.js");


var HttpServer_Logger = Class.create(Generic_Logger, {});
var HttpServer_Logger_Instance = new HttpServer_Logger($H({"LOG_LEVEL" : "info"}));


/**
 * Http Server Config
 */
var HttpServerConfig = {
    PROTOCOL        : 'HTTP/1.0',
    SERVER          : 'WebOS_Tri-Brick',
    DOCUMENT_ROOT   : '.',
    PORT            : 8080,
    DIRECTORY_INDEX : 'index.html',
    BUFSIZE         : 1024,
    SOCK_FAMILY     : 'webOS.Socket.PF_INET',
    SOCK_TYPE       : 'webOS.Socket.SOCK_STREAM',
    SOCK_OPT        : 'webOS.Socket.SO_REUSEADDR',
};


/**
 * Default mimetypes supported by this HttpServer
 */
var MIMETYPES = {
    '{}'    : 'application/octet-stream',
    
    'txt'  : 'text/plain',
    'htm'  : 'text/html',
    'html' : 'text/html',
    
    'css'  : 'text/css',
    
    'js'   : 'text/javascript',
    'json' : 'application/json', 
    
    'bmp'  : 'image/bmp',
    'gif'  : 'image/gif',
    'jpg'  : 'image/jpeg',
    'jpeg' : 'image/jpeg',
    'pbm'  : 'image/x-portable-bitmap',
    'pgm'  : 'image/x-portable-greymap',
    'pnm'  : 'image/x-portable-anymap',
    'ppm'  : 'image/x-portable-pixmap',
    'png'  : 'image/png',
    'tif'  : 'image/tiff',
    'tiff' : 'image/tiff',
    'xbm'  : 'image/x-xbitmap', 
    'xpm'  : 'image/x-xpixmap',
};


/**
 * WebOS Triton-based Http server
 */
var HttpServer = Class.create(GenericServer, {
        
        /**
         * initialize - Constructor
         */
        initialize: function($super, config) {
            HttpServer_Logger_Instance.write("log", "<<< HttpServer - initialize() >>>");
            
            $super(config);
            
            this.mount_map = $H({});
            this.rsorted_keys = null;
            
            this.protocol = (config && config.get('PROTOCOL')) || HttpServerConfig.PROTOCOL;
            this.server = (config && config.get('SERVER')) || HttpServerConfig.SERVER;
            this.document_root = (config && config.get('DOCUMENT_ROOT')) || HttpServerConfig.DOCUMENT_ROOT;
            this.directory_index = (config && config.get('DIRECTORY_INDEX')) || HttpServerConfig.DIRECTORY_INDEX;
            this.bufsize = (config && config.get('BUFSIZE')) || HttpServerConfig.BUFSIZE;
            
            HttpServer_Logger_Instance.write("log", "*** mount_map: (" + this.mount_map.inspect() +"), protocol: (" + this.protocol + "), server: (" + this.server + "), document_root: (" + this.document_root + "), directory_index: (" + this.directory_index + "), bufsize: (" + this.bufsize + ") ***");
            
            HttpServer_Logger_Instance.write("log", ">>> HttpServer - initialize() <<<");
        },
        
        
        /**
         * start - Starts Server
         */
        start: function($super) {
            HttpServer_Logger_Instance.write("log", "<<< HttpServer - start() >>>");
            
            // Attach http protocol handler to GenericServer. This will be called by backEndDispatcher.
            this.handler = this._httpHandler.bind(this);
            
            $super();
            
            HttpServer_Logger_Instance.write("log", ">>> HttpServer - start() <<<");
        },
        
        
        /**
         * _httpHandler - private
         *
         * This method dispatches Request to different Handlers depending on dir path
         */
        _httpHandler: function(channel) {
            if (!channel) {
                throw new ServerError("HttpServer Error: (Client socket channel == null)");
            }
            
            var req = channel.read(this.bufsize);
            
            // test to see if remote client close their end of the socket connection
            if (!req) {
                   HttpServer_Logger_Instance.write("log", "!!! Remote side closed client connection! !!!");
                   
                   if (this._onClientDisconnect) { this._onClientDisconnect(); }
                   
                   channel.shutdown(true);
                   channel.onread = undefined;
                   channel = undefined;
                   return;
            }
            
            HttpServer_Logger_Instance.write("log", "_httpHandler ====> REQ: " + Object.toJSON(req) + " <====");
            
            // strip out all CRLF
            var headers = req.split(HttpUtils.CRLF);
            headers = headers.findAll(function(a) { return a!==''; });
            
            // convert array of headers to hash of headers (key'ed by Header Fields). This hash will be used to create a HttpRequest Object.
            var HttpRequest = $H({});
            var HttpResponse = $H({});
            
            // attach socket channel to each HttpResponse so each response will be responsible for writing back to socket channel 
            HttpResponse.set('channel', channel);
            HttpResponse.set('wfile', new webOS.Buffer());
            HttpResponse.set('bytesRead', 0);
            HttpResponse.set('rfile', null);
            HttpResponse.set('protocol', this.protocol);
            HttpResponse.set('server', this.server);
            headers.each(function(a) { var f = a.match(/^(.*?):(.*)/); if (!f && a.split(" ")[0]=="GET") { HttpRequest.set("Request-Line", a); } else { HttpRequest.set(f[1],f[2]); }; });     
            HttpServer_Logger_Instance.write("log", "Hash[HttpRequest]" + HttpRequest.inspect());
            
            // check to make sure we're dealing with HTTP protocol
            if (HttpRequest.get('Request-Line').split(' ')[2].substring(0, 4) != "HTTP") {
                HttpRequestProcessor.sendError(HttpResponse, 400, "Unsupported protocol.");
                return;
            }
            
            var uri = headers[0].split(' ')[1];
            var query = uri.toQueryParams();
            
            // query found
            if (uri.indexOf('?') != -1) {
                uri = uri.split('?')[0];
            }
            
            HttpResponse.set('uri', uri);
            HttpResponse.set('query', query);
            HttpServer_Logger_Instance.write("log", "Hash[HttpResponse]" + HttpResponse.inspect());
            
            // redirect browser - do what Apache does
            if (uri.lastIndexOf('.')===-1 && !uri.endsWith('/')) {
                HttpRequestProcessor.sendResponse(HttpResponse, 301);
                HttpRequestProcessor.sendHeader(HttpResponse, "Location", uri+'/');
                HttpRequestProcessor.endHeaders(HttpResponse);
                HttpRequestProcessor.sendResponse(HttpResponse, -1, '');
                HttpRequestProcessor.done(HttpResponse);
                return;
            }
            
            // search for the appropriate handler to service this request using the pre-sorted keys array ...
            var handlerKey;
            if (this.rsorted_keys) {
                for (var i=0, k; k=this.rsorted_keys[i]; i++) {
                    if (uri.startsWith(this.rsorted_keys[i])) {
                        handlerKey = this.rsorted_keys[i];
                        break;
                    }
                }
                
                if (handlerKey) {
                    var handler = this.mount_map.get(handlerKey);
                    if (handler) {
                        // invoke the handler method with req, res objects 
                        handler.service(HttpRequest, HttpResponse);
                    } else {
                        HttpServer_Logger_Instance.write("error", "XXX HttpServer._httpHandler: Anomaly detected! mount_map has a null Handler entry. XXX");
                    }
                } else {
                    HttpServer_Logger_Instance.write("error","XXX HttpServer._httpHandler: Anomaly detected! mount_map has a null Path entry. XXX");
                }
            } else {
                HttpServer_Logger_Instance.write("warn", " #### I seem to be missing a handler for path: (" + uri + "). Can't service request without a proper handler. Please create one. ####");
                HttpRequestProcessor.sendError(HttpResponse, 403, "No appropriate handler(s) found.");
            }
            
        },
        
        
        /**
         * setClientDisconnect - Callback when client drops it's side of the connection
         */
        setClientDisconnect: function(handler) {
            this._onClientDisconnect = handler;
        },
        
        
        /**
         * mount - Attach different handler for dir path
         */
        mount: function(dir, handler, options) {
            HttpServer_Logger_Instance.write("log", "<<< HttpServer - mount() >>>");
            
            if (!dir || !handler) {
                throw new ServerError("HttpServer Error: dir" + (!dir?"==null":"!=null") + ", handler" + (!handler?"==null":"!=null"));
            }
            
            // ensure handler is of type AbstractServlet
            if (handler._type_ != HttpServlet.AbstractServlet.prototype._type_) {
                HttpServer_Logger_Instance.write("error", " XXX Handler type error: (handler must be subclass of HttpServlet.AbstractServlet) XXX");
                return;   
            }
            
            HttpServer_Logger_Instance.write("log", " *** dir: (" + dir + "), handler: (" + Object.toJSON(handler) + "), options: (" + Object.toJSON(options) + " ***");
            
            // introspect HttpServer properties and set them back for the requesting handler. non-existent properties set to null.
            if (options) {
                var optionsMap = $H({});
                for (var i=0, option; option=options[i]; i++) {
                    optionsMap.set(options[i], eval("this." + options[i].toLowerCase()));
                }
                handler.setOptions(optionsMap);
            }
            
            // mount table is keyed by dir. Overwrite if a new key (dir) is provided.
            this.mount_map.set(dir, handler);
            // keep a reverse sorted array of keys for fast searching (only do this each time a new path is mounted)
            this.rsorted_keys = this.mount_map.keys().sort().reverse();
            
            HttpServer_Logger_Instance.write("log", " @@@@ mount_map: (" + this.mount_map.inspect() + ") @@@@");

            HttpServer_Logger_Instance.write("log", ">>> HttpServer - mount() <<<");
        },
        
        
        /**
         * unmount - Detach handler associated with dir path
         */
        unmount: function(dir) {
            HttpServer_Logger_Instance.write("log", "<<< HttpServer - unmount() >>>");
            
            if (dir) {
                this.mount_map.unset(dir);
            }
            
            HttpServer_Logger_Instance.write("log", ">>> HttpServer - unmount() <<<");
        },
        
});



