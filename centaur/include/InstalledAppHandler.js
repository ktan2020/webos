
include("prototype_triton.js");
include("Logger.js");
include("HttpServlet.js");
include("HttpRequestProcessor.js");


var InstalledAppHandler_Logger = Class.create(Generic_Logger, {});
var InstalledAppHandler_Logger_Instance = new InstalledAppHandler_Logger($H({"LOG_LEVEL" : "info"}));


/**
 * InstalledAppHandler Config
 *
 * APP_INSTALL_PATH - can be relative or absolute. Relative to DOCUMENT_ROOT.
 */
var InstalledAppHandlerConfig = {
    // Absolute path for emulator
    APP_INSTALL_PATH : '/media/cryptofs/apps/usr/palm/applications/',
    
    // Relative to DOCUMENT_ROOT for local workspace
    //APP_INSTALL_PATH : '/usr/palm/applications/',
    
    APP_URL_PREFIX   : '/apps',
    
    // Array of rewrite rules 
    REWRITE          : [
                        [/^\/apps\/(.*)$/, '/media/cryptofs/apps/usr/palm/applications/'],
                        //[/^\/apps\/(.*)$/, '/usr/palm/applications/'],
                       ],
};


/**
 * InstalledAppHandler 
 */
var InstalledAppHandler = Class.create(HttpServlet.AbstractServlet, {
        
        /**
         * initialize - Constructor
         */
        initialize: function(config) {
            InstalledAppHandler_Logger_Instance.write("log", "<<< InstalledAppHandler - initialize() >>>");
            
            this.app_install_path = (config && config.get('APP_INSTALL_PATH')) || InstalledAppHandlerConfig.APP_INSTALL_PATH;
            this.app_url_prefix = (config && config.get('APP_URL_PREFIX')) || InstalledAppHandlerConfig.APP_URL_PREFIX;
            
            InstalledAppHandler_Logger_Instance.write("log", ">>> InstalledAppHandler - initialize() <<<");
        },
        
        
        /**
         * doGET - GET handler
         */
        doGET: function(req, res) {
            InstalledAppHandler_Logger_Instance.write("log", "<<< InstalledAppHandler - doGET() >>>");
            
            var uri = res.get('uri');
            
            if (uri && this.options && this.options.get('DOCUMENT_ROOT')) {
                var _dr_ = this.options.get('DOCUMENT_ROOT'), _ap_ = this.app_install_path, _px_ = this.app_url_prefix;
                 
                var start = (new Date()).getMilliseconds();
                var dirs = this._getDirs((_dr_==='/') ? this.app_install_path : _dr_+this.app_install_path);
                var end = (new Date()).getMilliseconds();
                
                var str = "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\">" +
                          "<html><title>Installed apps</title>" +
                          "<style type='text/css'>.sp {font-size:0.8em;color:#777;padding-left:0.5%;text-align:left;}</style>" +
                          "<body><h2>Installed apps in: " + this.app_install_path + "</h2>" +
                          "<hr>";
                
                str += "<center><div><table width='80%' border='1' cellpadding='2' cellspacing='0'>";
                
                if (dirs && dirs.length) {
                    dirs.each(function(dir) { str += "<tr><td>" + dir.name + "</td><td align='center'><a href='" + /*(_px_+'/'+dir.name)*/ (_dr_==='/' ? dir.path : _ap_+dir.name) + "?device=pre'>Pre</a></td><td align='center'><a href='" + /*(_px_+'/'+dir.name)*/ (_dr_==='/' ? dir.path : _ap_+dir.name) + "?device=pixi'>Pixi</a></td></tr>"; });
                }
                
                str += "</table></div></center><hr></body><div class='sp'>" + new Date() + "</div><div class='sp'>Powered by webOS (centaur). Generated in: " + (end-start) + " ms.</div></html>";
           
                HttpRequestProcessor.sendResponse(res, 200, null);
                HttpRequestProcessor.sendHeader(res, "Content-Type", HttpUtils.DefaultMimeTypes['html']);
                HttpRequestProcessor.sendHeader(res, "Content-Length", str.length);
                HttpRequestProcessor.sendHeader(res, "Cache-Control", "no-cache");
                HttpRequestProcessor.endBlock(res);
                HttpRequestProcessor.sendResponse(res, -1, str);
                HttpRequestProcessor.endBlock(res);
                HttpRequestProcessor.flushBuffer(res);
            }
            
            InstalledAppHandler_Logger_Instance.write("log", ">>> InstalledAppHandler - doGET() <<<");
        },
        
        
        /**
         * _getDirs - private
         *
         * retrieves all immediate child directories (1 level down only) of path as an array
         */
        _getDirs: function(path) {
            //console.log("_getDirs: path - (" + path + ")");            
            if (!path) {
                InstalledAppHandler_Logger_Instance.write("error", "XXX InstalledAppHandler._getDirs path == null! XXX");
                return undefined;   
            }
            
            var dirs = [];
            
            try {
                var fts = new webOS.FTS(path, webOS.FTS.FTS_LOGICAL | webOS.FTS.FTS_NOSTAT);
                if (!fts.read()) { 
                    InstalledAppHandler_Logger_Instance.write("error", "XXX InstalledAppHandler._getDirs: fts.read() - directory (" + path + ") not found! XXX");
                    return undefined;
                }
                
                while (true) {
                    var entry = fts.read();
                    
                    if (!entry) {
                        break;
                    }
                    
                    if (entry.directory) {
                        fts.set(webOS.FTS.FTS_SKIP);
                    }
                    
                    if (!entry.postorderDirectory) {
                        if (entry.directory) {
                            dirs.push({name:entry.name+'/', path:entry.path+'/'});
                        }
                    }
                }
            } catch (err) {
                InstalledAppHandler_Logger_Instance.write("error", "XXX InstalledAppHandler._getDirs threw an Exception: (" + err + "), path: (" + path + ") XXX");
                return undefined;
            }
            
            dirs.each(function(dir){ dir.path=dir.path.replace(/\/\//g, '\/'); });
            
            //InstalledAppHandler_Logger_Instance.write("log", " *** InstalledAppHandler._getDirs: " + Object.toJSON(dirs) + " ***");
            return dirs;
        },
        
});


