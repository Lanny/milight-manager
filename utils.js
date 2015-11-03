var fs = require('fs');
var homeDir = require('home-dir');
var _ = require('underscore');

var configPaths = [
  './config.json',
  homeDir('.milight-manager')
]

var defaults = {
  host: '10.0.0.10',
  serverPort: 4242,
  syncOnStart: true,
  defaultState: {
    on: true,
    intensity: 100
  }
}

var LOG_LEVEL = 4;

function log() {
  if (LOG_LEVEL > 2) {
    console.log.apply(console, arguments);
  }
}

function warn() {
  if (LOG_LEVEL > 1) {
    console.warn.apply(console, arguments);
  }
}

function debug() {
  if (LOG_LEVEL > 3) {
    console.debug.apply(console, arguments);
  }
}

module.exports.debug = debug;
module.exports.log = log;
module.exports.warn = warn;


module.exports.getConfig = function() {
  var settings = null

  _.each(configPaths, function(path) {
    try {
      var s = fs.readFileSync(path, {encoding: 'UTF-8'})

      settings = JSON.parse(s)
      return;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
  });

  if (settings === null) {
    warn('Unable to locate a settings  file, using defaults. This '
         + 'probably isn\'t going to work.')
    settings = {}
  }

  return _.extend({}, defaults, settings)
}
