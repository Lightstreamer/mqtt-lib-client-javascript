'use strict';
define(['Suites', 'LoggerManager', 'MqttConnectOptions', 'Message', 'Env'],
  function(Suites, LoggerManager, MqttConnectOptions, Message, Env) {

    var MqttConnectOptionsSuite = Suites.newSuite();
    var suite = MqttConnectOptionsSuite.suite;
    var test = MqttConnectOptionsSuite.test;
    var matcher = MqttConnectOptionsSuite.matcher;
    var track = MqttConnectOptionsSuite.track;

    // Uncomment the following to enable the skipping features.
    var xtest = MqttConnectOptionsSuite.notest;

    suite('MqttConnectOptions class tests', function() {

      test(1, 'when creating an instance with default settings',
        function(data) {

          var options = new MqttConnectOptions(data);
          matcher('username should be undefined', options.getUsername())
            .isUndefined();
          matcher('password should be undefined', options.getPassword())
            .isUndefined('');
          matcher('clean session flag should be true', options
            .getCleanSession()).is(true);
          matcher('Will Message should be undefined', options.getWillMessage())
            .isUndefined();
          matcher('Storage should be undefined', options.getStorage())
            .isUndefined();
          if (Env.isNodeJs()) {
            matcher('Store path should be "mqttcool-storage"', options
              .getStorePath()).is('mqttcool-storage');
          }
          matcher('onSuccess() should be a function', options.onSuccess)
            .isFunction();
          matcher('onFailure() should be a function', options.onFailure)
            .isFunction();
          matcher('onNotAuthorized() should be a function',
            options.onNotAuthorized).isFunction();
        }, function() {
          return [undefined, null];
        });

      test(2, 'when creating an instance which wraps an object literal',
        function() {
          var willMessage = new Message('willMessage');
          willMessage.destinationName = 'willTopic';

          var testWillMessage = new Message('willMessage');
          testWillMessage.destinationName = 'willTopic';

          var options = new MqttConnectOptions(
            {
              username: 'user',
              password: 'password',
              cleanSession: false,
              willMessage: willMessage,
              storage: {},
              storePath: './my-data',
              onSuccess: function() { },
              onFailure: function() { },
              onNotAuthorized: function() { }
            });

          matcher('username should be "user"', options.getUsername())
            .is('user');
          matcher('password should be "password"', options.getPassword())
            .is('password');
          matcher('clean session flag should be false', options
            .getCleanSession()).is(false);
          matcher('Will Message should be equal to test instance', options
            .getWillMessage()).isEqual(testWillMessage);
          matcher('Storage should not be undefined', options.getStorage()).not
            .isUndefined();
          if (Env.isNodeJs()) {
            matcher('Store path should be "./my-data"', options
              .getStorePath()).is('./my-data');
          }
          matcher('onSuccess() should be a function', options.onSuccess)
            .isFunction();
          matcher('onFailure() should be a function', options.onFailure)
            .isFunction();
          matcher('onNotAuthorized() should be a function',
            options.onNotAuthorized).isFunction();
        });

      test(3, 'when creating an instance passing only the clean session flag,'
        + ' with allowed values',
      function(data) {
        var options = new MqttConnectOptions({
          cleanSession: data.cleanSession
        });

        matcher('clean session flag should be <' + data.expected + ' >',
          options.getCleanSession()).is(data.expected);
      }, function() {
        return [
          { cleanSession: true, expected: true },
          { cleanSession: false, expected: false }
        ];
      });

      test(4, 'when creating an instance passing only the clean session flag,' +
        ' with NOT allowed values',
      function(data) {
        matcher('Should throw an exception with <' + data + '>', function() {
          new MqttConnectOptions({ cleanSession: data });
        }).throws();
      }, function() {
        return [1, '', [], {}, 'hello', function() { }, null, undefined,
          new Boolean(true)];
      });

      test(5, 'when creating an instance passing only the username, with ' +
        ' allowed values',
      function(data) {
        var options = new MqttConnectOptions({ username: data.username });

        matcher('username should be <' + data.expected + '>', options
          .getUsername()).is(data.expected);
      }, function() {
        return [
          { username: 'username', expected: 'username' },
          { username: String('username'), expected: 'username' },
          { username: '', expected: '' },
          { username: null, expected: null },
          { username: undefined, expected: undefined }
        ];
      });

      test(6, 'when creating an instance passing only the username, with NOT ' +
        ' allowed values',
      function(data) {
        matcher('Should throw an exception with <' + data + '>', function() {
          new MqttConnectOptions({ username: data });
        }).throws();
      }, function() {
        return [1, true, false, [], {}, function() { }, new String('hello'),
          ];
      });

      test(7, 'when creating an instance passing only the password, with ' +
        'allowed values',
      function(data) {
        var options = new MqttConnectOptions({ password: data.password });

        matcher('password should be <' + data.expected + '>', options
          .getPassword()).isEqual(data.expected);
      }, function() {
        return [
          { password: 'password', expected: 'password' },
          { password: String('password'), expected: 'password' },
          { password: '', expected: '' },
          { password: null, expected: null },
          { password: undefined, expected: undefined }
        ];
      });

      test(8, 'when creating an instance passing only the password, with NOT ' +
        ' allowed values',
      function(data) {
        matcher('Should throw an exception with <' + data + '>', function() {
          new MqttConnectOptions({ password: data });
        }).throws();
      }, function() {
        return [1, true, false, [], {}, function() { }, new String('hello')];
      });

      if (Env.isNodeJs()) {
        test(9, 'when creating an instance passing only the store path, with ' +
          'allowed values',
        function(data) {
          var options = new MqttConnectOptions({ storePath: data.storePath });

          matcher('store path should be <' + data.expected + '>', options
            .getStorePath()).isEqual(data.expected);
        }, function() {
          return [
            { storePath: './store', expected: './store' },
            { storePath: String('./store'), expected: './store' },
            { storePath: '', expected: 'mqttcool-storage' },
            { storePath: null, expected: 'mqttcool-storage' },
            { storePath: undefined, expected: 'mqttcool-storage' }
          ];
        });

        test(10, 'when creating an instance passing only the store path, with '
          + 'NOT allowed values',
        function(data) {
          matcher('Should throw an exception with <' + data + '>',
            function() {
              new MqttConnectOptions({ storePath: data });
            }).throws();
        }, function() {
          return [1, true, false, [], {}, function() { }];
        });
      }

      test(11, 'when creating an instance passing only the storage, with ' +
        'allowed values',
      function(data) {
        var options = new MqttConnectOptions({ storage: data.storage });

        // In case of defined value (non null and non undefined)
        if (data.expected) {
          matcher('storage should be <' + data.expected + '>', options
            .getStorage()).isEqual(data.expected);
        } else {
          matcher('storage should be <' + data.expected + '>', options
            .getStorage()).is(data.expected);
        }
      }, function() {
        return [
          // Allowed value, but will raise when sel-testing the storage.
          { storage: {}, expected: {} },

          // In this case, the default implementation will be used.
          { storage: null, expected: null },
          { storage: undefined, expected: undefined }
        ];
      });

      test(12, 'when creating an instance passing only the storage, with NOT ' +
        'allowed values',
      function(storage) {
        matcher('Should throw an exception with <' + storage + '>',
          function() {
            new MqttConnectOptions({ storage: storage });
          }).throws();
      }, function() {
        // To Do: Improve type checking of Array, which should not be allowed
        //return [1, true, false, [], function() { }, 'hello'];
        return [1, true, false, function() { }, 'hello'];
      });

      test(13, 'when creating an instance passing acceptable values for the ' +
        ' the Will Message',
      function() {
        var message = new Message('WillMessage');
        message.destinationName = 'willTopic';

        var options = new MqttConnectOptions({ willMessage: message });
        matcher('Will Message should be as expected', options
          .getWillMessage()).not.is(null);

        var options2 = new MqttConnectOptions({ willMessage: null });
        matcher('Will Message should be null', options2
          .getWillMessage()).is(null);

        var options3 = new MqttConnectOptions({ willMessage: undefined });
        matcher('Will Message should be undefined', options3
          .getWillMessage()).is(undefined);
      });

      test(14, 'when creating an instance passing only the Will Message, with' +
        ' NOT allowed values',
      function(msg) {
        matcher('Should throw an exception with <' + msg + '>',
          function() {
            new MqttConnectOptions({ willMessage: msg });
          }).throws();
      }, function() {
        // To Do: Improve type checking of Array, which should not be allowed
        //return [1, true, false, [], function() { }, 'hello'];
        return [1, true, false, function() { }, 'hello'];
      });

      test(15, 'when creating an instance passing only the Will Message, not ' +
        'properly set',
      function() {
        matcher('Should throw an exception',
          function() {
            new MqttConnectOptions({
              willMessage: new Message('WillMessage')
            });
          }).throws();
      });

      test(16, 'when creating an instance passing only callbacks, with ' +
        'allowed values',
      function(options) {
        matcher(Object.keys(options)[0] + ' should be allowed', function() {
          new MqttConnectOptions(options);
        }).not.throws();

      }, function() {
        return [
          { onSuccess: function() { } },
          { onSuccess: null },
          { onSuccess: undefined },
          { onFailure: function() { } },
          { onFailure: null },
          { onFailure: undefined },
          { onNotAuthorized: null },
          { onNotAuthorized: undefined }
        ];
      });

      test(17, 'when creating an instance passing only callbacks, with NOT ' +
        'allowed values',
      function(options) {
        matcher(Object.keys(options)[0] + ' shoud be allowed', function() {
          new MqttConnectOptions(options);
        }).throws();

      }, function() {
        return [
          { onSuccess: 1 },
          { onSuccess: true },
          { onSuccess: false },
          { onSuccess: [] },
          { onSuccess: {} },
          { onFailure: 1 },
          { onFailure: true },
          { onFailure: false },
          { onFailure: [] },
          { onFailure: {} },
          { onNotAuthorized: 1 },
          { onNotAuthorized: true },
          { onNotAuthorized: false },
          { onNotAuthorized: [] },
          { onNotAuthorized: {} }
        ];
      });

      function listener() { }
      listener.prototype = {
        foo: function() { }
      };

      test(18, 'when invoking the onSuccess() callback', function() {
        var l = new listener();
        var options = new MqttConnectOptions({
          onSuccess: function() {
            l.foo();
          }
        });

        track(l);

        options.onSuccess();
        matcher('Should have been invoked', l.foo).isInvoked();
      });

      test(19, 'when invoking the onFailure() callback', function() {
        var l = new listener();
        var options = new MqttConnectOptions({
          onFailure: function() {
            l.foo();
          }
        });
        track(l);

        options.onFailure();
        matcher('Should have been invoked', l.foo).isInvoked();
      });

      test(20, 'when invoking the onNotAuthorized() callback', function() {
        var l = new listener();
        var options = new MqttConnectOptions({
          onNotAuthorized: function() {
            l.foo();
          }
        });
        track(l);

        options.onNotAuthorized();
        matcher('Should have been invoked', l.foo).isInvoked();
      });
    });

    return MqttConnectOptionsSuite;
  });
