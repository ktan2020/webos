
include("prototype_triton.js");
include("FileHandler.js");

function main() {
    var f = new FileHandler($H(FileHandlerConfig));
    
    include("HttpServer.js");
    var h = new HttpServer($H(HttpServerConfig));
    h.mount("/", f, $A(['DOCUMENT_ROOT','DIRECTORY_INDEX']));
    
    // trigger infinte # of onread events
    f.service($H({'Request-Line':'GET /test/ HTTP/1.1'}), null); 
}
