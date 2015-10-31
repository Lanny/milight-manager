#!/usr/bin/env node

var Milight = require('milight'),
  express = require('express'),
  _ = require('underscore'),
  utils = require('./utils')
 
var debug = utils.debug,
  log = utils.log,
  warn = utils.warn

var config = utils.getConfig(),
  state = {}


var milight = new Milight({
  host: config.host,
  broadcast: false
})


function syncState() {
  log('Resynchronizing state');

  config.defaultState.on?milight.on():milight.off();
  state.on = config.defaultState.on;
}

var app = express();

app.post('/on', function(req, res) {
  milight.zone(1).on();
  state.on = true;
  res.json({status: 'SUCCESS'})
})

app.post('/off', function(req, res) {
  milight.zone(1).off()
  state.on = false;
  res.json({status: 'SUCCESS'});
})

app.get('/state', function(req, res) {
  res.json(state);
})


function main() {
  var server = app.listen(config.serverPort, function() {
    if (config.syncOnStart === true) {
      syncState()
    }

    log('Server started on %s:%s',
        server.address().address,
        server.address().port)
  })
}

if (require.main === module) { main(); }





