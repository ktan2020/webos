/* This file does a bunch of stuff to allow us to run in a regular browser.
 * It loads the scripts individually, it emulates palmSystem, fakes launch parameters, etc.
 *
 * It assumes that Mojo.Core and Foundations are available to it.
 *
 * WARNING: This code is a hackfest and is non-performant. Do not use it for production
 * purposes.
 */

/*jslint evil: true */
/*globals palmGetResource _ PalmSystem Foundations */

(function() {
	console.warn("LOADING DEBUG ENVIRONMENT!");

	var home = '/usr/palm/frameworks/' + Mojo.MOJO_VERSION + Mojo.FRAMEWORK_HOME;

	function loadSourcesTxt() {
		var src = home + '/sources.txt';
		var sourceTxt = palmGetResource(src).trim();

		return sourceTxt.split('\n');
	}

	function injectFrameworkFiles() {
		var i, c, source;
		var sources = loadSourcesTxt();
		var len = sources.length;
		for(i=0; i < len; i++) {
			source = sources[i].trim();
			c = home + '/' + source;
			// HACK: We know that if the component isn't localized, there will only be one path
			document.write('<script type="text/javascript" src="' + c +'"><\/script>');
		}
	}

	function emulatePalmSystem() {
		var simAddBanner = function simulateAddBannerMessage () {
			console.info("Banner: %s", _.toArray(arguments).join(","));
		};
		var simPlaySoundNotification = function simPlaySoundNotification(soundClass, soundFile) {
			console.info("playSoundNotification: ", soundClass, soundFile);
		};
		var paramsFromURI = Foundations.StringUtils.parseQueryString(document.baseURI);
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
			identifier: Mojo.Core.App.name,
			isMinimal: false,
			
			windowIdentifier: 1,
			stageReady: function() {},
			prepareSceneTransition: function() {}, 
			runCrossAppTransition: function() {},
			runSceneTransition: function() {}, 
			cancelSceneTransition:  function() {},  
			crossAppSceneActive: function() {}, 
			paste: function() {}, 
			isActivated: 1,
			deactivate: function() {},
			addNewContentIndicator: function() {}, 
			removeNewContentIndicator: function() {}, 
			setAlertSound: function() {}
		};
	}

	function queryParamsToLaunchParams() {
		var queryParams = Foundations.StringUtils.parseQueryString(document.URL);
		PalmSystem.launchParams = queryParams.mojoHostLaunchParams || "{}";
		if (PalmSystem.launchParams === "undefined") {
			PalmSystem.launchParams = "{}";
		}
	}

	function unnecessaryWarnings() {
		var noSetInterval;
		if (Mojo.appInfo.noWindow && Mojo.Host.current !== Mojo.Host.browser && !window.opener) {
			noSetInterval = function() {
				console.warn("Cannot use the global setInterval function from a hidden window. Use window.setInterval from a visible window.");
			};
			window.setInterval = noSetInterval;
		}
	}

	function emulateHeadlessApps() {
		var launchPage = palmGetResource(Mojo.Widget.getSystemTemplatePath('emulated-launch.html'));
		window.addEventListener('DOMContentLoaded', function() {
			document.body.innerHTML = launchPage;
			document.getElementById('faceless_launch_button').addEventListener(Mojo.Event.tap, Mojo.Controller.doRelaunch);
		});
	}

	function pushQueryScene() {
		/* RWT- This is a useful hack for  development, as it allows you
		 * to load a particular scene in mojo-host by specifying it in
		 * the query parameters, for example
		 *    http://localhost:3000/apps/fr-playground?scene=textfields
		 */
		var queryParams = Foundations.StringUtils.parseQueryString(this.document.URL);
		var sceneName = queryParams.scene;
		if (sceneName) {// Does
			this.pushScene(sceneName);
		}
	}

	function setDefaultTimezone() {
		Mojo.Log.info("Setting up default timezone for browser: PST");
		var d = new Date();
		var m = d.toString().match(/\(([A-Z]+)\)/);
		Mojo.Format._TZ = (m && m[1]) || 'PST';
	}

	Mojo.Debug = {
		setupFakeEnvironment: function() {
			emulatePalmSystem();
			queryParamsToLaunchParams();
			if (Mojo.Core.App.info.noWindow) {
				emulateHeadlessApps();
			}
			setDefaultTimezone();
		}
	};

	injectFrameworkFiles();


})();
