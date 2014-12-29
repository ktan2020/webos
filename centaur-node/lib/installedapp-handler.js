
var http = require('http'),
    fs = require('fs'),
    pathlib = require('path'),
    uri = require('url'),
    sys = require('sys'),
    mime = require('./content-type'),
    log = require('./log'),
    settings = require('./settings').default_settings,
    _ = require("./underscore")._;
    

function app_dir_listing(prefix, suffix, req, resp) {
    
    var path = pathlib.join(prefix, suffix);
    var str = "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\">" +
              "<html><title>Installed apps</title>" +
              "<meta http-equiv='Cache-Control' content='no-cache' />" +
              "<meta http-equiv='Pragma' content='no-cache' />" +
              "<meta http-equiv='Expires' content='0' />" +
              "<script type='text/javascript'>function alt(){ if (document.getElementsByTagName){ var t=document.getElementById('t'); var r=t.getElementsByTagName('tr'); for (var i=0;i<r.length;i++) r[i].className=((i%2===0) ? 'even' : 'odd')}}</script>" +
              
              "<style type='text/css'>.sp {font-size:0.8em;color:#777;padding-left:0.5%;text-align:left;float:left;} .even {background-color:white;} .odd {background-color:#D0D0D0;}" +
              ".hd {font-size:1.0em;color:#777;float:left;text-align:left;}" +
              "#nav-menu ul {list-style: none;padding: 0;margin: 0;}" +
              "#nav-menu li {float: left;margin: 0 0.15em;}" +
              "#nav-menu li a {background: #fff bottom left repeat-x;height: 2em;line-height: 2em;float: left;width: 9em;display: block;border: 0.1em solid #dcdce9;color: #0d2474;text-decoration: none;text-align: center;}" +
              "#nav-menu {width:30em}" +
              "</style>" +
              
              "<div id='nav-menu'>" +
              "<ul>" +
              "<li><a href='/PalmApps'>PalmApps</a></li>" +
              "<li><a href='/Apps'>Apps</a></li>" +
              "</ul>" +
              "</div>" + 
              
              "<div class='hd'><body onload='alt()'><h2>Installed apps in: " + path + "</h2>" +
              "<hr>";
              
    str += "<center><div><table id='t' width='80%' border='1' cellpadding='2' cellspacing='0'>";          
    var start = (new Date()).getMilliseconds();                   
    var ls = fs.readdir(path, function(err, files) {
        if (err) throw err;
      
        var end = (new Date()).getMilliseconds();
        
        if (files && files.length) {
             files.sort();
            _.each(files, function(file) {
                    
                var stat = fs.statSync(pathlib.join(path, file));
                if (stat.isDirectory()) {
                    
                    str += "<tr><td>" + file + "</td><td align='center'><a href='" + (pathlib.join(suffix, file)+'/?device=pre') + "'>Pre</a></td><td align='center'><a href='" + (pathlib.join(suffix, file)+'/?device=pixi') +"'>Pixi</a></td></tr>";
                
                }
            });
        }
        
        str += "</table></div></center><hr></body></div><div class='sp'>" + new Date() + ".</div><div class='sp'> Powered by nodejs. Generated in: " + (end-start) + " ms.</div></html>";
           
        resp.writeHead(200, {'Content-Type':'text/html', 'Content-Length':str.length});
        resp.end(str);
    });
}


exports.internal_apps = internal_apps = function(path, req, resp) {
    
    //app_dir_listing(settings['PALMAPP_INSTALL_PATH'], req, resp);
    app_dir_listing(settings['DOC_ROOT'], settings['PALMAPP_INSTALL_PATH'], req, resp);
    
}

exports.thirdparty_apps = thirdparty_apps = function(path, req, resp) {
    
    //app_dir_listing(settings['3RDPARTYAPP_INSTALL_PATH'], req, resp);   
    app_dir_listing(settings['DOC_ROOT'], settings['3RDPARTYAPP_INSTALL_PATH'], req, resp);
    
}
