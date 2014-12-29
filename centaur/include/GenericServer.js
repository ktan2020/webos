
include("prototype_triton.js");
include("Logger.js");


var GenericServer_Logger = Class.create(Generic_Logger, {});
var GenericServer_Logger_Instance = new GenericServer_Logger($H({"LOG_LEVEL" : "info"}));


var ServerState = {
    READY       : 0,
    STARTING    : 1,
    STARTED     : 2,
    STOPPED     : 3,
    STOPPING    : 4,
    
    ERROR       : -1,
    
    statusString   : function(status) {
        switch (status) {
        case 0: return "READY"; break;
        case 1: return "STARTING"; break;
        case 2: return "STARTED"; break;
        case 3: return "STOPPED"; break;
        case 4: return "STOPPING"; break;
        default: return "ERROR"; break;
        };
    },
};


/**
 * ServerError class
 */
var ServerError = Class.create({
        initialize: function(error) {
            this.error = error;
        },
});


/**
 * Generic Server Config
 */
var GenericServerConfig = {
    SERVERNAME      : 'localhost',
    BINDADDRESS     : '0.0.0.0',
    PORT            : 8080,
    SOCK_FAMILY     : 'webOS.Socket.AF_INET',
    SOCK_TYPE       : 'webOS.Socket.SOCK_STREAM',
    SOCK_OPT        : undefined,
    CHAN_OPT        : 'webOS.IOChannel.FLAG_NONBLOCK',
    LISTEN          : 10,
};


/**
 * Generic multi-purpose server 
 */
var GenericServer = Class.create({
        
        /**
         * initialize - Constructor
         */
        initialize: function(config) {
            GenericServer_Logger_Instance.write("log", "<<< GenericServer - initialize() >>>");
            
            this.handler = (config && config.get('SERVERHANDLER')) || null;
            this.status = ServerState.READY;
            
            this.servername = (config && config.get('SERVERNAME')) || GenericServerConfig.SERVERNAME;
            this.bind_address = (config && config.get('BINDADDRESS')) || GenericServerConfig.BINDADDRESS;
            this.port = (config && config.get('PORT')) || GenericServerConfig.PORT;
            this.sock_family = (config && config.get('SOCK_FAMILY')) || GenericServerConfig.SOCK_FAMILY;
            this.sock_type = (config && config.get('SOCK_TYPE')) || GenericServerConfig.SOCK_TYPE;
            this.sock_opt = (config && config.get('SOCK_OPT')) || GenericServerConfig.SOCK_OPT;
            this.chan_opt = (config && config.get('CHAN_OPT')) || GenericServerConfig.CHAN_OPT;
            this.listen = (config && config.get('LISTEN')) || GenericServerConfig.LISTEN;
            
            this.server_socket  = null;
            this.server_channel = null;
             
            GenericServer_Logger_Instance.write("log", "*** handler: (" + this.handler + "), status: (" + ServerState.statusString(this.status) + "), servername: (" + this.servername + "), bindaddress: (" + this.bind_address + "), port: (" + this.port + "), sock_family: (" + this.sock_family + "), sock_type: (" + this.sock_type + "), sock_opt: (" + this.sock_opt + "), chan_opt: (" + this.chan_opt + "), listen: (" + this.listen + ") ***");
            
            GenericServer_Logger_Instance.write("log", ">>> GenericServer - initialize() <<<");
        },
        
        
        /**
         * accept - 
         */
        accept: function() {
            GenericServer_Logger_Instance.write("log", "<<< GenericServer - accept() >>>");
            
            this.server_socket = new webOS.Socket.Socket(eval(this.sock_family), eval(this.sock_type));
            
            if (this.sock_opt) {
                this.server_socket.setsockopt(webOS.Socket.SOL_SOCKET, eval(this.sock_opt), true);
            }
            
            var addrs = webOS.Socket.getaddrinfo(null, this.port, eval(this.sock_family), eval(this.sock_type));
            var sa = null;
            
            for (var i=0, addr; addr=addrs[i]; i++) {
                GenericServer_Logger_Instance.write("log", "addrinfo: " + Object.toJSON(addr));
                sa = new webOS.Socket.SockAddr(addr.family, addr.sockAddr.host, addr.sockAddr.port);
                break;
            }
            
            if (!sa) {
                GenericServer_Logger_Instance("error", "Failed to find SockAddress!");
                throw new ServerError("Failed to find SockAddress!!!");
            }
            
            GenericServer_Logger_Instance.write("log", "Binding socket to addr: " + Object.toJSON(sa));
            this.server_socket.bind(sa);
            
            this.server_channel = new webOS.IOChannel.Channel(this.server_socket);
            this.server_channel.flags |= eval(this.chan_opt);
            
            // if socket option is NON BLOCKING then we attach onread handler
            if (this.chan_opt === 'webOS.IOChannel.FLAG_NONBLOCK') {
                this.server_channel.onread = this.frontEndDispatch.bind(this);
            } else {
                this.frontEndDispatch();   
            }
            
            GenericServer_Logger_Instance.write("log", "Listening on server socket ...");
            this.server_socket.listen(this.listen);
            
            GenericServer_Logger_Instance.write("log", ">>> GenericServer - accept() <<<");
        },
        
        
        /**
         * frontEndDispatch - private
         */
        frontEndDispatch: function() {
            GenericServer_Logger_Instance.write("log", "<<< GenericServer - frontEndDispatch() >>>");
            try { 
                if (this.server_channel.flags & webOS.IOChannel.FLAG_IS_READABLE) {
                    GenericServer_Logger_Instance.write("log", " **** server read ready - waiting for connection ****");
                    var accepted;
                    
                    try {
                        accepted = this.server_socket.accept();  
                        GenericServer_Logger_Instance.write("log", " ====> accepted a new connection: " + Object.toJSON(accepted) + " <====");
                    } catch (err) {
                        GenericServer_Logger_Instance.write("error", "XXX Server socket accept failed: (" + err + ") XXX");
                        throw new ServerError("Server socket accept failed: " + err);
                    }
                    
                    var channel;
                    
                    if (accepted) {
                        try {
                            channel = new webOS.IOChannel.Channel(accepted.socket);        
                        } catch (err) {
                            GenericServer_Logger_Instance.write("error", "XXX Failed to create channel from server socket: (" + err + ") XXX");
                            throw new ServerError("Failed to create channel from server socket: " + err);
                        }
                        
                        if (channel) {
                            this.backEndDispatch(accepted.socket, channel);
                        } else {
                            GenericServer_Logger_Instance.write("error", "XXX Client socket channel == null XXX");
                            throw new ServerError("Client socket channel == null");
                        }
                    }
                }
            } catch(err) { 
                GenericServer_Logger_Instance.write("error", "XXX Server socket hung up: (" + err + ") XXX");                
                this.server_channel.onread = undefined;
            }
            
            GenericServer_Logger_Instance.write("log", ">>> GenericServer - frontEndDispatch() <<<");
        },
        
        
        /**
         * backEndDispatch - private
         */
        backEndDispatch: function(socket, channel) {
            GenericServer_Logger_Instance.write("log", "<<< GenericServer - backEndDispatch() >>>");
            
            if (socket && channel) {
                channel.flags |= eval(this.chan_opt);
                
                if (this.chan_opt === 'webOS.IOChannel.FLAG_NONBLOCK') {
                    if (this.handler) {
                        channel.onread = this.handler.curry(socket, channel).bind(this);
                    } else {
                        GenericServer_Logger_Instance.write("warn", " !!! handler function == null !!!");
                    }
                } else {
                    if (this.handler) {
                        this.handler(socket, channel);
                    } else {
                        GenericServer_Logger_Instance.write("warn", " !!! handler function == null !!!");
                    }
                }
                
            } else {
                throw new ServerError("backEndDispatch: socket" + (!socket?"==null":"!=null") + ", channel" + (!channel?"==null":"!=null"));
            }
            
            GenericServer_Logger_Instance.write("log", ">>> GenericServer - backEndDispatch() <<<");
        },
        
        
        /**
         * start - Start this thing ...
         */
        start: function() {
            GenericServer_Logger_Instance.write("log", "<<< GenericServer - start() >>>");
            
            if (this.status !== ServerState.READY) {
                throw new ServerError("Server State Error! (Cannot start server that is not READY)");
            }
            
            this.status = ServerState.STARTING;
            
            // let's get this event handler loop started ...
            startApplicationLoop();
            
            this.status = ServerState.STARTED;
            
            this.accept();
            
            GenericServer_Logger_Instance.write("log", ">>> GenericServer - start() <<<");
        },
        
        
        /**
         * stop - Stop this thing ...
         */
        stop: function() {
            GenericServer_Logger_Instance.write("log", "<<< GenericServer - stop() >>>");
            
            if (this.status !== ServerState.STARTED || this.status !== ServerState.STARTING) {
                throw new ServerError("Server State Error! (Cannot stop server that is not STARTED or STARTING)");
            }
            
            this.status = ServerState.STOPPING;
            
            quit();
            
            this.status = ServerState.STOPPED;
            
            GenericServer_Logger_Instance.write("log", ">>> GenericServer - stop() <<<");
        },
        
        /**
         * setServerHandler - Sets the default handler function for server of this type. 
         * ie. What you would like it to do when a client socket is ready to be read from
         * 
         * Note:
         * Handler function must be function with 2 parameters. 
         *  E.g. To echo contents of client's sent message back:
         *  function(socket, channel) { var read = channel.read(1024); channel.write(read); channel.flush(); }
         */
         setServerHandler: function(handler) {
             this.handler = handler;
         },
        
});



