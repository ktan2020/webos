
include("prototype_triton.js");
include("FileHandler.js");

function main() {
    var f = new FileHandler();
    var h = new Object();
    
    include("HttpServer.js");
    var g = new HttpServer();
    g.mount("/", h, null);
}
