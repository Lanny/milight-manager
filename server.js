#!/usr/bin/env node

var Milight = require('milight'),
  express = require('express'),
  _ = require('underscore'),
  utils = require('./utils'),
  bodyParser = require('body-parser');
 
var debug = utils.debug,
  log = utils.log,
  warn = utils.warn;

var config = utils.getConfig(),
  state = {};


var milight = new Milight({
  host: config.host,
  broadcast: false
});


function syncState() {
  log('Resynchronizing state');

  if (config.defaultState.on) {
    milight.on();
  } else {
    milight.off();
  }
  state.on = config.defaultState.on;

  milight.white(config.defaultState.intensity);
  state.intensity = config.defaultState.intensity;
}

function startBrightnessSlide(initial, target, duration, callback) {
  var current = initial,
    rate = Math.abs(initial - target) / duration,
    timeUnit = 1 / rate;

  callback = (callback===undefined)?_.noop:callback;

  if (timeUnit < 0.5) {
    timeUnit = 0.5;
    rate = Math.abs(initial - target) / duration;
  }

  ;(function tick() {
    current += rate;
    milight.white(current);

    if (Math.abs(current - initial) >= Math.abs(initial - target)) {
      milight.white(target);
    } else {
      setTimeout(tick, timeUnit * 1000);
    }
  })();
}

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/state', function(req, res) {
  res.json(state);
});

app.post('/on', function(req, res) {
  milight.on();
  state.on = true;
  res.json({status: 'SUCCESS'});
});

app.post('/off', function(req, res) {
  milight.off();
  state.on = false;
  res.json({status: 'SUCCESS'});
});

app.post('/toggle', function(req, res) {
  var targetState = req.body.state;

  if (targetState === 'on') {
    milight.on();
    state.on = true;
  } else if (targetState === 'off') {
    milight.off();
    state.on = false;
  } else {
    res.json({
      status: 'FAILURE',
      reason: '`state` must be one of "on" or "off"'
    });
    return;
  }

  res.json({status: 'SUCCESS'});
});


app.post('/slide', function(req, res) {
  var initial = parseInt(req.body.initial),
    target = parseInt(req.body.target),
    duration = parseInt(req.body.duration);

  startBrightnessSlide(initial, target, duration);
  res.json({status: 'SUCCESS'});
});

app.post('/set-intensity', function(req, res) {
  var intensity = parseInt(req.body.intensity);

  if (isNaN(intensity)) {
    res.json({
      status: 'FAILURE',
      reason: '`intensity` was not a valid integer.'
    });
    return;
  }

  if (intensity < 0 || intensity > 100) {
    res.json({
      status: 'FAILURE',
      reason: '`intensity` was not in range of 0 to 100.'
    });
    return;
  }

  milight.white(intensity, function() {
    state.intensity = intensity;
    res.json({status: 'SUCCESS'});
  });
});


function main() {
  if (config.webui === true) {
    app.use('/webui', require('./webui'));
  }

  var server = app.listen(config.serverPort, function() {
    if (config.syncOnStart === true) {
      syncState();
    }

    //startBrightnessSlide(1, 100, 30);

    log('Server started on %s:%s',
        server.address().address,
        server.address().port);
  });
}

if (require.main === module) { main(); }

