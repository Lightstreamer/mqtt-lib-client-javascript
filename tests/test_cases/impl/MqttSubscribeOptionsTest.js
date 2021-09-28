'use strict';
define(['Suites', 'LoggerManager', 'MqttSubscribeOptions'],
  function(Suites, LoggerManager, MqttSubscribeOptions) {

    var MqttSubscriptionOptionsSuite = Suites.newSuite();
    var suite = MqttSubscriptionOptionsSuite.suite;
    var test = MqttSubscriptionOptionsSuite.test;
    var matcher = MqttSubscriptionOptionsSuite.matcher;
    var track = MqttSubscriptionOptionsSuite.track;

    var xtest = MqttSubscriptionOptionsSuite.notest;

    suite('MqttSubscribeOptions class tests', function() {

      test(1, 'when creating an instance with default settings',
        function(options) {
          var subOptions = new MqttSubscribeOptions(options);

          matcher('QoS should be 0', subOptions.getQoS()).is(0);
          matcher('"maxFrequency" should be "unlimited"',
            subOptions.getRequestedMaxFrequency()).is('unlimited');
          matcher('onSuccess() should be a function', subOptions.onSuccess)
            .isFunction();
          matcher('onFailure() should be a function', subOptions.onFailure)
            .isFunction();
          matcher('onNotAuthorized() should be a function', subOptions
            .onNotAuthorized).isFunction();
        }, function() {
          return [undefined, null];
        });

      test(2, 'when creating an instance which wraps an object literal',
        function() {
          var options = new MqttSubscribeOptions(
            {
              qos: 1,
              maxFrequency: 10,
              onSuccess: function() { },
              onFailure: function() { },
              onNotAuthorized: function() { }
            });

          matcher('QoS should be 1', options.getQoS()).is(1);
          matcher('"maxFrequency" should be 10', options
            .getRequestedMaxFrequency()).is(10);
          matcher('onSuccess() should be a function', options.onSuccess)
            .isFunction();
          matcher('onFailure() should be a function', options.onFailure)
            .isFunction();
          matcher('onNotAuthorized() should be a function', options
            .onNotAuthorized).isFunction();
        });

      test(3, 'when creating an instance passing only callbacks, with ' +
        'allowed values',
      function(options) {
        matcher(Object.keys(options)[0] + ' should be allowed', function() {
          new MqttSubscribeOptions(options);
        }).not.throws();

      }, function() {
        return [
          { onSuccess: function() { } },
          { onSuccess: null },
          { onSuccess: undefined },
          { onFailure: function() { } },
          { onFailure: null },
          { onFailure: undefined },
          { onNotAuthorized: function() { } },
          { onNotAuthorized: null },
          { onNotAuthorized: undefined }
        ];
      });

      test(4, 'when creating an instance passing only callbacks, with NOT ' +
        'allowed values',
      function(options) {
        matcher(Object.keys(options)[0] + ' should be allowed', function() {
          new MqttSubscribeOptions(options);
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

      test(5, 'when creating an instance passing only QoS, with allowed values',
        function(qos) {
          var options = new MqttSubscribeOptions({ qos: qos });

          if (typeof qos !== 'undefined') {
            matcher('QoS < ' + qos + '> should be allowed', options.getQoS())
              .is(qos);
          } else {
            matcher('QoS < ' + qos + '> should be allowed', options.getQoS())
              .is(0);
          }
        }, function() {
          return [0, 1, 2];
        });

      test(6, 'when creating an instance passing only QoS, with NOT allowed ' +
        'values',
      function(qos) {
        matcher('QoS <' + qos + '> should provoke an exception', function() {
          new MqttSubscribeOptions({ qos: qos });
        }).throws();
      }, function() {
        return [-1, 3, '', false, true, null, undefined, {}, []];
      });

      test(7, 'when creating an instance passing only "maxFrequency",' +
        ' with allowed values',
      function(maxFrequency) {
        var options = new MqttSubscribeOptions({
          maxFrequency: maxFrequency
        });

        if (typeof maxFrequency !== 'undefined') {
          matcher('"maxFrequency" should be < ' + maxFrequency + '>',
            options.getRequestedMaxFrequency()).is(maxFrequency);
        } else {
          matcher('"maxFrequency" should be < ' + maxFrequency + '>',
            options.getRequestedMaxFrequency()).is('unlimited');
        }
      }, function() {
        return [1, 100, 34.2];
      });

      test(8, 'when creating an instance passing only "maxFrequency",' +
        ' with NOT allowed values',
      function(maxFrequency) {
        matcher('"maxFrequency" <' + maxFrequency + '> should prove an ' +
            'exception',
        function() {
          new MqttSubscribeOptions({ maxFrequency: maxFrequency });
        }).throws();
      }, function() {
        return [-1, 0, 'hello', true, false, [], {}, null, undefined];
      });

      function listener() { }
      listener.prototype = {
        foo: function() { }
      };

      test(9, 'when invoking the onSuccess(), callback', function() {
        var l = new listener();
        var options = new MqttSubscribeOptions({
          onSuccess: function(responseObject) {
            l.foo(responseObject);
          }
        });
        track(l);

        options.onSuccess(2);
        matcher('onSuccess() should have been invoked', l.foo).isInvoked()
          .with({ 'grantedQos': 2 });
      });

      test(10, 'when invoking the onFailure() callback', function() {
        var l = new listener();
        var options = new MqttSubscribeOptions({
          onFailure: function(responseObject) {
            l.foo(responseObject);
          }
        });
        track(l);

        options.onFailure(0x80);
        matcher('onFailure() should have been invoked', l.foo)
          .isInvoked().with({ 'errorCode': 0x80 });
      });

      test(11, 'when invoking the onNotAuthorized() callback',
        function() {
          var l = new listener();
          var options = new MqttSubscribeOptions({
            onNotAuthorized: function(responseObject) {
              l.foo(responseObject);
            }
          });
          track(l);

          var responseObject = { errorCode: 1, errorMessage: 'Error' };
          options.onNotAuthorized(responseObject);
          matcher('onNotAuthorized() should have been invoked', l.foo)
            .isInvoked().with(responseObject);
        });
    });

    return MqttSubscriptionOptionsSuite;
  });
