
var pb = require('/usr/palm/nodejs/palmbus');
var sys = require('sys');
 
function responseArrived(message) {
    sys.log("responseArrived[" + message.responseToken() + "]:" + message.payload());
}
 
sys.log("creating ls2 handle object");
 
//var h = new pb.Handle("com.sample.service", true);
var h = new pb.Handle("", false);
 
var p = {msg: "Rob"};
var s = JSON.stringify(p);
var call = h.call("palm://com.palm.node_js_service/test", s);
call.addListener('response', responseArrived);

