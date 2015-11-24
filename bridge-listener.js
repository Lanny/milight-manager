#!/usr/bin/env node

var dgram = require('dgram'),
  utils = require('./utils');

var config = utils.getConfig();

function BridgeListener(globalStateObject) {
  this._state = globalStateObject;
  this._socket = dgram.createSocket('udp4');

  this._handlerMap = {
    0x41: this._allOff,
    0x42: this._allOn
  };
}

BridgeListener.prototype = {
  start: function() {
    var self = this;

    self._socket.on('error', function(err) {
      console.error('Error in listener:', err);
      process.exit(1);
    });

    self._socket.on('listening', function() {
      var addr = self._socket.address();
      utils.log('Bridge listener started on', addr.address + ':' + addr.port);
    });


    self._socket.on('message', function(msg, rinfo) {
      var firstByte = msg.readUInt8(0);

      var handler = self._handlerMap[firstByte];

      if (handler === undefined) {
        utils.debug('Got unexpexted first byte: 0x%s', firstByte.toString(16));
        return;
      }

      handler.call(self, msg, rinfo);
    });

    self._socket.bind(config.bridgePort);
  },
  _allOn: function() { this._state.on = true; },
  _allOff: function() { this._state.on = false; }
};

module.exports = BridgeListener;
