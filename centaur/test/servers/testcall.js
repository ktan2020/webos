
include("prototype_triton.js");

function main() {

    function passCb(message) {
        console.log("passCb!");
        console.log("payload: " + message.payload() + ", method: " + message.method() + ", category: " + message.category + ", applicationID: " + message.applicationID + ", sender: " + message.sender() + ", uniqueToken: " + message.uniqueToken() + ", kind: " + message.kind());
        //message.print();
    }

    function failCb(message) {
        console.log("failCb!");
        console.log("payload: " + message.payload() + ", method: " + message.method() + ", category: " + message.category + ", applicationID: " + message.applicationID + ", sender: " + message.sender() + ", uniqueToken: " + message.uniqueToken() + ", kind: " + message.kind());
        //message.print();
    }

    try {
        var service = new webOS.Handle("", true);
        //var token = service.call("palm://com.palm.triton_js_service/nosuchmethod", "{}", passCb, failCb);
        //var token = service.call("palm://com.palm.triton_js_service/error", "{}", passCb, failCb);
        //var token = service.call("palm://com.palm.triton_js_service/die", "{}", passCb, failCb);
        var token = service.call("palm://com.palm.triton_js_service/test", "{}", passCb, failCb);
        console.log("***** token: " + Object.toJSON(token) + " *****");
        if (token != null) { console.log("!=null"); } else { console.log("==null"); }
      
        token = service.call("palm://com.palm.triton_js_service/test", "{}", passCb, failCb);
        console.log("***** token: " + Object.toJSON(token) + " *****");   
     
        startApplicationLoop();
    
        quit.delay(3);
    } catch (err) {
        console.log("XXX Caught an Exception: " + err + " XXX");
    }
}
