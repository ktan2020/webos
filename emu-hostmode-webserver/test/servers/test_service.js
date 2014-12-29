

var handles = [];


function main () {
	console.log("*** creating javascript service ***");

	function testCallback (message) {
	    console.log("<<< testCallback >>>");
	    
		message.respond("ahoy, matie");
		
		console.log(">>> testCallback <<<");
	}

	function errorCallback (message) {
	    console.log("<<< errorCallback >>>");
		
	    message.respond("bang");
		var x = thingThatDoesntExist;
		
		console.log(">>> errorCallback <<<");
	}

	function dieCallback (message) {
	    console.log("<<< dieCallback >>>");
	    
		message.respond("bye bye");
		quit.delay(1);
		
		console.log(">>> dieCallback <<<");
	}
	
	function longPollCallback (message) {
	    console.log("<<< longPollCallback >>>");
	    
	    setTimeOut(longPollCallback, 1500);
	    
	    console.log(">>> longPollCallback <<<");
	}

	try {
        h = new Triton.Handle("com.palm.triton_js_service");
        handles[handles.length] = h;
        h.registerMethod("", "test", testCallback);
        h.registerMethod("", "die", dieCallback);
        h.registerMethod("", "error", errorCallback);
	} catch (err) {
	    console.log("XXX Fatal: Caught exception - " + err + " XXX");
	}
	
	startApplicationLoop();
}

