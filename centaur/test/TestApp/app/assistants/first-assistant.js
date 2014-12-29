function FirstAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

FirstAssistant.prototype.handleButton1Press = function(event){
    this.controller.serviceRequest('palm://com.palm.systemservice', {
	    method: 'time/getSystemTime',
	    parameters: {subscribe:true},
		onSuccess: this.handleTime.bind(this)
	});	
}

FirstAssistant.prototype.handleButton2Press = function(event) {    
    var request = new Ajax.Request("/proxy?proxy=http://feeds.huffingtonpost.com/huffingtonpost/raw_feed", {
        method: "get",
        evalJSON: "false",
        onSuccess: this.handleAjax.bind(this),
        //onSuccess: function(transport) { console.log("Good !!! Success: ", transport); console.log("Response: " + transport.responseText + ", JSON: " + Object.toJSON(transport)); },
        //onFailure: function(transport) { console.log("XXX Something's seriously wrong !!!! : ", transport); },
     });
}

FirstAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
// a local object for button attributes
    this.button1Attributes = {};

// a local object for button model
    this.button1Model = {
        buttonLabel : 'Subscribe',
        buttonClass : '',
        disabled : false
    };

// set up the button
    this.controller.setupWidget("MyButton1", this.button1Attributes, this.button1Model);
// bind the button to its handler
    Mojo.Event.listen(this.controller.get('MyButton1'), Mojo.Event.tap, this.handleButton1Press.bind(this));
    
    this.button2Attributes = {};
    
    this.button2Model = {
        buttonLabel : 'Ajax XSS Call',
        buttonClass : '',
        disabled : false,
    };
    
    this.controller.setupWidget("MyButton2", this.button2Attributes, this.button2Model);
    Mojo.Event.listen(this.controller.get('MyButton2'), Mojo.Event.tap, this.handleButton2Press.bind(this));
}

FirstAssistant.prototype.handleTime = function(response){
	$('area-to-update').update("System Time is: <br><br>" + Object.toJSON(response));																	 
}

FirstAssistant.prototype.handleAjax = function(response) {
    console.log("Response: " + response.responseText);
    $('area-to-update').update(response.responseText);
}

FirstAssistant.prototype.handleErrResponse = function(response){
	$('area-to-update').update("Error service response: <br><br>" + Object.toJSON(response));																		 
}

FirstAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}

FirstAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

FirstAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  
	  // add cancel service request here ...	  
	  this.controller.stopListening(this.controller.get('MyButton1'), Mojo.Event.tap, this.handleButton1Press.bind(this));
	  this.controller.stopListening(this.controller.get('MyButton2'), Mojo.Event.tap, this.handleButton2Press.bind(this));	  
}



