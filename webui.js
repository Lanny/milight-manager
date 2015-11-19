var express = require('express'),
  _ = require('underscore'),
  path = require('path'),
  utils = require('./utils');

var app = express();

app.get('/', function(req, res) {
  var indexPath = path.join(__dirname, 'static', 'index.html');
  res.sendFile(indexPath);
});

app.use('/static', express.static('static'));

module.exports = app;
