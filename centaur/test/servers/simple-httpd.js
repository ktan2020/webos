
/**
 * simple httpd implementation in triton js
 *
 */


include("prototype_triton.js");


var CRLF = "\r\n";


/**
 * Standard HTTP return codes
 */
var STATUS_CODES = {
  200 : 'OK',
  201 : 'Created',
  202 : 'Accepted',
  204 : 'No Content',
  400 : 'Bad Request',
  404 : 'Not Found',
  500 : 'Internal Server Error',
  501 : 'Not Implemented',
  502 : 'Bad Gateway',
  503 : 'Service Unavailable',
  504 : 'Gateway Time-out',
  505 : 'HTTP Version not supported',
};


/**
 * Global container var
 */
var HTTPD = {
    'protocol'  : 'HTTP/1.0',
    'server'    : 'WebOS Triton',
    'loglevel'  : 'log',
    'bufsize'   : 256*1024,
    'sockblock' : false,
};


/**
 * Browser mimetypes
 */
var MIMETYPES = {
    '{}'    : 'application/octet-stream',
    
    '.txt'  : 'text/plain',
    '.htm'  : 'text/html',
    '.html' : 'text/html',
    
    '.css'  : 'text/css',
    
    '.js'   : 'text/javascript',
    '.json' : 'application/json', 
    
    '.bmp'  : 'image/bmp',
    '.gif'  : 'image/gif',
    '.jpg'  : 'image/jpeg',
    '.jpeg' : 'image/jpeg',
    '.pbm'  : 'image/x-portable-bitmap',
    '.pgm'  : 'image/x-portable-greymap',
    '.pnm'  : 'image/x-portable-anymap',
    '.ppm'  : 'image/x-portable-pixmap',
    '.png'  : 'image/png',
    '.tif'  : 'image/tiff',
    '.tiff' : 'image/tiff',
    '.xbm'  : 'image/x-xbitmap', 
    '.xpm'  : 'image/x-xpixmap',
};


function _Httpd_Log_(level, mesg) {
    var d = new Date();
    if (HTTPD['loglevel'] == "info" && level.toLowerCase() == "log") { return; }
    
    eval("console." + level.toLowerCase() + "(\"[" + level.toUpperCase() + " : " + d + "] \" + mesg)");
}


/**
 * Server factory
 */
function Httpd_Server(root, port, page) {
    _Httpd_Log_("info", " *** Httpd_Server: creating new Server ***");
    
    HTTPD['root'] = root;
    HTTPD['port'] = port;
    HTTPD['page'] = page;
    HTTPD['listen'] = 5;
    
    HTTPD['serverSocket'] = new Triton.Socket.Socket(Triton.Socket.AF_INET, Triton.Socket.SOCK_STREAM);
    
    var addrs = Triton.Socket.getaddrinfo(null, port, Triton.Socket.AF_INET, Triton.Socket.SOCK_STREAM);
    var sa = null;
    
    for (var i=0, addr; addr=addrs[i]; i++) {
        _Httpd_Log_("log", "addrinfo: " + Object.toJSON(addr));
        sa = new Triton.Socket.SockAddr(addr.family, addr.sockAddr.host, addr.sockAddr.port);
        break;
    }
    
    if (!sa) {
        _Httpd_Log_("error", "Failed to find sockaddress!");   
        //throw new Error("Failed to find sockaddress!");
    }
    
    _Httpd_Log_("log", "Binding socket to addr: ", Object.toJSON(sa));
    HTTPD['sockaddr'] = sa;
    HTTPD['serverSocket'].bind(sa);
    HTTPD['serverChannel'] = new Triton.IOChannel.Channel(HTTPD['serverSocket']);
    HTTPD['serverChannel'].flags |= Triton.IOChannel.FLAG_NONBLOCK;
    HTTPD['serverChannel'].onread = _HttpdAccept_;
    
    _Httpd_Log_("log", "Listening on server socket");
    HTTPD['serverSocket'].listen(5);
    
    return HTTPD['serverSocket'];
}


/**
 * Server accept dispatcher 
 */
function _HttpdAccept_() {
    _Httpd_Log_("log", " *** _HttpdAccept_: server read ready, waiting for a connection ***");
    var accepted;
    
    try {
        accepted = HTTPD['serverSocket'].accept();
        _Httpd_Log_("log", " ===> accepted a new connection: " + Object.toJSON(accepted) + " <===");
    } catch (err) {
        _Httpd_Log_("error", "XXX Server socket accepted failed!: (" + err + ") XXX");   
        return;
    }
    
    var channel;
    
    if (accepted != null) {
        try {
            channel = new Triton.IOChannel.Channel(accepted.socket);
        } catch (err) {
            _Httpd_Log_("error", "XXXX Failed to created channel from server socket: (" + err + ") XXXX");   
            return;
        }
        
        // create new HTTPClient container object for each async client connection that comes in 
        var newClient = new HttpClientContainer(accepted.socket, channel);
    } else {
        _Httpd_Log_("error", "XXX Server socket accept returned NULL !!! XXX");
    }
}


/**
 * Default Http Handler
 */
var HttpClientContainer = Class.create({
        
        initialize: function(sk, chan) {
            _Httpd_Log_("log", " *** initialize ***");
            
            this.sock = sk;
            this.chan = chan;
            this.reqBuffer = null;
            this.url;
            
            this.fileIn;
            this.writeBuffer = new Triton.Buffer();
            this.bytesRead = 0;
            
            this.chan.flags |= Triton.IOChannel.FLAG_NONBLOCK;
            this.chan.onread = this.socketRead.bind(this);
        },
        
        socketRead: function() {
            _Httpd_Log_("log", " *** socketRead ***");
            
            if (this.chan != null) {
                this.reqBuffer = this.chan.read(HTTPD['bufsize']);
                
                if (!this.reqBuffer) {
                    _Httpd_Log_("log", "!!! Remote side closed client connection! !!!");
                    if (this.chan != null) {
                        this.chan.shutdown(true);
                        this.chan.onread = undefined;
                        this.chan = undefined;
                    }
                    this.sock.close();
                    return;
                }
                
                _Httpd_Log_("log", "REQST: <<<" + this.reqBuffer._toJSON() + " >>>");
                
                this.handle();
                
            } else {
                _Httpd_Log_("error", "XXX read: client chan == null XXX");   
            }
        },
        
        handle: function() {
            _Httpd_Log_("log", " *** handle ***");
                
            var header = this.reqBuffer.split(CRLF)[0];
            var headerarray = header.split(" ");
            var protocol = headerarray[0];
            this.url = headerarray[1];
                
            _Httpd_Log_("info", protocol + " " + this.url);
                
            // query found
            if (this.url.indexOf('?') != -1) {
                this.url = this.url.split('?')[0];
            }
                
            // process HTTP protocol
            switch (protocol) {
            case "GET":
                this.doGet();
                break;
                    
            case "HEAD":
                //this.doHead();
                break;
                    
            default:
                break;
            }
        },
        
        doGet: function() {
            _Httpd_Log_("log", " *** doGet: url ===> (" + this.url + ") ***");
            
            if (this.url.lastIndexOf('.')==-1 && this.url[this.url.length-1]!='/') {
                // redirect browser - do what Apache does
                this.sendResponse(301);
                this.sendHeader("Location", this.url+"/");
                this.endHeaders();
                this.done();
                return;
            }
            
            this.url = (this.url.length>0 && this.url[this.url.length-1]=='/') ? this.url+HTTPD['page'] : this.url;
            var inputfile = _HttpdUrlToFile_(HTTPD['root'], this.url);
            
            try {
                this.fileIn = new Triton.IOChannel.Channel(inputfile, "r");   
            } catch (err) {
                _Httpd_Log_("warn", "### 404 - File: " + inputfile + " does not exist. (" + err + ") ###");
                this.sendError(404, "File: (" + this.url + ") does not exist!");
            }
            
            if (this.fileIn != null) {
                this.fileIn.flags |= Triton.IOChannel.FLAG_NONBLOCK;
                this.fileIn.onread = this._fileOnread.bind(this);
            }
        },
        
        sendError: function(code, mesg) {
            _Httpd_Log_("log", " *** sendError: code ===> (" + code + "), mesg ===> (" + mesg + ") ***");
            
            if (this.chan != null) {
                var mesg = "<title>Error!!!!!</title><h1>" + code + ": " + STATUS_CODES[code] + "</h1><h2>" + mesg + "</h2>";
                
                this.sendResponse(404, '');
                this.sendHeader("Content-Type", "text/html");
                this.sendHeader("Content-Length", mesg.length);
                this.endHeaders();
                
                this.sendResponse(-1, mesg);
                this.done();
            } else {
                _Httpd_Log_("error", "XXX sendError: client channel == null XXX");
            }
        },
        
        sendResponse: function(code, mesg) {
            _Httpd_Log_("log", " *** sendResponse: code ===> (" + code + ") ***");
            
            if (this.chan != null) {
                if (code != -1) {
                    this.chan.write(HTTPD['protocol'] + " " + code + " " + STATUS_CODES[code] + CRLF);
                    this.sendHeader("Server", HTTPD['server']);
                    this.sendHeader("Date", new Date());
                } else {
                    this.chan.write(CRLF);
                    this.chan.write(mesg + CRLF);
                    this.chan.write(CRLF);
                }
            } else {
                _Httpd_Log_("error", "XXX sendResponse: client channel == null XXX");
            }
        },
        
        sendResponseUsingBuffer: function(buf) {
            _Httpd_Log_("log", " *** sendResponseUsingBuffer: buf.length ===> (" + buf.length + ") ***");
            
            if (this.chan != null) {
                buf.position = 0;
                
                while (buf.position != buf.length) {
                    var writeCount = this.chan.writeUsingBuffer(buf, buf.length-buf.position);
                    _Httpd_Log_("log", " ::: buffer write to channel: (" + writeCount + ") bytes :::");
                    buf.position += writeCount;
                }
            } else {
                _Httpd_Log_("error", "XXX sendResponseUsingBuffer: client channel == null XXX");
            }
        },
        
        sendHeader: function(key, value) {
            _Httpd_Log_("log", " *** sendHeader: key ===> (" + key + "), value ===> (" + value + ") ***");
            
            if (this.chan != null) {
                //TODO: What to do for connection: close, keepalive
                this.chan.write(key + ": " + value + CRLF);
            } else {
                _Httpd_Log_("error", "XXX sendHeader: client channel == null XXX");
            }
        },
        
        endHeaders: function() {
            _Httpd_Log_("log", " *** endHeaders ***");  
            
            if (this.chan != null) {
                this.chan.write(CRLF);
            } else {
                _Httpd_Log_("error", "XXX endHeaders: client channel == null XXX");   
            }
        },
        
        done: function() {
            _Httpd_Log_("log", " *** done ***");   
            
            if (this.chan != null) {
                this.chan.flush();
				this.chan.onread = undefined;
				this.chan = undefined;
            } else {
                _Httpd_Log_("error", "XXX done: client channel == null XXX");   
            }
        },
        
        _fileOnread: function() {
            var readBuffer = new Triton.Buffer();
            readBuffer.position = 0;
            var ret = this.fileIn.readUsingBuffer(readBuffer, HTTPD['bufsize']);
            this.bytesRead += ret;
            _Httpd_Log_("log", " ... read: (" + ret + ") bytes ...");
          
            // slurp in buffer content and then append to accumulator buffer
            readBuffer.position = 0;
            readBuffer.copyTo(this.writeBuffer, ret);
          
            if (ret == 0) {
                this._fileOnreadDone();
            }
            
            readBuffer.position = 0;
        },
        
        _fileOnreadDone: function() {
            // done with read ... no more bytes to read in, so write out accumulated response
            _Httpd_Log_("log", " ++++++ url: " + this.url + " ++++++");
            
            this.sendResponse(200, '');
            this.sendHeader("Content-Type", (this.url.lastIndexOf('.')!=-1 && MIMETYPES[this.url.substring(this.url.lastIndexOf('.'),this.url.length)]!=undefined ? MIMETYPES[this.url.substring(this.url.lastIndexOf('.'),this.url.length)] : MIMETYPES['{}']));
            this.sendHeader("Content-Length", this.bytesRead);
            this.endHeaders();
            this.sendResponseUsingBuffer(this.writeBuffer);
            this.endHeaders();
            this.done();
            
            this.fileIn.shutdown(true);
            this.fileIn.onread = undefined;
			this.fileIn = undefined;
            gc();
            
            return;
        },
        
});


function _HttpdUrlToFile_(root, url) {
    _Httpd_Log_("log", "_HttpdUrlToFile_: (" + root + "), (" + url + ")");
    
    return "" + root + url;
}


function main() {
    
    var port = getenv('PORT') || 8080, root = getenv('PUBLIC_HTML') || ".", page = getenv('PAGE') || "index.html";
    _Httpd_Log_("info", "<<< PORT: (" + port + "), ROOT: (" + root + "), PAGE: (" + page +  ") >>>");
    
    _Httpd_Log_("info", "calling Httpd_Server");
    Httpd_Server(root, port, page);
    _Httpd_Log_("info", "*** Starting httpd server on localhost port " + port + " ***");
    
    _Httpd_Log_("info", "Before startApplicationLoop() ...");
    startApplicationLoop();
    _Httpd_Log_("info", "After startApplicationLoop() ...");
    
}



