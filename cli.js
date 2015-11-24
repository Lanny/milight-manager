#!/usr/bin/env node

var http = require('http'),
  _ = require('underscore'),
  querystring = require('querystring'),
  colors = require('colors'),
  utils = require('./utils');
 
var config = utils.getConfig();

function makeReqOpts(url, settings) {
  settings = _.extend({}, settings);

  var opts = {
    hostname: config.managerAddress,
    port: config.serverPort,
    method: 'POST',
    path: url,
    headers: {}
  };

  _.extend(opts, settings.addtOpts);

  if (typeof settings.data === 'object') {
    var postData = querystring.stringify(settings.data);
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.headers['Content-Length'] = Buffer.byteLength(postData);

    opts._data = postData;
  }

  return opts;
}

function makeResponseHandler(callback) {
  return (function(res) {
    if (res.statusCode !== 200) {
      console.error('Error, status code: ', (''+res.statusCode).red);
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
        if (callback === undefined) {
          process.exit(0);
        } else {
          callback(response);
        }
      }
    });
  });
}

function defaultErrorHandler(err) {
  if (err.code === 'ECONNREFUSED') {
    console.error('Could not connect to manager server'.red);
    process.exit(1);
  } else {
    throw err;
  }
}

function state() {
  function callback(data) {
    var s = data.state;

    console.log('Full array status: %s', s.on?'ON'.green:'OFF'.red);

    var bar = '';
    for (var i=0; i<10; i++) {
      if (i < s.intensity / 10) {
        bar += '|'.white;
      } else {
        bar += '|'.black;
      }
    }

    console.log('White intensity: %s %d%', bar, s.intensity);
  }

  var opts = { addtOpts: { method: 'GET' } };
  var req = http.request(makeReqOpts('/state', opts),
                         makeResponseHandler(callback));
  req.on('error', defaultErrorHandler);
  req.end();
}

function turnOn() {
  var req = http.request(makeReqOpts('/on'), makeResponseHandler());
  req.on('error', defaultErrorHandler);
  req.end();
}

function turnOff() {
  var req = http.request(makeReqOpts('/off'), makeResponseHandler());
  req.on('error', defaultErrorHandler);
  req.end();
}

function setColorHex(colorCode) {
  if (colorCode.slice(0,1) !== '#') {
    colorCode = '#' + colorCode;
  }

  var opts = makeReqOpts('/set-color', {
    data: {
      hex: colorCode
    }
  });
  var req = http.request(opts, defaultResponseHandler);

  req.on('error', defaultErrorHandler);
  req.write(opts._data);
  req.end();
}

var subcommands = {
  'on': turnOn,
  'off': turnOff,
  'hex': setColorHex,
  '?': state,
  'state': state
};

function delegate(subcommand, args) {
  var f = subcommands[subcommand];

  if (f === undefined) {
    console.error('Unrecognized subcommand:', subcommand);
    process.exit(1);
  }

  try {
    f.apply(this, args);
  } catch (e) {
    console.log(e);
  }
}

if (require.main === module) {
  delegate(process.argv[2], process.argv.slice(3));
}

