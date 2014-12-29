/*$
 * @name controller_stage.js
 * @fileOverview DOC TBD: describe the StageController file
 * See {@link Mojo.Controller.StageController} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*globals Mojo PalmSystem Mojo _ Foundations window */

/**
 * class Mojo.Controller.StageController
 * This class provides methods to manipulate scene on the stage.
 *
 * This class provides methods to manipulate scene on the stage.
 * A stage is an HTML structure very similar to a standard browser window. 
 * A single application may have multiple stages and a single stage may contain multiple scenes.
 **/
Mojo.Controller.StageController = function() {
	this.initialDelegatedCalls = [];
	this.delegateToSceneAssistant = this.preInitDelegate;
	this.fullInit = false;
	this.sendEventToCommanders = this.sendEventToCommanders.bind(this);
	this.handleBack = this.handleBack.bind(this);
};


Mojo.Controller.StageController.prototype = {

	/*$ @private */
	kDefaultSceneName: 'main',
	kSceneClassName: 'palm-scene',
	kBrowserObject: 'application/x-palm-browser',
	enableAltCharPicker: true,  //set to false if you dont want the alt char picker
	
	
	handleDocumentLoaded: function(appController, stageWindow) {
		//console.time('handleDocumentLoaded');
		var that = this, focusWrapper;
		var bodyClassName = 'palm-default';
		this.window = stageWindow || window;
		this.document = this.window.document;		
		this.paramsFromURI = Foundations.StringUtils.parseQueryString(this.document.baseURI);
		this.stageType = this.paramsFromURI.window || "card";
		
		this.fullInit = true;
		
		this._stagePreparing = true; // we are still preparing, and must call PalmSystem.stageReady() after first scene push.
		
		switch(this.stageType) {
		case Mojo.Controller.StageType.popupAlert:
			bodyClassName = 'palm-popup-notification';
			break;
		case Mojo.Controller.StageType.bannerAlert:
			bodyClassName = 'palm-banner-notification';
			break;
		case Mojo.Controller.StageType.dashboard:
			bodyClassName = 'palm-dashboard-notification';
			break;
		}
		Mojo.Dom.addClassName(this.document.body, bodyClassName);
		this._sceneStack = new Mojo.SceneStack();
		this._commanderStack = new Mojo.CommanderStack();

		this._appController = appController;
		
		this._deferredSceneOps = [];
		this._deferredLoadingScenes = [];
		this._deferredSceneOpLoader = this._deferredSceneOpLoader.bind(this);
		this._deferredSceneOpExecutor = this._deferredSceneOpExecutor.bind(this);

		this._endTransition = this._endTransition.bind(this);
		this._useSceneTransitions = true;
		
		// Add ourselves to this stage's commander stack so we can
		// provide default behavior for special keys like 'escape/back'.
		this.pushCommander(this);

		// push the app assistant on the commander chain to handle commands or notification processing
		if (appController && appController.assistant) {
			this.pushCommander(appController.assistant);
		}

		// Register a global key observer on the document.
		// We use this to convert special keys into mojo-events.
		this._boundKeyHandler = this._keyHandler.bind(this);
		this.document.addEventListener('keyup', this._boundKeyHandler, false);
		this._boundKeyDownHandler = this._keyDownHandler.bind(this);
		this.document.addEventListener('keydown', this._boundKeyDownHandler, false);
		this._boundKeyPressHandler = this._keyPressHandler.bind(this);
		this.document.addEventListener('keypress', this._boundKeyPressHandler, false);

		this.document.addEventListener(Mojo.Event.back, this.handleBack);
		this.document.addEventListener(Mojo.Event.forward, this.sendEventToCommanders);
		this.document.addEventListener(Mojo.Event.up, this.sendEventToCommanders);
		this.document.addEventListener(Mojo.Event.down, this.sendEventToCommanders);

		this._cleanup = this._cleanup.bind(this);
		this.window.addEventListener('unload', this._cleanup, false);

		// WARNING: It turns out that this is actually wrong for the Launcher & status bar stages, created at boot... it's not initially active.
		// Launcher will, for the moment, directly set the appropriate state in the stageController to false instead.
		this.updateActive(true);
		
		focusWrapper = function() {
			Mojo.Log.warn("Calling window.focus() is deprecated. Use the stage controller activate() method.");
			that.activate();
		};
		
		this.window.focus = focusWrapper;
		if (this.isChildWindow()) {
			Mojo.Locale.loadLocaleSpecificStylesheets(this.document);
		}
		//console.timeEnd('handleDocumentLoaded');
	},

	/*$
	 * @private
	 * Called when the window is closed.
	 * Gives app scene & stage assistants a chance to clean up.
	 */
	_cleanup: function() {
		var stageName;
		var appController = Mojo.Controller.appController;
		var appAssistantCleanup = appController.getAssistantCleanup();
		var winRef = this.window;
		winRef.removeEventListener('unload', this._cleanup, false);
		if (winRef.PalmSystem && winRef.PalmSystem.windowIdentifier) delete appController._stageMgr._creationIdHash[winRef.PalmSystem.windowIdentifier];
		
		// Deactivate scene stack & pop all scenes synchronously.
		// This ensures that cleanup code won't typically execute after the window has been closed.
		this._sceneStack.deactivate();
		this._sceneStack.popScenesTo();
		
		// Cancel any deferred scene ops & transition that might be in progress.
		this._cancelDeferredSceneOps();
		
		try {
			// Call assistant's cleanup method, if any:
			if(this.assistant && this.assistant.cleanup) {
				this.assistant.cleanup();
			}
		} catch(e) {
			Mojo.Log.logException(e, "WARNING: Error cleaning up stage assistant.");
		} 

		stageName = this.window.name;
		Mojo.Gesture.cleanup(this.document);
		Mojo.Controller.appController._stageMgr.removeStageRef(stageName, this.window);
		
		try {
			if (!this.isChildWindow()) {
				Mojo.Controller.appController.closeNonMainStages();
				if (appAssistantCleanup) {
					appAssistantCleanup();
				}
			}
		} catch(e2) {
			Mojo.Log.logException(e2, "WARNING: Error cleaning up app assistant.");
		} 
		
		this.document.removeEventListener('keyup', this._boundKeyHandler, false);
		this.document.removeEventListener('keydown', this._boundKeyDownHandler, false);
		this.document.removeEventListener('keypress', this._boundKeyPressHandler, false);
		
		this.document.removeEventListener(Mojo.Event.back, this.handleBack);
		this.document.removeEventListener(Mojo.Event.forward, this.sendEventToCommanders);
		this.document.removeEventListener(Mojo.Event.up, this.sendEventToCommanders);
		this.document.removeEventListener(Mojo.Event.down, this.sendEventToCommanders);

		this.document.removeEventListener(Mojo.Event.windowActivate, this.activatedHandler);
		this.document.removeEventListener(Mojo.Event.windowDeactivate, this.deactivatedHandler);
		
		this.indicateNewContent(false);
		
	},

	/*$
	 * @private
	 * Installed as the stage activation & deactivation callbacks, called by SysMgr.
	 */
	updateActive: function(isActive, e) {
		if (isActive) {
			if(this.stageType !== Mojo.Controller.StageType.popupAlert) {
				this.indicateNewContent(false);
			}
			if(this.assistant && this.assistant.activate) {
				this.assistant.activate();
			} 
		} else {
			if(this.assistant && this.assistant.deactivate) {
				this.assistant.deactivate();
			} 
		}
	},

	/*$
	 * Return the current application controller.
	 */
	getAppController: function() {
		return this._appController;
	},


	isActive: function() {
		return (this.window.PalmSystem && this.window.PalmSystem.isActivated) ? this.window.PalmSystem.isActivated : null;
	},

	/**
	 * Mojo.Controller.StageController#isActiveAndHasScenes() -> undefined
	 *
	 * Returns true if the stage is both active and has currently pushed.
	 **/
	isActiveAndHasScenes: function() {
		return this.isActive() && !!this.topScene();
	},
	
	/*$
	 * @private
	 */
	isFocusedAndHasScenes: function() {
		return this.isActiveAndHasScenes();
	},
	
	/**
	 * Mojo.Controller.StageController#activate() -> undefined
	 *
	 * Programmatically activate this stage.
	 * Causes card windows to be maximized.
	 **/
	activate: function() {
		if (this.window.PalmSystem && this.window.PalmSystem.activate) {
			this.window.PalmSystem.activate();
		}
	},
	
	/**
	 * Mojo.Controller.StageController#deactivate() -> undefined
	 *
	 * Programatically deactivate this stage.
	 * Causes card windows to be minimized.
	 **/
	deactivate: function() {
		if (this.window.PalmSystem && this.window.PalmSystem.deactivate) {
			this.window.PalmSystem.deactivate();
		}
	},
	
	
	/*$
	 * Returns true of there are pending scene operations.
	 * Note that this CANNOT be used to determine whether there are scene operations currently in progress...
	 * After the first stage of a scene transition, the deferredSceneOps array is cleared to allow queuing of 
	 * successive operations separately from the current batch.
	 * @private
	 */
	hasPendingSceneOperations: function() {
		var deferredSceneOps = this._deferredSceneOps;
		return deferredSceneOps && deferredSceneOps.length > 0;
	},

	setSceneVisibility: function(sceneController, visible) {
		var targetElement;
		
		if (sceneController.sceneScroller) {
			targetElement = sceneController.sceneScroller;
		} else {
			targetElement = sceneController.sceneElement;
		}
		
		if (visible) {
			if (!Mojo.Dom.visible(targetElement)) {
				Mojo.Dom.show(targetElement);
			}
			sceneController.showWidgetContainer(targetElement);
		}
		
		if (!visible && Mojo.Dom.visible(targetElement)) {
			sceneController.hideWidgetContainer(targetElement);
			Mojo.Dom.hide(targetElement);
		}
		
	},

	deleteDelegationQueue: function() {
		this.delegateToSceneAssistant = this.postInitDelegate;
		delete this.initialDelegatedCalls;
	},
	
	executeDelegation: function(assistant, sceneArgs) {
		var methodName = sceneArgs.shift();

		var f = assistant && assistant[methodName];
		if (f) {
			f.apply(assistant, sceneArgs);
		}
	},
	
	executeDelegationQueue: function() {
		var scene = this.activeScene();
		var assistant = scene && scene.assistant;
		var executeDelegation = this.executeDelegation.bind(this, assistant);

		if(assistant) {
			this.initialDelegatedCalls.forEach(executeDelegation); 
		}		
	},
	
	isFullyInitialized: function() {
		return this.fullInit;
	},
	
	isReadyForDelegation: function() {
		return this.fullInit && !this.hasPendingSceneOperations();
	},
	
	preInitDelegate: function() {
		if(this.initialDelegatedCalls) {
			this.initialDelegatedCalls.push(_.toArray(arguments));
		} else {
			this.postInitDelegate.apply(this, _.toArray(arguments));
		}
	},
	
	postInitDelegate: function() {
		var scene = this.topScene();
		var args = _.toArray(arguments);
		var assistant = scene && scene.assistant;
		
		this.executeDelegation(assistant, args);
	},
	
	/**
	 * Mojo.Controller.StageController#delegateToSceneAssistant(functionName[, args ]) -> undefined
	 * - functionName (String): name of property to use to get the function
	 *   to call.
	 * - args (Arguments): Any number of arguments to pass to the scene
	 *   assistant function.
	 *
	 * Use to call a method on the assistant of the current scene of this stage. The first
	 * parameter is the name of the property that contains the function to call. The remaining
	 * parameters are passed to that function. The `this` keyword is bound to the scene assistant
	 * for this call.
	 **/
	delegateToSceneAssistant: Mojo.doNothing,

	setupStageAssistant: (function() {
		function defaultConstructor(winName) {
			if(winName) {
				return window[Mojo.identifierToCreatorFunctionName(winName, "StageAssistant")];
			}
		}

		function setupStageAssistant() {

			// This really has nothing to do with the StageAssistant, but this is the 
			// first method that gets called after Mojo is set up in the child window.
			// TODO: It would be tidier to explicitly call a StageController.setup() method, 
			// and call setupStageAssistant() from there.
			Mojo.Event.listen(
				this.document,
				Mojo.Event.screenRotate,
				this.screenOrientationChanged.bind(this));
			this.window.Mojo.sceneTransitionCompleted = Mojo.doNothing;

			// Set up stage activation callbacks.
			this.activatedHandler = this.updateActive.bind(this, true);
			this.deactivatedHandler = this.updateActive.bind(this, false);
			this.document.addEventListener(Mojo.Event.windowActivate, this.activatedHandler);
			this.document.addEventListener(Mojo.Event.windowDeactivate, this.deactivatedHandler);

			this.body = this.document.body;

			var defaultStageAssistantName;
			if (!this.isChildWindow()) {
				defaultStageAssistantName = "StageAssistant";
			}
			var assistantName = this.paramsFromURI.assistantName || defaultStageAssistantName;

			var ConstructorFunction = Mojo.findConstructorFunction(assistantName) || defaultConstructor(this.window.name);
			if (ConstructorFunction) {
				this.assistant = new ConstructorFunction(this);
				this.assistant.controller = this;

				if(this.assistant.setup) {
					this.assistant.setup();
				}

				// push the stage assistant on the commander chain to handle commands or notification processing
				this.pushCommander(this.assistant);

			}

			// If there isn't an assistant or the create callback didn't push any scenes, then we try to push a default scene.
			// Any push operations would be on the deferred scene op queue at this point, so we can just check the length.
			// Note that we never do this in child stages, since the stageCreated callback should push scene.
			if(!this.hasPendingSceneOperations()  && !this.isChildWindow() && !this.assistant) {
				this.pushScene(this.kDefaultSceneName);
			}

		}
		
		return setupStageAssistant;
	})(),
	
	/**
	 * Mojo.Controller.StageController#isChildWindow() -> boolean
	 *
	 * Utility function to find out if the current window is a child window.
	 *
	 * returns true for child windows.
	 **/
	isChildWindow:  function() {
		return Mojo.Controller.isChildWindow(this.window);
	},
	

	/*$
	 * @returns {Boolean} returns true if the current stage has new content for the indicator, and false otherwise.
	 */
	hasNewContent: function() {
		return !!this._throbId;
	},
	
	/*$
	 * Change properties of the window.
	 * @param {Object} props A map representing the properties to change.  Keys are the property names, and values are the new values.
	 * Possible values include:
	 * <table border="1">
	 * <tr><td>blockScreenTimeout</td><td>Boolean.  If true, the screen will not dim or turn off in the absence of user activity.  If false, the timeout behavior will be reinstated.</td></tr>
	 * <tr><td>setSubtleLightbar</td><td>Boolean.  If true, the light bar will be made somewhat dimmer than normal.  If false, it will return to normal.</td></tr>
	 * <tr><td>fastAccelerometer</td><td>Boolean.  If true, the accelerometer rate will increase to 30mhz; false by default, rate is at 4hz. Note fast rate is active only for apps when maximized.</td></tr>
	 * </table>
	 */
	setWindowProperties: function(props) {
		// Pass through to PalmSystem.  Assume it's the responsibility of PalmSystem.setWindowProperties()
		// to deal with properties it's never heard of.
		if (this.window.PalmSystem && this.window.PalmSystem.setWindowProperties) this.window.PalmSystem.setWindowProperties(props);
	},

	/*$
	 * @private
	 */
	frameworkHideSplashScreen: function() {
		if(this._stagePreparing) {
			//console.timeEnd('activation time');
			Mojo.Controller.appController.frameworkHideSplashScreen(this.window);
		}
	},
	
	/**
	 * Mojo.Controller.StageController#enableManualSplashScreenMode() -> undefined
	 *
	 * This may be called on a stageController to manually control when the
	 * stage's splash screen is taken down
	 *
	 * JS Example
	 * ----------
	 * 
	 *    var pushSecond = function(stageController) {
	 *            stageController.enableManualSplashScreenMode();
	 *            stageController.pushScene('second');
	 *
	 *            setTimeout(function(){stageController.hideSplashScreen();}, 10000);
	 *    }
	 *    Mojo.Controller.getAppController().createStageWithCallback({
	 *           name: "newDelayed",
	 *           lightweight: true
	 *    }, pushSecond.bind(that));
	 **/
	enableManualSplashScreenMode: function() {
		Mojo.Controller.appController.enableManualSplashScreenMode(this.window);
	},
	
	/*$
	 * @function
	 * @description to be used with enableManualSplashScreenMode, see its description
	 */
	hideSplashScreen: function() {
		this._stagePreparing = undefined;		
		Mojo.Controller.appController.hideSplashScreen(this.window);
	},
	
	/*$
	 * Makes the core navi button pulsate if true. This is mainly intended to alert the user to dashboard
	 * events that desire user attention.
	 *
	 */
	indicateNewContent: function(hasNew) {
		if(this.window.PalmSystem && this.window.PalmSystem.addNewContentIndicator && this.window.PalmSystem.removeNewContentIndicator) {
			if(hasNew) {
				if(this._throbId) {
					this.window.PalmSystem.removeNewContentIndicator(this._throbId);
				} 
				this._throbId = this.window.PalmSystem.addNewContentIndicator();
				
			} else {
				if(this._throbId) {
					this.window.PalmSystem.removeNewContentIndicator(this._throbId);
					delete this._throbId;
				} 
			}
		}		
	},
	
	
	/*$
	 * Sends the given event through the entire command chain,
	 * starting with the CommanderStack in the current scene,
	 * and progressing to the StageController's stack if the
	 * current scene does not call Mojo.Event.stopPropagation().
	 * @param {Object} event
	 */
	sendEventToCommanders: function(eventToSend) {
		var scene = this.activeScene();

		if(!eventToSend._mojoPropagationStopped) {
			
			if (scene) {
				if(eventToSend.type === Mojo.Event.back) {
					scene.commitChanges();
				}
				
				scene.getCommanderStack().sendEventToCommanders(eventToSend);
			}
			
			if(!eventToSend._mojoPropagationStopped) {
				this._commanderStack.sendEventToCommanders(eventToSend);
			}
			

		}
	},

	/*$
	 * @private
	 */
	sendNotificationDataToCommanders: function(notificationData) {
		var scene = this.activeScene();

		if (scene && notificationData) {
			notificationData = scene.getCommanderStack().sendNotificationDataToCommanders(notificationData);
		}

		if(notificationData) {
			notificationData = this._commanderStack.sendNotificationDataToCommanders(notificationData);
		}

		return notificationData;
	},

	/*$
	 * Adds the given commander to the top of this StageController's stack.
	 * The commanders in this stack are only used when this scene is the current scene.
	 * @param {Object} cmdr
	 */
	pushCommander: function(cmdr) {
		this._commanderStack.pushCommander(cmdr);
	},

	/*$
	 * Removes a commander from the commander stack.
	 * @param {Object} cmdr commander to remove.
	 */
	removeCommander: function(cmdr) {
		this._commanderStack.removeCommander(cmdr);
	},

	/*$ @private
	 * Obtain the commander stack for this scene.
	 * When this is the current scene, this commander stack forms
	 * the first half of the commander chain.
	 */
	getCommanderStack: function() {
		return this._commanderStack;
	},

	/*$
	 * Return the topmost scene from this stage.
	 */
	topScene: function() {
		return this._sceneStack.currentScene();
	},
	
	/*$
	 * Return the currently active scene from this stage, if any.
	 * If no scenes are active, returns undefined.
	 */
	activeScene: function() {
		var curScene = this.topScene();
		if(curScene && curScene.isActive()) {
			return curScene;
		}
	},
	
	/*$
	 * Returns the scene assistant of the scene above this scene in the
	 * scene stack, or undefined if there is no such scene.
	 */	
	parentSceneAssistant: function(targetSceneAssistant) {
		return this._sceneStack.parentSceneAssistant(targetSceneAssistant);
	},
	
	/*$
	 * Sets the orientation of the stage's window.
	 *
	 * @param {String} orientation One of 'up', 'down', 'left', 'right', or 'free'
	 */
	setWindowOrientation: function(orientation) {
		if (this.window.PalmSystem && this.window.PalmSystem.windowOrientation) {
			this.window.PalmSystem.windowOrientation = orientation;
		}
	},
	
	/*$
	 * Gets the orientation of the stage's window.
	 *
	 * @param {String} orientation One of 'up', 'down', 'left' or 'right'
	 */
	getWindowOrientation: function() {
		if (this.window.PalmSystem && this.window.PalmSystem.windowOrientation) {
			return this.window.PalmSystem.windowOrientation;
		}
		return 'up';
	},

	/*$
	 * Loads a stylesheet -- and any versions of it for the current locale --
	 * into the stage's document.
	 *
	 * @param {String} path A path from which to load the stylesheet that is relative 
	 *                      either to the given root, or the application's root 
	 *                      directory if root is not specified 
	 */
	loadStylesheet: function(path, root) {
		Mojo.loadStylesheet(this.window.document, path, root);
		Mojo.Locale._loadLocalizedStylesheet(this.window.document, path, root);
	},

	/*$
	 * Unloads a stylesheet -- and any versions of it for the current locale --
	 * from the stage's document.
	 *
	 * @param {String} path A path relative to the application's root directory 
	 *                      specifying the stylesheet to unload.
	 */
	unloadStylesheet: function(path, root) {
		var i;
		var theDocument = this.window.document;
        if ( root ) {
            // root is defined only for loadable frameworks
            path = root + (root.charAt(root.length-1) != '/' ? '/' : "") + path;
	    }
		var links = theDocument.querySelectorAll('link[type="text/css"][href$="' + path + '"]');
		var head = theDocument.querySelector('head');
		if (!head) {
		Mojo.Log.warn("No <head> element!");
			return;
		}

		for (i = 0; i < links.length; ++i) {
			links[i].disabled = true;
			head.removeChild(links[i]);
		}
	},

	/*$
		Returns an array of scene controllers currently on the stack.
		result[0] is the bottom scene on the stack.
	*/
	getScenes: function() {
		return this._sceneStack.getScenes();
	},	
	
	/*$ @private */
	useSceneTransitions: function(enabled) {
		this._useSceneTransitions = enabled;
	},
	
/*$
 * Push a new scene; the Scene Lifecycle initial setup includes this function.
 * Note that this is an asynchronous operation.
 * An app calls `stageController.pushScene('myScene')`:
 * 
 * 1. A div is created with the view HTML for the new scene, and inserted into the `<body>`.
 * 2. A SceneController for 'myScene' is instantiated.
 * 3. A scene assistant for 'myScene' is instantiated, if available.
 * 4. The new scene is placed on the stage's scene stack then the Scene Controller and 
 *    assistant's `setup()` methods are called and Widgets (divs that specify 
 *    x-mojo-element) are created, rendered, and added to the DOM.
 *
 * At this point, scene should now be ready for initial display, even if the app is waiting for 
 * a service request to complete to provide dynamic data to fill out the scene.
 * 
 * 1. The StageController transitions the scene onto the stage.
 * 2. When the transition is complete, the scene controller and assistant's
 *    `activate` method is called, and the scene is ready for action.
 * 
 *
 * @param {String|Object} sceneArguments	either the name of the scene to push, or
 *											an object with these properties:
 *											{ name, assistantConstructor, sceneTemplate, [templateRoot], [id] }
 *											Note that all additional arguments are passed to the constructor of the next scene's assistant.
 * @since 1.4 sceneArguments allows for template substitution on the new scene's html via a templateModel property. This is passed as 'object' to Mojo.View.render.
 */
	pushScene: function(sceneArguments) {
		var myArguments;
		
		myArguments = _.toArray(arguments);
		myArguments.shift(); // drop sceneArguments
		this._deferSceneOperation(this._syncPushOperation.bind(this, 'pushScene', sceneArguments, myArguments), false, sceneArguments);
	},
	
	/*$
	 * Pops the current scene and simultaneously pushed a new scene without 
	 * activating & deactivating any underlying scenes.
	 * Note that this is an asynchronous operation.
	 * 
	 * @param {String|Object} sceneArguments either the name of the scene to push, or
	 *                        an object with properties including the name of the scene
	 *                        and the id to use as a DOM id.
	 * @since 1.4 sceneArguments allows for template substitution on the new scene's html via a templateModel property. This is passed as 'object' to Mojo.View.render.
	 */
	swapScene: function(sceneArguments) {
		var myArguments;
		
		myArguments = _.toArray(arguments);
		myArguments.shift(); // drop sceneArguments
		this._deferSceneOperation(this._syncPushOperation.bind(this, 'swapScene', sceneArguments, myArguments), false, sceneArguments);
	},
	
	/*
		Internal sequence of events for pushing/popping a scene:
		
		Phase One: Pushing/popping potentially multiple scenes on the stack.
		
		1. Push/pop scene called.
		2. A deferred scene operation is queued up, consisting of:
			{
				op: A function to perform the operation on the scene stack.
				transition: optional transition from the push/pop arguments, if specified.
				scene: sceneController to operate on.
				name: name of the scene to push
				isPop: boolean, true for pop operations.
			}
		
		3. For push operations, the name of the scene is recorded so we can handle lazy scene assistant loading.
		
		4. Execution of deferred scene ops is deferred, so we can go to #1 at this point.
		
		...
		Phase Two: Lazy Scene Assistant Loading
		1. If there are any scene assistants that we need to load, then we do it here asynchronously, and begin Phase Three when it's complete.
		2. If there are no scene assistants to load, we skip straight to Phase Three.
		
		Phase Three: Execution of Deferred Scene Ops
		1. Create a scene transition object to "snapshot" the current scene and prepare for the graphicsl transition.
			We always use the transition of the last scene op in the queue.  
			If this has been determined already, and is 'none', then we avoid creating the transition object here.		
		2. If there's a current scene, deactivate it.  Create a transition object (which snapshots it) if transition != none.
		3. Execute all deferred scene ops in order.
		4. Perform "aboutToActivate" sequence on the new top scene, an async operation.
		
		Phase 4: Activate the new scene.
		5. Run the scene transition.
		6. When transition is complete, activate the new scene.
		7. Repeat, if we've gotten any more push/pop requests in the mean time.
		
	*/
	
	
	
	/*$ @private
		Deferred function for creating new scene, used by pushScene & swapScene.
		Allows us to defer creation of the scene assistant too, so code running in the 
		assistant constructor function can't confuse us as easily.
	*/
	_syncPushOperation: function(opName, sceneArguments, myArguments, deferredOp) {
		//console.time('syncpushop');
		//console.time('preparenewscene');
		var scene = this._prepareNewScene(sceneArguments, myArguments);
		//console.timeEnd('preparenewscene');
		if(scene) {
			//console.time('pushnewscene');
			this._sceneStack[opName](scene);
			//console.timeEnd('pushnewscene');
			
			// If push args did not specify a transition, then use the scene's default:
			deferredOp.transition = deferredOp.transition || scene.defaultTransition;
		}
		//console.timeEnd('syncpushop');
	},
	
	
	/*$
	 * Removes a scene from the scene stack, passing the return value
	 * to the newly revealed scene's activate method.
	 * Note that this is an asynchronous operation.
	 * 
	 * @param {Object} returnValue Value passed to the next scene active method
	 * @param {Object} options Optional object that can specify:
     *      {
	 *          transition: @see Mojo.Transition
	 *      }
	 */
	popScene: function(returnValue, options) {
		this._deferSceneOperation(this._sceneStack.popScene.bind(this._sceneStack, returnValue), true, options);
	},
	
	/*$
	 * Removes scenes from the scene stack until the target scene is reached, or there are no scenes remaining on the stack.
	 * targetScene may be either the SceneController for the desired scene, the scene DOM ID, or the scene name.
	 * If targetScene is undefined, all scenes will be popped.
	 * Intermediate popped scenes are *not* reactivated, nor is there any visual transition to signify their removal from the stack.
	 * Note that this is an asynchronous operation.
	 * 
	 * @param {Object} targetScene
	 * @param {Object} options @see #popScene
	 */
	popScenesTo: function(targetScene, returnValue, options) {
		var op = this._sceneStack.popScenesTo.bind(this._sceneStack, targetScene, returnValue);
		this._deferSceneOperation(op, true, options);
	},
	
	
	/*$ @private 
		Adds the given function to the queue of deferred scene operations, and/or schedules the queue for execution by
		deferring a function to execute them all (unless we've already done it or we're in a transition).
		'options' is either the sceneArguments for a push/swap, or the pop options for a pop/popTo.
	*/
	_deferSceneOperation: function(op, isPop, options) {
		//console.timeEnd('startTransition');
		var sceneToLoad, curScene, transition;

		// op may be undefined, if we just want to check & possibly schedule the next set of scene operations.
		if(op) {
			
			transition = options && options.transition;
			
			// If this is a push, add the scene name to the list for lazy assistant loading.
			if(isPop === false) {
				sceneToLoad = options && (options.name || options); // scene arguments may be just a string.
				if(sceneToLoad) {
					this._deferredLoadingScenes.push(sceneToLoad);
				}
			
				// This is just a safety check, since we require cross-app pushes to use the crossApp transition.
				if(options && options.appId && transition) {
					Mojo.Log.warn("You cannot specify a transition when pushing a cross-app scene ", options.name, ", forcing to 'crossApp'.");
					options.transition = Mojo.Transition.crossApp;
				}
			}
			
			// Save operation on our stack, for later execution.
			this._deferredSceneOps.push({op:op, isPop:isPop, transition:transition});
		}
		
		if (this.hasPendingSceneOperations()) {	
			// Create a scene transition (unless someone disabled transitions).
			// Creating the transition object snapshots the window's current scene (if there is one) and "freezes" 
			// the display. This gives the new scene a chance to set things up before the transition begins.
			// While displaying the snapshot, we should not receive any key/mouse events.
			// It's important to do this synchronously with respect to the push/pop request because otherwise
			// apps can easily get into a state where tapping twice quickly can cause them to (for example) push a sub-scene twice.
			curScene = this._sceneStack.currentScene();
			if(!this._sceneTransitionInProgress && curScene && this._useSceneTransitions && !this._currentTransition && 
					transition !== Mojo.Transition.none) {
				this._currentTransition = new Mojo.Controller.Transition(this.window, isPop);
			}
			
		}
		
		// Schedule operations to be executed, if we haven't already.
		if(this._deferredSceneOpID === undefined && this.hasPendingSceneOperations()) {
			this._sceneTransitionInProgress = true;
			this._deferredSceneOpID = _.defer(this._deferredSceneOpLoader);
		}
		
	},
	
	
	/*$ @private 
		Makes a pass through the deferred scene ops and tries to load any scripts required for the scenes being pushed.
		The deferred ops are not executed until all scripts have been loaded.
		TODO: This lazy load mechanism is no longer "zero overhead"... we will iterate through unloaded scripts every time a scene is pushed.
			We could optimize it by only loading scripts for a pushed scene if the scene assistant class is not defined.
	*/
	_deferredSceneOpLoader: function() {
		var scenes = [];
		
		scenes = this._deferredLoadingScenes;
		
		// Swap out the deferred op array so any new requests are not added to the current set.
		this._aboutToExecSceneOps = this._deferredSceneOps;
		this._deferredSceneOps = [];
		
		// If there's nothing left to do, return.  
		// This can happen if the stage is closed during a push/pop transition.
		if(!this._aboutToExecSceneOps || this._aboutToExecSceneOps.length === 0) {
			return;
		}
		
		// If we have pushed any scenes, make sure we load the sources for them.
		// If no loading is needed, this will fall through to _deferredSceneOpExecutor() immediately.
		if(scenes.length > 0) {
			this._deferredLoadingScenes = []; // only need to reset this if it had scenes in it.
			Mojo.loadScriptsForScenes(scenes, this._deferredSceneOpExecutor);
		} else {
			this._deferredSceneOpExecutor();
		}
		
	},
	
	/*$ @private */
	_deferredSceneOpExecutor: function() {
		var sceneOps, curScene, synchronizer, continueTransition, timeSinceHighlight;
		var syncCallback, amountToDelayToShowHightlight = 0;
		var timeBeforeSetup, scenePrepTimeout;
		var op, lastOp, transitionName, poppedScene;
		var defaultTransition;
		
		// Finally, after scene scripts are loaded, pick up our queue of deferred scene ops.
		sceneOps = this._aboutToExecSceneOps;
		delete this._aboutToExecSceneOps;
		
		// Do nothing if there are no scene ops.
		// This can happen if the stage is closed.
		if(!sceneOps || sceneOps.length < 1) {
			return;
		}
		
		// The maximum scene prep timeout needs to include setup time in addition
		// to any delay waiting for service request data to arrive.
		timeBeforeSetup = Date.now();
		
		// We're pushing or popping some scene, so we know we need to deactivate the current one, if any.
		this._sceneStack.deactivate();
		
		// save reference to last scene op.
		lastOp = _.last(sceneOps);

		// If there are no scenes in the stack (_sceneStack.length === 0), we
		// don't really need a graphical transition to occur -- we just want the
		// event "freezing" that a scene transition gives us -- so we use
		// Mojo.Transition.none in that case.
		if (this._sceneStack.length > 0) {
			defaultTransition =  Mojo.Transition.defaultTransition;
		} else {
			defaultTransition = Mojo.Transition.none;
		}
		
		// Do initial execution of the push operations, and determine what transition to use.
		// This creates the scene controllers, but does not push them.
		
		// Execute all deferred operations:
		while(sceneOps.length > 0) {
			
			// If this is a pop operation, we need to save a reference to
			// the popped scene so we can check its transition later.
			poppedScene = this._sceneStack.currentScene();
			
			// Execute the deferred op.
			// We pass the op object itself in so that a default transition set in the assistant's setup() can take affect.
			op = sceneOps.shift();
			op.op(op);
		}
		
		// Always use the transition for the last scene op.  This might be sub-optimal in exotic cases 
		// with multiple push/pop operations, but it's consistently a simple & reasonable choice.
		transitionName = lastOp.transition || (lastOp.isPop && poppedScene && poppedScene.defaultTransition) || defaultTransition;
		
		// If we have any scenes left to activate, then we begin the activation process on the top one.
		// We use a synchronizer to allow various clients (mostly the scene assistant, and any lazy lists in the scene)
		// to delay the start of the transition.
		curScene = this._sceneStack.currentScene();
		
		
		// Transition objects are created whenever there's a scene to transition FROM, but 
		// we only actually run them when we also have a scene to transition TO.
		// If there's no transition in affect, then we can just call our completion function directly.
		// This occurs when there is no scene to transition from, for example when the first scene is 
		// pushed onto a stack or the last one is popped.
		// It's okay to call _endTransition() directly (not yielding an inconsistent programming model),
		// since the important bit is that push/pop is always async.
		// However, we do need to make sure we always follow the "aboutToActivate" scheme when 
		// there is a destination scene.
		if(curScene) {
			
			Mojo.Log.info("About to activate scene ", curScene.sceneName);
			//console.time('aboutToActivate');
			this._sceneStack.aboutToActivate(curScene);
			//console.timeEnd('aboutToActivate');

			if(this._currentTransition) {
				this._currentTransition.setTransitionType(transitionName, lastOp.isPop);
				syncCallback = this._currentTransition.run.bind(this._currentTransition, this._endTransition);
			} else {
				//console.time('synccallback');
				syncCallback = this._endTransition;
			}
			
			// We use a Synchronize object to continue the scene transition so that it can be delayed
			// for service request data to be available, allowing us to transition to a scene that's 
			// fully-populated with data.
			scenePrepTimeout = 0.5;
			synchronizer = new Mojo.Function.Synchronize({
								syncCallback: syncCallback,
								timeout:scenePrepTimeout});
		
			// We always wrap one function, to prevent the synchronizer from firing early if the scene
			//  assistant (or some other client) immediately calls a wrapped function before any others 
			// are created.
			// If nothing else wraps functions with the synchronizer, then the transition will start 
			// immediately when continueTransition is called below.  The operation is asynchronous
			// either way, but we avoid one pass through webkit and back to javascript when no one
			// uses the synchronizer.
			continueTransition = synchronizer.wrap(Mojo.doNothing);
		
			// Pass the synchronizer to the scene controller.  
			// It will take care of wrapping whatever else needs it.
			this.setSceneVisibility(curScene, true);
			curScene.aboutToActivate(synchronizer);
		
			// Allow a brief moment to see any tap hightlight before starting the
			// transition
			if (Mojo.Gesture.highlightTarget) {
				timeSinceHighlight = Date.now() - Mojo.Gesture.highlightTargetTime;
				amountToDelayToShowHightlight = 100 - timeSinceHighlight;
			}
			
			if (amountToDelayToShowHightlight > 0) {
				_.delay(continueTransition, amountToDelayToShowHightlight/1000);
			} else {
				continueTransition();				
			}
		}
		else { // If there's no scene to transition to, then immediately complete the transition.
			if(this._currentTransition) {
				this._currentTransition.cleanup();
			}
			this._endTransition();
		}
				
	},
	
	/*$ @private 
		Cancels any deferred scene operations and/or transitions that are currently in progress.
		If they have not been executed yet, then they never will be.
		Called from StageController._cleanup, and important when a child stage is 
		thrown away since the window object will shortly be invalid.
		This is a bit messy I'm afraid.
	*/
	_cancelDeferredSceneOps: function() {
		
		// If we have a timeout in progress, then clear it.
		// It may have already fired, though, so we must keep checking other state vars.
		if(this._deferredSceneOpID !== undefined) {
			this.window.clearTimeout(this._deferredSceneOpID);
			delete this._deferredSceneOpID;
		}
		
		// If we have created a transition, then cancel it:
		if(this._currentTransition) {
			this._currentTransition.cleanup();
			delete this._currentTransition;
		}
		
		// If we have scenes to load, remove them all:
		if(this._deferredLoadingScenes && this._deferredLoadingScenes.length > 0) {
			Foundations.ArrayUtils.clear(this._deferredLoadingScenes);
		}
		
		// If we have deferred ops at the scene-loading stage, remove them all:
		if(this.hasPendingSceneOperations()) {
			Foundations.ArrayUtils.clear(this._deferredSceneOps);
		}
		
		// If we have deferred scene ops to execute, then remove them:
		if(this._aboutToExecSceneOps) {
			delete this._aboutToExecSceneOps;
		}
		
		this._sceneTransitionInProgress = false;
		
	},
	
	/*
	 * Called when the scene transition is complete.
	 */
	_endTransition: function() {
		// Transition is over, allow scene ops, and process any pending ones if needed.
		//console.timeEnd('synccallback');
		delete this._deferredSceneOpID;
		delete this._currentTransition;
		this._sceneTransitionInProgress = false;

		this.frameworkHideSplashScreen();
		this._sceneStack.activate();

		if(this.initialDelegatedCalls) {
			this.executeDelegationQueue();
			this.deleteDelegationQueue();
		}
		
		// Schedule the next set of deferred scene operations if needed.
		this._deferSceneOperation();
		Mojo.Log.info("Transition ended.");
	},
	
	
	/*$
	 * @private
	 */
	_sceneIdFromName: function(sceneName) {
		return 'mojo-scene-' + sceneName;
	},

	tryEarlySynchronousTransition: function(transition, sceneController, sceneArguments) {
			//middle of transition
		if(transition &&
				//not disabled by app
				this._useSceneTransitions && 
				sceneArguments.transition != Mojo.Transition.none &&
				//can be done synchronously since not waiting for anything
				(!sceneController.assistant || !sceneController.assistant.aboutToActivate)) {
			transition.setTransitionType((sceneArguments && 
					(sceneArguments.assistantConstructor === Mojo.Controller.CrossAppSourceAssistant) && 
					Mojo.Transition.crossApp) || 
					((sceneArguments.transition == Mojo.Transition.crossFade) && Mojo.Transition.crossFade) ||
					Mojo.Transition.zoomFade);
			transition.preparingNewScene(this._endTransition);
		}
	},

	/*$
	 * @private
	 * Helper function that sets up a new scene with controller.
	 * Used by pushScene and swapScene.
	 * @param {Object} sceneArguments
	 * @param {Object} myArguments
	 */
	_prepareNewScene: function(sceneArguments, myArguments) {
		var sceneId, scrollerId, scrollerContent;
		var setup, index, sceneName, sceneTemplateName, templateRoot;
		var content, nodeList, contentDiv;
		var sceneElement, sceneController;
		var transition;
		
		if (_.isString(sceneArguments)) {
			sceneId = sceneArguments;
			if (this.get(sceneId)) {
				index = 1;
				while(this.get(sceneId)) {
					sceneId = sceneArguments + '-' + index;
					index += 1;
				}
			}
			sceneArguments = {name : sceneArguments, id: this._sceneIdFromName(sceneId)};
		} else if (sceneArguments.appId) {
			setup = Mojo.Controller.setupCrossAppPush(sceneArguments, myArguments);
			sceneArguments = setup.sceneArguments;
			myArguments = setup.additionalArguments;
		}

		try {
			sceneController = new Mojo.Controller.SceneController(this, sceneArguments, myArguments);
			sceneController.window = this.window;
			
			transition = this._currentTransition;
			//XXX: this was merged incorrectly. this should go at the end of the method.
			this.tryEarlySynchronousTransition(transition, sceneController, sceneArguments);
		} catch (e){
			Mojo.Log.logException(e, "The scene '"+sceneArguments.name+"' could not be pushed because an exception occurred.");
			//XXX: merged incorrectly. the scene wasn't added yet.
			Mojo.Dom.remove(this.get(sceneId));
			return;
		}
		
		sceneName = sceneArguments.name;
		
		sceneTemplateName = sceneArguments.sceneTemplate || sceneName + "/" + sceneName + "-scene";
		templateRoot = sceneArguments.templateRoot;
		sceneId = sceneArguments.id || this._sceneIdFromName(sceneArguments.name);

		content = Mojo.View.render({templateRoot: templateRoot, template: sceneTemplateName, object: (sceneArguments.templateModel) });
		content = content.trim();

		nodeList = Mojo.View.convertToNodeList(content, this.document);
		contentDiv = Mojo.View.wrapMultipleNodes(nodeList, this.document, !this._hasPalmSceneClass(nodeList));
		contentDiv.setAttribute("id", sceneId);

		if (!sceneArguments.disableSceneScroller) {
			scrollerId = sceneId + "-scene-scroller";
			scrollerContent = this.document.createElement('div');
			scrollerContent.setAttribute('id', scrollerId);
			scrollerContent.setAttribute('x-mojo-element', 'Scroller');
			scrollerContent.appendChild(contentDiv);
			contentDiv = scrollerContent;
		}
		Mojo.Dom.insertTop(this.body, contentDiv);

		sceneElement = this.get(sceneId);

		// add scene-specific css classes
		Mojo.Dom.addClassName(sceneElement, this.kSceneClassName);
		Mojo.Dom.addClassName(sceneElement, sceneName + '-scene');

		sceneController.setSceneElement(sceneElement);

		return sceneController;
	},
	
	/*$ @private */
	_hasPalmSceneClass: function(nodeList) {
		var i, length, node;
		length = nodeList.length;
		for(i=0; i<length; i++) {
			node = nodeList[i];
			if(node.nodeType === node.ELEMENT_NODE) {
				return Mojo.Dom.hasClassName(node, this.kSceneClassName);
			}
		}
	},
	
	
	/*$
	 * This allows the client application to send text to the clipboard to be pasted elsewhere later.
	 * @param {Boolean} escapeHTML: ignored in initial setClipboard api; later will allow pasting of rich text
	 */
	setClipboard: function(text, escapeHTML) {
		var scene = this.topScene();
		var tempTextarea;
		
		if(scene) {
			tempTextarea = this.document.createElement('textarea');
			tempTextarea.value = text;
			
			scene.sceneElement.appendChild(tempTextarea);
			tempTextarea.select();
			this.document.execCommand('cut');
			Mojo.Dom.remove(tempTextarea);
		}
	},

	paste: function() {
		if (PalmSystem && PalmSystem.paste) {
			PalmSystem.paste();
		}
	},

	setAlertSound: function(soundClass, soundFile) {
		if (this.window.PalmSystem && this.window.PalmSystem.setAlertSound) {
			this.window.PalmSystem.setAlertSound(soundClass, soundFile);
		}
	},

	/*$
	 * @private
	 */
	_keyHandler: function(keyEvent) {
		var scene = this.topScene();
		var tempTextArea, msg, scriptNode;
		var webView; 
		
		if (keyEvent.altKey && keyEvent.keyCode === Mojo.Char.f && Mojo.Config.debuggingEnabled) {
			this.toggleFpsBox();
			Mojo.Event.stop(keyEvent);
		} else if (Mojo.Host.current === Mojo.Host.browser && keyEvent.altKey && keyEvent.keyCode === Mojo.Char.m) {
			this.sendEventToCommanders(Mojo.Event.make(Mojo.Event.command, {command: Mojo.Menu.showAppCmd}));
		} else if (this.enableAltCharPicker && keyEvent.keyCode === Mojo.Char.sym) {
			if (this.doesTargetAcceptKeys(keyEvent.target)) {
				this._sendCharpickerEvent(Mojo.Event.renderAltCharacters, keyEvent.target, null);
			} else {
				webView = this._getWebview(keyEvent.target);
				if (webView) {
					webView.mojo.isEditing(this._sendCharpickerEventCallback.bind(this, Mojo.Event.renderAltCharacters, webView, null));
				}
			}
		} else if (keyEvent.keyCode === Mojo.Char.o && keyEvent.ctrlKey && keyEvent.shiftKey && Mojo.Config.debuggingEnabled) {
			//} else if (keyEvent.keyCode === Mojo.Char.o) {
			// Special key shortcut to open a live js console.
			Mojo.Debug.openDebugger(this);
		} else if (keyEvent.keyCode === Mojo.Char.v && keyEvent.ctrlKey && keyEvent.shiftKey && Mojo.Config.debuggingEnabled) {
			// Special key shortcut to show framework info.
			scene = this.activeScene();
			if(scene) {
				msg = 'Using build '+Mojo.MOJO_BUILD+", version = "+Mojo.MOJO_VERSION+", ";
				
				scriptNode = Mojo.findScriptTag();
				if(scriptNode && scriptNode.hasAttribute('x-mojo-version')) {
					msg += 'x-mojo-version='+scriptNode.getAttribute('x-mojo-version')+".";
				}
				if(scriptNode && scriptNode.hasAttribute('x-mojo-submission')) {
					msg += 'x-mojo-submission='+scriptNode.getAttribute('x-mojo-submission')+".";
				}
				
				scene.showAlertDialog({
					onChoose:Mojo.doNothing,
					title: 'Framework Info',
					message: msg,
					choices: [{label:"OK", value:1}]
				});
			}
		} else if (keyEvent.keyCode === Mojo.Char.l && keyEvent.ctrlKey && keyEvent.shiftKey && Mojo.Config.debuggingEnabled) {
			//} else if (keyEvent.keyCode === Mojo.Char.l) {
			
			// Special key shortcut to save the current scene's HTML to the clipboard, and log it to the console.
			if(scene) {
				tempTextArea = this.document.createElement('textarea');
				Mojo.Log.info("HTML for scene '", scene.sceneName, "':\n", scene.sceneElement.innerHTML);
				tempTextArea.value = scene.sceneElement.innerHTML;
				scene.sceneElement.appendChild(tempTextArea);
				tempTextArea.select();
				this.document.execCommand('cut');
				Mojo.Dom.remove(tempTextArea);
			}
			
		} else {			
			// Give current scene a chance to handle keyboard shortcuts:
			scene = this.activeScene();
			if(keyEvent.metaKey && scene && scene.handleShortcut(String.fromCharCode(keyEvent.which), keyEvent)) {
				Mojo.Event.stop(keyEvent);
			}
		}
		
		this._forwardEventToTopContainer(Mojo.Event.keyup, keyEvent);
	},
	
	
	/*$
	 * @private
	 */
	_keyDownHandler: function(keyDownEvent) {
		var webView;
		
		if (this.enableAltCharPicker && keyDownEvent.keyCode !== Mojo.Char.sym && keyDownEvent.ctrlKey) {
			if (this.doesTargetAcceptKeys(keyDownEvent.target)) { //this is coming over as ctrl locally
				this._sendCharpickerEvent(Mojo.Event.renderChordedAltCharacters, keyDownEvent.target, keyDownEvent.keyCode);
			} else	{
				webView = this._getWebview(keyDownEvent.target);
				if (webView) {
					webView.mojo.isEditing(this._sendCharpickerEventCallback.bind(this, Mojo.Event.renderChordedAltCharacters, webView, keyDownEvent.keyCode));
				}
			}
		}
		
		this._forwardEventToTopContainer(Mojo.Event.keydown, keyDownEvent);
	},
	
	/*$
	 * @private
	 */
	_keyPressHandler: function(keyPressEvent) {
		if(keyPressEvent.metaKey) {
			if(Mojo.Host.current !== Mojo.Host.mojoHost) {
				Mojo.Event.stop(keyPressEvent);
			}
		 } else {
			this._forwardEventToTopContainer(Mojo.Event.keypress, keyPressEvent);
		}
	},

	/*$
	 * @private
	 */	
	 _getWebview: function(target) {
		if (target.type === this.kBrowserObject) {
			//find the webview parent
			return Mojo.View.getParentWithAttribute(target, 'x-mojo-element', 'WebView');
		}
		return null;
	},

	/*$
	 * @private
	 */	
	_sendCharpickerEventCallback: function(type, target, character, isEditing) {
		if (isEditing) {
			this._sendCharpickerEvent(type, target, character);
		}
	},
	
	/*$
	 * @private
	 */
	_sendCharpickerEvent: function(type, target, character) {
		this.sendEventToCommanders(Mojo.Event.make(type, {selectionTarget: target, character: character}));
	},

	
	/*$
	 * @private
	 */
	_forwardEventToTopContainer: function(type, originalEvent) {
		var scene = this.topScene();
		var container = scene && scene.topContainer();
		
		if (container) {
			Mojo.Event.send(container, type, {originalEvent: originalEvent}, false, true);
		}
	},

	
	/*$
	 * @private Used only by alt char picker logic to determine if this should popup the alt char picker
	 */
	doesTargetAcceptKeys: function(target) {
		return Mojo.View.isTextField(target);
	},

	/*$
	 * This is an event commander method we use to trigger default 'back' behavior.
	 * The app controller is itself added to the commander chain.
	 * @param {Object} event
	 * @private
	 */
	handleCommand: function(commandEvent) {
		if(commandEvent.type == Mojo.Event.back) {
			// TODO: Remove this legacy code.  I think nothing uses it to close dialogs anymore.
			var db = this.get('mojo-dialog');
			if (db) {
				Mojo.Event.stop(commandEvent);
				Mojo.Controller.closeDialogBox();
			}

			else if (this._sceneStack.size() > 1) {
				Mojo.Event.stop(commandEvent);
				
				if(!this._sceneTransitionInProgress) {
					this.popScene();
				}
			}
		}

		else if (commandEvent.type == Mojo.Event.commandEnable){

			// By default, the prefs & help items in the app-menu are disabled.
			// Scene or stage assistants may override this
			// often global to the app, so we'll leave them enabled for the moment.
			if(commandEvent.command == Mojo.Menu.prefsCmd || commandEvent.command == Mojo.Menu.helpCmd) {
				Mojo.Event.stop(commandEvent);
			}
		} 
	},

	handleBack: function(backEvent) {
		this.sendEventToCommanders(backEvent);
		if (backEvent.defaultPrevented) {
			Mojo.Event.stop(backEvent);
		}
	},

	/*$
	 * @private
	 */
	toggleFpsBox: function() {
		var q = Mojo.Core.Animation.getQueue(this.document);
		q.toggleFPSBox();
	},
	/*$
	 * @private
	 */
	considerForNotification: function(params) {
		var scene = this.activeScene();
		if (scene  && scene.assistant && scene.assistant.considerForNotification) {
			params = scene.assistant.considerForNotification(params);
		}
		return params;
	},
	
	get: function(elementOrElementId) {
		if (!_.isString(elementOrElementId)) {
			return elementOrElementId;
		}
		return this.document.getElementById(elementOrElementId);
	},
	
	/*$
	 * @private
	 */
	screenOrientationChanged: function(orientation) {
		var f = function(sceneController) {
			sceneController.handleOrientationChange(orientation);
		};
		this._sceneStack.forEach(f);
	}
		
	
};


/*$ 
description?
@private
@class 
@name Mojo.SceneStack
*/

/*$ 
@constructor
@private 
*/
Mojo.SceneStack = function() {
		this._sceneStack = [];
		this._pendingHides = [];
};


Mojo.SceneStack.prototype = {

	/*$ @private
		Returns an array of scene controllers currently on the stack.
		result[0] is the bottom scene on the stack.
	*/
	getScenes: function() {
		return this._sceneStack.slice(0);
	},
	
	/*$ @private
		Deactivates the top scene controller on the stack, if it's active.
	*/
	deactivate: function() {
		var currentScene = _.last(this._sceneStack);
		if (currentScene && currentScene.isActive()) {
			currentScene.deactivate();
			currentScene.stageController.setSceneVisibility(currentScene, false);
		}
	},
	
	/*$ @private
		Activates the top scene controller on the stack, if it's active.
	*/
	activate: function() {
		var currentScene = _.last(this._sceneStack);
		var returnVal = this._returnValue;
		
		delete this._returnValue;
		
		if (currentScene && !currentScene.isActive()) {
			// keep this last since it could cause other scene operations.
			currentScene.activate(returnVal);
		}
	},
	
	/*$ @private
		Called at the beginning of a transition, when we're going to activate a scene.
		Hides any other scenes that were pushed.
	*/
	aboutToActivate: function(activatingScene) {
		var i, scene;
		
		for(i=0; i<this._pendingHides.length; i++) {
			scene = this._pendingHides[i];
			if(scene !== activatingScene) {
				scene.stageController.setSceneVisibility(scene, false);
			}
		}
		Foundations.ArrayUtils.clear(this._pendingHides);
	},
	
	/*$
	 * Describe popScene
	 * 
	 * @param {Object} returnValue
	 * @private
	 */
	popScene: function(returnValue) {
		this._returnValue = returnValue;
		this._removeTopScene();
	},

	/*$
	 * pushScene
	 * 
	 * @param {Object} sceneController
	 */
	pushScene: function(sceneController) {
		this._addScene(sceneController);
	},

	/*$
	 * pop the old scene, and push the new one without activating/deactivating any underlying scene.
	 * @param {Object} sceneController
	 */
	swapScene: function(sceneController) {
		this._removeTopScene();
		this._addScene(sceneController);
	},

	/*$
	 * scene may be  the controller object itself, the scene id, or the scene name.
	 * @param {Object} scene
	 * @private	
	 */
	popScenesTo: function(scene, returnValue) {
		var curScene = _.last(this._sceneStack);
		
		this._returnValue = returnValue;
		
		while(curScene && curScene !== scene && curScene.sceneName !== scene && curScene.sceneId !== scene) {

			// Pop current scene.
			this._removeTopScene();
			
			// Move to next one.
			curScene = _.last(this._sceneStack);
		}
	},
	/*$
	 * currentScene
	 */
	currentScene: function() {
		return _.last(this._sceneStack);
	},
	
	/*$
	 * parentSceneAssistant
	 */
	parentSceneAssistant: function(targetScene) {
		var targetSceneController = targetScene.controller;
		var targetSceneIndex = this._sceneStack.indexOf(targetSceneController);
		if (targetSceneIndex <= 0) {
			return undefined;
		}
		var sceneController = this._sceneStack[targetSceneIndex - 1];
		return sceneController && sceneController.assistant;
	},
	/*$
	 * size
	 * 
	 * @param {Object} scene
	 */
	size: function(scene) {
		return this._sceneStack.length;
	},

	/*$
	 * Removes top scene from the stack & properly cleans it up.
	 * Does NOT activate any underlying scenes.
	 * 
	 * @private
	 */
	_removeTopScene: function() {
		var currentScene = _.last(this._sceneStack);
		if (currentScene) {
			currentScene.cleanup();
		}
		this._sceneStack.pop();
	},

	/*$
	 * Adds a scene to the top of the stack & properly sets it up.
	 * Does NOT deactivate any underlying scenes.
	 * 
	 * @private
	 * @param {Object} sceneController
	 */
	_addScene: function(sceneController) {
		//console.time('setupscene');
		var sceneSetupResult = sceneController.setup();
		//console.timeEnd('setupscene');

		if(sceneSetupResult === sceneController.ASSISTANT_FAILURE) {
			if(sceneController.sceneScroller) {
				Mojo.Dom.remove(sceneController.sceneScroller);
			} else {
				Mojo.Dom.remove(sceneController.sceneElement);
			}
		} else {
			this._sceneStack.push(sceneController);
			this._pendingHides.push(sceneController);
		}
	},
	
	/*$ @private */
	forEach: function(f) {
		this._sceneStack.forEach(f); 
	}

};

/*$#nocode-*/
