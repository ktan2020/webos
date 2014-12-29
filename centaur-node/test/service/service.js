
var pb = require('/usr/palm/nodejs/palmbus');
var sys = require('sys');
var _ = require('./underscore')._;
 
var h;
 
sys.log("creating javascript service");
 
function testCallback (message) {
    sys.log("payload in testCallback: '" + message.payload() + "'");
    message.respond("ahoy, matie " + message.payload())
}
 
function errorCallback (message) {
    message.respond("bang");
    var x = thingThatDoesntExist;
}
 
function dieCallback (message) {
    message.respond("bye bye")
    _.delay(process.exit, 1);
}
 
function requestArrived(message) {
    sys.log("requestArrived");
    message.print();
    switch(message.method()) {
    case "test":
        testCallback(message);
        break;
    case "die":
        dieCallback(message);
        break;
    case "error":
        errorCallback(message);
        break;
    }
}
 
h = new pb.Handle("com.palm.node_js_service", false);
h.registerMethod("", "test")
h.registerMethod("", "die")
h.registerMethod("", "error")
 
h.addListener('request', requestArrived);
