
include("prototype_triton.js");


var handle; 
var token;

function main() {
    
    try {
        function cb(m) {
            var s = Object.toJSON(m.payload());
            console.log("**** callback message.payload: (" + s + ") ****");
            
            handle.cancel(token);
        }
        
        handle = new webOS.Handle("", true);
        token = handle.call("palm://com.palm.systemservice/time/getSystemTime", Object.toJSON({subscribe:true}), cb, cb);
        //token = handle.call("palm://com.palm.connectionmanager/getStatus", Object.toJSON({subscribe:true}), cb, cb);
    } catch (err) {
        console.log("XXX Service call: palm://com.palm.systemservice/time/getSystemTime threw an Exception:  " + err + " XXX");   
    }
    
    startApplicationLoop();
    
}



