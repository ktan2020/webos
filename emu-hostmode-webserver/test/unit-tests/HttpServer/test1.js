
include("prototype_triton.js");
include("GenericServer.js");
include("HttpServer.js");


function main() {
    var h = new HttpServer($H(GenericServerConfig).merge($H(HttpServerConfig)));
    
    console.log("Starting server ...");
    h.start();
}
