
include("prototype_triton.js");
include("GenericServer.js");
include("HttpServer.js");
include("HttpServlet.js");

function main() {
    var myHandler = Class.create({
            setOptions: function(o) { console.log("++++ o: " + o.inspect() + " ++++"); },
    });
    var h = new HttpServer($H(HttpServerConfig).merge($H(GenericServerConfig)));
    h.mount("/", (new myHandler()), $A(['DOCUMENT_ROOT','DIRECTORY_INDEX']));
}

