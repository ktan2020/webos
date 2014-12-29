
//
// make a real service call to com.palm.triton_js_service/test 
//

include("prototype_triton.js");
include("PalmServiceHandler.js");

function main() {
    
    var handler = new PalmServiceHandler();
    
    var h = $H({'query':{'sessionID':'0xdeadfeed','serviceName':'com.palm.triton_js_service','serviceMethod':'test','methodParams':'{}'},
                'uri':'/bridge/handle_method.js'});
    
    var g = $H({'query':{'sessionID':'0xdeadfeed','serviceName':'com.palm.triton_js_service','serviceMethod':'error','methodParams':'{}'},
                'uri':'/bridge/handle_method.js'});
    
    handler.doGET($H(), h);
    handler.doGET($H(), h);
    handler.doGET($H(), g);
    
    startApplicationLoop();
}


