
*************************************************************************
*
*   centaur
*
*   ... a strange mishmash of WEBrick, Python, and cometd ...
*
*
*   Many thanks to:
*       Rob Tsuk, Steve Grafton, Chris Wiebe, Steve Lemke, Frankie Fu, Matt McNulty
*
************************************************************************

centaur is a Http Server framework very similar to WEBrick (http://microjet.ath.cx/webrickguide/html/Contents.html).
In fact, it is almost a straight port of WEBrick to Triton in Javascript using Triton's native extensions.


Feature List:
=============

* Runs on both emulator and local desktop. (Safari - only supported browser).
* Extends Luna service bus out of emulator via Palm Service bridge servlet. 
* Long polling (Comet). Servicecall return callbacks acted upon immediately.
* Servlet introspection via channels:
  /bridge/internal/query/session_map/ and /bridge/internal/query/session_map/size/
* Runtime dynamic remapping of uri using rules table (similar to mod-rewrite).
* Listing of installed apps in emulator or local desktop using config setting.
  3rd party apps     - http://localhost:5580/Apps/
  Palm internal apps - http://localhost:5580/PalmApps/
* Supports Pre and Pixi resolution (320x480, 320x400).
* Multiple browser tabs / windows assigned unique session id's. Open tabs / windows
  automatically attempts to reconnect to respective previous sessions.


  
To run:
    /path/to/triton -I /path/to/javascript_files_to_include/ main.js

    


#################    
To do's:
--------
 
* X-JSON - Safari (refuse to get unsafe header)
* Comet obj in wrong parent window when app is launched via faceless window
* notifications (???)

#################
