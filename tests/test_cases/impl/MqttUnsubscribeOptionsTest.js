'use strict';
define(['Suites', 'LoggerManager', 'MqttUnsubscribeOptions'],
  function(Suites, LoggerManager, MqttUnsubscribeOptions) {

    var MqttSubscriptionOptionsSuite = Suites.newSuite();
    var suite = MqttSubscriptionOptionsSuite.suite;
    var test = MqttSubscriptionOptionsSuite.test;
    var matcher = MqttSubscriptionOptionsSuite.matcher;
    var track = MqttSubscriptionOptionsSuite.track;

    // Uncomment the following for enabling the skipping features.
    var xtest = MqttSubscriptionOptionsSuite.notest;

    suite('MqttUnsubscribeOptions class tests', function() {

      test('1. when creating an instance with default settings',
        function(options) {
          var unsubOptions = new MqttUnsubscribeOptions(options);

          matcher('onSuccess() should be a function', unsubOptions.onSuccess)
            .isFunction();
          matcher('onFailure() should be a function', unsubOptions.onFailure)
            .isFunction();
        }, function() {
          return [undefined, null];
        });

      test('2. when creating an instance which wraps an object literal',
        function() {

          var options = new MqttUnsubscribeOptions(
            {
              onSuccess: function() { },
              onFailure: function() { }
            });

          matcher('onSuccess() should be a function', options.onSuccess)
            .isFunction();
          matcher('onFailure() should be a function', options.onFailure)
            .isFunction();
        });

      test('3. when creating an instance passing only callbacks, with allowed' +
        ' values',
      function(options) {
        matcher(Object.keys(options)[0] + ' should be allowed', function() {
          new MqttUnsubscribeOptions(options);
        }).not.throws();

      }, function() {
        return [
          { onSuccess: function() { } },
          { onSuccess: null },
          { onSuccess: undefined },
          { onFailure: function() { } },
          { onFailure: null },
          { onFailure: undefined }
        ];
      });

      test('4. when creating an instance passing only callbacks, with NOT ' +
        'allowed values',
      function(options) {
        matcher(Object.keys(options)[0] + ' should be allowed', function() {
          new MqttUnsubscribeOptions(options);
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
          { onFailure: {} }
        ];
      });

      function listener() { }
      listener.prototype = {
        foo: function() { }
      };

      test('5. when invoking the onSuccess() callback', function() {
        var l = new listener();
        var options = new MqttUnsubscribeOptions({
          onSuccess: function() {
            l.foo();
          }
        });
        track(l);

        options.onSuccess();
        matcher('onSuccess() should have been invoked', l.foo).isInvoked();
      });

      test('6. when invoking the onFailure() callback', function() {
        var l = new listener();
        var options = new MqttUnsubscribeOptions({
          onFailure: function(errorCode) {
            l.foo(errorCode);
          }
        });
        track(l);

        options.onFailure(0x80);
        matcher('onFailure() should have been invoked', l.foo)
          .isInvoked().with(0x80);
      });
    });

    return MqttSubscriptionOptionsSuite;
  });
