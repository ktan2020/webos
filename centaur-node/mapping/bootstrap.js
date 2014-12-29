
(function() {

        if (window.top!==window) window.top.logDebug("*** bootstrap.js - bootstrapping hacks now ***");
        
        document.write("<script type='text/javascript' src='/usr/palm/frameworks/mojo-core.js'></script>");

        var parseQueryString = function(queryString) {
            var result = {};
            
            if (!queryString){
                return result;
            }
            
            if (queryString.charAt(0) == '?') queryString = queryString.substring(1);
            queryString = queryString.replace(/\+/g, ' ');
            
            var queryComponents = queryString.split(/[&;]/g);
            for (var i = 0; i < queryComponents.length; i++) {
                var keyValuePair = queryComponents[i].split('=');
                var key = decodeURIComponent(keyValuePair[0]);
                var value = decodeURIComponent(keyValuePair[1]);
            
                if (!result[key]) result[key] = [];
                result[key].push((keyValuePair.length == 1) ? '' : value);
            }
            return result;
        }

        var simActivate = function simulateActivate() {
            if (window.top!==window) window.top.logDebug("PalmSystem.activate called.");
            else console.log("PalmSystem.activate called.");
        };
        var simAddBanner = function simulateAddBannerMessage () {
            if (window.top!==window) window.top.logDebug("Banner: %s", JSON.stringify(arguments));
			else console.log("Banner: %s", JSON.stringify(arguments));
		};
		var simPlaySoundNotification = function simPlaySoundNotification(soundClass, soundFile) {
		    if (window.top!==window) window.top.logDebug("playSoundNotification: ", soundClass, soundFile);
		    else console.log("playSoundNotification: ", soundClass, soundFile);
		};
		var paramsFromURI = parseQueryString(document.baseURI);
		
		window.PalmSystem = {
			deviceInfo: '{"screenWidth": ' + document.width + 
				', "screenHeight": ' + document.height +
				', "minimumCardWidth": ' + document.width +
				', "minimumCardHeight": 188, "maximumCardWidth": ' +
				document.width + ', "maximumCardHeight": ' + document.height +
				', "keyboardType": "QWERTY"}',
			launchParams: paramsFromURI.launchParams || "{}",
			addBannerMessage: simAddBanner,
			removeBannerMessage: function() {},
			clearBannerMessages: function() {},
			simulateMouseClick: function() {},
			stageReady: function() {},
			playSoundNotification: simPlaySoundNotification,
			runTextIndexer: function(a) { return a;},
			version: "mojo-host",
			simulated: true,
			timeFormat: "HH12",
			locale: paramsFromURI.mojoLocale || "en_us",
			localeRegion: paramsFromURI.mojoLocaleRegion || "en_us",
			screenOrientation: 'up',
			windowOrientation: 'up',
			receivePageUpDownInLandscape: function() {},
			enableFullScreenMode: function() {},
			setWindowProperties: function() {},
			identifier: document.baseURI.split('/')[document.baseURI.split('/').length-2],
			isMinimal: false,
			
			activate: function() {},
            activityId: 1, // attr
			windowIdentifier: 1, // attr
			stageReady: function() {},
			prepareSceneTransition: function() {}, 
			runCrossAppTransition: function() {},
			runSceneTransition: function() {}, 
			cancelSceneTransition:  function() {},  
			crossAppSceneActive: function() {}, 
			paste: function() {}, 
			isActivated: 1, // attr
			deactivate: function() {},
			addNewContentIndicator: function() {}, 
			removeNewContentIndicator: function() {}, 
			setAlertSound: function() {}
		};

		if (window.top!==window) window.top.logDebug("*** bootstrapping done ***");

})();

