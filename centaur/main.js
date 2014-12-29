
/**
 * main.js script for centaur
 */


include("prototype_triton.js");
include("Logger.js");
include("HttpServer.js");


var Logger = Class.create(Generic_Logger, {});
var Logger_Instance = new Logger($H({"LOG_LEVEL" : "info"}));


function main() {
    
    var port = getenv('PORT') || undefined;
    var doc_root = getenv('DOCUMENT_ROOT') || undefined;
    Logger_Instance.write("log", "<<< port: (" + port + "), doc_root: (" + doc_root + ") >>>");
     
    var serverConfig = $H({});
    if (port) serverConfig.set('PORT', port);
    if (doc_root) serverConfig.set('DOCUMENT_ROOT', doc_root);
    
    var config = ($H(GenericServerConfig).update($H(HttpServerConfig))).update(serverConfig);
    Logger_Instance.write("log", "<<< " + config.inspect() + " >>>");
    
    var server = new HttpServer(config);
    server.setClientDisconnect(function(){Logger_Instance.write("info", "*** Client disconnected! ***");});
    
    include("FileHandler.js");
    Logger_Instance.write("info", " ... [*] Mounting DOCUMENT_ROOT: (" + server.document_root + ") @ / ...");
    server.mount('/', new FileHandler(), {GET: $A(['DOCUMENT_ROOT','DIRECTORY_INDEX'])});
    
    include("PalmServiceHandler.js");
    Logger_Instance.write("info", " ... [*] Mounting Palm Service Bridge @ /bridge ...");
    server.mount('/bridge', new PalmServiceHandler(), {GET: $A(['DIRECTORY_INDEX'])});
    
    include("InstalledAppHandler.js");
    Logger_Instance.write("info", " ... [*] Mounting 3rd party installed apps @ /Apps ...");
    server.mount('/Apps', new InstalledAppHandler(), {GET: $A(['DOCUMENT_ROOT']), /*SET: {REWRITE: InstalledAppHandlerConfig.REWRITE}*/});
    Logger_Instance.write("info", " ... [*] Mounting Palm internal apps @ /PalmApps ...");
    server.mount('/PalmApps', new InstalledAppHandler($H({APP_INSTALL_PATH: '/usr/palm/applications/'})), {GET: $A(['DOCUMENT_ROOT'])});
    
    include("ProxyHandler.js");
    Logger_Instance.write("info", " ... [*] Mounting Proxy @ /proxy ...");
    server.mount("/proxy", new ProxyHandler());
    
    Logger_Instance.write("info", " ... starting Http Server on port: (" + server.port + "), document_root: (" + server.document_root +  ") ...");
    server.start();
    
}


