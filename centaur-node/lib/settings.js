
var log = require('./log');

default_settings = {
    "LOG_LEVEL"                 : log.levels.INFO,
    "DIRECTORY_INDEX"           : "index.html",
    
    "DOC_ROOT"                  : process.env['DOC_ROOT'] || process.cwd(),
    "PORT"                      : process.env['PORT'] || 8080, 
    
    "PALMAPP_INSTALL_PATH"      : "/usr/palm/applications/",
    //"PALMAPP_INSTALL_PATH"      : "/usr/palm/tools/centaur-node/mapping/",
    "3RDPARTYAPP_INSTALL_PATH"  : "/media/cryptofs/apps/usr/palm/applications",
};

//default_settings["PALMAPP_INSTALL_PATH"]        = default_settings['DOC_ROOT'] + "/usr/palm/applications/";
//default_settings["3RDPARTYAPP_INSTALL_PATH"]    = default_settings['DOC_ROOT'] + "/usr/palm/applications/";


exports.default_settings = default_settings;
