
include("prototype_triton.js");
include("PalmServiceHandler.js");

function main() {
    var handler = new PalmServiceHandler();
    
    handler._passCallback(null, null, null);
}
