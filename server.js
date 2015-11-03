#!/usr/bin/env node

var Milight = require('milight'),
  express = require('express'),
  _ = require('underscore'),
  utils = require('./utils'),
  bodyParser = require('body-parser')
 
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
  log('Resynchronizing state')

  config.defaultState.on?milight.on():milight.off()
  state.on = config.defaultState.on

  milight.white(config.defaultState.intensity, function(){});
  state.intensity = config.defaultState.intensity
}

var app = express()

app.use(bodyParser.urlencoded({ extended: true }))

app.get('/state', function(req, res) {
  res.json(state)
})

app.post('/on', function(req, res) {
  milight.on()
  state.on = true
  res.json({status: 'SUCCESS'})
})

app.post('/off', function(req, res) {
  milight.off()
  state.on = false
  res.json({status: 'SUCCESS'})
})

app.post('/set-intensity', function(req, res) {
  var intensity = parseInt(req.body.intensity)

  if (isNaN(intensity)) {
    res.json({
      status: 'FAILURE',
      reason: '`intensity` was not a valid integer.'
    })
    return
  }

  if (intensity < 0 || intensity > 100) {
    res.json({
      status: 'FAILURE',
      reason: '`intensity` was not in range of 0 to 100.'
    })
    return
  }

  milight.white(intensity, function() {
    state.intensity = intensity
    res.json({status: 'SUCCESS'})
  })
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

if (require.main === module) { main() }





