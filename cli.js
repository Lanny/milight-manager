#!/usr/bin/env node

var http = require('http'),
  _ = require('underscore'),
  utils = require('./utils');
 
var config = utils.getConfig();

function makeReqOpts(url) {
  return {
    hostname: config.managerAddress,
    port: config.serverPort,
    method: 'POST',
    path: url
  };
}

function defaultResponseHandler(res) {
  if (res.statusCode !== 200) {
    console.error('Error, status code: ', res.statusCode);
    process.exit(1);
  }

  var body = '';
  
  res.on('data', function(chunk) {
    body += chunk;
  });

  res.on('end', function() {
    var response;
    try {
      response = JSON.parse(body);
    } catch (e) {
      console.error('Error parsing response:', body);
      process.exit(1);
    }

    if (response.status !== 'SUCCESS') {
      if (response.status !== undefined && response.reason !== undefined) {
        console.error(response.status, ':', response.reason);
      } else {
        console.error('Malformed response from server.');
      }

      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}

function turnOn() {
  var req = http.request(makeReqOpts('/on'), defaultResponseHandler);
  req.end();
}

function turnOff() {
  var req = http.request(makeReqOpts('/off'), defaultResponseHandler);
  req.end();
}

var subcommands = {
  'on': turnOn,
  'off': turnOff
};

function delegate(subcommand, args) {
  var f = subcommands[subcommand];

  if (f === undefined) {
    console.error('Unrecognized subcommand:', subcommand);
    process.exit(1);
  }

  f.apply(this, args);
}

if (require.main === module) {
  delegate(process.argv[2], process.argv.slice(3));
}

