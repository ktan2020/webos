
/*
 * Deferred mode
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
    'loglevel'  : 'info',
    'bufsize'   : 256*1024,
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

function Httpd_Server(root, port) {
    _Httpd_Log_("info", " *** Httpd_Server: creating new Server ***");
    
    HTTPD['root'] = root;
    HTTPD['port'] = port;
    
    HTTPD['serverSocket'] = new Triton.Socket.Socket(Triton.Socket.PF_INET, Triton.Socket.SOCK_STREAM);
    
    HTTPD['serverSocket'].setsockopt(webOS.Socket.SOL_SOCKET, webOS.Socket.SO_REUSEADDR, true);
    var addrs = Triton.Socket.getaddrinfo(null, port, Triton.Socket.PF_INET, Triton.Socket.SOCK_STREAM);
    var sa = null;
    
    for (var i=0, addr; addr=addrs[i]; i++) {
        //_Httpd_Log_("log", "addrinfo: " + Object.toJSON(addr));
        sa = new Triton.Socket.SockAddr(addr.family, addr.sockAddr.host, addr.sockAddr.port);
        break;
    }
    
    if (!sa) {
        _Httpd_Log_("error", "Failed to find sockaddress!");   
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
    
    if (accepted) {
        try {
            channel = new Triton.IOChannel.Channel(accepted.socket);
        } catch (err) {
            _Httpd_Log_("error", "XXXX Failed to created channel from server socket: (" + err + ") XXXX");   
            return;
        }
        
        // create new HTTPClient container object for each async client connection that comes in 
        newClient = new HttpClientContainer(accepted.socket, channel);
    } else {
        _Httpd_Log_("error", "XXX Server socket accept returned NULL !!! XXX");
    }
}

/**
 * Default Http Handler
 */
var HttpClientContainer = Class.create({
        initialize: function(sk, chan) {
            this.sock = sk;
            this.chan = chan;
            this.reqBuffer = null;
            this.url;
            
            this.fileIn;
            this.writeBuffer = new webOS.Buffer();
            this.bytesRead = 0;
            this.responseBuffer = new webOS.Buffer();
            
            this.chan.flags |= Triton.IOChannel.FLAG_NONBLOCK;
            this.chan.onread = this.socketRead.bind(this);
        },
        
        socketRead: function() {
            try {
                if (this.chan) {
                    this.reqBuffer = this.chan.read(HTTPD['bufsize']);
                    
                    if (!this.reqBuffer) {
                        _Httpd_Log_("info", "!!! Remote side closed client connection! !!!");
                        if (this.chan) {
                            this.chan.shutdown(true);
                            this.chan.onread = undefined;
                            this.chan.onwrite = undefined;
                            this.chan = undefined;
                        }
                        this.sock.close();
                        return;
                    }
                    //_Httpd_Log_("log", "REQST: <<<" + this.reqBuffer._toJSON() + " >>>");
                    this.handle();
                } else {
                    _Httpd_Log_("error", "XXX read: client chan == null XXX");   
                }
            } catch (err) {
                console.log("*** socketRead threw an exception! : " + err + "***");  
                this.socketRead();
            }
        },
        
        handle: function() {
            var header = this.reqBuffer.split(CRLF)[0];
            var headerarray = header.split(" ");
            var protocol = headerarray[0];
            this.url = headerarray[1];
                
            //_Httpd_Log_("info", protocol + " " + this.url);
                
            // query found
            if (this.url.indexOf('?') !== -1) {
                this.url = this.url.split('?')[0];
            }
                
            // process HTTP protocol
            switch (protocol) {
            case "GET":
                this.doGet();
                break;   
            default:
                break;
            }
        },
        
        fileSize: function(url) {
            if (url) {
                return new webOS.FTS(url, webOS.FTS.FTS_DEFAULT).read().stat.size;
            }
            return undefined;
        },
        
        doGet: function() {
            var inputfile = _HttpdUrlToFile_(HTTPD['root'], this.url);
            //console.log("XXX inputfile: " + inputfile + ", size: " + this.fileSize(inputfile) + " XXX");
            
            try {
                this.fileIn = new Triton.IOChannel.Channel(inputfile, "r");   
            } catch (err) {
                _Httpd_Log_("warn", "### 404 - File: " + inputfile + " does not exist. (" + err + ") ###");
                this._sendError_(404, "File: (" + this.url + ") does not exist!");
            }
            
            if (this.fileIn) {
                this.fileIn.flags |= Triton.IOChannel.FLAG_NONBLOCK;
                this.fileIn.onread = this._fileOnread.bind(this);
            }
        },
        
        _sendError_: function(code, mesg) {
            if (this.chan) {
                var mesg = "<title>Error!!!!!</title><h1>" + code + ": " + STATUS_CODES[code] + "</h1><h2>" + mesg + "</h2>";
                
                try {
                    this._sendResponse_(404, '');
                    this._sendHeader_("Content-Type", "text/html");
                    this._sendHeader_("Content-Length", mesg.length);
                    this._endBlock_();
                    
                    this._sendResponse_(-1, mesg);
                    this._endBlock_();
                    this._flushBuffers_(this.responseBuffer);
                } catch (err) {
                    console.error("XXX _sendError_ threw an Exception: " + err + "XXX");
                    throw err;
                }
            } else {
                _Httpd_Log_("error", "XXX sendError: client channel == null XXX");
                throw "sendError: client channel == null";
            }
        },
        
        _sendResponse_: function(code, mesg) {
            if (code !== -1) {
                this.responseBuffer.writeString(HTTPD['protocol'] + " " + code + " " + STATUS_CODES[code] + CRLF);
                this._sendHeader_("Server", HTTPD['server']);
                this._sendHeader_("Date", new Date());
            } else {
                this.responseBuffer.writeString(CRLF+mesg+CRLF);
            }
        },
        
        _sendHeader_: function(key, value) {
            this.responseBuffer.writeString(key + ": " + value + CRLF);
        },
        
        _endBlock_: function() {
            this.responseBuffer.writeString(CRLF);
        },
        
        _done_: function() {
            if (this.chan) {
                if (this.chan.flags & webOS.IOChannel.FLAG_IS_WRITEABLE) {
                    this.chan.flush();
                    this.chan.shutdown(true);
                    this.chan.onread = undefined;
                    this.chan = undefined;
                }
            } else {
                _Httpd_Log_("error", "XXX _done_: client channel == null XXX");
                throw "_done_: client channel == null";
            }
        },
        
        _flushBuffers_: function(b, f) {
            b.position = 0;
            var wrote = 0;
            
            function writeReady() {
                if (wrote === b.length) {
                    //console.log("Write buffer to Socket complete!!! wrote: " + wrote + ", buf: " + b.length);
                    this.chan.onwrite = undefined;
                    
                    try {
                        if (f && typeof f === 'function') {
                            f();
                        } else {
                            this._done_();
                        }
                    } catch (err) {
                        console.error("writeReady threw an Exception: " + err);
                        throw err;
                    }
                    
                    return;
                }
                
                try {
                    if (this.chan.flags & webOS.IOChannel.FLAG_IS_WRITEABLE) {
                        var writeCount = this.chan.writeUsingBuffer(b, HTTPD['bufsize']);
                        //console.log(" ::: buffer write to channel: (" + writeCount + ") :::");
                        b.position += writeCount;
                        wrote += writeCount;
                    }
                } catch (err) {
                    console.log("XXX chan.writeUsingBuffer threw an Exception: " + err + " XXX");
                }
            }
            
            if (this.chan) {
                this.chan.onwrite = writeReady.bind(this);
            } else {
                _Httpd_Log_("error", "XXX _flushBuffers_: client channel == null XXX");
                throw "_flushBuffers_: client channel == null";
            }         
        },
        
        _fileOnread: function() {
            try {
                var readBuffer = new Triton.Buffer();
                readBuffer.position = 0;
                var ret = this.fileIn.readUsingBuffer(readBuffer, HTTPD['bufsize']);
                this.bytesRead += ret;
                _Httpd_Log_("log", " ... read: (" + ret + ") bytes ...");
                readBuffer.position = 0;
                readBuffer.copyTo(this.writeBuffer, ret);
              
                if (ret === 0) {
                    this.fileIn.shutdown(true);
                    this.fileIn.onread = undefined;
                    this.fileIn = undefined;
                    this._fileOnreadDone();
                }
            } catch (err) {
                console.error("*** _fileOnread threw an exception! : " + err + " ***");
            }
        },
        
        _fileOnreadDone: function() {
            try {
                this._sendResponse_(200, '');
                this._sendHeader_("Content-Type", (this.url.lastIndexOf('.')!=-1 && MIMETYPES[this.url.substring(this.url.lastIndexOf('.'),this.url.length)]!=undefined ? MIMETYPES[this.url.substring(this.url.lastIndexOf('.'),this.url.length)] : MIMETYPES['{}']));
                this._sendHeader_("Content-Length", this.bytesRead);
                this._endBlock_();
                this._flushBuffers_(this.responseBuffer, function(){this._flushBuffers_(this.writeBuffer);}.bind(this));
            } catch (err) {
                console.error("*** _fileOnreadDone threw an exception! : " + err + " ***");
            }
            
            return;
        },
});

function _HttpdUrlToFile_(root, url) {
    return "" + root + url;
}

function main() {
    var port = getenv('PORT') || 8080, root = getenv('PUBLIC_HTML') || ".";
    _Httpd_Log_("info", "<<< PORT: (" + port + "), ROOT: (" + root + ") >>>");
    
    _Httpd_Log_("info", "calling Httpd_Server");
    Httpd_Server(root, port);
    _Httpd_Log_("info", "*** Starting httpd server on localhost port " + port + " ***");
    
    _Httpd_Log_("info", "Before startApplicationLoop() ...");
    startApplicationLoop();
    _Httpd_Log_("info", "After startApplicationLoop() ...");    
}



