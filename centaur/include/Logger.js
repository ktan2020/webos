
include("prototype_triton.js");


/**
 * logging levels - info, log, warn, error
 */
var Generic_Logger = Class.create({
        
        initialize: function(config) { 
            // default level is INFO
            this.log_level = "info";
            
            if (config && config.get('LOG_LEVEL')!=null) {
                this.log_level = config.get('LOG_LEVEL');
            }
        },
        
        write: function(level, mesg) {
            var d = new Date();
            if (this.log_level == "info" && level.toLowerCase() == "log") { return; }
            
            eval("console." + level.toLowerCase() + "(\"[" + level.toUpperCase() + " : " + d + "] \" + mesg)")
        },
});




