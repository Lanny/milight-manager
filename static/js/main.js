;(function() {
  function reportError(error) {
    if (error.reason !== undefined) {
      alert(error.reason);
    } else {
      alert('Aw shit, something bad done happened.');
    }
    console.error(error);
  }

  function makeCommitFunc(options) {
    // If we back out we'll triger this function again, but we don't want to
    // try to recommit, so we flip this flag to suppress the first change
    // after it gets set.
    var suppressCommit = false;

    return function(observable, oldValue) {
      var self = this;
      var deferred = $.Deferred();
      var params = {};

      if (suppressCommit === true) {
        suppressCommit = false;
        return deferred.resolve().promise();
      }

      function backOut(error) {
        reportError(error);

        // Now try to back out of the change.
        suppressCommit = true;
        observable(oldValue);

        deferred.reject();
      }

      for (var key in options.fields) {
        var field = options.fields[key];
        if (typeof field === 'function') {
          params[key] = field.call(self, options);
        }
      }

      $.post(options.url, params)
        .done(function(data) {
          if (data.status !== 'SUCCESS') {
            backOut(data);
          } else {
            deferred.resolve();
          }
        })
        .fail(function(data) {
          backOut(data);
        });

      return deferred.promise();
    };
  }

  function Manager() {
    var self = this;

    self.state = {
      on: ko.observable(false),
      intensity: ko.observable(100)
    };
  }

  Manager.prototype = {
    init: function() {
      var self = this;
      return self.refreshState()
        .done(function() {
          self._wireUp();
        });
    },
    refreshState: function() {
      var self = this;
      var deferred = $.Deferred();

      $.getJSON('../state')
        .done(function(data) {
          for (var key in data) {
            self.state[key](data[key]);
          }

          deferred.resolve();
        });

      return deferred;
    },
    _wireUp: function() {
      var self = this;
      for (var key in self.state) {
        ;(function() {
          var funcName = '_commit__' + key;
          var observable = self.state[key];

          if (funcName in self) {
            // Bind to both the change and beforeChange events so we can capture
            // the old value but still discover the new value.
            var oldValue = null;
            self.state[key].subscribe(function(x) {
              oldValue = x;
            }, null, 'beforeChange');

            self.state[key].subscribe(function() {
              self[funcName].call(self, observable, oldValue);
            });
          }
        })();
      }

    },
    _commit__on: makeCommitFunc({
      url: '../toggle',
      fields: {
        state: function() {
          return this.state.on()?'on':'off';
        }
      }
    })
  };

  function init() {
    var manager = new Manager();
    manager.init()
      .done(function() {
        ko.applyBindings(manager);
      });
  }

  $(function() { init(); });
})();
