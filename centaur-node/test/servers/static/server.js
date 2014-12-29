#!/usr/bin/env node


var fs = require('fs'),
    server = require('./lib'),
    sys = require('sys');

var settings = {};    
server.start(settings);

