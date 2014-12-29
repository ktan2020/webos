/** This will this file to be considered private from a documentation perspective 
Copyright 2009 Palm, Inc.  All rights reserved.

*/
/**#@+   @private */

if (window.palmService === undefined && 
	window.PalmServiceBridge === undefined ) {

	window.PalmServiceBridge = Class.create({
		call: function(fullUrl, parameters) {
			this.fullUrl = fullUrl;
			this.parameters = parameters;
			var matches = fullUrl.match(this.serviceExpression);
			if (matches && matches.length == 3) {
				this.identifier = matches[1];
				this.method = matches[2];
				this.sendRequestToMojoHost();
			} else {
				var error = Object.extend({}, this.cannotExtractIdentifierError);
				error.errorText += this.fullUrl;
				this.sendResponse(error);
			}
		},

		sendRequestToMojoHost: function() {
			var params = this.parameters || "{}";
			var ajaxParams = {
				sessionID: window.parent.top.name,
				methodParams: params,
				serviceMethod: this.method,
				serviceName: this.identifier
			};
			var url = this.makeLunaHostUrl();
			this.request = new Ajax.Request(url, {
				method: 'get',
				parameters: ajaxParams,
				onSuccess: this.onSuccess.bind(this),
				onFailure: this.onFailure.bind(this)
			});

		},

		makeLunaHostUrl: function() {
			return "/bridge/handle_method.js";
		},

		makeNoSuchServiceError: function() {
			var error = Object.extend({}, this.noSuchServiceError);
			var template = new Template(error.errorText);
			error.errorText = template.evaluate(this);
			return error;
		},

		makeUnknownServiceError: function(transport) {
			var error = Object.extend({}, this.unknownServiceError);
			error.errorText += transport.status;
			error.errorText += ":";
			error.errorText += transport.responseText;
			return error;
		},

		onSuccess: function(transport) {
			var json = transport.responseText.evalJSON(true);
			
			if (!window.parent.comet.serviceBridgeManager) {
				window.parent.comet.serviceBridgeManager = new PalmServiceBridge.Manager();
			}
			window.parent.comet.serviceBridgeManager.requests[json.token] = this;
		},

		onFailure: function(transport) {
			if (transport.status == 501) {
				this.sendResponse(this.makeNoSuchServiceError());
			} else {
				this.sendResponse(this.makeUnknownServiceError(transport));
			}
		},

		sendResponse: function(error) {
			this.onservicecallback.defer({type: Object.toJSON(error)});
		},
		
		cancel: function() {
			
		},

		serviceExpression: /palm:\/\/([\w.]+)\/(.*)/,
		cannotExtractIdentifierError: {"returnValue":false, "errorCode":-1, "errorText":"Cannot extract identifier and method from "},  
		noSuchServiceError: {"returnValue":false, "errorCode":-1, "errorText":"mojo-host provides no service '#{identifier}' with method '#{method}'"},
		unknownServiceError: {"returnValue":false, "errorCode":-1, "errorText":"mojo-host error: "}
	});

	PalmServiceBridge.Manager = Class.create({
		initialize: function() {
			Mojo.Log.info("Creating PalmServiceBridge.Manager");
			this.requests = {};
		},
		
		callback: function(response) {
			Mojo.Log.info("PalmServiceBridge.Manager received callback - response:(" + response + ")"); 
			
			var token = response.token;
			var payload = response.payload;
			
			var req = this.requests[token];
			if (req) {
				try {
					req.onservicecallback(payload);
				} catch (err) {
					Mojo.Log.error("Exception in service callback: " + err);
				}
			}
		}
	});

}

/** This will this file to be considered private from a documentation perspective */
/**#@-*/
