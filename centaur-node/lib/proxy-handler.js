

var http = require('http'),
    fs = require('fs'),
    pathlib = require('path'),
    uri = require('url'),
    sys = require('sys'),
    mime = require('./content-type'),
    log = require('./log'),
    settings = require('./settings').default_settings,
    _ = require("./underscore")._;
    
    

function _get_hostname(uri) {
    return uri.split('://')[1].split('/')[0];
}

function _get_path(uri) {
   return "/"+uri.split('://')[1].split('/').splice(1).join('/');
}

function _uri_to_port(uri) {
    var matches = uri.match(/:(\d+)/g);
    if (matches) {
        return matches.pop().slice(1);
    } else {
        switch (uri.split('://')[0]) {
        case 'http': return 80;
        case 'ftp' : return 21;
        default: throw 'Unsupported protocol!'
        }
    }
}

function _curl(location, resp) {
    var port = _uri_to_port(location), host = _get_hostname(location), path = _get_path(location);
    var server = http.createClient(port, host);
    var req = server.request('GET', path, {'host': host});
    req.end();
    
    req.on('response', function(response){
        console.log('response.statusCode: ' + response.statusCode);
        if (response.statusCode === 301) {
            var r=response.headers.location.match(/^http:\/\/(.*)\/$/)[1];
            
            console.log('301 detected -> ' + response.headers.location + ' to: ' + r);
            _curl(response.headers.location, resp);
            return;
        }
        response.on('data', function(data){
            console.log('data: ' + data);
            resp.write(data, 'binary'); // XXX
        });
        response.on('end', function(){
            resp.end();       
        });
        
        resp.writeHead(200, {'Cache-Control': 'no-cache'}); // XXX
    });
};
        

function doGET(req, resp) {
    var query;
    
    if (req.url && uri.parse(req.url, true)) {
        query = uri.parse(req.url, true).query;
        
        if (query && query.proxy) {
            // URI decode the proxy request first. query request url must be uri encoded ...
            var proxy = decodeURIComponent(query.proxy);       
            
            log.info("%%% Incoming proxy request for URL: (" + proxy  + ") %%%");
            
            _curl(proxy, resp);
        }
        
    }
    
}


function doPOST(req, resp) {
    var query;
    
    // ???
}
    
    
    
exports.proxy_handler = proxy_handler = function(path, req, resp) {
    
    
    //console.log("req.method: " + req.method + ", req.url: " + req.url + " XXX");
    
    switch(req.method) {
    case 'GET':
        doGET(req, resp); break;
    case 'POST':
        doPOST(req, resp); break;
    default:
        throw "!!! proxy_handler unable to handle this request: " + req.method + " !!!";
    }
    
    
}

    
