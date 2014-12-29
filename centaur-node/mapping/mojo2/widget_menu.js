/*$
 * @name widget_menu.js
 * @fileOverview This file discusses the Menu class which can be used to add a menubar to a scene;
 * See {@link Mojo.Menu} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*globals _ Mojo $LL */

/*$
Unlike all other widgets, Menu widgets are not declared in your scene view file, but are simply instantiated 
and have their actions handled from within your assistant completely. Menu widgets are thought to be above 
the scene elements, attached to the scene's window rather than a point in the scene, so it wouldn't work 
for their position to be determined within the HTML.

With any of the menu functions, you need to set up a command handler which will receive the command events 
according to the precedence rules within the commander stack. See the Developer Guide - Menus for more 
information on the command handlers.

@class
*/
Mojo.Menu = {};

/*$
#### Overview ####
The View menu presents items as variable sized buttons, either singly or in groups across the top of 
the scene. The items are layed out in a horizontal sequence starting from the left of the screen to 
the right. The button widths can be adjusted from within the items property width, and the framework 
adjusts the space between the buttons automatically.

Unlike all other widgets, Menu widgets are not declared in your scene view file, but are simply 
instantiated and have their actions handled from within your assistant completely. Menu widgets are 
thought to be above the scene elements, attached to the scene's window rather than a point in the 
scene, so it wouldn't work for their position to be determined within the HTML.

With any of the menu functions, you need to set up a command handler which will receive the 
command events according to the precedence rules within the commander stack. 

See the Developer Guide - Menus for more information on the command handlers.

#### Declaration ####

		None 

#### Events ####


	Events for menus are sent via the commander chain. Scenes are automatically registered on the commander chain.
	To receive events, implement a handleCommand function in your scene assistant. The event's command field will 
	contain the command associated with the menu item selected, specified as part of the items array.
		
	ex:
		handleCommand: function(event) {
			if (event.type === Mojo.Event.command) {
				switch (event.command) {
					...
				}
			}
		}


#### Instantiation ####
    
		this.controller.setupWidget(Mojo.Menu.viewMenu,
			this.attributes = {
			   spacerHeight: 0,
			   menuClass: 'no-fade'
			},
			this.model = {
				visible: true,
				items: [ 
					{ icon: "", command: "", label: "  "},
					{ label: "My App Name", width: 210 },
					{ icon: '', command: '', label: "  "}
				]
			};
    

#### Attribute Properties ####

		Attribute Property  Type		Required	Default			Description
		---------------------------------------------------------------------------------------------------------------------------------
	    spacerHeigth        Integer		Optional	Calculated		If specified, the spacer div associated with this menu will be the given height in pixels.
																	This affects the size of the scene content, and whether the view menu "pushes down"
																	other content in the scene.
	    menuClass           String		Optional    .palm-default	If true, then the edit menu will also include Bold/Italics/Underline.


#### Model Properties ####

		Model Property  Type        Required    Default     Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    label			String      Optional    Null        Not displayed, future
	    visible			Boolean     Optional    TRUE        Current visibility of this menu
	    items			Array       Required                List items for this menu, values below:
		
			List items		Type	Required	Default		Description     
			---------------------------------------------------------------------------------------------------------------------------------
			label			String		Optional    Null	User visible label for this item, not rendered for groups
			icon			String		Optional			CSS class for icon to display in this item
					iconPath		String		Optional	None	Path to image to display in menu item, relative to app's director
					width			Integer		Optional			Calculated based on item's width - specifies the width in pixels of this menuitem.
																	Overrides default calculations. Ignored for groups.
					items			Array		Optional	None	If specified, this item is a "group" that visually ties the child items together.
					toggleCmd		String		Optional	None	Only used when `items` is specified.  Specify this property to make this group a 
																	"toggle group". This string is the `command` of currently selected 'choice' 
																	item in this group, and this property is modified by the widget when a different 
																	choice is made.
					command			String		Optional	None	Specify to make this item a "choice".  It will then respond to a user tap by 
																	sending a mojo-command event through the commander chain with this string as 
																	the "command" property.
					disabled		Boolean		Optional	FALSE	Menu choice is disabled when this is true. Only used for items which also specify 'command'.
					submenu			String		Optional	null	Specify to make this item a "submenu" item.  It will then respond to a user 
																	tap by displaying the named menu as a popup submenu.
					template		String		Optional	null	Path to HTML template for custom content to be inserted instead of a standard 
																	menu item. The template is rendered using this item model object for property substitution.
					checkEnabled	Boolean		Optional	FALSE	If truthy, a Mojo.Event.commandEnable event will be sent through the commander 
																	chain each time this menu item is displayed or invoked via keyboard shortcut.  
																	If a commander calls `preventDefault()` on the event, then the menuitem's model 
																	will be modified to disable the menu item. Otherwise it will be enabled. This can 
																	be used to lazily update the enable state of items in the app-menu or submenus.


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
*/
Mojo.Menu.viewMenu = 'palm-view-menu';


/*$
#### Overview ####
The Command Menu are items presented at the bottom of the screen, and similar to the 
View Menu in most ways. Items will include variable sized buttons, that can be combined into 
groups, and in a horizontal layout from left to right. As with the View Menu, button widths 
can be adjusted from within the items property width, and the framework adjusts the space 
between the buttons automatically. 

Unlike all other widgets, Menu widgets are not declared in your scene view file, but are 
simply instantiated and have their actions handled from within your assistant completely. 
Menu widgets are thought to be above the scene elements, attached to the scene's window 
rather than a point in the scene, so it wouldn't work for their position to be determined 
within the HTML.

With any of the menu functions, you need to set up a command handler which will receive the 
command events according to the precedence rules within the commander stack. 

See the Developer Guide - Menus for more information on the command handlers.

#### Declaration ####

		None 

#### Events ####


	Events for menus are sent via the commander chain. Scenes are automatically registered on the commander chain. 
	To receive events, implement a handleCommand function in your scene assistant. The event's command field will 
	contain the command associated with the menu item selected, specified as part of the items array.

	ex:
		handleCommand: function(event) {
			if (event.type === Mojo.Event.command) {
				switch (event.command) {
					...
				}
			}
		}



#### Instantiation ####
    
		this.controller.setupWidget(Mojo.Menu.commandMenu,
			this.attributes = {
			   spacerHeight: 0,
			   menuClass: 'no-fade'
			},
			this.model = {
		      visible: true,
		      items: [ 
			         { icon: "back", command: "do-Previous"},
			         { icon: 'forward', command: 'do-Next'}
				]
		};
    

#### Attribute Properties ####

		Attribute Property  Type        Required    Default     Description
		---------------------------------------------------------------------------------------------------------------------------------
	    spacerHeight        Integer     Optional    Calculated    If specified, the spacer div associated with this menu will be the given height in pixels.
	                                                                This affects the size of the scene content, and whether the view menu "pushes down"
	                                                                other content in the scene.
	    menuClass           String      Optional    .palm-default If true, then the edit menu will also include Bold/Italics/Underline.


#### Model Properties ####

		Model Property  Type        Required    Default     Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    label               String      Optional    Null        Not displayed, future
	    visible             Boolean     Optional    TRUE        Current visibility of this menu
	    items               Array       Required                List items for this menu, values below:
				List items		Type		Required	Default	Description     
				---------------------------------------------------------------------------------------------------------------------------------
		        label           String      Optional    Null	User visible label for this item, not rendered for groups
		        icon			String		Optional			CSS class for icon to display in this item
		        iconPath		String		Optional	None	Path to image to display in menu item, relative to app's director
		        width			Integer		Optional			Calculated based on item's width - specifies the width in pixels of this menuitem.  
																Overrides default calculations. Ignored for groups.
		        items			Array		Optional	None	If specified, this item is a "group" that visually ties the child items together.
		        toggleCmd		String		Optional	None	Only used when `items` is specified.  Specify this property to make this group a 
																"toggle group". This string is the `command` of currently selected 'choice' item in 
																this group, and this property is modified by the widget when a different choice is made.
		        command	String	Optional				None	Specify to make this item a "choice".  It will then respond to a user tap by sending 
																a mojo-command event through the commander chain with this string as the "command" property.
				disabled		Boolean		Optional	FALSE	Menu choice is disabled when this is true. Only used for items which also specify 'command'.
		        submenu	String	Optional				null	Specify to make this item a "submenu" item.  It will then respond to a user tap by 
																displaying the named menu as a popup submenu.
		        template		String		Optional	null	Path to HTML template for custom content to be inserted instead of a standard menu item. 
																The template is rendered using this item model object for property substitution.
		        checkEnabled	Boolean		Optional	FALSE	If truthy, a Mojo.Event.commandEnable event will be sent through the commander chain 
																each time this menu item is displayed or invoked via keyboard shortcut.  
																If a commander calls `preventDefault()` on the event, then the menuitem's model will 
																be modified to disable the menu item. Otherwise it will be enabled. This can be used 
																to lazily update the enable state of items in the app-menu or submenus.


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
*/
Mojo.Menu.commandMenu = 'palm-command-menu';


/*$
#### Overview ####
The Application Menu appears in the upper left corner of the screen when the user taps the left hand 
side of the status bar. It includes some system-defined and some application-defined actions, and 
is intended to have an application-wide scope for the most part. The application list contains a 
few required actions: Edit, which is a item group including Cut, Copy and Paste; Preferences and 
Help, both of which are disabled by default. You are free to add any other items to the menu, and 
to enable Preferences and/or Help by hooking them to the appropriate actions for your application.

Unlike all other widgets, Menu widgets are not declared in your scene view file, but are simply 
instantiated and have their actions handled from within your assistant completely. Menu widgets 
are thought to be above the scene elements, attached to the scene's window rather than a point 
in the scene, so it wouldn't work for their position to be determined within the HTML.

With any of the menu functions, you need to set up a command handler which will receive the 
command events according to the precedence rules within the commander stack. 

See the Developer Guide - Menus for more information on the command handlers.


#### Declaration ####

		None


#### Events ####


	Events for menus are sent via the commander chain. Scenes are automatically registered on the commander chain. 
	To receive events, implement a handleCommand function in your scene assistant. The event's command field will 
	contain the command associated with the menu item selected, specified as part of the items array.

	ex:
		handleCommand: function(event) {
			if (event.type === Mojo.Event.command) {
				switch (event.command) {
					...
				}
			}
		}


#### Instantiation ####

		this.controller.setupWidget(Mojo.Menu.appMenu,
	       this.attributes = {
					omitDefaultItems: true
				},
		this.model = {
			visible: true,
			items: [ 
				{label: "About My App ...", command: 'do-myAbout'},
				Mojo.Menu.editItem,
					{ label: "Preferences...", command: 'do-myPrefs' },
					{ label: "Help...", command: 'do-myHelp' }
			]
		};


#### Attribute Properties ####

		Attribute Property  Type        Required    Default     Description
		---------------------------------------------------------------------------------------------------------------------------------
		omitDefaultItems    Boolean     Optional    FALSE       If true, then default menu items will not be added to this menu.
		richTextEditItems   Boolean     Optional    FALSE       If true, then the edit menu will also include Bold/Italics/Underline.


#### Model Properties ####

		Model Property  Type        Required    Default     Description     
		---------------------------------------------------------------------------------------------------------------------------------
		label               String      Optional    Null        Not displayed, future
		visible             Boolean     Optional    TRUE        Current visibility of this menu
		items               Array       Required                List items for this menu, values below:
				List items		Type		Required	Default	Description     
				---------------------------------------------------------------------------------------------------------------------------------
				label			String      Optional    Null	User visible label for this item, not rendered for groups
				icon			String		Optional			CSS class for icon to display in this item
				iconPath		String		Optional	None	Path to image to display in menu item, relative to app's director
				width			Integer		Optional			Calculated based on item's width - specifies the width in pixels of this menuitem.
																Overrides default calculations. Ignored for groups.
				items			Array		Optional	None	If specified, this item is a "group" that visually ties the child items together.
				toggleCmd		String		Optional	None	Only used when `items` is specified.  Specify this property to make this group a 
																"toggle group". This string is the `command` of currently selected 'choice' item 
																in this group, and this property is modified by the widget when a different choice is made.
				command			String		Optional	None	Specify to make this item a "choice".  It will then respond to a user tap by sending 
																a mojo-command event through the commander chain with this string as the "command" property.
				disabled		Boolean		Optional	FALSE	Menu choice is disabled when this is true. Only used for items which also specify 'command'.
				submenu			String		Optional	null	Specify to make this item a "submenu" item.  It will then respond to a user tap by 
																displaying the named menu as a popup submenu.
				template		String		Optional	null	Path to HTML template for custom content to be inserted instead of a standard menu item. 
																The template is rendered using this item model object for property substitution.
				checkEnabled	Boolean		Optional	FALSE	If truthy, a Mojo.Event.commandEnable event will be sent through the commander chain 
																each time this menu item is displayed or invoked via keyboard shortcut.  
																If a commander calls `preventDefault()` on the event, then the menuitem's model will 
																be modified to disable the menu item. Otherwise it will be enabled. This can be used 
																to lazily update the enable state of items in the app-menu or submenus.


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
	   None


@field
*/
Mojo.Menu.appMenu = 'palm-app-menu';


// Constants for standard menu commands:

/*$
 * @private
 * @constant 
 * @description Command value to tell the system to show the app menu (launched as a cross-app push)
 */
Mojo.Menu.showAppCmd = 'palm-show-app-menu';

/*$
 * @constant 
 * @description Cut command menu value
 */
Mojo.Menu.cutCmd = 'palm-cut-cmd';

/*$
 * @constant 
 * @description Copy command menu value
 */
Mojo.Menu.copyCmd = 'palm-copy-cmd';

/*$
 * @constant 
 * @description Paste command menu value
 */
Mojo.Menu.pasteCmd = 'palm-paste-cmd';

/*$
 * @constant 
 * @description Preferences command menu value
 */
Mojo.Menu.prefsCmd = 'palm-prefs-cmd';

/*$
 * @constant 
 * @description Help command menu value
 */
Mojo.Menu.helpCmd = 'palm-help-cmd';

/*$
 * @constant 
 * @description Bold text command menu value
 */
Mojo.Menu.boldCmd = 'palm-bold-cmd';

/*$
 * @constant 
 * @description Italic text command menu value
 */
Mojo.Menu.italicCmd = 'palm-italic-cmd';

/*$
 * @constant 
 * @description Underline text command menu value
 */
Mojo.Menu.underlineCmd = 'palm-underline-cmd';

/*$
 * @constant 
 * @description Select All text command menu value
 */
Mojo.Menu.selectAllCmd = 'palm-selectall-cmd';

/*$
 * @constant 
 * @description Cut item menu object
 */
Mojo.Menu.cutItem = {label:$LL('Cut'), command:Mojo.Menu.cutCmd, shortcut:'x', checkEnabled:true};

/*$
 * @constant 
 * @description Copy item menu object
 */
Mojo.Menu.copyItem = {label:$LL('Copy'), command:Mojo.Menu.copyCmd, shortcut:'c', checkEnabled:true};

/*$
 * @constant 
 * @description Paste item menu object
 */
Mojo.Menu.pasteItem = {label:$LL('Paste'), command:Mojo.Menu.pasteCmd, shortcut:'v', checkEnabled:true};

/*$
 * @constant 
 * @description Bold text item menu object
 */
Mojo.Menu.boldItem = {label:$LL('Bold'), command:Mojo.Menu.boldCmd, checkEnabled:true};

/*$
 * @constant 
 * @description Italic text item menu object
 */
Mojo.Menu.italicItem = {label:$LL('Italic'), command:Mojo.Menu.italicCmd, checkEnabled:true};

/*$
 * @constant 
 * @description Underline text item menu object
 */
Mojo.Menu.underlineItem = {label:$LL('Underline'), command:Mojo.Menu.underlineCmd, checkEnabled:true};

/*$
 * @constant 
 * @description Select All text item menu object
 */
Mojo.Menu.selectAllItem = {label:$LL('Select All'), command:Mojo.Menu.selectAllCmd, shortcut:'a', checkEnabled:true};

/*$
 * @constant 
 * @description Preferences item menu object
 */
Mojo.Menu.prefsItem = {label:$LL('Preferences'), command:Mojo.Menu.prefsCmd, checkEnabled:true};

/*$
 * @constant 
 * @description Help item menu object
 */
Mojo.Menu.helpItem = {label:$LL('Help'), command:Mojo.Menu.helpCmd, checkEnabled:true};

/*$
 * @constant 
 * @description Edit item menu object
 */
Mojo.Menu.editItem = {label:$LL('Edit'), items: [
												 Mojo.Menu.selectAllItem,
												 Mojo.Menu.cutItem,
												 Mojo.Menu.copyItem,
												 Mojo.Menu.pasteItem
				]};

/*$
 * @constant 
 * @description Styled Text item menu object
 */
Mojo.Menu.styleEditItem = {label:$LL('Edit'), items: [
												 Mojo.Menu.selectAllItem,
												 Mojo.Menu.cutItem,
												 Mojo.Menu.copyItem,
												 Mojo.Menu.pasteItem,
												 Mojo.Menu.boldItem,
												 Mojo.Menu.italicItem,
												 Mojo.Menu.underlineItem
				]};


Mojo.Widget._Menu = function(){};
Mojo.Widget._Menu.prototype = {

	kMenuLeftMargin: 0,

	kMenuHeight: 60,
	kMenuSpacerHeight: 50,

	kAppPopupClass: 'capitalize',
	kSubmenuPopupClass: 'palm-submenu',

	kAppPopupScrimClass: 'app-menu',
	
	kAppPopupId: 'palm-app-menu',

	kDontDisplayHiddenMenus: false, // if true, then display:none will be applied to hidden menus... 
									// but this currently causes problems because we're lax about performing layout only when we're visible.
									// So, hiding the menus and calling modelChanged() causes them to be laid out incorrectly when this is set.
	
	/*$ @private */
	setup : function setup() {
		var sceneDiv = this.controller.scene.sceneElement;
		
		// Set up to track child nodes to prevent model borking bug (NOV-43254)
		this.trackedChildNodes = [];
		
		// Look up various menu models:
		this.viewMenu = {
			model: this.controller.model.viewModel || {},
			attrs: this.controller.model.viewAttrs || {},
			placement: 'top',
			menuClass: 'view-menu'
		};
		this.viewMenu.spacerHeight = this.viewMenu.attrs.spacerHeight || this.kMenuSpacerHeight;

		this.commandMenu = {
			model: this.controller.model.commandModel || {},
			attrs: this.controller.model.commandAttrs || {},
			placement: 'bottom',
			menuClass: 'command-menu'
		};
		this.commandMenu.spacerHeight = this.commandMenu.attrs.spacerHeight || this.kMenuSpacerHeight;

		this.appMenu = {
			model: this.controller.model.appModel || {},
			attrs: this.controller.model.appAttrs || {}
		};
		
		if (this.appMenu.attrs.richTextEditMenu) {
			this.defaultAppMenuPrefixItems = [Mojo.Menu.styleEditItem];
		} else {
			this.defaultAppMenuPrefixItems = [Mojo.Menu.editItem];
		}
		
		this.window = this.controller.scene.window;
		this.document = this.controller.scene.document;

		if (this.viewMenu.model.items){
			// This is a sort of replacement widget div, since we use the actual widget div for the command menu.
			// It acts as a container for the menu, and also as a spacer to push content down when the menu is visible.
			this.viewMenu.div = this.controller.document.createElement('div');
			sceneDiv.insertBefore(this.viewMenu.div, sceneDiv.firstChild);
			
			// This currently seems to have no affect in terms of preventing content from being laid out under the
			// scene header, so the template currently includes a spacer.  Never the less, palm.css indicates
			// that this style should be applied, so we do it.
			Mojo.Dom.addClassName(sceneDiv, 'palm-hasheader');

			this.setupMenu(this.viewMenu);
		}

		if (this.commandMenu.model.items) {
			this.commandMenu.div = this.controller.element;
			this.setupMenu(this.commandMenu);

			this.handleDocumentActivation = this.handleDocumentActivation.bind(this);

			this.controller.listen(this.document, Mojo.Event.windowActivate, this.handleDocumentActivation, false);
			this.controller.listen(this.document, Mojo.Event.windowDeactivate, this.handleDocumentActivation, false);
		}

		this.handleWindowResize = this.handleWindowResize.bind(this);
		this.controller.listen(this.window, 'resize', this.handleWindowResize, false);
		
		// Observe scene activation so we can be smart about not 
		// re-rendering when the scene is not active (and therefore hidden).
		this.sceneActive = false;
		this.handleSceneActivate = this.handleSceneActivate.bind(this);
		this.controller.listen(this.controller.scene.sceneElement, Mojo.Event.aboutToActivate, this.handleSceneActivate, false);
		this.handleSceneDeactivate = this.handleSceneDeactivate.bind(this);
		this.controller.listen(this.controller.scene.sceneElement, Mojo.Event.deactivate, this.handleSceneDeactivate, false);
		
	},

	setupMenu: function(menu) {
		this.controller.scene.watchModel(menu.model, this, this.handleModelChanged);

		// Initialize 'enabled' properties, if needed.
		this.checkItemEnables(menu.model.items);

		Mojo.Dom.addClassName(menu.div, 'palm-menu-spacer');

		menu.tapHandler = this.tapHandler.bind(this, menu);
		this.controller.listen(menu.div, Mojo.Event.tap, menu.tapHandler);
		menu.visible = menu.model.visible === undefined || !!menu.model.visible;
		this.renderFromModel(menu);

		this.controller.scene.handleEdgeVisibility(
			menu.placement, true,
			Mojo.Dom.getDimensions(menu.div).height);
	},

	cleanup: function() {
		if (this.viewMenu.model.items) {
			this.controller.stopListening(this.viewMenu.div, Mojo.Event.tap, this.viewMenu.tapHandler);
		}
		if(this.commandMenu.model.items) {
			this.controller.stopListening(this.commandMenu.div, Mojo.Event.tap, this.commandMenu.tapHandler);
			this.controller.stopListening(this.document, Mojo.Event.activate, this.handleDocumentActivation, false);
			this.controller.stopListening(this.document, Mojo.Event.deactivate, this.handleDocumentActivation, false);
		}
		
		this.controller.stopListening(this.window, 'resize', this.handleWindowResize, false);
		
		this.controller.stopListening(this.controller.scene.sceneElement, Mojo.Event.aboutToActivate, this.handleSceneActivate, false);
		this.controller.stopListening(this.controller.scene.sceneElement, Mojo.Event.deactivate, this.handleSceneDeactivate, false);
	},
	
	
	handleSceneActivate: function() {
		
		// Begin responding to modelChanged() calls.
		this.sceneActive = true;
		
		// If we previously tried to re-render view or cmd menus while inactive, then we do it now instead.
		if(this.commandMenu.updateOnActivate && this.commandMenu.model.items) {
			this.commandMenu.updateOnActivate = false;
			this.controller.scene.modelChanged(this.commandMenu.model, undefined);
		}
		if(this.viewMenu.updateOnActivate && this.viewMenu.model.items) {
			this.viewMenu.updateOnActivate = false;
			this.controller.scene.modelChanged(this.viewMenu.model, undefined);
		}
		
	},
	
	handleSceneDeactivate: function() {
		// Ignore modelChanged() calls.
		this.sceneActive = false;
	},

	// Re-render menus when width changes.  This lets us update when switching between landscape & portrait modes.
	handleWindowResize: function(event) {
		if(this.menuWidth !== this.calcMenuWidth()) {
			
			// It's a little messy to call modelChanged() when the model is not actually changing here, 
			// but this ensures that if there's a synchronous blur event caused when we re-render, then
			// any additional model changes in response to the event will be properly serialized.
			// Since menu models are very rarely shared between widgets, it's not that big a deal.
			if(this.commandMenu.model.items) {
				this.controller.scene.modelChanged(this.commandMenu.model, undefined);
			}
			if(this.viewMenu.model.items) {
				this.controller.scene.modelChanged(this.viewMenu.model, undefined);
			}
		}
	},

	handleDocumentActivation: function handleDocumentActivation(event) {
	    var focused = event.type === Mojo.Event.windowActivate;
		var vis = this.getMenuVisible(Mojo.Menu.commandMenu);

		// The idea is that if our window blurs while the cmd menu is visible, then we automatically hide it.
		// If it focuses when we auto-hid it, then we show it again.  But, the user setting must always override
		// this, so setMenuVisible() clears the commandMenu.autoHidden property.
		if(!focused && vis) {
			this.setMenuVisible(Mojo.Menu.commandMenu, false);
			this.commandMenu.autoHidden = true;
		} else if (focused && this.commandMenu.autoHidden) {
			this.setMenuVisible(Mojo.Menu.commandMenu, true);
			delete this.commandMenu.autoHidden;
		}

	},

	/*
		Handles all tap events in menu bars.
	*/
	tapHandler: function(menu, event) {
		var widgetNode = menu.div;
		var itemNode = event.target;
		var itemModel, itemCmd;
		var groupNode, groupModel;


		if (!menu.visible) {
			return;
		}
		
		if (!this.controller.scene.isActive()) {
			return;
		}

		// find outermost menuitem mode:
		while(itemNode._mojoMenuItemModel === undefined && itemNode !== widgetNode) {
			itemNode = itemNode.parentNode;
		}

		// find model for this menuitem:
		itemModel = itemNode._mojoMenuItemModel;
		if(!itemModel) {
			return;
		}
		
		// Disabled menu buttons don't consume tap events, but they still prevent the default blur behavior.
		if(itemModel.disabled) {
			event.preventDefault();
			return;
		}
		
		// tap event is handled, but if there is a specific item that got tapped, it needs to get this event so that the gesture system will send the simulateClick event and set an insertion point
		event.stopPropagation();
		
		// If it has a submenu, then pop it up:
		if(itemModel.submenu) {
			this.popupSubmenu(itemModel.submenu, event.target, this.kSubmenuPopupClass);
			return;
		}

		itemCmd = itemModel.command;

		// Find outermost group node, if item is in a group:
		groupNode = itemNode.parentNode;
		while(groupNode && groupNode._mojoMenuItemModel === undefined && groupNode !== widgetNode) {
			groupNode = groupNode.parentNode;
		}

		if(groupNode && groupNode !== widgetNode) {
			groupModel = groupNode._mojoMenuItemModel;
		}
		
		// If we're in a toggle group, then apply special behavior!
		if(groupModel && groupModel.toggleCmd !== undefined && itemCmd) {
			
			// We used to check if it was on the currently chosen toggle button item,
			// and then not send the command event... but some apps have a requirement
			// to respond when the currently chosen toggle is clicked, so now we send it anyways.
			
			// Update toggle styles if tap was on non-current item.
			if(groupModel.toggleCmd != itemCmd){
				groupModel.toggleCmd = itemCmd;
			} else if (groupModel.items.length === 1){
				groupModel.toggleCmd = '';
			}
			this.applyToggleStyles(groupNode, groupModel.toggleCmd);
		}

		// Send command associated with this item, if appropriate:
		this.sendCommandEvent(itemCmd, event);

	},

	// called by scene controller to display the app menu.
	toggleAppMenu: function() {
		var popupModel, items;
		var newAppMenuPopup;
		
		if(this.appMenuPopup) {
			this.appMenuPopup.mojo.close();
		}
		else {

			// Build the model for the app menu.
			// It consists of the default menu items at the beginning & end, with any scene-specific ones in the middle
			// this section deals with empty app menu models
			if (this.appMenu.model && this.appMenu.model.items) {
				items = this.appMenu.model.items;
			} else {
				items = [];
			}
			
			if (items.length === 0 || !this.appMenu.attrs.omitDefaultItems) {
				// Default menu items at the beginning and end, with scene-specific items in the middle
				items = this.defaultAppMenuPrefixItems.concat(items, this.kDefaultAppMenuSuffixItems);
			}

			// Send commandEnable events for any items requesting it:
			this.checkItemEnables(items);

			popupModel = {
				onChoose: this.popupChoose.bind(this),
				items: items,
				popupClass: this.kAppPopupClass,
				scrimClass: this.kAppPopupScrimClass,
				popupId: this.kAppPopupId,
				manualPlacement: true,
				// Shhh! _mojoContainerLayer is secret!
				// App menus are supposed to dismiss cancelable dialogs, which
				// requires that the menu be at the same layer
				_mojoContainerLayer: this.controller.scene.dialogContainerLayer
			};

			if (this.window.PalmSystem && thus.window.PalmSystem.hideSpellingWidget) this.window.PalmSystem.hideSpellingWidget();
			newAppMenuPopup = this.controller.scene.popupSubmenu(popupModel);

			if(!newAppMenuPopup.mojo.isClosed()) {
				this.appMenuPopup = newAppMenuPopup;
			}
		}
	},

	/*
		Given an array of menu items, this function sends commandEnable events through the
		commander chain for any items which specify checkEnabled=true.
		Then the item model object is modified to reflect the updated enable state of the item.
		It recurses for groups, but not for submenus.
	*/
	checkItemEnables: function(items) {
		var i;
		var curItem, enableEvt;

		for (i = 0; i < items.length; i++) {
			curItem = items[i];

			if (curItem.command && curItem.checkEnabled) {
				enableEvt = Mojo.Event.make(Mojo.Event.commandEnable, {command: curItem.command});
				this.controller.stageController.sendEventToCommanders(enableEvt);

				curItem.disabled = enableEvt.defaultPrevented;
			} else if (curItem.items) {
				this.checkItemEnables(curItem.items);
			}
		}

	},



	sendCommandEvent: function(cmdName, event) {
		if(cmdName && this.controller.scene.isActive()) {
			this.controller.stageController.sendEventToCommanders(Mojo.Event.make(Mojo.Event.command, {command: cmdName, originalEvent:event}));
		}
	},

	/*
		Re-renders menus when the model changes.
	*/
	handleModelChanged : function handleModelChanged(model) {
		var menu;
		
		if (model === this.commandMenu.model) {
			menu = this.commandMenu;
		} else if (model === this.viewMenu.model) {
			menu = this.viewMenu;
		} else {
			return;
		}
		
		// If the scene is not active, then we defer updating the menu until it becomes active again.
		if (!this.sceneActive) {
			menu.updateOnActivate = true;
			return;
		}
		
		// Otherwise, re-render the menu!
		if (menu.div) {
			this.resetChildNodeTracking();
			if (menu.div.firstChild) {
				menu.div.removeChild(menu.div.firstChild);
			}

			this.renderFromModel(menu);

			this.resetChildNodeTracking();
		}
	},
	
	// Semi-private API used by scene controller.
	toggleMenuVisible: function(which) {
		if(which == Mojo.Menu.viewMenu) {
			this.setMenuVisible(which, !this.viewMenu.visible);
		} else if(which == Mojo.Menu.commandMenu) {
			this.setMenuVisible(which, !this.commandMenu.visible);
		}
	},


	// Semi-private API used by the scene controller
	getMenuVisible: function(which) {
		if(which == Mojo.Menu.viewMenu) {
			return this.viewMenu.visible;
		} else if(which == Mojo.Menu.commandMenu) {
			return this.commandMenu.visible;
		}
	},

	// Semi-private API used by scene controller.
	setMenuVisible: function(which, visible) {
		//setup a global for what is about to happen before we start the animations so that taps are ignored
		//as the menu is animating off the screen
		this.hidden = !visible;
		
		// We must adjust both the spacer div and the fixed-position menu div itself.
		if (which == Mojo.Menu.viewMenu) {
			this.animateMenu(this.viewMenu, visible);
		} else if (which == Mojo.Menu.commandMenu) {
			// If the set API is called for the cmd menu, then that overrides any auto-hiding/showing we might have done.
			delete this.commandMenu.autoHidden;
			this.animateMenu(this.commandMenu, visible);
		}
	},
	
	/*$ @private 
		Animates the view and command menus on and off the screen
	*/
	animateMenu: function(menu, visible) {
		var animator, onComplete;
		if (menu.div && visible != menu.visible) {
		    
			// If we're hiding a menu, then we need to make it display:none when the animation is finished.
			if (!visible && this.kDontDisplayHiddenMenus) {
				onComplete = this.applyDisplayNone;
			}

			// Make sure it's visible before we try to animate it on screen.
			if (visible && this.kDontDisplayHiddenMenus) {
				menu.div.style.display='';
				this.controller.scene.showWidgetContainer(menu.div);
			}

			if(visible !== menu.visible && menu == this.viewMenu) {
				animator = Mojo.Animation.animateStyle(menu.div, 'height', 'ease-in-out', {
					from: 0,
					to: this.viewSpacerHeight,
					duration: 0.15,
					reverse:!visible,
					onComplete: onComplete});

				animator = Mojo.Animation.animateStyle(menu.div.firstChild, 'top', 'ease-in-out', {
					from: -1*this.kMenuHeight,
					to: 0,
					duration: 0.15,
					reverse:!visible});
			}
			else if(visible && menu == this.commandMenu) {
				menu.div.style.height = this.commandSpacerHeight;
				menu.div.firstChild.style.bottom = "0px";
				Mojo.Dom.removeClassName(menu.div.firstChild, "faded");
			} else {
				Mojo.Dom.addClassName(menu.div.firstChild, "faded");
			}

			menu.visible = visible;
			if (menu.model.visible !== undefined) {
				menu.model.visible = visible;
			}

			this.controller.scene.handleEdgeVisibility(menu.placement, visible, menu.spacerHeight);
		}
	},
	
	/*$ @private
		Completion function for menu visibility animations.  
		Makes menus display:none when hidden, so embedded text fields are unfocusable.
	*/
	applyDisplayNone: function(element, cancelled) {
		if(!cancelled) {
			this.controller.scene.hideWidgetContainer(element);
			element.style.display='none';
		}
	},


	calcMenuWidth: function() {
		// leave 3 pixels margin on either side
		return this.window.innerWidth - (2*this.kMenuLeftMargin);
	},

	resetChildNodeTracking: function() {
		this.trackedChildNodes.length = 0;
	},

	/*
		Render command or view menu into the given element, using the given model.
	*/
	renderFromModel: function renderFromModel(menu) {
		var node = this.renderItemList(Mojo.Widget.getSystemTemplatePath("menu/menu"), menu.model.items);

		this.menuWidth = this.calcMenuWidth();

		// WARNING: We just append to parent here... caller must remove old child if needed.
		menu.div.appendChild(node);

		this.controller.instantiateChildWidgets(node);
		this.controller.scene.showWidgetContainer(node);
		
		this.calculateMenuLayout(node, menu.model.items);
		
		// Apply command/view menu classes if appropriate:
		Mojo.Dom.addClassName(node, menu.menuClass);
		Mojo.Dom.addClassName(node, (menu.attrs.menuClass !== undefined ? menu.attrs.menuClass : 'palm-default'));

		menu.div.style.height = menu.visible ? (menu.spacerHeight+'px') : '0px';
		menu.div.firstChild.style[menu.placement] = menu.visible ? '0px' : (-1*this.kMenuHeight+'px');
		
		return node;
	},

	/*
		Renders a list of menu items.
		Used for both groups and the top-level menu itself.
	*/
	renderItemList: function renderItemList(containerTemplate, itemList, templateRoot) {

		var i;
		var obj = {menuItems:"<div id='MojoMenuItemsParentMarker'></div>"};
		var itemsHTML;
		var node;


		node = Mojo.View.convertToNode(Mojo.View.render({object: obj, template: containerTemplate, templateRoot: templateRoot}), this.controller.document);

		// Find the parent of the menu items, remember it, and remove the marker.
		var markerNode = node.querySelector('#MojoMenuItemsParentMarker');
		var itemsParent = markerNode.parentNode;
		itemsParent.removeChild(markerNode);
		node._mojoMenuItemsParent = itemsParent;

		// Render menu items, and insert them into the container:
		for(i=0; i<itemList.length; i++) {
			this.renderItemInto(itemsParent, itemList[i]);
		}

		return node;
	},

	/*
		Render individual menu item (which may be a group),
		and appends it to the given parent node.
	*/
	renderItemInto: function renderItemInto(parent, itemModel) {
		var content;
		var node;

		// Render item depending on what properties it contains:

		// If a custom template is specified, then use it for rendering the item:
		if(itemModel.template) {
			content = Mojo.View.render({object: itemModel, template: itemModel.template, templateRoot: itemModel.templateRoot});
			node = Mojo.View.convertToNode(content, this.controller.document);
		}

		// Render it as a group if it has subitems:
		else if(itemModel.items) {
			node = this.renderItemList(Mojo.Widget.getSystemTemplatePath("menu/group"), itemModel.items);
			if(itemModel.toggleCmd) {
				this.applyToggleStyles(node, itemModel.toggleCmd);
			}
		}

		// 'choice' & submenu items are rendered the same:
		else if(itemModel.command || itemModel.submenu) {
			if(itemModel.iconPath) {
				content = Mojo.View.render({object: {iconPath:"background-image: url("+itemModel.iconPath+");"},
											template: Mojo.Widget.getSystemTemplatePath("menu/icon-choice")});
			} else if(itemModel.icon) {
				content = Mojo.View.render({object: {icon:itemModel.icon}, template: Mojo.Widget.getSystemTemplatePath("menu/icon-choice")});
			} else {
				content = Mojo.View.render({object: {label:itemModel.label}, template: Mojo.Widget.getSystemTemplatePath("menu/text-choice")});
			}
			node = Mojo.View.convertToNode(content, this.controller.document);

			if(itemModel.disabled) {
				Mojo.Dom.addClassName(node, 'palm-disabled');
				node.attributes.removeNamedItem('x-mojo-tap-highlight');
			}
		}

		// TODO: Render labels.
		else if(itemModel.icon || itemModel.iconPath) {
			Mojo.Log.warn("WARNING: Icon labels are not supported in menus. Did you mean to specify a command?");
		}else if(itemModel.label !== undefined) {
			node = Mojo.View.convertToNode(Mojo.View.render({object: {label:itemModel.label}, template: Mojo.Widget.getSystemTemplatePath("menu/label")}),
				this.controller.document);
		}


		// Tag rendered menu items with their model & width, and append to parent:
		if(node) {
			node._mojoMenuItemModel = itemModel;

			if(itemModel.width && !itemModel.items) {	// only allow width override for non-groups.
				node._mojoMenuItemWidth = itemModel.width;
				node.style.width = itemModel.width+'px';
			}

			this.trackedChildNodes.push(node);
			parent.appendChild(node);
		}

	},

	setModel: function setModel(newModel) {
		Mojo.Log.error("WARNING: Setting the model on a menu is not currently supported.");
		// The issue is just that the actual widget "model" is set by the scene controller to be the hidden hash of all menu models.
		// We currently manually subscribe to changes on the view & command models in the widget.
		// Easy enough to cancel & resubscribe in the new model, but the scene assistant has no way to specify the hash of all models,
		// so we'd have to figure out some weird way to make it work.  Plus, it's unlikely to be needed.
	},

	// Given parent node of menu items, and an array of models for the children, assign 'left' positions to all children.
	calculateMenuLayout: function calculateMenuLayout(menuNode, models) {
		var dividerCount=0, itemCount=0;
		var i;
		var dividerWidth, interItemSpace;
		var totalWidth, widthScaling;
		var count;

		// Run though models, counting dividers versus regular top-level items.
		// This is a bit messy... we also count up the width of all dividers that specify a width.
		// This is needed in order for us to properly calculate how much space is "leftover",
		// and we have to do it while traversing the models, since dividers do not appear in the DOM at all.
		count = this.countItems(models);
		dividerCount = count.dividers;
		itemCount = count.items;

		// Run through DOM subtree calculating item widths for top-level items:
		totalWidth = this.calculateItemWidths(menuNode._mojoMenuItemsParent) + count.dividersWidth;


		// If we don't have enough space, we need to scale it down:
		if(totalWidth > this.menuWidth) {
			widthScaling = this.menuWidth / totalWidth;
			dividerWidth = 0;
			interItemSpace = 0;
		}
		else { // Otherwise, figure out how to allocate extra space:
			widthScaling = 1; // don't need to scale down sizes.
			interItemSpace = this.menuWidth - totalWidth;

			// If we have dividers, extra space is shared amongst them.
			if(dividerCount > 0) {
				dividerWidth = Math.floor(interItemSpace / dividerCount);
				interItemSpace = 0;
			} else { // Otherwise, we divide it evenly between all TOP LEVEL items.
				interItemSpace = Math.floor(interItemSpace / (itemCount-1));
			}
		}


		// Finally, assign positions to all of the items:
		this.assignItemPositions(menuNode, models, widthScaling, dividerWidth, interItemSpace);

	},

	/*
		Counts items & dividers according to the scheme we need to calculate layout.
		Dividers which specify width are counted specially... they don't go into either divider or item count,
		but their width is accumulated to be taken into account when we calculate how much extra space we have.
	*/
	countItems: function(items) {
		var subCounts;
		var counts = {dividers:0, items:0, dividersWidth:0};
		var i, item;

		for(i=0; i<items.length; i++) {
			item = items[i];
			if(this.isDivider(item)) {

				// Dividers which specify width don't go into the 'divider count',
				// since they don't receive any of the "extra space".
				if(item.width === undefined) {
					counts.dividers++;
				} else {
					// ... instead we add up their width so we can properly calculate "extra space".
					counts.dividersWidth += item.width;
				}

			} else {
				
				// This item counts as a divider, if 'expand' is specified.
				// This allows labels to fill the available extra space.
				// Otherwise, it's a regular item, and we may reduce its width if we run out of space.
				if(item.expand) {
					counts.dividers++;
				} else {
					counts.items++;
				}
				
				// If it's a group, then we need to include any subdivders in the  divider count,
				// but we do NOT include the items.  We count only top-level items.
				if(item.items) {
					subCounts = this.countItems(item.items);
					counts.dividers += subCounts.dividers;
					counts.dividersWidth += subCounts.dividersWidth;
				}
			}
		}

		return counts;
	},

	/*
		Actually assigns posistions to the menuitems under the given menu node, and returns the total space used.
		Requires that positions of non-flexible spaces already be calculated via calculateItemWidths().
		Called recursively to lay out items inside groups, and saves the width of the group as a property on the group node
		now that it can be determined.
	*/
	assignItemPositions: function(node, itemModels, widthScaling, dividerWidth, interItemSpace){
		var items = node._mojoMenuItemsParent.childNodes;
		var item;
		var currentLeft = this.kMenuLeftMargin;
		var modelIndex = 0;
		var i;
		for(i=0; i<items.length; i++) {
			item = items[i];

			// skip non-menu-item nodes
			if(item._mojoMenuItemModel) {
				while(this.isDivider(itemModels[modelIndex])) {
					currentLeft += (itemModels[modelIndex].width || dividerWidth);
					modelIndex++;
				}

				item.style.left = currentLeft+'px';
				
				// Is this an expanding item? Then give it a share of the divider space allocation.
				if(item._mojoMenuItemModel.expand) {
					item._mojoMenuItemWidth += dividerWidth;
					item.style.width = item._mojoMenuItemWidth+'px';
				}
				
				currentLeft += interItemSpace;

				// If it's a group, we need to recurse in order to handle dividers.
				// This is how we calculate the real size of the group, and therefore
				// can continue laying out top-level items.
				if(item._mojoMenuItemsParent) {
					// note that interItemSpace is always 0 inside groups.
					item._mojoMenuItemWidth = this.assignItemPositions(item, item._mojoMenuItemModel.items, widthScaling, dividerWidth, 0);
					item._mojoMenuItemWidth /= widthScaling; // since this should be the unscaled width...
				}

				currentLeft += Math.floor(item._mojoMenuItemWidth * widthScaling);

				modelIndex++;
			}
		}
		return currentLeft;
	},

	/*
		Calculates widths of items under the given menu node, saves it as a property on them, and returns the total.
		Does not calculate width of groups, although the cumulative width of their children is included in the total.
		Ignores flexible spaces entirely.  Called recursively for groups.
	*/
	calculateItemWidths: function(node) {
		var items = node._mojoMenuItemsParent.childNodes;
		var i, item;
		var total = 0;

		for(i=0; i<items.length; i++) {
			item = items[i];

			// Skip nodes that aren't menuitems.
			if(!item._mojoMenuItemModel) {
				continue;
			}

			// If width is already specified, take it into account in our total:
			if(item._mojoMenuItemWidth) {
				total += item._mojoMenuItemWidth;
			}
			else if(item._mojoMenuItemModel.expand) {
				// Expanding items start out 0-width, and then get their real width assigned once we've calculated the space for dividers.
				item._mojoMenuItemWidth = 0;
			}
			else { // Otherwise, calculate it:

				// If it's a group, we need to recurse first,
				// and then we don't fill in the width on the group item,
				// since it could change when we allocate space to dividers.
				if(item._mojoMenuItemsParent) {
					total += this.calculateItemWidths(item);
				} else {
					item._mojoMenuItemWidth = Mojo.Dom.getWidth(item);
					total += item._mojoMenuItemWidth;
				}
			}

		}

		return total;
	},

	/*
		Apply dynamic toggle button styles to child items of a toggle button group.
	*/
	applyToggleStyles: function applyToggleStyles(groupNode, chosenCmd) {
		var node;
		var itemsParent = groupNode._mojoMenuItemsParent;

		for(var i=0; i<itemsParent.childNodes.length; i++) {
			node = itemsParent.childNodes[i];
			if(node._mojoMenuItemModel) {
				if(node._mojoMenuItemModel.command == chosenCmd) {
					Mojo.Dom.addClassName(node, 'palm-depressed');
				} else {
					Mojo.Dom.removeClassName(node, 'palm-depressed');
				}
			}
		}
	},

	/*
		Divider items don't have any required properties, so they're hard to identify.
		We use this function, and the logic is basically this: if it's not anything else, it's a divider.
	*/
	isDivider: function(item) {
		return !((item.label !== undefined) || item.icon || item.iconPath || item.items || item.template);
	},

	/*
		Called when a submenu item is selected.
		Pops up the names submenu, near the given element,
		and sends a command event with the appropriate command if a choice is made.
	*/
	popupSubmenu: function(submenuName, eventTarget, popupClass) {

		// Look up the named submenu:
		var menu = this.controller.scene.getWidgetSetup(submenuName);
		menu = menu && menu.model;

		Mojo.assert(menu, "Submenu '"+submenuName+"' cannot be displayed, because it has not been set up or has no model. Check your call to setupWidget().");

		// Send commandEnable events for any items requesting it:
		this.checkItemEnables(menu.items);

		menu = Mojo.Model.decorate(menu);
		menu.onChoose = this.popupChoose.bind(this);
		menu.placeNear = eventTarget;
		menu.popupClass = popupClass;
		return this.controller.scene.popupSubmenu(menu);

	},

	// Called by submenu popups.  Sends the command event for the user's submenu choice.
	popupChoose: function(command) {
		//animate the thing out and then remove it
		
		// Only send command event if a choice was made:
		this.sendCommandEvent(command);
		this.appMenuPopup = undefined;
	},

	handleShortcut: function(which, event) {
		// Just search the menu tree for shortcuts.
		// If this is too slow, we can keep shortcut hashes for the view & command menus,
		// fill them out when rendering, and update them when the menu models change.
		// We'd need to additionally traverse all linked submenu models, though, during
		// initial rendering in order to make sure the hash included their shortcuts as well.
		var result = false;
		result = this.tryShortcut(this.commandMenu.model.items, which, event);
		result = result || this.tryShortcut(this.viewMenu.model.items, which, event);
		result = result || this.tryShortcut(this.appMenu.model.items, which, event);
		// Check shortcuts in default app-menu items, since the this.appMenu.model itself only includes scene-specific stuff.
		if(!result && !this.appMenu.attrs.omitDefaultItems) {
			result = this.tryShortcut(this.defaultAppMenuPrefixItems, which, event) ||
				this.tryShortcut(this.kDefaultAppMenuSuffixItems, which, event);
		}

		return result;
	},

	// Check the given items array for the given shortcut string.
	// Sends a mojo-command event & returns true if the shortcut is found,
	// and recurses if groups or submenus are present in the items list.
	tryShortcut: function(items, which, event) {
		var i;
		var item;
		var result = false;

		if(!items) {
			return false;
		}

		for(i=0; i<items.length; i++) {
			item = items[i];

			// is it a command item? Check the shortcut.
			if(item.command && item.shortcut && item.shortcut.toUpperCase() == which) {

				// If enable state is set to auto-update, then we need to update it before invoking
				// via a key shortcut, since the stuff controlling the enable state might have changed.
				if(item.checkEnabled) {
					this.checkItemEnables([item]);
				}

				// If it's enabled, then we send the command event.
				if(!item.disabled) {
					this.sendCommandEvent(item.command, event);
				}
				return true;
			}
			// Is it a group? Recurse to check subitems.
			else if(item.items) {
				result = this.tryShortcut(item.items, which, event);
			}
			// Is it a submenu item?  Then we need to recurse on the submenu...
			else if(item.submenu) {
				item = this.controller.scene.getWidgetSetup(item.submenu);
				item = item && item.model.items;
				result = this.tryShortcut(item, which, event);
			}

			if(result) {
				return true;
			}
		}

		return false;
	}

};

Mojo.Widget._Menu.prototype.kDefaultAppMenuSuffixItems = [Mojo.Menu.prefsItem, Mojo.Menu.helpItem];
