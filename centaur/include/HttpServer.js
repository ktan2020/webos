
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
    SERVER          : 'WebOS_Centaur',
    DOCUMENT_ROOT   : '.',
    PORT            : 8080,
    DIRECTORY_INDEX : 'index.html',
    BUFSIZE         : 1024*10,
    SOCK_FAMILY     : 'webOS.Socket.PF_INET',
    SOCK_TYPE       : 'webOS.Socket.SOCK_STREAM',
    SOCK_OPT        : 'webOS.Socket.SO_REUSEADDR',
    THROTTLE_READ   : 175, /* in ms */
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
            this.throttle_read = (config && config.get('THROTTLE_READ')) || HttpServerConfig.THROTTLE_READ;
            
            // rewrite rules table (undefined by default)
            this.rewrite = undefined;
            
            HttpServer_Logger_Instance.write("log", "*** mount_map: (" + this.mount_map.inspect() +"), protocol: (" + this.protocol + "), server: (" + this.server + "), document_root: (" + this.document_root + "), directory_index: (" + this.directory_index + "), bufsize: (" + this.bufsize + ") ***");
            
            HttpServer_Logger_Instance.write("log", ">>> HttpServer - initialize() <<<");
        },
        
        
        /**
         * start - Starts Server
         */
        start: function($super) {
            HttpServer_Logger_Instance.write("log", "<<< HttpServer - start() >>>");
            
            // Attach http protocol handler to GenericServer. This will be called by backEndDispatcher.
            //this.handler = this._throttle1_.bind(this);
            this.handler = this._httpHandler.bind(this);
            
            $super();
            
            HttpServer_Logger_Instance.write("log", ">>> HttpServer - start() <<<");
        },
        
        
        /**
         * _throttle_ - private (experimental)
         *
         * To throttle incoming socket read requests (to prevent server DoS)
         */
        __timeout_id__: undefined,
        _throttle_: function(socket, channel) {
            channel.onread = undefined;
            
            if (this.__timeout_id__) {
                clearTimeout(this.__timeout_id__);
                this.__timeout_id__ = undefined;
                channel.onread = this._throttle_.curry(socket, channel).bind(this);
            } else {
                this.__timeout_id__ = setTimeout(this._httpHandler.curry(socket, channel).bind(this), this.throttle_read);
            }
        },
        
        __callstack__: [],
        _throttle1_: function(socket, channel) {
            channel.onread = undefined;
            this.handler = undefined;
            
            if (!socket || !channel) { return; }
            
            this.__callstack__.push((function(){ this._httpHandler.curry(socket, channel).bind(this).call(this); }).bind(this));  
            
            if (this.__callstack__.length) {
                var f = this.__callstack__.shift();
                //f();
                if (f) {
                    f.delay(this.throttle_read / 1000.0);
                }
            }
            
            this.handler = this._throttle1_.bind(this);
        },
        
        
        /**
         * _httpHandler - private
         *
         * This method dispatches Request to different Handlers depending on dir path
         */
        _httpHandler: function(socket, channel) {
            if (!channel) {
                throw new ServerError("HttpServer Error: (Client socket channel == null)");
            }
            
            channel.onread = undefined; 
            
            if (channel.flags & webOS.IOChannel.FLAG_IS_READABLE) {
                var req;
                
                try {
                    req = channel.read(this.bufsize);
                } catch (err) {
                    HttpServer_Logger_Instance.write("warn","! HttpServer._httpHandler channel.read threw: (" + err + "), client side closed socket prematurely !");
                    channel.onread = channel.onwrite = undefined;
                    return;
                }
                                    
                // test to see if remote client close their end of the socket connection
                if (!req) {
                    HttpServer_Logger_Instance.write("log", "!!! Remote side closed client connection! !!!");
                       
                    if (this._onClientDisconnect) { this._onClientDisconnect(); }
                       
                    try {
                        channel.shutdown(true);
                    } catch (err) {
                        HttpServer_Logger_Instance.write("warn", "! HttpServer._httpHandler channel.shutdown threw: (" + err + "), client side closed socket prematurely !");
                    }
                    
                    channel.onread = channel.onwrite = undefined;
                    return;
                }                 
                
                HttpServer_Logger_Instance.write("log", "_httpHandler ====> REQ: " + Object.toJSON(req) + " <===="); // XXX
                
                // strip out all CRLF
                var headers = req.split(HttpUtils.CRLF);
                headers = headers.findAll(function(a) { return a!==''; });
                
                HttpServer_Logger_Instance.write("log", "_httpHandler ====> headers: " + Object.toJSON(headers) + " <====");
                if (!headers || headers.length===0) { 
                    HttpServer_Logger_Instance.write("warn", "! Strange request headers from browser: (" + Object.toJSON(headers) + ") !");
                    HttpRequestProcessor.sendError(HttpResponse, 400, "Bad request.");
                    return;
                }
                
                // convert array of headers to hash of headers (key'ed by Header Fields). This hash will be used to create a HttpRequest Object.
                var HttpRequest = $H({});
                var HttpResponse = $H({});
                
                // attach socket channel to each HttpResponse so each response will be responsible for writing back to socket channel 
                HttpResponse.set('socket', socket);
                HttpResponse.set('channel', channel);
                HttpResponse.set('headers', new webOS.Buffer());
                HttpResponse.set('wfile', new webOS.Buffer());
                HttpResponse.set('bytesRead', 0);
                HttpResponse.set('rfile', null);
                HttpResponse.set('protocol', this.protocol);
                HttpResponse.set('server', this.server);
                
                if (headers[0].charAt(0)==='G') { 
                    // GET 
                    headers.each(function(a) { if (a) { var f = a.match(/^(.*?): (.*)/); if (!f) { HttpRequest.set("Request-Line", a); } else { HttpRequest.set(f[1],f[2]); }; } });
                } else if (headers[0].charAt(0)==='P') { 
                    // POST - retrieve message body and store keyed by 'Data'
                    headers.each(function(a, i) { if (a) { var f = a.match(/^(.*?): (.*)/); if (!f) { if (!i) HttpRequest.set("Request-Line", a); else HttpRequest.set("Data", a); } else { HttpRequest.set(f[1],f[2]); }; } });
                } else {
                    HttpServer_Logger_Instance.write("error", "XXX Invalid request headers from browser: (" + Object.toJSON(headers) + ") XXX");
                    HttpRequestProcessor.sendError(HttpResponse, 400, "Bad request.");
                    return;
                }
                
                HttpServer_Logger_Instance.write("log", "Hash[HttpRequest]" + HttpRequest.inspect()); // XXX
                
                // check to make sure we're dealing with HTTP protocol
                if (HttpRequest.get('Request-Line') && HttpRequest.get('Request-Line').split(' ')[2].substring(0, 4) != "HTTP") {
                    HttpRequestProcessor.sendError(HttpResponse, 400, "Unsupported protocol.");
                    return;
                }
                
                var uri = headers[0].split(' ')[1];
                var query = uri && uri!='' ? uri.toQueryParams() : {};
                
                // query found
                if (uri.indexOf('?') != -1) {
                    uri = uri.split('?')[0];
                }
               
                // rewrite matching here 
                if (this.rewrite) {
                    this.rewrite.each(function(rule) { var m=uri.match(rule[0]); if (m) { /*console.log("before rewrite: " + uri);*/ uri=rule[1]+m[1]; /*console.log(" => Rewrite uri to: " + uri);*/ $break; } });
                }
                //HttpServer_Logger_Instance.write("log", " Rewrite uri to: " + uri);
            
                HttpResponse.set('uri', uri);
                HttpResponse.set('query', query);
                HttpServer_Logger_Instance.write("log", "Hash[HttpResponse]" + HttpResponse.inspect());
                
                // redirect browser - do what Apache does
                if (uri.lastIndexOf('.')===-1 && !uri.endsWith('/') && Object.toJSON(query)=='{}') {
                    HttpRequestProcessor.sendResponse(HttpResponse, 301);
                    HttpRequestProcessor.sendHeader(HttpResponse, "Location", uri+'/');
                    HttpRequestProcessor.endBlock(HttpResponse);
                    HttpRequestProcessor.sendResponse(HttpResponse, -1, '');
                    HttpRequestProcessor.flushBuffer(HttpResponse);
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
                        HttpServer_Logger_Instance.write("error", "XXX HttpServer._httpHandler: Anomaly detected! mount_map has a null Path entry. XXX");
                    }
                } else {
                    HttpServer_Logger_Instance.write("warn", " #### I seem to be missing a handler for path: (" + uri + "). Can't service request without a proper handler. Please create one. ####");
                    HttpRequestProcessor.sendError(HttpResponse, 403, "No appropriate handler(s) found.");
                }
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
            
            // introspect (GET & SET) HttpServer properties and set them back for the requesting handler. non-existent properties set to null.
            if (options) {
                if (options.GET) {
                    var optionsMap = $H({});
                    for (var i=0, option; option=options.GET[i]; i++) {
                        optionsMap.set(options.GET[i], eval("this." + options.GET[i].toLowerCase()));
                    }
                    handler.setOptions(optionsMap);
                } 
                
                if (options.SET) {
                    this.rewrite = $A(options.SET.REWRITE);
                    //console.log("rewrite: " + Object.toJSON(this.rewrite));
                } 
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


