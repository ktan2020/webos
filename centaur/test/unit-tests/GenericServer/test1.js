
include("prototype_triton.js");
include("GenericServer.js");

function main() {
    var g = new GenericServer($H(GenericServerConfig));
    g.setServerHandler(function(c){ var r = c.read(1204); c.write(r); c.flush(); console.log("XXXXX " + Object.toJSON(r));});
    
    console.log("Starting Generic Server ...");
    g.start(); 
}
