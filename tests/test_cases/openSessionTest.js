'use strict';
define(['Suites', 'LightstreamerClient', 'openSession', 'Scenario'],
  function(Suites, LightstreamerClient, openSession, Scenario) {

    var mqttCoolSuite = Suites.newSuite();
    var suite = mqttCoolSuite.suite;
    var test = mqttCoolSuite.test;
    var before = mqttCoolSuite.before;
    var beforeSuite = mqttCoolSuite.beforeSuite;
    var asyncTest = mqttCoolSuite.asyncTest;


    var matcher = mqttCoolSuite.matcher;
    var track = mqttCoolSuite.track;

    // Uncomment the following to enable the skipping features.
    var xtest = mqttCoolSuite.notest;
    var xasyncTest = mqttCoolSuite.noasyncTest;
    var xsuite = mqttCoolSuite.xsuite;

    var SERVER_ADDRESS = Scenario.serverAddress;

    var DummyMQTTCoolListener = function() { };
    DummyMQTTCoolListener.prototype = {

      onConnectionSuccess: function() { },

      onConnectionFailure: function() { },

      onLsClient: function(lsClient) {
        this.lsClient = lsClient;
      }
    };

    suite('openSession Tests', function() {

      suite('a. Test invalid connection parameters', function() {
        beforeSuite(function(async) {
          Scenario.restartCool(function() {
            async.done();
          });
        }, true);

        test(1, 'when invoking openSession() passing wrong arguments',
          function(data) {
            matcher('An exception should have been thrown', function() {
              openSession.apply(null, data.args);
            }).throws(data.exp);

          }, function() {
            return [
              {
                args: [undefined],
                exp: new Error('Please supply the correct number of arguments')
              },
              {
                args: [SERVER_ADDRESS],
                exp: new Error('Please supply the correct number of arguments')
              },
              {
                args: [SERVER_ADDRESS, null],
                exp: new Error('Invalid [listener] value: null')
              },
              {
                args: [null, {}],
                exp: new Error('Invalid [serverAddress] value: null')
              },
              {
                args: [SERVER_ADDRESS, 'username'],
                exp: new Error('Invalid [listener] value: username')
              },
              {
                args: [SERVER_ADDRESS, 'username', 'password'],
                exp: new Error('Invalid [listener] value: password')
              },
              {
                args: [null, 'username', 'password', {}],
                exp: new Error('Invalid [serverAddress] value: null')
              },
              {
                args: [SERVER_ADDRESS, 'username', 'password', null],
                exp: new Error('Invalid [listener] value: null')
              }
            ];
          });

        asyncTest(2, 'when invoking openSession() passing an invalid schema',
          function(async) {
            var listener = new DummyMQTTCoolListener();
            track(listener);

            matcher('Should throw an exception', function() {
              openSession('localhost:8080', 'username', 'password',
                listener);
            }).throws(new Error('[|IllegalArgumentException|The ' +
              'given server address has not a valid scheme|]'));

            async(function() {
              matcher('Listener shout have not been invoked', listener).not
                .isInvoked();
            }, 100);

          });
      });

      suite('b. Test successful scenario', function() {
        beforeSuite(function(async) {
          Scenario.restartCool(function() {
            async.done();
          });
        }, true);

        asyncTest(3, 'when invoking openSession() passing right parameters',
          function(async, data) {

            // Add a new listener instance a last parameter.
            var listener = new DummyMQTTCoolListener();
            data.push(listener);

            listener.onLsClient = function(lsClient) {
              var connectionDetails = lsClient.connectionDetails;
              var checkUsername = data.length >= 3;
              var checkPassword = data.length == 4;

              // Check the mandatory serveraddress argument.
              var serverAddress = connectionDetails.getServerAddress();
              matcher('Server address of ' +
                'LightstreamerClient.connectionDetails should be <' + data[0] +
                '/>', serverAddress).isEqual(data[0] + '/');

              if (data.length >= 3) {
                if (checkUsername) {
                  matcher('Username of LightstreamerClient.connectionDetails ' +
                    'should be <' + data[1] + '>', connectionDetails.getUser())
                    .isEqual(data[1]);
                }
                // Won't work, as ConnectionDetails.getPassword() is not defined
                /*if (checkPassword) {
                  matcher('Password of LightstreamerClient.connectionDetails ' +
                    'should be <' + data[2] + '>', listener.lsClient.
                      connectionDetails.getPassword()).isEqual(data[2]);
                }*/
              }

              async.done();
            };

            Scenario.setupDefault(function() {
              openSession.apply(null, data);
            });
          }, function() {
            return [
              [SERVER_ADDRESS, 'username', 'password'],
              [SERVER_ADDRESS, 'username'],
              [SERVER_ADDRESS],
              [SERVER_ADDRESS, null, null],
              [SERVER_ADDRESS, 'username', null],
              [SERVER_ADDRESS]
            ];
          });

        asyncTest(4, 'when onConnectionSuccess() is invoked',
          function(async) {
            var listener = new DummyMQTTCoolListener();

            var barrier = 0;
            listener.onConnectionSuccess = function(mqttCoolSession) {
              matcher('Should not be null', mqttCoolSession).not.is(null);
              matcher('Should not be undefined', mqttCoolSession)
                .not.isUndefined();

              // Advance the barrier
              barrier++;
              if (barrier == 2) {
                // Ensure the barrier is 2, since the first progress should have
                // been done by onLsClient()
                async.done();
              }
            };
            listener.onLsClient = function(/** lsClient */) {
              // Advance the barrier
              barrier++;
            };
            listener.onConnectionFailure = function(errType) {
              async.fail('"onConnectionFailure" expected not to be invoked');
            };

            Scenario.setupDefault(function() {
              openSession(SERVER_ADDRESS, listener);
            });

          });

        asyncTest(5, 'when creating two separate instances of MQTTCoolSession',
          function(async) {
            var listener1 = new DummyMQTTCoolListener();
            var listener2 = new DummyMQTTCoolListener();
            var clientFactory1 = null;
            var clientFactory2 = null;

            var barrier = 0;
            listener1.onConnectionSuccess = function(mqttCoolSession) {
              clientFactory1 = mqttCoolSession;
              barrier++;
              if (barrier == 2) {
                finalAssert();
              }
            };
            listener2.onConnectionSuccess = function(mqttCoolSession) {
              clientFactory2 = mqttCoolSession;
              barrier++;
              if (barrier == 2) {
                finalAssert();
              }
            };

            Scenario.setupDefault(function(serverAddress) {
              //setFactory();
              openSession(serverAddress, listener1);
              openSession(serverAddress, listener2);
            });

            function finalAssert() {
              matcher('ClientFactory1 should not be null', clientFactory1)
                .not.is(null);
              matcher('ClientFactory1 should not be undefined', clientFactory1)
                .not.isUndefined();
              matcher('ClientFactory2 should not be null', clientFactory2)
                .not.is(null);
              matcher('ClientFactory2 should not be undefined', clientFactory2)
                .not.isUndefined();
              matcher('ClientFactory1 and ClientFactory2 should be different',
                clientFactory1).not.isEqual(clientFactory2);
              async.done();
            }
          });
      });

      suite('c. Test connection failure', function() {
        before(function(async) {
          Scenario.restartCool(function() {
            async.done();
          });
        }, true);

        asyncTest(6, 'when onConnectionFailure() is invoked because of a server'
          + 'error', function(async, data) {
          var lightstreamerClient = null;

          Scenario.setupSessionFailure(data.error, data.errorMessage,
            function(serverAddress) {

              openSession(serverAddress, {

                onConnectionSuccess: function() {
                  async.fail('Should not have been invoked');
                },

                onLsClient: function(lsClient) {
                  lightstreamerClient = lsClient;
                },

                onConnectionFailure(errType, errCode, errMessage) {
                  matcher('Lightstreamer should have been set',
                    lightstreamerClient).not.is(null);
                  matcher('errorType should be as expected', errType)
                    .is(data.expectedType);
                  matcher('errorCode should be as expected', errCode)
                    .is(data.expectedErrorCode);
                  matcher('errorMessage should be as expected', errMessage)
                    .is(data.expectedErrorMessage);
                  async.done();
                }

              });
            });
        }, function() {
          return [
            {
              comment: '(Lightstreamer Server error).',

              // Error code as sent by the MQTT.Cool server
              error: 2,
              // Error message as sent by the MQTT.Cool server
              errorMessage: 'Requested Adapter Set not available',

              // Error type as interpreted by the library
              expectedType: 'SERVER_ERROR',
              // Error code and error message are forwarded "as is" to the
              // client

              expectedErrorCode: 2,
              expectedErrorMessage: 'Requested Adapter Set not available'
            }
          ];
        });

        asyncTest(7, 'when onConnectionFailure() is invoked because of a '
           + 'server error due to the Hook', function(async, data) {
          var lightstreamerClient = null;

          Scenario.setupSessionFailure(-1, data.errorMessage,
            function(serverAddress) {

              openSession(serverAddress, data.user, {

                onLsClient: function(lsClient) {
                  lightstreamerClient = lsClient;
                },

                onConnectionSuccess: function() {
                  async.fail('Should not have been invoked');
                },

                onConnectionFailure(errType, errCode, errMessage) {
                  matcher('Lightstreamer should have been set',
                    lightstreamerClient).not.is(null);
                  matcher('errorType should be as expected', errType)
                    .is(data.expectedType);
                  matcher('errorCode should be as expected', errCode)
                    .is(data.expectedErrorCode);
                  matcher('errorMessage should be as expected', errMessage)
                    .is(data.expectedErrorMessage);
                  async.done();
                }
              });
            });
        }, function() {
          return [
            {
              comment: '(Unauthorized session with custom exception).',

              user: 'raise_issue_user',

              // Custom exception formatted and sent as a JSON string by
              // MQTT Cool.
              errorMessage: '{"code": 2, "message": "Not authorized user"}',

              // Error type as interpreted by the library.
              expectedType: 'UNAUTHORIZED_SESSION',

              // Error code and error message parsed from the JSON string sent
              // by MQTT Cool server.
              expectedErrorCode: 2,
              expectedErrorMessage: 'Not authorized user'
            },
            {
              comment: '(Unauthorized session with unspecified exception).',

              user: 'not_authorized_user',

              // Custom exception formatted and sent as a JSON string by
              // MQTT Cool.
              errorMessage: '',

              // Error type as interpreted by the library.
              expectedType: 'UNAUTHORIZED_SESSION'
              // No expected responseObj.
            }
          ];
        });
      });

    });

    return mqttCoolSuite;
  });
