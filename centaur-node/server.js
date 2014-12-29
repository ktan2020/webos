#!/usr/bin/env node


var fs = require('fs'),
    sys = require('sys'),
    server = require('./lib/core'),
    log = require('./lib/log'),
    settings = require('./lib/settings').default_settings,
    file_handler = require('./lib/file-handler').static_handler,
    internalapps_handler = require('./lib/installedapp-handler').internal_apps,
    thirdpartyapps_handler = require('./lib/installedapp-handler').thirdparty_apps,
    service_handler = require('./lib/service-handler').service_handler,
    proxy_handler = require('./lib/proxy-handler').proxy_handler;
   
    

settings['LOG_LEVEL'] = log.levels.INFO;     
    

// mount handlers here ...
mount('/', file_handler);
log.info(" ... [*] Mounting DOC_ROOT:(" + settings['DOC_ROOT'] + ") @ / ... ");

mount('/bridge', service_handler);
log.info(" ... [*] Mounting Palm Service Bridge @ /bridge ... ");

mount('/Apps', thirdpartyapps_handler);
log.info(" ... [*] Mounting 3rd party installed apps @ /Apps ... ");

mount('/PalmApps', internalapps_handler);
log.info(" ... [*] Mounting Palm Internal apps @ /PalmApps ... ");

mount('/proxy', proxy_handler);
log.info(" ... [*] Mounting Proxy @ /proxy ...");


log.info(" ... Starting centaur-nodejs server on PORT: (" + settings['PORT'] + "), DOC_ROOT:(" + settings['DOC_ROOT'] + ") ...");
server.start(settings);

