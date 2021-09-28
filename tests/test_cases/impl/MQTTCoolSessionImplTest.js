'use strict';
define(['Suites', 'LightstreamerClient', 'MQTTCoolSessionImpl', 'openSession',
  'Scenario'],
function(Suites, LightstreamerClient, MQTTCoolSessionImpl, openSession,
  Scenario) {

  var MQTTCoolSessionTestImplSuite = Suites.newSuite();
  var suite = MQTTCoolSessionTestImplSuite.suite;
  var beforeSuite = MQTTCoolSessionTestImplSuite.beforeSuite;
  var test = MQTTCoolSessionTestImplSuite.test;
  var asyncTest = MQTTCoolSessionTestImplSuite.asyncTest;
  var matcher = MQTTCoolSessionTestImplSuite.matcher;

  var xtest = MQTTCoolSessionTestImplSuite.notest;
  var xsuite = MQTTCoolSessionTestImplSuite.notest;
  var xasyncTest = MQTTCoolSessionTestImplSuite.noasyncTest;

  var genStringOfLength = function(length) {
    var s = '';
    for (var i = 0; i < length; i++) {
      s += 'a';
    }

    return s;
  };

  var TOO_LENGTH_CLIENT_ID = genStringOfLength(24);
  var MAX_LENGTH_STRING = genStringOfLength(23);

  function getData() {
    return [
      {
        comment: ' not supplying <broker_reference>',
        expectedException: new Error('Invalid [brokerReference] value: ' +
            'undefined')
      },
      {
        comment: ' supplying empty <broker_reference>',
        expectedException: new Error('Invalid [brokerReference] argument: ' +
            '<>'),
        brokerReference: ''
      },
      {
        comment: ' supplying not valid char in <broker_reference>',
        expectedException: new Error('Invalid [brokerReference] argument: ' +
            '<broker_@>'),
        brokerReference: 'broker_@'
      },
      {
        comment: ' supplying not valid char in <broker_reference> (2)',
        expectedException: new Error('Invalid [brokerReference] argument: ' +
            '<{}>'),
        brokerReference: '{}'
      },
      {
        comment: ' supplying regular string for <broker_reference>',
        expectedException: null,
        brokerReference: 'broker_reference'
      },
      {
        comment: ' supplying regular string for <broker_reference> (2)',
        expectedException: null,
        brokerReference: 'broker-reference'
      },
      {
        comment: ' supplying regular URI for <broker_reference> ("mqtt")',
        expectedException: null,
        brokerReference: 'mqtt://localhost:1883'
      },
      {
        comment: ' supplying regular URI for <broker_reference> ("tcp")',
        expectedException: null,
        brokerReference: 'tcp://localhost:1883'
      },
      {
        comment: ' supplying regular URI for <broker_reference> ("ssl")',
        expectedException: null,
        brokerReference: 'ssl://localhost:8883'
      },
      {
        comment: ' supplying regular URI for <broker_reference> ("mqtts")',
        expectedException: null,
        brokerReference: 'mqtts://localhost:8883'
      },
      {
        comment: ' supplying a string, number and underscore for ' +
          '<broker_reference>',
        expectedException: null,
        brokerReference: '_1'
      },
      {
        comment: ' supplying a string, number, underscore and letter for ' +
          '<broker_reference>',
        expectedException: null,
        brokerReference: '1_a'
      },
      {
        comment: ' supplying not encodable ClientId as UTF-8 string',
        expectedException: new Error('Argument [clientId] not encodable ' +
            'as UTF-8 string'),
        brokerReference: 'broker_reference',
        clientId: '\ud800'
      },
      {
        comment: ' supplying a regular clientId',
        expectedException: '',
        brokerReference: 'broker_reference',
        clientId: 'clientId123'
      },
      {
        comment: ' supplying a clientId made of unicode chars',
        expectedException: '',
        brokerReference: 'broker_reference',
        clientId: '\u0080\U2A6D4'
      },
      {
        comment: ' supplying null as clientId',
        expectedException: '',
        brokerReference: 'broker_reference',
        clientId: null
      },
      // The following two tests have been removed, as the client library
      // is not in charge of ensuring that the client identifier is compliant
      // with the MQTT Protocol Specifications; indeed, it is a server
      // responsibility.
      /*{
          comment: ' supplying max length exceeded for ClientId',
          expectedException: new Error('Argument [clientId] exceeded max ' +
            'length: <65536>'),
          brokerReference: 'broker_reference',
          clientId: TOO_LENGTH_CLIENT_ID
        },
        {
          comment: ' supplying max length string for <broker_reference>',
          expectedException: '',
          brokerReference: 'broker_reference',
          clientId: MAX_LENGTH_STRING
        }*/
    ];
  }

  suite('MQTTCoolSessionImpl tests', function() {

    suite('Test client creation', function() {
      test(1, 'when invoking createClient()', function(data) {
        var session = new MQTTCoolSessionImpl(1,
          new LightstreamerClient('http://localhost:8080', 'MQTT'));
        if (!data.expectedException) {
          var mqttClient = session.createClient(data.brokerReference,
            data.clientId);
          matcher('Client should be not null', mqttClient).not.is(null);
          matcher('Client should be not undefined', mqttClient)
            .not.isUndefined();
          matcher('The brokerAlias should be <' + data.brokerReference + '>',
            mqttClient._getBrokerAddress()).is(data.brokerReference);
          if (data.clientId) {
            matcher('The clientId should be <' + data.clientId + '>',
              mqttClient._getClientId()).is(data.clientId);
          } else {
            matcher('The clientId should be an empty string',
              mqttClient._getClientId()).is('');
          }
        } else {
          matcher('Should throw an exception', function() {
            session.createClient(data.brokerReference, data.clientId);
          }).throws(data.expectedException);
        }
      }, getData);

      test(2, 'when creating different instances of MqttClient', function() {
        var session = new MQTTCoolSessionImpl(1,
          new LightstreamerClient('http://localhost:8080', 'MQTT'));
        var mqttClient1 = session.createClient('default', 'clientid');
        var mqttClient2 = session.createClient('default', 'clientid');
        matcher('mqttClient1 should be different from mqttClient2',
          mqttClient1).not.isEqual(mqttClient2);
      });

    });

    suite('Test shutting down', function() {
      beforeSuite(function(async) {
        Scenario.restartCool(function() {
          async.done();
        });
      }, true);

      asyncTest(3, 'when invoking close()', function(async) {
        var lsActuallyConnected = false;
        Scenario.setupDefault(function(serverAddress) {

          openSession(serverAddress, {

            onConnectionSuccess: function(mqttCoolSession) {
              // In the case of mock, delay the close invocation to let the
              // ClientListener instance to be notified.
              setTimeout(function() {
                mqttCoolSession.close();
              }, 500);
            },

            onConnectionFailure: function(errType) {
              async.fail(errType);
            },

            onLsClient: function(ls) {
              ls.addListener({
                onStatusChange: function(status) {
                  switch (status) {
                    case 'CONNECTED:WS-STREAMING':
                    case 'CONNECTED:HTTP-STREAMING':
                    case 'CONNECTED:WS-POLLING':
                    case 'CONNECTED:HTTP-POLLING':
                      lsActuallyConnected = true;
                      break;

                    case 'DISCONNECTED':
                      if (lsActuallyConnected) {
                        // Test ends once finally disconnected.
                        async.done();
                      }
                      break;
                  }
                }
              });
            }

          });
        });
      });
    });

  });

  return MQTTCoolSessionTestImplSuite;
});
