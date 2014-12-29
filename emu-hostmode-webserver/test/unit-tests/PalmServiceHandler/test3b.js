
//
// make a real service call to non-existant method ie. com.palm.triton_js_service/no_such_method
//

include("prototype_triton.js");
include("PalmServiceHandler.js");

function main() {
    
    var handler = new PalmServiceHandler();
    
    var h = $H({'query':{'sessionID':'0xdeadfeed','serviceName':'com.palm.triton_js_service','serviceMethod':'no_such_method','methodParams':'{}'},
                'uri':'/bridge/handle_method.js'});
    
    handler.doGET($H(), h);
    
    startApplicationLoop();
}


