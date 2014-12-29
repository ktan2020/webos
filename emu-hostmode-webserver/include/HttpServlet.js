
include("prototype_triton.js");
include("Logger.js");


var HttpServlet_Logger = Class.create(Generic_Logger, {});
var HttpServlet_Logger_Instance = new HttpServlet_Logger($H({"LOG_LEVEL" : "info"}));


var HttpServlet = {};


/**
 * HttpServlet.AbstractServlet - Base Servlet class
 */
HttpServlet.AbstractServlet = Class.create({
        
        /**
         * initialize - Constructor
         */
        initialize: function() {
            this.options = null;
        },
        
        
        /**
         * service - Base class abstract method
         */
        service: function(req, res) {
            HttpServlet_Logger_Instance.write("log", "<<< HttpServlet.AbstractServlet - service() >>>");
            
            if (req && req.get('Request-Line')) {
                var r = req.get("Request-Line").split(' ')[0];
                switch (r) {
                case "GET":
                    this.doGET(req, res);
                    break;
                    
                case "HEAD":
                    break;
                    
                case "POST":
                    break;
                 
                default:
                    HttpServlet_Logger_Instance.write("warn", "!!! Unknown Request Protocol: (" + r + ") !!!");
                }
            } else {
                HttpServlet_Logger_Instance.write("warn", "**** Anomaly detected: Request hashmap missing a 'Request-Line' field. ****");
            }
            
            HttpServlet_Logger_Instance.write("log", ">>> HttpServlet.AbstractServlet - service() <<<");
        },
        
        
        /**
         * setOptions - For introspecting HttpServer state or attributes. opt is a $H() hashmap.
         */
        setOptions: function(opt) {
            this.options = opt;
        },
        
        
        /**
         * doGET - 
         */
        doGET: function(req, res) {
            throw "!!! Provide implementation for AbstractServlet doGET !!!";
        },
        
        
        /**
         * private - crude RTTI 
         */
         _type_: function() {},
                
});


