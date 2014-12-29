
var server = require('./lib');
var log = require('./log');
var sys = require('sys');

    
var settings = {};

try {    
        
    server.start(settings);

} catch (err) {

    sys.puts('Error with ');
    process.exit(1);

}


