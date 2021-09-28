'use strict';
define(['Suites', 'MqttClientImpl', 'openSession', 'Objects', 'Message',
  'Scenario'],
function(Suites, MqttClientImpl, openSession, Objects, Message, Scenario) {

  var MqttClientImplTestSuite = Suites.newSuite();
  var suite = MqttClientImplTestSuite.suite;
  var test = MqttClientImplTestSuite.test;
  var before = MqttClientImplTestSuite.before;
  var beforeSuite = MqttClientImplTestSuite.beforeSuite;
  var after = MqttClientImplTestSuite.after;
  var asyncTest = MqttClientImplTestSuite.asyncTest;
  var matcher = MqttClientImplTestSuite.matcher;
  var asyncMatcher = MqttClientImplTestSuite.asyncMatcher;
  var track = MqttClientImplTestSuite.track;

  var xtest = MqttClientImplTestSuite.notest;
  var xasyncTest = MqttClientImplTestSuite.noasyncTest;
  var xsuite = MqttClientImplTestSuite.xsuite;

  /**
    * A simple listener to catch connection events.
    */
  function ConnectionListener() { }

  ConnectionListener.prototype = {

    connected: function() { },

    notAuthorized: function() { },

    notConnected: function() { },

    connectionLost: function() { },

    reconnectStart: function() { },

    reconnected: function() { }
  };

  /**
    * The MqttClient instance under test
    * @type {MqttClient}
    */
  var mqttClient = null;

  /**
    * The selected scenario handler for connection
    * @type {Scenario}
    **/
  var scenarioHandler = null;

  /**
    * The MQTT.Cool session
    * @type {MqttCoolSession}
    */
  var session = null;

  suite('Connection tests', function() {

    suite('a. Test invalid connection parameters and illegal states',
      function() {

        beforeSuite(function(async) {
          Scenario.restartServices(function() {
            async.done();
          });
        }, true);

        before(function(async) {
          Scenario.setupConnack(0, function(serverAddress, handle) {

            scenarioHandler = handle;

            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;
                async.done();
              },

              onConnectionFailure: function(errType, responseObj) {
                async.fail(errType);
              }
            });
          });
        }, true);

        after(function() {
          if (session) {
            session.close();
          }
        });

        test(1, 'when setting invalid callbacks with invalid values',
          function(data) {
            mqttClient = session.createClient('default',
              'mqttcooltest-client');

            for (var value in data.values)
              matcher('Should throw an exception', function() {
                mqttClient[data.callback] = value;
              }).throws();

          }, function() {
            return [
              {
                callback: 'onConnectionLost', values: [true, 1, 'hello', []]
              },
              {
                callback: 'onReconnectionStart',
                values: [true, 1, 'hello', []]
              },
              {
                callback: 'onReconnectionComplete',
                values: [true, 1, 'hello', []]
              },
              {
                callback: 'onMessageArrived', values: [true, 1, 'hello', []]
              },
              {
                callback: 'onMessageDelivered', values: [true, 1, 'hello', []]
              },
              {
                callback: 'onMessageNotAuthorized',
                values: [true, 1, 'hello', []]
              }
            ];
          }
        );

        test(2, 'when invoking connect() method passing a clientId and '
          + 'cleanSession set to false, but self-test on local storage fails',
        function() {
          mqttClient = session.createClient('default', 'mqttcooltest-client');

          var listener = new ConnectionListener();
          track(listener);

          matcher('Should throw an exception', function() {
            mqttClient.connect({
              storage: {}, // Fake storage to trigger a failure self-test
              cleanSession: false,
              onSuccess: function() {
                listener.connected();
              }
            });
          }).throws();
          matcher('Connection Options should be null',
            mqttClient._getConnectionOptions()).is(null);
        }, function() {
          return [{}, null];
        });

        test(3, 'when invoking connect() method passing a storage, but '
          + 'without clientId', function() {
          mqttClient = session.createClient('default');

          var listener = new ConnectionListener();
          track(listener);

          matcher('Should throw an exception', function() {
            mqttClient.connect({
              // Fake storage
              storage: {}
            });
          }).throws();
          matcher('Connection Options should be null',
            mqttClient._getConnectionOptions()).is(null);
        });

        test(4, 'when invoking connect() method passing a cleanSession set to '
          + 'false, but without clientId', function() {
          mqttClient = session.createClient('default');

          var listener = new ConnectionListener();
          track(listener);

          matcher('Should throw an exception', function() {
            mqttClient.connect({ cleanSession: false });
          }).throws();
          matcher('Connection Options should be null',
            mqttClient._getConnectionOptions()).is(null);
        });

        test(5, 'when invoking connect() method throws an Exception because '
          + 'providing a Will Message, but without clientId', function() {
          mqttClient = session.createClient('default');

          var listener = new ConnectionListener();
          track(listener);

          var willMessage = new Message('willMessage');
          willMessage.destinationName = 'topic';

          matcher('Should throw an exception', function() {
            mqttClient.connect({ willMessage: willMessage });
          }).throws();

          matcher('Connection Options should be null',
            mqttClient._getConnectionOptions()).is(null);
        });

        asyncTest(6, 'when connect() method throws an Exception because the '
          + 'the client is NOT disconnected', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);
          mqttClient.connect();

          async(function() {
            asyncMatcher(async, 'Should throw an exception', function() {
              mqttClient.connect();
            }).throws();
          }, 600);
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        test(7, 'when disconnect() method cannot be invoked because the client'
          + ' is already disconnected', function(data) {
          mqttClient = session.createClient('default',
            data.clientId);

          matcher('Should throw an exception', function() {
            mqttClient.disconnect();
          }).throws();
          matcher('Status should be "DISCONNECTED"',
            mqttClient._getStatus()).is(MqttClientImpl.STATUS.DISCONNECTED);
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-7'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(8, 'when disconnect() method cannot be invoked because the '
          + 'client is disconnecting', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          mqttClient.connect({
            onSuccess: function() {
              mqttClient.disconnect();
              asyncMatcher(async, 'Status should be "DISCONNECTING"',
                mqttClient._getStatus())
                .is(MqttClientImpl.STATUS.DISCONNECTING);

              asyncMatcher(async, 'Should throw an exception', function() {
                mqttClient.disconnect();
              }).throws();
              async.done();
            },

            onFailure: function(responseObj) {
              async.fail(responseObj.errorMessage);
            }
          });


        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-8'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });
      });

    suite('b. Test successful scenarios',
      function() {
        beforeSuite(function(async) {
          Scenario.restartServices(function() {
            async.done();
          });
        }, true);

        before(function(async) {
          Scenario.setupConnack(0, function(serverAddress) {
            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;
                async.done();
              },

              onConnectionFailure: function(errType, responseObj) {
                async.fail(errType);
              }
            });
          });

        }, true);

        after(function(async) {
          if (session) {
            session.close();
          }
          setTimeout(function() {
            async.done();
          }, 1500);
        }, true);

        test(9, 'when setting callbacks with allowed values', function(data) {
          mqttClient = session.createClient('default', 'mqttcooltest-client-9');

          for (var value in data.values)
            matcher('Should NOT throw any exception', function() {
              mqttClient[data.callback] = value;
            }).throws();

        }, function() {
          return [
            {
              callback: 'onConnectionLost',
              values: [function() { }, undefined, null]
            },
            {
              callback: 'onReconnectionStart',
              values: [function() { }, undefined, null]
            },
            {
              callback: 'onReconnectionComplete',
              values: [function() { }, undefined, null]
            },
            {
              callback: 'onMessageArrived',
              values: [function() { }, undefined, null]
            },
            {
              callback: 'onMessageDelivered',
              values: [function() { }, undefined, null]
            },
            {
              callback: 'onMessageNotAuthorized',
              values: [function() { }, undefined, null]
            }
          ];
        }
        );

        asyncTest(10, 'when invoking connect() method', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          var listener = new ConnectionListener();
          track(listener);

          asyncMatcher(async, 'Initial status should be "DISCONNECTED"',
            MqttClientImpl.STATUS.DISCONNECTED)
            .isEqual(mqttClient._getStatus());

          if (data.clientId) {
            var willMessage = new Message('Will Message');
            willMessage.destinationName = 'test';
            willMessage.retained = true;
          }

          mqttClient.connect({
            onSuccess: function(noparam) {
              //listener.connected();
              asyncMatcher(async, 'onSuccess() should have been (without any'
                + ' any parameter)', noparam).isUndefined();
              if (data.clientId) {
                asyncMatcher(async, 'The store should not be null',
                  mqttClient._getStore()).not.is(null);
                asyncMatcher(async, 'The store should be empty',
                  mqttClient._getStore().size()).is(0);
              }
              asyncMatcher(async, 'Current status should be "CONNECTED"',
                MqttClientImpl.STATUS.CONNECTED)
                .isEqual(mqttClient._getStatus());
              mqttClient.disconnect();
              async.done();
            },

            willMessage: willMessage,

            onFailure: function(responseObj) {
              async.fail(responseObj.errorMessage);
            },

            onNotAuthorized: function() {
              async.fail('Not authorized');
            }
          });

          asyncMatcher(async, 'while connecting, the status should be '
            + '"CONNECTING"', mqttClient._getStatus())
            .is(MqttClientImpl.STATUS.CONNECTING);
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-10'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(11, 'when two instances invoke connect() to the same broker,'
          + ' in the case of shared connection', function(async) {
          mqttClient = session.createClient('default');
          var mqttClient2 = session.createClient('default');

          asyncMatcher(async, 'Initial status should be "DISCONNECTED"',
            MqttClientImpl.STATUS.DISCONNECTED)
            .isEqual(mqttClient._getStatus());

          asyncMatcher(async, 'Initial status should be "DISCONNECTED"',
            MqttClientImpl.STATUS.DISCONNECTED)
            .isEqual(mqttClient2._getStatus());

          var barrier = 0;
          mqttClient.connect({
            onSuccess: function() {
              barrier++;
              asyncMatcher(async, 'Current status should be "CONNECTED"',
                MqttClientImpl.STATUS.CONNECTED)
                .isEqual(mqttClient._getStatus());

              if (barrier == 2) {
                assertConnectionId();
              }
            },

            onFailure: function() {
              async.fail('Invoked onFailure() on instance 1');
            }
          });

          asyncMatcher(async, 'while connecting, the status should be '
            + '"CONNECTING"', mqttClient._getStatus())
            .is(MqttClientImpl.STATUS.CONNECTING);

          mqttClient2.connect({
            onSuccess: function() {
              barrier++;
              asyncMatcher(async, 'Current status should be "CONNECTED"',
                MqttClientImpl.STATUS.CONNECTED)
                .isEqual(mqttClient2._getStatus());

              if (barrier == 2) {
                assertConnectionId();
              }
            },

            onFailure: function() {
              async.fail('Invoked onFailure() on instance 2');
            }
          });

          asyncMatcher(async, 'while connecting, the status should be '
            + '"CONNECTING"', mqttClient2._getStatus())
            .is(MqttClientImpl.STATUS.CONNECTING);

          function assertConnectionId() {
            asyncMatcher(async, 'ConnectionId should be different',
              mqttClient._getConnectionId())
              .not.isEqual(mqttClient2._getConnectionId());
            mqttClient.disconnect();
            mqttClient2.disconnect();
            async.done();
          }
        });

        asyncTest(12, 'when invoking disconnect() method',
          function(async, data) {
            mqttClient = session.createClient('default', data.clientId);

            var connectionListener = new ConnectionListener();

            mqttClient.onConnectionLost = function(responseObject) {
              connectionListener.connectionLost(responseObject);
              asyncMatcher(async, 'Should be equal to', responseObject)
                .isEqual({
                  errorCode: 0,
                  errorMessage: 'Successful disconnection'
                });

              asyncMatcher(async, 'Status should be "DISCONNECTED"',
                mqttClient._getStatus())
                .isEqual(MqttClientImpl.STATUS.DISCONNECTED);

              async.done();
            };
            track(connectionListener);

            // Start the connection.
            mqttClient.connect({
              onFailure: function(responseObject) {
                async.fail(responseObject.errorMessage);
              },

              onSuccess: function() {
                asyncMatcher(async, '"disconnect()" should NOT throw any '
                  + 'exceptions', function() {
                  mqttClient.disconnect();
                }).not.throws();
              }
            });
          }, function() {
            return [
              {
                comment: ' in the case of shared connection',
                clientId: undefined
              },
              {
                comment: ' in the case of dedicated connection',
                clientId: 'mqttcooltest-client-12'
              }
            ];
          });

        asyncTest(13, 'when invoking close() on the originating session',
          function(async, data) {
            mqttClient = session.createClient('default', data.clientId);

            var connectionListener = new ConnectionListener();

            mqttClient.onConnectionLost = function(responseObject) {
              connectionListener.connectionLost(responseObject);
              var expectedErrorMessage = 'Disconnection from MQTT.Cool';
              if (!Scenario.isMin()) {
                expectedErrorMessage =
                    'Disconnection from PRODUCT_NAME_PLACEHOLDER';
              }
              asyncMatcher(async, 'Should be equal to', responseObject)
                .isEqual({
                  errorCode: 12,
                  errorMessage: expectedErrorMessage
                });

              asyncMatcher(async, 'Status should be "DISCONNECTED"',
                mqttClient._getStatus())
                .isEqual(MqttClientImpl.STATUS.DISCONNECTED);
              async.done();
            };
            track(connectionListener);

            // Start the connection.
            mqttClient.connect({
              onFailure: function(responseObject) {
                async.fail(responseObject.errorMessage);
              },

              onSuccess: function() {
                // Close the MQTTCoolSession instance to cause the underlying
                // LightstreamerClient instance to disconnect.
                session.close();
              }
            });

          }, function() {
            return [
              {
                comment: ' in the case of shared connection',
                clientId: undefined
              },
              {
                comment: ' in the case of dedicated connection',
                clientId: 'mqttcooltest-client-13'
              }
            ];
          });

        asyncTest(14, 'when two instances invoke disconnect() from the same '
          + ' broker, in the case of shared connection', function(async) {
          var mqttClient1 = session.createClient('default');
          var mqttClient2 = session.createClient('default');

          var connectionListener1 = new ConnectionListener();
          var connectionListener2 = new ConnectionListener();

          mqttClient1.onConnectionLost = function(responseObject) {
            connectionListener1.connectionLost(responseObject);
          };
          track(connectionListener1);

          mqttClient2.onConnectionLost = function(responseObject) {
            connectionListener2.connectionLost(responseObject);
          };
          track(connectionListener2);

          var disconnectEvents = 0;

          mqttClient1.onConnectionLost = function(responseObj) {
            asyncMatcher(async, 'Should be equal to 0',
              responseObj.errorCode).is(0);
            asyncMatcher(async, 'Client 1\'s status should be ' +
                  '"DISCONNECTED"', mqttClient1._getStatus())
              .isEqual(MqttClientImpl.STATUS.DISCONNECTED);
            disconnectEvents++;
            checkDisconnected();
          };

          // Start the first connection.
          mqttClient1.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Status should be "CONNECTED"',
                mqttClient1._getStatus());
              mqttClient1.disconnect();
            },

            onFailure: function(responseObj) {
              async.fail(responseObj.errorMessage);
            }
          });

          mqttClient2.onConnectionLost = function(responseObj) {
            asyncMatcher(async, 'Should be equal to 0',
              responseObj.errorCode).is(0);
            asyncMatcher(async, 'Client 2\'s status should be "DISCONNECTED"',
              mqttClient2._getStatus())
              .isEqual(MqttClientImpl.STATUS.DISCONNECTED);
            disconnectEvents++;
            checkDisconnected();
          };

          // Start the second connection.
          mqttClient2.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Status should be "CONNECTED"',
                mqttClient2._getStatus());
              mqttClient2.disconnect();
            },

            onFailure: function(responseObj) {
              async.fail(responseObj.errorMessage);
            }
          });

          function checkDisconnected() {
            if (disconnectEvents == 2) {
              async.done();
            }
          }
        });

        asyncTest(15, 'when invoking sequence of connect-disconnect-connect',
          function(async, data) {
            var mqttClient1 = session.createClient('default', data.clientId);

            // Start connection.
            mqttClient1.connect({
              onSuccess: function() {
                //setTimeout(function() {
                mqttClient1.disconnect();
                //}, 500);
              }
            });

            mqttClient1.onConnectionLost = function(responseObject) {
              asyncMatcher(async, 'Should be equal to 0',
                responseObject.errorCode).is(0);

              mqttClient1.connect({

                onSuccess: function() {
                  // Upon successful connection, final invocation of
                  // disconnect().
                  mqttClient1.onConnectionLost = function(responseObject) {
                    asyncMatcher(async, 'Should be equal to 0',
                      responseObject.errorCode).is(0);
                    async.done();
                  };
                  mqttClient1.disconnect();
                }
              });
            };
          }, function() {
            return [
              {
                comment: ' in the case of shared connection',
                clientId: undefined
              },
              {
                comment: ' in the case of dedicated connection',
                clientId: 'mqttcooltest-client-15'
              }
            ];
          });
      });

    suite('c. Test unauthorized connections',
      function() {
        beforeSuite(function(async) {
          Scenario.restartServices(function() {
            async.done();
          });
        }, true);

        after(function(async) {
          if (session) {
            session.close();
          }

          setTimeout(function() {
            async.done();
          }, 5000);
        }, true);

        asyncTest(16, 'when onNotAuthorized() callback is invoked because of '
          + 'unauthorized connection by the plugged Hook ',
        function(async, data) {
          Scenario.setupConnectionFailure(data.errorType, data.errorMessage,
            function(serverAddress) {

              openSession(serverAddress, {

                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;

                  mqttClient = session.createClient(data.uri, data.clientId);

                  mqttClient.connect({
                    onSuccess: function() {
                      async.fail();
                    },

                    onFailure: function() {
                      async.fail();
                    },

                    onNotAuthorized: function(responseObject) {
                      asyncMatcher(async, 'Should be equal', responseObject)
                        .isEqual(data.expectedResponse);

                      var status = mqttClient._getStatus();
                      asyncMatcher(async, 'Status should be "DISCONNECTED"',
                        status).is(MqttClientImpl.STATUS.DISCONNECTED);

                      async.done();
                    }
                  });
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            }, false);

        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection with no custom '
                + 'exception',

              clientId: 'mqttcooltest-client-16_1',

              uri: 'tcp://deny.authorization:1883',

              // Error code as sent by the Server
              errorType: -3,

              // Error message as sent by the Server
              errorMessage: ''

            // No expected responseObj
            },
            {
              comment:
                  ' in the case of shared connection with no custom exception',

              clientId: undefined,

              uri: 'tcp://deny.authorization:1883',

              // Error code as sent by the Server
              errorType: -3,

              // Error message as sent by the Server
              errorMessage: ''

            // No expected responseObj
            },
            {
              comment:
                  ' in the case of dedicated connection with custom exception',

              clientId: 'mqttcooltest-client-16_2',

              uri: 'tcp://raise.issue:1883',

              // Error code as sent by the Server
              errorType: -3,

              // Error message as sent by the Server
              errorMessage:
                  '{"code": 1, "message": "Not authorized connection"}',

              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Not authorized connection'
              }
            },
            {
              comment:
                  ' in the case of shared connection with custom exception',

              clientId: undefined,

              uri: 'tcp://raise.issue:1883',

              // Error code as sent by the Server
              errorType: -3,

              // Error message as sent by the Server
              errorMessage:
                  '{"code": 1, "message": "Not authorized connection"}',

              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Not authorized connection'
              }
            }
          ];
        });
      });

    suite('d. Test issues with MQTT.Cool and the MQTT Broker',
      function() {
        before(function(async, testId) {
          var complete = function() {
            async.done();
          };

          if (testId == 19) { // This test requires the MQTT broker to be down
            Scenario.restartCoolAndStopBroker(complete);
          } else {
            Scenario.restartServices(complete);
          }
        }, true);

        after(function(async) {
          if (session) {
            session.close();
          }
          setTimeout(function() {
            async.done();
          }, 5000);
        }, true);

        asyncTest(17, 'when onFailure() callback is invoked because of invalid'
          + ' broker reference', function(async, data) {
          var serverErrCode = -2;
          var serverErrMessage = '';

          Scenario.setupConnectionFailure(serverErrCode, serverErrMessage,
            function(serverAddress) {

              openSession(serverAddress, {
                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;

                  mqttClient = session.createClient('invalid_reference',
                    data.clientId);

                  mqttClient.connect({
                    onSuccess: function() {
                      async.fail();
                    },

                    onFailure: function(responseObject) {
                      asyncMatcher(async, 'Should be equal', responseObject)
                        .isEqual({
                          errorCode: 9,
                          errorMessage: 'MQTT broker configuration not valid'
                        });

                      asyncMatcher(async, 'Status should be "DISCONNECTED"',
                        mqttClient._getStatus()).
                        is(MqttClientImpl.STATUS.DISCONNECTED);

                      async.done();
                    }
                  });
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            });
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-17'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(18, 'when onFailure() callback is invoked because MQTT.Cool'
          + ' is not reachable ', function(async, data) {
          Scenario.setupDefault(function(serverAddress, scenarioHandle) {
            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;

                mqttClient = session.createClient('default', data.clientId);

                // Trigger a connection issue
                scenarioHandle.networkIssue();
                setTimeout(function() {
                  mqttClient.connect({
                    onSuccess: function() {
                      async.fail();
                    },

                    onFailure: function(responseObject) {
                      var expectedMessage = 'Connection error to MQTT.Cool';
                      if (!Scenario.isMin()) {
                        expectedMessage =
                              'Connection error to PRODUCT_NAME_PLACEHOLDER';
                      }
                      asyncMatcher(async, 'onFailure() should have been '
                      +  'invoked', responseObject).isEqual({
                        errorCode: 10,
                        errorMessage: expectedMessage
                      });

                      asyncMatcher(async, 'Status should be "DISCONNECTED"',
                        mqttClient._getStatus())
                        .is(MqttClientImpl.STATUS.DISCONNECTED);
                      async.done();
                    }
                  });
                }, 3000);
              },

              onConnectionFailure: function(errType) {
                async.fail(errType);
              }
            });
          });
        }, function() {
          return [
            {
              comment: 'in the case of shared connection',
              clientId: undefined
            },
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-18'
            }
          ];
        });

        asyncTest(19, 'when onFailure() callback is invoked because the MQTT'
          + ' broker is not reachable',
        function(async, data) {
          var serverErrCode = -13;
          var serverErrMessage = '';

          Scenario.setupConnectionFailure(serverErrCode, serverErrMessage,
            function(serverAddress) {

              openSession(serverAddress, {
                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;
                  mqttClient = mqttCoolSession.createClient('default',
                    data.clientId);

                  mqttClient.connect({
                    onSuccess: function() {
                      async.fail('onSuccess() Should not have been invoked');
                    },

                    onFailure: function(responseObject) {
                      asyncMatcher(async, 'Should be equal', responseObject)
                        .isEqual({
                          errorCode: 11,
                          errorMessage: 'Connection error to the MQTT broker'
                        });
                      asyncMatcher(async, 'Status should be "DISCONNECTED"',
                        mqttClient._getStatus()).
                        is(MqttClientImpl.STATUS.DISCONNECTED);

                      async.done();
                    }
                  });
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            });
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-19'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(20, 'when onFailure() callback is invoked because of a server'
          + ' error (mock only)',
        function(async, data) {
          var serverErrCode = 30;
          var serverErrMessage = 'subscriptions are not allowed by the current'
            + ' license terms (for special licenses only)';
          Scenario.setupConnectionFailure(serverErrCode, serverErrMessage,
            function(serverAddress) {
              openSession(serverAddress, {
                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;
                  mqttClient = session.createClient('invalid_reference',
                    data.clientId);

                  mqttClient.connect({
                    onSuccess: function() {
                      async.fail();
                    },

                    onFailure: function(responseObject) {
                      asyncMatcher(async, 'Should be equal',
                        responseObject).isEqual({
                        errorCode: 100,
                        errorMessage: 'SERVER_ERROR=> code: <30>, '
                          + 'message: <subscriptions are not allowed by '
                          + 'the current license terms (for special '
                          + 'licenses only)>'
                      });
                      asyncMatcher(async, 'Status should be "DISCONNECTED"',
                        mqttClient._getStatus())
                        .is(MqttClientImpl.STATUS.DISCONNECTED);
                      async.done();
                    }
                  });
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            }, true); // mock only as it is too hard to reproduce that!
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-20'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(21, 'when onFailure() callback is invoked because of returned'
          + ' error code in the CONNACK response.', function(async, data) {
          var connectionListener = new ConnectionListener();
          track(connectionListener);

          var mock = !(data.ack.returnCode == 5 &&
                typeof data.clientId != 'undefined');
          Scenario.setupConnack(data.ack.returnCode,
            function(serverAddress) {

              openSession(serverAddress, {
                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;

                  mqttClient = mqttCoolSession.createClient('default',
                    data.clientId);

                  // Start the connection.
                  mqttClient.connect({
                    onSuccess: function() {
                      async.fail();
                    },

                    onFailure: function(responseObject) {
                      var expectedResponse = {
                        errorCode: data.ack.returnCode
                      };
                      if (data.ack.expectedMessage) {
                        expectedResponse.errorMessage =
                              data.ack.expectedMessage;
                      }
                      asyncMatcher(async, 'Should be equal', responseObject)
                        .isEqual(expectedResponse);
                      async.done();
                    }
                  });
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            }, mock);

        }, function() {
          return [
            {
              clientId: 'mqttcooltest-client-21_1',
              ack:
                    {
                      returnCode: 1,
                      expectedMessage:
                        'Connection Refused: unacceptable protocol version'
                    }
            },
            {
              clientId: undefined,
              ack:
                    {
                      returnCode: 1,
                      expectedMessage:
                        'Connection Refused: unacceptable protocol version'
                    }
            },
            {
              clientId: 'mqttcooltest-client-21_2',
              ack:
                    {
                      returnCode: 2,
                      expectedMessage: 'Connection Refused: identifier rejected'
                    }
            },
            {
              clientId: undefined,
              ack:
                    {
                      returnCode: 2,
                      expectedMessage: 'Connection Refused: identifier rejected'
                    }
            },
            {
              clientId: 'mqttcooltest-client-21_3',
              ack:
                    {
                      returnCode: 3,
                      expectedMessage: 'Connection Refused: server unavailable'
                    }
            },
            {
              clientId: undefined,
              ack:
                    {
                      returnCode: 3,
                      expectedMessage: 'Connection Refused: server unavailable'
                    }
            },
            {
              clientId: 'mqttcooltest-client-21_4',
              ack:
                    {
                      returnCode: 4,
                      expectedMessage:
                        'Connection Refused: bad user name or password'
                    }
            },
            {
              clientId: undefined,
              ack:
                    {
                      returnCode: 4,
                      expectedMessage:
                        'Connection Refused: bad user name or password'
                    }
            },
            {
              clientId: 'unauthorized-client-id',
              ack:
                    {
                      returnCode: 5,
                      expectedMessage: 'Connection Refused: not authorized'
                    }
            },
            {
              clientId: undefined,
              ack:
                    {
                      returnCode: 5,
                      expectedMessage: 'Connection Refused: not authorized'
                    }
            },
            {
              clientId: 'mqttcooltest-client-21_5',
              ack:
                    {
                      // Should not be verified, but we ensure not to break
                      // onFailure() invocation.
                      returnCode: 6
                    }
            },
            {
              clientId: undefined,
              ack:
                    {
                      // Should not be verified, but we ensure not to break
                      // onFailure() invocation.
                      returnCode: 6
                    }
            }
          ];
        });

        asyncTest(22, 'when onFailure() callback is invoked because of a rapid'
          + ' sequence of CONNECT-DISCONNECT',
        function(async, data) {
          Scenario.setupDefault(function(serverAddress, scenarioHandle) {
            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;
                mqttClient = mqttCoolSession.createClient('default',
                  data.clientId);

                mqttClient.connect({
                  onSuccess: function() {
                    async.fail('onSuccess() Should not have been invoked');
                  },

                  onFailure: function(responseObject) {
                    var expectedMessage = 'Disconnection from MQTT.Cool';
                    if (!Scenario.isMin()) {
                      expectedMessage =
                            'Disconnection from PRODUCT_NAME_PLACEHOLDER';
                    }
                    asyncMatcher(async, 'Should be equal', responseObject)
                      .isEqual({
                        errorCode: 12,
                        errorMessage: expectedMessage
                      });
                    asyncMatcher(async, 'Status should be "DISCONNECTED"',
                      mqttClient._getStatus())
                      .is(MqttClientImpl.STATUS.DISCONNECTED);
                    async.done();
                  }
                });
                mqttClient.disconnect();
              },

              onConnectionFailure: function(errType) {
                async.fail(errType);
              }
            });
          });
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-22'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(23, 'when onConnectionLost() callback is invoked because the'
          + ' MQTT broker stops working',
        function(async, data) {

          var listener = new ConnectionListener();
          track(listener);

          Scenario.setupConnack(0, function(serverAddress, handler) {

            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;

                mqttClient = mqttCoolSession.createClient('default',
                  data.clientId);

                // Start the test.
                test(handler);
              },

              onConnectionFailure: function(errType) {
                async.fail(errType);
              }
            });
          });

          function test(handler) {
            mqttClient.onConnectionLost = function(responseObject) {
              asyncMatcher(async, 'Should be equal',
                responseObject).isEqual({
                errorCode: 11,
                errorMessage: 'Connection error to the MQTT broker'
              });

              asyncMatcher(async, 'Status should be "DISCONNECTED"',
                mqttClient._getStatus())
                .is(MqttClientImpl.STATUS.DISCONNECTED);
              async.done();
            };

            mqttClient.connect({
              onSuccess: function() {
                setTimeout(function() {
                  asyncMatcher(async, 'onFailure() should not have been '
                    + 'invoked', listener.notConnected).not.isInvoked();

                  // Stop the broker to trigger a CONNECTION_ERROR
                  handler.stopBroker();
                }, 500);
              },

              onFailure: function(responseObject) {
                async.fail(responseObject.errorMessage);
              }
            });

          }
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-23'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });
      });

    suite('e. Test connection recovery',
      function() {
        before(function(async) {
          Scenario.restartServices(function() {
            Scenario.setupConnack(0, function(serverAddress, handler) {

              scenarioHandler = handler;

              openSession(serverAddress, {
                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;
                  async.done();
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            });
          });
        }, true);

        after(function(async) {
          if (session) {
            session.close();
          }
          // Put a pause between a test and another of 5 seconds.
          setTimeout(function() {
            async.done();
          }, 5000);
        }, true);

        asyncTest(24, 'when MQTT.Cool crashes after an initial connection was'
          + ' successfully established', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          var connListener = new ConnectionListener();
          track(connListener);

          // Attach a callback to the onReconnectionStart property to track its
          // invocation.
          var onReconnectionStartCounter = 0;
          mqttClient.onReconnectionStart = function() {
            connListener.reconnectStart();

            onReconnectionStartCounter++;

            // Ensure that the following logic triggers just once.
            if (onReconnectionStartCounter == 1) {
              asyncMatcher(async, 'Status should be "RECOVERY"',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.RECOVERY);

              // Simulate restart of the MQTT.Cool server.
              scenarioHandler.startMQTTCool();
              return;
            }

            if (onReconnectionStartCounter == 2) {
              // Then we expect the client be in the RETRY status as a
              // "DISCONNECTED:WILL-DISCONNECT" is triggered.
              asyncMatcher(async, 'Status should be "RETRY"',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.RETRY);
              return;
            }

            async.fail('onReconnectionStart should not have been invoked');
          };

          mqttClient.onReconnectionComplete = function() {
            asyncMatcher(async, 'onReconnectionStart() should have been '
              + 'invoked', connListener.reconnectStart).isInvoked();
            asyncMatcher(async, 'Status should be "CONNECTED"',
              mqttClient._getStatus()).is(MqttClientImpl.STATUS.CONNECTED);
            asyncMatcher(async, 'onSuccess() should have not been invoked',
              connListener.connected).not.isInvoked();
            async.done();
          };

          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Status should be CONNECTED',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.CONNECTED);

              // Stop the MQTT.Cool server to trigger an issue.
              scenarioHandler.stopMQTTCool();
            },

            onFailure: function() {
              async.fail('onFailure() should not have been invoked');
            }
          });

        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-24'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(25, 'when network issues are detected by the automatic '
          + 'recovery connection, after an initial connection was successfully '
          + 'established', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          var connListener = new ConnectionListener();
          track(connListener);

          // Attach a callback to the onReconnectionStart property to track its
          // invocation.
          var onReconnectionStartInvoked = false;
          mqttClient.onReconnectionStart = function() {
            connListener.reconnectStart();

            // Ensure that the following logic triggers just once.
            if (!onReconnectionStartInvoked) {
              onReconnectionStartInvoked = true;
              asyncMatcher(async, 'Status should be "RECOVERY"',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.RECOVERY);

              // Simulate resolution of connection issues.
              scenarioHandler.recoverConnection();
            }
          };

          mqttClient.onReconnectionComplete = function() {
            asyncMatcher(async, 'onReconnectionStart() should have been '
              + 'invoked', connListener.reconnectStart).isInvoked();
            asyncMatcher(async, 'Status should be "CONNECTED"',
              mqttClient._getStatus()).is(MqttClientImpl.STATUS.CONNECTED);
            asyncMatcher(async, 'onSuccess() should have not been invoked',
              connListener.connected).not.isInvoked();
            async.done();
          };

          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Status should be CONNECTED',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.CONNECTED);

              // Start a network issue.
              scenarioHandler.networkIssue();
            },

            onFailure: function() {
              async.fail('onFailure() should not have been invoked');
            }
          });

        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-24'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(26, 'when the client disables automatic recovery triggered '
          + 'by the detection of network issues', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          var connListener = new ConnectionListener();
          track(connListener);

          mqttClient.onReconnectionStart = function() {
          // The client wants to disconnect.
            mqttClient.disconnect();
          };

          mqttClient.onConnectionLost = function(responseObject) {
            var expectedMessage = 'Connection error to MQTT.Cool';
            if (!Scenario.isMin()) {
              expectedMessage =
                  'Connection error to PRODUCT_NAME_PLACEHOLDER';
            }
            asyncMatcher(async, 'Should be as expected', responseObject)
              .isEqual({
                errorCode: 10,
                errorMessage: expectedMessage
              });

            asyncMatcher(async, 'Status should be "DISCONNECTED"',
              mqttClient._getStatus()).is(MqttClientImpl.STATUS.DISCONNECTED);

            async.done();
          };

          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Status should be "CONNECTED"',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.CONNECTED);

              // Start a network issue.
              scenarioHandler.networkIssue();
            },

            onFailure: function(responseObj) {
              async.fail(responseObj.errorMessage);
            }
          });

        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-25'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

        asyncTest(27, 'when the client disables automatic recovery triggered '
          + 'by the MQTT.cool server crash in the case of',
        function(async, data) {
          mqttClient = session.createClient('default',
            data.clientId);

          var connListener = new ConnectionListener();
          track(connListener);

          mqttClient.onReconnectionStart = function() {
          // The client wants to disconnect.
            mqttClient.disconnect();
          };

          mqttClient.onConnectionLost = function(responseObject) {
            var expectedMessage = 'Connection error to MQTT.Cool';
            if (!Scenario.isMin()) {
              expectedMessage =
                  'Connection error to PRODUCT_NAME_PLACEHOLDER';
            }
            asyncMatcher(async, 'Should be as expected', responseObject)
              .isEqual({
                errorCode: 10,
                errorMessage: expectedMessage
              });

            asyncMatcher(async, 'Status should be "DISCONNECTED"',
              mqttClient._getStatus()).is(MqttClientImpl.STATUS.DISCONNECTED);

            async.done();
          };

          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Status should be "CONNECTED"',
                mqttClient._getStatus()).is(MqttClientImpl.STATUS.CONNECTED);

              // Stop the MQTT.Cool server to trigger an issue.
              scenarioHandler.stopMQTTCool();
            },

            onFailure: function(responseObj) {
              async.fail(responseObj.errorMessage);
            }
          });

        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection',
              clientId: 'mqttcooltest-client-25'
            },
            {
              comment: ' in the case of shared connection',
              clientId: undefined
            }
          ];
        });

      });
  });

  return MqttClientImplTestSuite;
});
