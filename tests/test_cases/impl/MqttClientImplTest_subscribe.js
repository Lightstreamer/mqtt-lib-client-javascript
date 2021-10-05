'use strict';
define(['Suites', 'LightstreamerClient', 'LoggerManager', 'openSession',
  'MqttClientImpl', 'Objects', 'Message', 'Json', 'DefaultStorage', 'Store',
  'Scenario'],
function(Suites, LightstreamerClient, LoggerManager, openSession,
  MqttClientImpl, Objects, Message, Json, DefaultStorage, Store, Scenario) {

  var MqttClientImplTestSuite = Suites.newSuite();
  var suite = MqttClientImplTestSuite.suite;

  var before = MqttClientImplTestSuite.before;
  var beforeSuite = MqttClientImplTestSuite.beforeSuite;
  var after = MqttClientImplTestSuite.after;
  var test = MqttClientImplTestSuite.test;
  var asyncTest = MqttClientImplTestSuite.asyncTest;
  var matcher = MqttClientImplTestSuite.matcher;
  var asyncMatcher = MqttClientImplTestSuite.asyncMatcher;
  var track = MqttClientImplTestSuite.track;
  var delay = Scenario.delay;

  var xsuite = MqttClientImplTestSuite.xsuite;
  var xtest = MqttClientImplTestSuite.notest;
  var xasyncTest = MqttClientImplTestSuite.noasyncTest;

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

  /**
   * Trigger a MQTT.Cool server stop.
   * @param {*} sh the scenario handler
   */
  var serverCrash =  function(sh) {
    sh.stopMQTTCool();
  };

  /**
   * Trigger a MQTT.Cool server recovery.
   * @param {*} sh the scenario handler
   */
  var serverRecovery = function(sh, callback) {
    sh.startMQTTCool(callback);
  };

  /**
   * Trigger a network issue.
   * @param {*} sh the scenario handler
   */
  var networkIssue =  function(sh) {
    sh.networkIssue();
  };

  /**
   * Trigger a network recovery.
   * @param {*} sh the scenario handler
   */
  var networkRecovery = function(sh, callback) {
    sh.recoverConnection(callback);
  };

  suite('Subscription tests', function() {

    suite('a. Test invalid subscribing parameters and illegal states',
      function() {
        beforeSuite(function(async) {
          Scenario.restartServices(function() {
            async.done();
          });
        }, true);

        before(function(async) {
          // For the purpose of this unit test, there is no need to
          // distinguish between a dedicated connection and a shared one.
          Scenario.setupConnack(0, function(serverAddress) {
            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;
                mqttClient = session.createClient('default',
                  'mqttcooltest-client-a');
                async.done();
              },

              onConnectionFailure: function(errType) {
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

        asyncTest(1, 'when invoking subscribe() method supplying invalid '
          + 'topicFilter', function(async, data) {
          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Should throw an exception for invalid '
                + 'topicFilter',
              function() {
                mqttClient.subscribe(data);
              }).throws(new Error('Invalid [topicFilter] argument: <'+ data
                + '>'));
              async.done();
            }
          });

        }, function() {
          return [1, true, false, {}, [], undefined, null];
        });

        asyncTest(2, 'when invoking subscribe() method supplying invalid '
          + 'subscribe options', function(async, data) {
          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Should throw an exception for invalid '
                + 'topicFilter',
              function() {
                mqttClient.subscribe('topicFilter', data.opt);
              }).throws(data.err);
              async.done();
            }
          });

        }, function() {
          return [
            { opt: { qos: 4 }, err: new Error('Invalid [QoS] value: 4') },
            {
              opt: { maxFrequency: 'hello' },
              err: new Error('Invalid [maxFrequency] value: hello')
            }];
        });

        test(3, 'when subscribe() method cannot be invoked because the client '
          + ' is disconnected', function() {
          matcher('Should throw an exception for invalid state',
            function() {
              mqttClient.subscribe('topic3', {});
            }).throws(new Error('Invalid state'));
        });

      });

    suite('b. Test callbacks', function() {
      beforeSuite(function(async) {
        Scenario.restartServices(function() {
          async.done();
        });

      }, true);

      before(function(async, testId) {
        // Very hard to test a failure subscription in integration test.
        var mockOnly = testId == 8;
        Scenario.setupConnack(0, function(serverAddress, handle) {
          scenarioHandler = handle;

          openSession(serverAddress, {
            onConnectionSuccess: function(mqttCoolSession) {
              session = mqttCoolSession;
              //setTimeout(function() { async.done(); }, 5500);
              async.done();
            },

            onConnectionFailure: function(errType) {
              async.fail(errType);
            }
          });
        }, mockOnly);
      }, true);

      after(function() {
        if (session) {
          session.close();
        }
      });

      asyncTest(4, 'when onSuccess() callback is invoked, in the case of shared'
        + ' connection', function(async, data) {
        mqttClient = session.createClient('default');

        mqttClient._setProtocolListener({

          onSharedSubscription: function(sub) {
            if (data.qos == 0) {
              asyncMatcher(async, 'maxFrequency should be "unlimited"',
                sub.getRequestedMaxFrequency()).is('unlimited');
            } else {
              asyncMatcher(async, 'maxFrequency should be "unfiltered"',
                sub.getRequestedMaxFrequency()).is('unfiltered');
            }
            asyncMatcher(async, 'The schema should be "subscribe_schema"',
              sub.getFieldSchema()).is('subscribe_schema');
            asyncMatcher(async, 'Requested snapshot should be "no"',
              sub.getRequestedSnapshot()).is('no');
            asyncMatcher(async, 'Selector should be set',
              sub.getSelector().length).isGreaterThanOrEqual(10);
            asyncMatcher(async, 'Subscription should have only one ' +
                  'listener', sub.getListeners().length).is(1);

            scenarioHandler.sharedSuback(sub, data.suback);
          }
        });

        mqttClient.connect({
          onSuccess: function() {
            mqttClient.subscribe('topic4', {
              qos: data.qos,

              onSuccess: function(responseObject) {
                var expected = data.expectedNotified;
                /*
                 * In case of integration test, the return code should match the
                 * requested QoS, at least if no particular settings has been
                 * provided to the MQTT Server, which is not the case of regular
                 * tests.
                 */
                if (Scenario.isInt()) {
                  expected = data.qos;
                }
                asyncMatcher(async, 'Return Code should be <'
                  + data.expectedNotified + '>', responseObject.grantedQos)
                  .isEqual(expected);
                async.done();
              },

              onFailure: function(responseObj) {
                async.fail('Subscription failed: ' + responseObj.errorCode);
              }
            });
          }
        });
      }, function() {
        return [
          {
            comment: ' [qos: 0, suback: 0, notified: 0]',
            qos: 0, suback: 0, expectedNotified: 0
          },
          {
            comment: ' [qos: 0, suback: 1, notified: 0]',
            qos: 0, suback: 1, expectedNotified: 0
          },
          {
            comment: ' [qos: 0, suback: 2, notified: 0]',
            qos: 0, suback: 2, expectedNotified: 0
          },
          {
            comment: ' [qos: 1, suback: 0, notified: 0]',
            qos: 1, suback: 0, expectedNotified: 0
          },
          {
            comment: ' [qos: 1, suback: 1, notified: 1]',
            qos: 1, suback: 1, expectedNotified: 1
          },
          {
            comment: ' [qos: 1, suback: 2, notified: 1]',
            qos: 1, suback: 2, expectedNotified: 1
          },
          {
            comment: ' [qos: 2, suback: 0, notified: 0]',
            qos: 2, suback: 0, expectedNotified: 0
          },
          {
            comment: ' [qos: 2, suback: 1, notified: 1]',
            qos: 2, suback: 1, expectedNotified: 1
          },
          {
            comment: ' [qos: 2, suback: 2, notified: 2]',
            qos: 2, suback: 2, expectedNotified: 2
          }
        ];
      });

      asyncTest(5, 'when onSuccess() callback is invoked, in the case of '
        + ' dedicated connection', function(async, data) {
        mqttClient = session.createClient('default', data.clientId);

        mqttClient._setProtocolListener({
          onSubscribe: function(subPacket) {
            asyncMatcher(async, 'The internal sent messages table should '
              + 'contain 1 item', mqttClient._getSent()).isOfLength(1);
            var sent = mqttClient._getSent();
            var packetId = subPacket.body['packetId'];
            asyncMatcher(async, 'Should be a SUBSCRIBE packet',
              sent[packetId].body.type).is('SUBSCRIBE');
            asyncMatcher(async, 'The internal received messages table should'
              + ' be empty', mqttClient._getReceived()).isOfLength(0);
            asyncMatcher(async, 'The message queue should contain 1 item',
              mqttClient._getMessageQueueSize()).is(1);
            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'Should be a SUBSCRIBE packet',
              queue[0].body['type']).is('SUBSCRIBE');
            asyncMatcher(async, 'Should be the same packet', queue[0])
              .is(sent[packetId]);
            asyncMatcher(async, 'Should be the same packet', subPacket)
              .is(queue[0]);

            scenarioHandler.suback(data.clientId, packetId, data.qos);
          }
        });

        mqttClient.connect({
          cleanSession: data.cleanSession,
          onSuccess: function() {
            mqttClient.subscribe('ls_topic', {
              qos: data.qos,
              onSuccess: function(responseObject) {
                asyncMatcher(async, 'Return Code should be <' + data.qos + '>',
                  responseObject.grantedQos).isEqual(data.qos);

                var activeSubs = mqttClient._getActiveSubscriptions();
                if (data.cleanSession) {
                  asyncMatcher(async, 'The Subscription Store should contain'
                    + ' 1 item', activeSubs).isOfLength(1);
                } else {
                  asyncMatcher(async, 'The Subscription Store should be empty',
                    activeSubs).isOfLength(0);
                }
                checkFinalState(async, data.clientId);
                async.done();
              }
            });
          }
        });
      }, function() {
        return [
          {
            clientId: 'mqttcooltest-client-5_1',
            comment: ' and cleanSession set to true [qos: 0]',
            cleanSession: true,
            qos: 0
          },
          {
            clientId: 'mqttcooltest-client-5_2',
            comment: ' and cleanSession set to true [qos: 1]',
            cleanSession: true,
            qos: 1
          },
          {
            clientId: 'mqttcooltest-client-5_3',
            comment: ' and cleanSession set to true [qos: 2]',
            cleanSession: true,
            qos: 2
          },
          {
            clientId: 'mqttcooltest-client-5_4',
            comment: ' and cleanSession set to false [qos: 0]',
            cleanSession: false,
            qos: 0
          },
          {
            clientId: 'mqttcooltest-client-5_5',
            comment: ' and cleanSession set to false [qos: 1]',
            cleanSession: false,
            qos: 1
          },
          {
            clientId: 'mqttcooltest-client-5_6',
            comment: ' and cleanSession set to false [qos: 2]',
            cleanSession: false,
            qos: 2
          }
        ];
      });

      asyncTest(6, 'when two separate client instances subscribe to the same '
        + 'topic with different QoS,', function(async, data) {
        // Create a new ClientFactory to trigger a new LightstreamerClient
        // session
        var scenario2 = null;
        Scenario.setupConnack(0, function(serverAddress, handle) {
          scenario2 = handle;
          openSession(serverAddress, {
            onConnectionSuccess: function(secondSession) {
              continueTest(secondSession);
            }
          });
        });

        function continueTest(secondSession) {
          var clientId;
          if (data.clientId) {
            clientId = data.clientId + '_1';
          }
          mqttClient = session.createClient('default', clientId);

          mqttClient._setProtocolListener({
            // Invoked in the case of dedicated connection.
            onSubscribe: function(subPacket) {
              scenarioHandler.suback(clientId, subPacket.body['packetId'],
                data.qos1);
            },

            // Invoked in the case of share connection.
            onSharedSubscription: function(sub) {
              scenarioHandler.sharedSuback(sub, data.qos1);
            }
          });

          mqttClient.connect({
            onSuccess: function() {
              mqttClient.subscribe('topic6', {
                qos: data.qos1,
                onSuccess: function(responseObject) {
                  asyncMatcher(async, 'Return Code should be <' + data.qos1
                        + '>', responseObject.grantedQos).isEqual(data.qos1);
                  startClient2(secondSession);
                }
              });
            }
          });
        }

        function startClient2(secondSession) {
          // Create a new MqttClient instance to be used for submitting
          // a similar subscription.
          var clientId;
          if (data.clientId) {
            clientId = data.clientId + '_2';
          }
          var mqttClient2 = secondSession.createClient('default', clientId);
          mqttClient2._setProtocolListener({
            // Invoked in the case of dedicated connection.
            onSubscribe: function(subPacket) {
              scenario2.suback(clientId, subPacket.body['packetId'],
                data.qos2);
            },

            // Invoked in the case of share connection.
            onSharedSubscription: function(sub) {
              scenario2.sharedSuback(sub, data.qos2);
            }
          });

          mqttClient2.connect({
            onSuccess: function() {
              mqttClient2.subscribe('topic6', {
                qos: data.qos2,
                onSuccess: function(responseObj) {
                  asyncMatcher(async, 'Return Code should be <' + data.qos2
                        + '>', responseObj.grantedQos).isEqual(data.qos2);
                  secondSession.close();
                  async.done();
                }
              });
            },

            onFailure() {
              secondSession.close();
              async.fail();
            }
          });

        }
      }, function() {
        return [
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 0, qos2: 0])',
            clientId: 'mqttcooltest-client-6_1', qos1: 0, qos2: 0
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 1, qos2: 0])',
            clientId: 'mqttcooltest-client-6_2', qos1: 1, qos2: 0
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 2, qos2: 0])',
            clientId: 'mqttcooltest-client-6_3', qos1: 2, qos2: 0
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 0, qos2: 1])',
            clientId: 'mqttcooltest-client-6_4', qos1: 0, qos2: 1
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 1, qos2: 1])',
            clientId: 'mqttcooltest-client-6_5', qos1: 1, qos2: 1
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 2, qos2: 1])',
            clientId: 'mqttcooltest-client-6_6', qos1: 2, qos2: 1
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 0, qos2: 2])',
            clientId: 'mqttcooltest-client-6_7', qos1: 0, qos2: 2
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 1, qos2: 2])',
            clientId: 'mqttcooltest-client-6_8', qos1: 1, qos2: 2
          },
          {
            comment:
                  ' in the case of dedicated connection ([qos1: 2, qos2: 2])',
            clientId: 'mqttcooltest-client-6_9', qos1: 2, qos2: 2
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 0, qos2: 0])',
            clientId: undefined, qos1: 0, qos2: 0
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 1, qos2: 0])',
            clientId: undefined, qos1: 1, qos2: 0
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 2, qos2: 0])',
            clientId: undefined, qos1: 2, qos2: 0
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 0, qos2: 1])',
            clientId: undefined, qos1: 0, qos2: 1
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 1, qos2: 1])',
            clientId: undefined, qos1: 1, qos2: 1
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 2, qos2: 1])',
            clientId: undefined, qos1: 2, qos2: 1
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 0, qos2: 2])',
            clientId: undefined, qos1: 0, qos2: 2
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 1, qos2: 2])',
            clientId: undefined, qos1: 1, qos2: 2
          },
          {
            comment:
                  ' in the case of shared connection ([qos1: 2, qos2: 2])',
            clientId: undefined, qos1: 2, qos2: 2
          }
        ];
      });

      asyncTest(7, 'when a subscription is resubmitted because of a conflicting'
        + ' selector in a shared connection', function(async) {
        mqttClient = session.createClient('default');

        var subscriptionCount = 0;
        var firstSub;
        mqttClient._setProtocolListener({
          // Invoked in the case of share connection.
          onSharedSubscription: function(sub) {
            subscriptionCount++;
            if (subscriptionCount == 1) {
              firstSub = sub;
              // Reset the selector strategy;
              mqttClient._setSelectorStrategy(null);
              delay(function() {
                scenarioHandler.sharedSuback(sub, -6);
              }, 500);
            } else {
              asyncMatcher(async, 'New subscription should be different from '
                + 'the previous one', firstSub).not.is(sub);
              asyncMatcher(async, 'New Selector should be different from the '
                + 'the previous one', sub.getSelector()).not
                .isEqual(firstSub.getSelector());

              delay(function() {
                scenarioHandler.sharedSuback(sub, 0);
              }, 500);
            }
          }
        });

        // Set a function to trigger the "TestSelector" server side.
        mqttClient._setSelectorStrategy(function() {
          return 'TestSelector';
        });

        mqttClient.connect({
          onSuccess: function() {
            mqttClient.subscribe('topic7', {

              qos: 0,

              onSuccess: function() {
                if (subscriptionCount != 2) {
                  async.fail('onSuccess() should not have been invoked');
                } else {
                  checkFinalState(async);
                  async.done();
                }
              },

              onFailure: function() {
                async.fail('onFailure() should not have been invoked');
              },

              onAuthorizationFailure: function() {
                async.fail('onAuthorizationFailure() should not have been '
                  + ' invoked');
              }
            });
          }
        });
      });

      asyncTest(8, 'when onFailure() callback is invoked',
        function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          mqttClient._setProtocolListener({
            // Invoked in the case of dedicated connection.
            onSubscribe: function(subPacket) {
              scenarioHandler.suback(data.clientId,
                subPacket.body['packetId'], 0x80);
            },

            // Invoked in the case of share connection.
            onSharedSubscription: function(sub) {
              scenarioHandler.sharedSuback(sub, 0x80);
            }
          });

          mqttClient.connect({
            onSuccess: function() {
              mqttClient.subscribe('topic8', {
                onSuccess: function() {
                  async.fail('onSuccess() should not have been invoked');
                },

                onFailure: function(responseObject) {
                  asyncMatcher(async, 'Return Code should be 0x80',
                    responseObject.errorCode).is(0x80);

                  checkFinalState(async, data.clientId);
                  async.done();
                }
              });
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
              clientId: 'mqttcooltest-client-8'
            }
          ];
        });

      asyncTest(9, 'when a sequence of subscriptions occurs in a shared ' +
        ' subscription',
        function(async, data) {
          mqttClient = session.createClient('mqttcool_broker');
          var notificationsCollector = [];
          var subAckCounter = 0;
          var numberOfSubscriptions = 10;

          mqttClient.connect({
            onSuccess: function() {
              for (var i = 0; i < numberOfSubscriptions; i++) {
                var options = {
                  onSuccess: function() {
                    notificationsCollector.push('topic9 #' + subAckCounter);
                    subAckCounter++;
                    if (subAckCounter == numberOfSubscriptions) {
                      asyncMatcher(async, '', notificationsCollector.length)
                        .isEqual(numberOfSubscriptions);
                      for (var i = 0; i < notificationsCollector.length; i++) {
                        asyncMatcher(async, '', notificationsCollector[i])
                          .isEqual('topic9 #' + i);
                      }
                      async.done();
                    }
                  },

                  onFailure: function(responseObject) {
                    async.fail('onFailure() should not have been called');
                  }
                };

                if (i % 2) {
                  options['maxFrequency'] = 1;
                }

                mqttClient.subscribe('topic9', options);
              }
            },

            onFailure: function(res) {
              async.fail(res.errorMessage);
            }
          });
        });

      asyncTest(10, 'when a resubscription occurs in a shared subscription',
        function(async, data) {
          mqttClient = session.createClient('default');

          mqttClient.connect({
            onSuccess: subscribe
          });

          function subscribe() {
            mqttClient.subscribe('topic10', {
              onSuccess: resubscribe,
              onFailure: function(responseObject) {
                async.fail('onFailure() should not have been called');
              }
            });
          }

          function resubscribe() {
            mqttClient.subscribe('topic10', {
              onSuccess: function() {
                async.done();
              },
              onFailure: function(responseObject) {
                async.fail('onFailure() should not have been called');
              }
            });
          }
      });
    });

    suite('c. Test unauthorized subscriptions', function() {
      beforeSuite(function(async) {
        Scenario.restartServices(function() {
          async.done();
        });
      }, true);

      after(function() {
        if (session) {
          session.close();
        }
      });

      asyncTest(11, 'when onAuthorizationFailure() callback is invoked,',
        function(async, data) {
          Scenario.setupUnauthorizedSubscription(data.clientId,
            data.errorMessage, function(serverAddress, handle) {
              scenarioHandler = handle;

              openSession(serverAddress, {
                onConnectionSuccess: function(mqttCoolSession) {
                  session = mqttCoolSession;
                  startTest();
                },

                onConnectionFailure: function(errType) {
                  async.fail(errType);
                }
              });
            });

          function startTest() {
            mqttClient = session.createClient('default', data.clientId);

            mqttClient.onConnectionLost = function(responseObj) {
              if (responseObj.errorCode != 0) {
                //async.fail(responseObj.errorMessage);
              }
            };

            mqttClient.connect({
              onSuccess: function() {
                mqttClient.subscribe(data.failureTopic, {
                  qos: 0,

                  onSuccess: function() {
                    async.fail('onSuccess() should not have been invoked');
                  },

                  onFailure: function() {
                    async.fail('onFailure() should not have been invoked');
                  },

                  onNotAuthorized: function(responseObject) {
                    asyncMatcher(async, 'onAuthorizationFailure() should have'
                      + 'have been invoked', responseObject)
                      .isEqual(data.expectedResponse);
                    checkFinalState(async, data.clientId);
                    async.done();
                  }
                });
              },

              onFailure: function(responseObj) {
                async.fail(responseObj.errorMessage);
              }
            });
          }
        }, function() {
          return [
            {
              comment: ' in the case of dedicated connection and Unauthorized '
                + 'subscription with unspecified exception',
              clientId: 'mqttcooltest-client-9_1',
              failureTopic: 'not_authorize',
              errorMessage: ''
              // No expected responseObj.
            },
            {
              comment: ' in the case of dedicated connection and Unauthorized '
                + 'subscription with custom exception',

              clientId: 'mqttcooltest-client-9_2',
              failureTopic: 'not_authorize_with_exception',
              errorMessage:
                  '{ "code":1, "message": "Subscription not allowed"}',

              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Subscription not allowed'
              }
            },
            {
              comment: ' in the case of shared connection and Unauthorized '
                + 'subscription with unspecified exception',
              failureTopic: 'not_authorize',

              errorMessage: ''
              // No expected responseObj.
            },
            {
              comment: ' in the case of shared connection and Unauthorized '
                + 'subscription with custom exception',
              failureTopic: 'not_authorize_with_exception',

              errorMessage:
                  '{ "code":1, "message": "Subscription not allowed"}',

              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Subscription not allowed'
              }
            }
          ];
        });

    });

    suite('d. Test arriving of messages', function() {
      beforeSuite(function(async) {
        Scenario.restartServices(function() {
          async.done();
        });
      }, true);

      before(function(async) {
        // Clear the localStorage.
        new DefaultStorage().clearAll();

        Scenario.setupConnack(0, function(serverAddress, handle) {
          scenarioHandler = handle;

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
      }, true);

      after(function() {
        if (session) {
          session.close();
        }
      });

      asyncTest(12, 'when onMessageArrived() callback is invoked,',
        function(async, data) {
          var cleanSession = true;
          if (data.clientId) {
            cleanSession = data.cleanSession;
          }

          mqttClient = session.createClient('default', data.clientId);

          mqttClient.onError = function(error) {
            if (publishingClient) {
              publishingClient.disconnect();
            }
            async.fail(error);
          };

          mqttClient._setProtocolListener({
            /**
              * Invoked in the case of shared connection
              *
              * @param {Subscription} subscription -
              */
            onSharedSubscription: function(subscription) {
              setTimeout(function() {
                scenarioHandler.sharedSuback(subscription,
                  data.subscribingQos);

                // Start publishing messages once the subscription has been
                // completed.
                startPublishing(async, subscription, data);
              }, 500);
            },

            /**
              * Invoked in the case of dedicated connection.
              *
              * @param {Packet} subscribePacket -
              */
            onSubscribe: function(/** subscribePacket */) {
              setTimeout(function() {
                scenarioHandler.suback(data.clientId, 1, data.subscribingQos);

                // Start publishing messages once the subscription has been
                // completed.
                startPublishing(async, null, data);
              }, 100);
            },

            onPublishProcessed: function(packet) {
              if (!data.cleanSession) {
                delay(function() {
                  var qos = packet.body['message']['qos'];
                  if (qos == 1) {
                    scenarioHandler.puback(data.clientId,
                      packet.body['packetId']);

                  } else if (qos == 2) {
                    scenarioHandler.pubrel(data.clientId,
                      packet.body['packetId']);
                  }
                }, 100);
              }
            }
          });

          mqttClient.onMessageArrived = function(message) {
            asyncMatcher(async, 'QoS should be <' + data.expectedQos + '>',
              message.qos).is(data.expectedQos);
            asyncMatcher(async, 'Topic should be <' +
                data.pub.destinationName + '>', message.destinationName)
              .isEqual(data.pub.destinationName);
            asyncMatcher(async, 'Payload should be <' +
                data.pub.payloadString + '>', message.payloadString)
              .isEqual(data.pub.payloadString);

            setTimeout(function() {
              checkFinalState(async, data.clientId);
              async.done();
            }, 500);
          };

          mqttClient.onConnectionLost = function(response) {
            // errorCode is 12 when session is closed in the 'after' method.
            if (response.errorCode != 12) {
              async.fail(response.errorMessage);
            }
          };

          mqttClient.connect({
            cleanSession: cleanSession,

            onSuccess: function() {
              mqttClient.subscribe(data.pub.destinationName, {
                qos: data.subscribingQos,

                onSuccess: function(responseObj) {
                  asyncMatcher(async, 'Should be <' + data.subscribingQos +'>',
                    responseObj.grantedQos).is(data.subscribingQos);
                },

                onFailure: function() {
                  async.fail('Should not have been invoked');
                }
              });
            },

            onFailure: function(responseObj) {
              async.fail('onFailure() should not have been invoked: '
                + responseObj.errorMessage);
            }
          });
        }, function() {
          return [
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 0, '
                + 'published QoS: 0]',
              subscribingQos: 0,
              pub: event('topic10_1', 0, 'hello10_1'),
              expectedQos: 0
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 0, '
                + 'published QoS: 1]',
              subscribingQos: 0,
              pub: event('topic10_2', 1, 'hello10_2'),
              expectedQos: 0
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 0, '
                + 'published QoS: 2]',
              subscribingQos: 0,
              pub: event('topic10_3', 2, 'hello10_3'),
              expectedQos: 0
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 1, '
                + 'published QoS: 0]',
              subscribingQos: 1,
              pub: event('topic10_4', 0, 'hello10_4'),
              expectedQos: 0
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 1, '
                + 'published QoS: 1]',
              subscribingQos: 1,
              pub: event('topic10_5', 1, 'hello10_5'),
              expectedQos: 1
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 1, '
                + 'published QoS: 2]',
              subscribingQos: 1,
              pub: event('topic10_6', 2, 'hello10_6'),
              expectedQos: 1
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 2, '
                + 'published QoS: 0]',
              subscribingQos: 2,
              pub: event('topic10_7', 0, 'hello10_7'),
              expectedQos: 0
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 2, '
                + 'published QoS: 1]',
              subscribingQos: 2,
              pub: event('topic10_8', 1, 'hello10_8'),
              expectedQos: 1
            },
            {
              clientId: undefined,
              comment: ' in the case of shared connection [subscribed QoS: 2, '
                + 'published QoS: 2]',
              subscribingQos: 2,
              pub: event('topic10_9', 2, 'hello10_9'),
              expectedQos: 2
            },
            {
              clientId: 'mqttcooltest-client-10_1a',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 0, published QoS: 0]',
              subscribingQos: 0,
              pub: event('topic10_1a', 0, 'hello10_1a'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_2a',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 0, published QoS: 1]',
              subscribingQos: 0,
              pub: event('topic10_2a', 1, 'hello10_2a'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_3a',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 0, published QoS: 2]',
              subscribingQos: 0,
              pub: event('topic10_3a', 2, 'hello10_3a'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_1b',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 1, published QoS: 0]',
              subscribingQos: 1,
              pub: event('topic10_1b', 0, 'hello10_1b'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_2b',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true , subscribed QoS: 1, published QoS: 1]',
              subscribingQos: 1,
              pub: event('topic10_2b', 1, 'hello10_2b'),
              expectedQos: 1
            },
            {
              clientId: 'mqttcooltest-client-10_3b',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 1, published QoS: 2]',
              subscribingQos: 1,
              pub: event('topic10_3b', 2, 'hello10_3b'),
              expectedQos: 1
            },
            {
              clientId: 'mqttcooltest-client-10_1c',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS:2, published QoS: 0]',
              subscribingQos: 2,
              pub: event('topic10_1c', 0, 'hello10_1c'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_2c',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 2, published QoS: 1]',
              subscribingQos: 2,
              pub: event('topic10_2c', 1, 'hello10_2c'),
              expectedQos: 1
            },
            {
              clientId: 'mqttcooltest-client-10_3c',
              cleanSession: true,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'true, subscribed QoS: 2, published QoS: 2]',
              subscribingQos: 2,
              pub: event('topic10_3c', 2, 'hello10_3c'),
              expectedQos: 2
            },
            {
              clientId: 'mqttcooltest-client-10_1d',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false , subscribed QoS: 0, published QoS: 0]',
              subscribingQos: 0,
              pub: event('topic10_1d', 0, 'hello10_1d'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_2d',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
              + 'false , subscribed QoS: 0, published QoS: 1]',
              subscribingQos: 0,
              pub: event('topic10_2d', 1, 'hello10_2d'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_3d',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false , subscribed QoS: 0, published QoS: 2]',
              subscribingQos: 0,
              pub: event('topic10_3d', 2, 'hello10_3d'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_1e',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false , subscribed QoS: 1, published QoS: 0]',
              subscribingQos: 1,
              pub: event('topic10_1e', 0, 'hello10_1e'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_2e',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false, subscribed QoS: 1, published QoS: 1]',
              subscribingQos: 1,
              pub: event('topic10_2e', 1, 'hello10_2e'),
              expectedQos: 1
            },
            {
              clientId: 'mqttcooltest-client-10_3e',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false, subscribed QoS:1, published QoS: 2]',
              subscribingQos: 1,
              pub: event('topic10_3e', 2, 'hello10_3e'),
              expectedQos: 1
            },
            {
              clientId: 'mqttcooltest-client-10_1f',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false, subscribed QoS: 2, published QoS: 0]',
              subscribingQos: 2,
              pub: event('topic10_1f', 0, 'hello10_1f'),
              expectedQos: 0
            },
            {
              clientId: 'mqttcooltest-client-10_2f',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false, subscribed QoS: 2, published QoS: 1]',
              subscribingQos: 2,
              pub: event('topic10_2f', 1, 'hello10_2f'),
              expectedQos: 1
            },
            {
              clientId: 'mqttcooltest-client-10_3f',
              cleanSession: false,
              comment: ' in the case of dedicated connection [cleanSession: '
                + 'false, subscribed QoS: 2, published QoS: 2]',
              subscribingQos: 2,
              pub: event('topic10_3f', 2, 'hello10_3f'),
              expectedQos: 2
            }
          ];
        });
    });

    suite('e. Test reconnection', function() {
      before(function(async) {
        // Clear the localStorage.
        new DefaultStorage().clearAll();

        Scenario.restartServices(function() {
          Scenario.setupConnack(0, function(serverAddress, handle) {
            scenarioHandler = handle;

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
        setTimeout(function() {
          async.done();
        }, 1500);
      }, true);

      asyncTest(13, '', function(async, data) {
        var listener = {
          onSubscribed: function() { }
        };
        track(listener);

        // Reference to the Subscription which will be automatically resubmitted
        var subscription;

        mqttClient = session.createClient('default', data.clientId);

        var subscriptionCount = 0;
        mqttClient._setProtocolListener({
          onSharedSubscription: function(sub) {
            // Save the reference to the Subscription, in order to be later
            // used when simulating the connection recovery.
            subscription = sub;
            delay(function() {
              scenarioHandler.sharedSuback(sub, 0);
            }, 500);
          },

          onSubAckProcessed: function(packetId) {
            subscriptionCount++;
            if (subscriptionCount == 1) {
              asyncMatcher(async, 'onSubscribed() should  have been invoked',
                listener.onSubscribed).isInvoked();

              var activeSubs = mqttClient._getActiveSubscriptions();
              asyncMatcher(async, 'The Subscription Store should contain 1 '
                + 'item', activeSubs).isOfLength(1);

              // Start network issue.
              scenarioHandler.stopMQTTCool();
            } else if (subscriptionCount == 2) {
              activeSubs = mqttClient._getActiveSubscriptions();
              asyncMatcher(async, 'The Subscription Store should contain 1 '
                + 'item', activeSubs).isOfLength(1);
              asyncMatcher(async, 'onSubscribed() should not have been invoked',
                listener.onSubscribed).not.isInvoked();

              checkFinalState(async, data.clientId);

              // Start a publishing client to verify that the subscription still
              // works as expected.
              startPublishing(async, null, data);
            } else {
              async.fail('Should have not been invoked');
            }
          },

          onSharedSubscriptionAckProcessed: function(sub) {
            subscriptionCount++;
            if (subscriptionCount == 1) {
              asyncMatcher(async, 'onSubscribed() should have been invoked',
                listener.onSubscribed).isInvoked();

              // Stop the MQTT.Cool server to trigger an issue.
              scenarioHandler.stopMQTTCool();
            } else if (subscriptionCount == 2) {
              asyncMatcher(async, 'onSubscribed() should not have been invoked',
                listener.onSubscribed).not.isInvoked();

              checkFinalState(async);

              // Start a publishing client to verify that the subscription
              // still works as expected.
              startPublishing(async, null, data);
            }
          }
        });

        mqttClient.onReconnectionStart = function() {
          mqttClient.onReconnectionStart = null;

          // Simulate restart of the MQTT.Cool server.
          scenarioHandler.startMQTTCool(function() {
            delay(function() {
              scenarioHandler.sharedSuback(subscription, 0);
            }, 500);
          });
        };

        mqttClient.onMessageArrived = function(msg) {
          matcher('Message should be as expected', msg).isEqual(data.pub);
          async.done();
        };

        mqttClient.connect({
          onSuccess: function() {
            mqttClient.subscribe(data.pub.destinationName, {
              qos: data.subscribingQos,
              onSuccess: function(rc) {
                listener.onSubscribed(rc);
              }
            });
          }
        });
      }, function() {
        var serverCrashCommentPrefix = 'when previous acknowledged shared '
          + 'subscriptions are resubmitted after a reconnection due to '
          +  'MQTT.Cool server crash';

        var serverCrashCommentForDedicatedPrefix = 'when previous dedicated '
          + 'subscriptions are resubmitted after a reconnection due to '
          + 'MQTT.Cool server crash, in the case of clean session set to true';
        return [
          {
            clientId: undefined,
            comment: serverCrashCommentPrefix + ' [qos: 0]',
            pub: event('topic11a', 0, 'hello11a'),
            subscribingQos: 0
          },
          {
            clientId: undefined,
            comment: serverCrashCommentPrefix + ' [qos: 1]',
            pub: event('topic11b', 1, 'hello11b'),
            subscribingQos: 1
          },
          {
            clientId: undefined,
            comment: serverCrashCommentPrefix + ' [qos: 2]',
            pub: event('topic11c', 2, 'hello11c'),
            subscribingQos: 2
          },
          {
            clientId: 'mqttcooltest-client-11a',
            comment: serverCrashCommentForDedicatedPrefix + ' [qos: 0]',
            pub: event('topic11a1', 0, 'hello11a1'),
            subscribingQos: 0
          },
          {
            clientId: 'mqttcooltest-client-11b',
            comment: serverCrashCommentForDedicatedPrefix + ' [qos: 1]',
            pub: event('topic11b1', 1, 'hello11b1'),
            subscribingQos: 1
          },
          {
            clientId: 'mqttcooltest-client-11c',
            comment: serverCrashCommentForDedicatedPrefix + ' [qos: 2]',
            pub: event('topic11c1', 2, 'hello11c1'),
            subscribingQos: 2
          }
        ];
      });

      xasyncTest(14, '', function(async, data) {
        var listener = {
          onSubscribed: function() { }
        };
        track(listener);

        mqttClient = session.createClient('default', data.clientId);

        var subscriptionCount = 0;
        mqttClient._setProtocolListener({
          onSubAckProcessed: function() {
            subscriptionCount++;
            if (subscriptionCount == 1) {
              // Trigger a network issue.
              networkIssue(scenarioHandler);
            } else {
              async.fail('Should not have been received a new suback');
            }
          },

          onSharedSubscriptionAckProcessed: function() {
            subscriptionCount++;
            if (subscriptionCount == 1) {
              // Trigger a network issue.
              networkIssue(scenarioHandler);
            } else {
              async.fail('Should not have been received a new suback');
            }
          }
        });

        mqttClient.onReconnectionStart = function() {
          // This avoid duplicate calls.
          mqttClient.onReconnectionStart = null;

          scenarioHandler.recoverConnection();
        };

        mqttClient.onReconnectionComplete = function() {
          checkFinalState(async, data.clientId);
          // Start a publishing client to verify that the subscription
          // still works as expected.
          startPublishing(async, null, data);
        };

        mqttClient.onMessageArrived = function(msg) {
          matcher('Message should be as expected', msg).isEqual(data.pub);
          async.done();
        };

        mqttClient.connect({
          onSuccess: function() {
            mqttClient.subscribe(data.pub.destinationName, {
              qos: data.subscribingQos,
              onSuccess: function(rc) {
                listener.onSubscribed(rc);
              }
            });
          }
        });
      }, function() {
        var networkIssueCommentPrefix = 'when previous acknowledged shared '
          + 'subscription still continue to work, after a reconnection due to '
          + 'temporary network issues';

        var networkIssueCommentForDedicatedPrefix = 'when previous '
          + 'acknowledged shared subscription still continue to work after a '
          + 'reconnection due to temporary network issues, in the case of '
          + 'clean session set to true';
        return [
          {
            clientId: undefined,
            comment: networkIssueCommentPrefix + ' [qos: 0]',
            pub: event('topic12_1a', 0, 'hello12_1a'),
            subscribingQos: 0
          },
          {
            clientId: undefined,
            comment: networkIssueCommentPrefix + ' [qos: 1]',
            pub: event('topic12_2a', 1, 'hello12_2a'),
            subscribingQos: 1
          },
          {
            clientId: undefined,
            comment: networkIssueCommentPrefix + ' [qos: 2]',
            pub: event('topic12_3a', 2, 'hello12_3a'),
            subscribingQos: 2
          },
          {
            clientId: 'mqttcooltest-client-12_1b',
            comment: networkIssueCommentForDedicatedPrefix + ' [qos: 0]',
            pub: event('topic12_1b', 0, 'hello12_1b'),
            subscribingQos: 0
          },
          {
            clientId: 'mqttcooltest-client-12_2b',
            comment: networkIssueCommentForDedicatedPrefix + ' [qos: 1]',
            pub: event('topic12_2b', 1, 'hello12_2b'),
            subscribingQos: 1
          },
          {
            clientId: 'mqttcooltest-client-12_3b',
            comment: networkIssueCommentForDedicatedPrefix + ' [qos: 2]',
            pub: event('topic12_3b', 2, 'hello12_3b'),
            subscribingQos: 2
          }
        ];
      });

      asyncTest(15, ' when previous acknowledged dedicated subscription still '
        + 'continue to work, in the case of clean session set to false, after '
        + 'a reconnection due to ', function(async, data) {
        mqttClient = session.createClient('default', data.clientId);
        var listener = {
          onSubscribed: function() { }
        };
        track(listener);

        var subscriptionCounter = 0;
        var activeSubs;
        mqttClient._setProtocolListener({
          onSubAckProcessed: function(packetId) {
            subscriptionCounter++;
            if (subscriptionCounter == 1) {
              asyncMatcher(async, 'onSubscribed() should  have been invoked',
                listener.onSubscribed).isInvoked();

              activeSubs = mqttClient._getActiveSubscriptions();
              asyncMatcher(async, 'The Subscription Store should be empty',
                activeSubs).isOfLength(0);

              // Start the issue.
              data.issue(scenarioHandler);
            } else if (subscriptionCounter > 1) {
              async.fail('Should not have been subscribed');
            }
          },

          onPublishProcessed: function(packet) {
            delay(function() {
              var packetId = packet.body['packetId'];
              var qos = packet.body['message']['qos'];
              if (qos == 1) {
                scenarioHandler.puback(data.clientId, packetId);
              } else if (qos == 2) {
                scenarioHandler.pubrel(data.clientId, packetId);
              }
            }, 100);
          }
        });

        mqttClient.onReconnectionStart = function() {
          mqttClient.onReconnectionStart = null;
          //networkRecovery(scenarioHandler);
          data.recovery(scenarioHandler);
        };

        mqttClient.onReconnectionComplete = function() {
          checkFinalState(async, data.clientId);

          // Start a publishing client to verify that the previous
          // subscription still works as expected.
          startPublishing(async, null, data);
        };

        mqttClient.onMessageArrived = function(msg) {
          asyncMatcher(async, 'Message should be as expected', msg)
            .isEqual(data.pub);
          mqttClient.disconnect();
        };

        mqttClient.onConnectionLost = function(responseObj) {
          if (responseObj.errorCode == 0) {
            async.done();
          } else {
            async.fail(responseObj.errorMessage);
          }
        };

        mqttClient.connect({
          cleanSession: false,
          onSuccess: function() {
            mqttClient.subscribe(data.pub.destinationName, {
              qos: data.subscribingQos,
              onSuccess: function(rc) {
                listener.onSubscribed(rc);
              }
            });
          }
        });

      }, function() {
        return [
          {
            clientId: 'mqttcooltest-client-13_1a',
            comment: ' MQTT.Cool server crash [qos: 0]',
            pub: event('topic13_1a', 0, 'hello13_1a'),
            subscribingQos: 0,
            issue: serverCrash,
            recovery: serverRecovery,
          },
          {
            clientId: 'mqttcooltest-client-13_2a',
            comment: ' MQTT.Cool server crash [qos: 1]',
            pub: event('topic13_2a', 1, 'hello13_2a'),
            subscribingQos: 1,
            issue: serverCrash,
            recovery: serverRecovery
          },
          {
            clientId: 'mqttcooltest-client-13_3a',
            comment: ' MQTT.Cool server crash [qos: 2]',
            pub: event('topic13_3a', 2, 'hello13_3a'),
            subscribingQos: 2,
            issue: serverCrash,
            recovery: serverRecovery
          },
          {
            clientId: 'mqttcooltest-client-13_1b',
            comment: ' temporary network issues [qos: 0]',
            pub: event('topic13_1b', 0, 'hello13_1b'),
            subscribingQos: 0,
            issue: networkIssue,
            recovery: networkRecovery
          },
          {
            clientId: 'mqttcooltest-client-13_2b',
            comment: ' temporary network issues [qos: 1]',
            pub: event('topic13_2b', 1, 'hello13_2b'),
            subscribingQos: 1,
            issue: networkIssue,
            recovery: networkRecovery
          },
          {
            clientId: 'mqttcooltest-client-13_3b',
            comment: ' temporary network issues [qos: 2]',
            pub: event('topic13_3b', 2, 'hello13_3b'),
            subscribingQos: 2,
            issue: networkIssue,
            recovery: networkRecovery,
          }
        ];
      });

      xasyncTest(16, 'when onMessageArrived() callback is invoked in the case '
        + 'of dedicated connection for QoS 1 messages, and pending PUBACK is '
        + 'not delivered because of interruption between client and server',
      function(async, data) {
        data.subscribingQos = 1;
        mqttClient = session.createClient('default', data.clientId);
        var listener = {
          onMessageArrived: function() { }
        };
        track(listener);

        var publishProcessedEventCounter = 0;
        var publishReceivedEventCounter = 0;
        // Cache the published packet, to be used later while simulating
        // the connection recovery.
        var publishedPacket = null;
        mqttClient._setProtocolListener({
          onSubscribe: function(subPacket) {
            var packetId = subPacket.body['packetId'];
            var qos = subPacket.body['qos'];
            scenarioHandler.suback(data.clientId, packetId, qos);
          },

          onPublishReceived: function(packet) {
            publishReceivedEventCounter++;
            if (publishReceivedEventCounter == 1) {
              networkIssue(scenarioHandler);
            } else {
              //func();
            }
          },

          onPublishProcessed: function(packet) {
            publishProcessedEventCounter++;

            if (publishProcessedEventCounter == 1) {
              publishedPacket = packet;
              asyncMatcher(async, '"onMessageArrived" should have been ' +
                    'invoked', listener.onMessageArrived)
                .isInvoked().with(data.pub);

              asyncMatcher(async, 'The internal sent messages table ' +
                    'should be empty', mqttClient._getSent()).isOfLength(0);

              // Check the Store.
              asyncMatcher(async, 'The Store should be empty',
                mqttClient._getStore().size()).is(0);

              asyncMatcher(async, 'The message queue should be empty',
                mqttClient._getMessageQueueSize()).is(0);
            } else if (publishProcessedEventCounter == 2) {
              asyncMatcher(async, '"onMessageArrived" should have been ' +
                    'invoked', listener.onMessageArrived).isInvoked();

              asyncMatcher(async, 'Should be a duplicate',
                packet.body['message']['duplicate']).is(true);

              setTimeout(function() {
                checkFinalState(async, data.clientId);
                async.done();
              }, 500);
            }
          }
        });

        mqttClient.onReconnectionStart = function() {
          mqttClient.onReconnectionStart = null;
          networkRecovery(scenarioHandler, function() {
            if (Scenario.isInt()) {
              return;
            }
            // Prepare the modified message to be send while simulating
            // the connection recovery.
            var message = publishedPacket.body['message'];
            message['duplicate'] = true;
            var m = Json.decodeMessageFromJson(message);
            scenarioHandler.publish(data.clientId,
              publishedPacket.body['packetId'], m);
          });
        };

        mqttClient.onMessageArrived = function(message) {
          listener.onMessageArrived(message);
        };

        mqttClient.connect({
          cleanSession: false,

          onSuccess: function() {
            mqttClient.subscribe(data.pub.destinationName, {
              qos: data.subscribingQos,

              onSuccess: function(rc) {
                asyncMatcher(async, 'onSuccess() should have been invoked',
                  rc.grantedQos).isEqual(data.subscribingQos);

                setTimeout(function() {
                  startPublishing(async, null, data);
                }, 500);
              }
            });
          }
        });

      }, function() {
        return [
          {
            clientId: 'mqttcooltest-client-14',
            pub: event('topic14', 1, 'hello14')
          }
        ];
      });

      xasyncTest(17, ' when onMessageArrived() callback is invoked in the case'
        + 'of dedicated connection, for QoS 2 messages and pending acks '
        + 'redelivered after a reconnection (integration only)',
      function(async, data) {
        if (!Scenario.isInt()) {
          async.done();
          return;
        }
        data.subscribingQos = 2;
        mqttClient = session.createClient('default', data.clientId);

        var listener = {
          onMessageArrived: function(message) { }
        };
        track(listener);

        mqttClient._setProtocolListener({
          onSubscribe: function(subPacket) {
            var packetId = subPacket.body['packetId'];
            var qos = subPacket.body['qos'];
            scenarioHandler.suback(data.clientId, packetId, qos);
          }
        });

        var publishProcessedEventCounter = 0;
        var pubRelEventCounter = 0;
        var canRecover = false;
        mqttClient._setProtocolListener({
          onSubscribe: function(subPacket) {
            var packetId = subPacket.body['packetId'];
            scenarioHandler.suback(data.clientId, packetId, 1);
          },

          onPublishProcessed: function(packet) {
            publishProcessedEventCounter++;
            if (publishProcessedEventCounter == 1) {
              // onMessageArrived() is not invoked because QoS is 2.
              asyncMatcher(async, '"onMessageArrived" should not have been '
                + 'invoked', listener.onMessageArrived).not.isInvoked();

              asyncMatcher(async, 'The internal sent messages table should be '
                + 'empty', mqttClient._getSent()).isOfLength(0);

              // Check the Store.
              asyncMatcher(async, 'The Store should contain 1 item',
                mqttClient._getStore().size()).is(1);
              var storedItem = mqttClient._getStore()
                ._getByPacketIdAndState(1, Store.ITEM_STATE['RECEIVED']);
              asyncMatcher(async, 'Should be a PUBLISH packet in RECEIVED '
                + 'state', storedItem.body['type']).is('PUBLISH');

              // Check the received table.
              asyncMatcher(async, 'The internal received messages table should '
                + 'contain 1 item',
              mqttClient._getReceived()).isOfLength(1);

              var packetId = packet.body['packetId'];
              var msg = mqttClient._getReceived()[packetId];
              asyncMatcher(async, 'Should be a PUBLISH packet',
                msg.body['type']).is('PUBLISH');

              // The PUBREC has been aborted because of the lost connectivity.
              asyncMatcher(async, 'The message queue should be empty',
                mqttClient._getMessageQueueSize()).is(0);

              canRecover = true;
              networkIssue(scenarioHandler);
            } else if (publishProcessedEventCounter == 2) {
              // Receive the message once again, as the PUBREC has aborted.
              // Client is not notified yet.
              asyncMatcher(async, '"onMessageArrived" should not have been '
                + 'invoked', listener.onMessageArrived).not.isInvoked();

              asyncMatcher(async, 'Should be a duplicate',
                packet.body['message']['duplicate']).is(true);
            }
          },

          onPubRelProcessed: function(packetId) {
            pubRelEventCounter++;
            if (pubRelEventCounter == 1) {
              asyncMatcher(async, '"onMessageArrived" should have been invoked',
                listener.onMessageArrived).isInvoked();

              asyncMatcher(async, 'The Store should be empty', mqttClient.
                _getStore().size()).is(0);
              asyncMatcher(async, 'The internal received messages table should '
                + 'be empty', mqttClient._getReceived()).isOfLength(0);
              asyncMatcher(async, 'The message queue should be empty',
                mqttClient._getMessageQueueSize()).is(0);
              canRecover = true;
              networkIssue(scenarioHandler);
            } else if (pubRelEventCounter == 2) {
              asyncMatcher(async, '"onMessageArrived" should not have been '
                + 'invoked', listener.onMessageArrived).not.isInvoked();
              setTimeout(function() {
                checkFinalState(async, data.clientId);
                async.done();
              }, 500);
            }
          }
        });

        mqttClient.onMessageArrived = function(message) {
          listener.onMessageArrived(message);
        };

        mqttClient.onReconnectionStart = function() {
          if (canRecover) {
            networkRecovery(scenarioHandler);
            canRecover = false;
          }
        };

        mqttClient.connect({
          cleanSession: false,

          onSuccess: function() {
            mqttClient.subscribe(data.pub.destinationName, {
              qos: data.subscribingQos,

              onSuccess: function(rc) {
                asyncMatcher(async, 'onSuccess() should have been invoked',
                  rc.grantedQos).isEqual(data.subscribingQos);
                setTimeout(function() {
                  startPublishing(async, null, data);
                }, 500);
              }
            });
          }
        });
      }, function() {
        return [
          {
            clientId: 'mqttcooltest-client-15',
            pub: event('topic15', 2, 'hello15')
          }
        ];
      });
    });

    function checkFinalState(async, clientId) {
      asyncMatcher(async, 'The internal sent messages table should be empty',
        mqttClient._getSent()).isOfLength(0);
      asyncMatcher(async, 'The internal received messages table should be '
        + 'empty', mqttClient._getReceived()).isOfLength(0);
      asyncMatcher(async, 'The message queue should be empty',
        mqttClient._getMessageQueueSize()).is(0);

      // In case of dedicated connection, the additional check is that the
      // store should be empty.
      if (clientId) {
        asyncMatcher(async, 'The Store should be empty',
          mqttClient._getStore().size()).is(0);
      }
    }
  });

  // Dedicated client with the only purpose of publishing message to
  // the MQTT Server.
  var publishingClient;

  /**
   * @param {object} async -
   * @param {Subscription} sub -
   * @param {object} data -
   */
  function startPublishing(async, sub, data) {
    // Create a dedicated client for publishing message to the MQTT broker.
    publishingClient = session.createClient('default',
      'mqttcooltest-publisher');

    publishingClient._setProtocolListener({
      onPublish: function(pub) {
        delay(function() {
          if (pub.body.message.qos > 0) {
            scenarioHandler.deliveryComplete(
              publishingClient._getConnectionId(), pub.body.packetId);
          }
        }, 500);
      }

    });

    publishingClient.connect({
      onSuccess: function() {
        // Send messages once connected.
        publishingClient.send(data.pub);
      }
    });

    publishingClient.onConnectionLost = function() {
      //async.fail(responseObj.errorMessage);
    };

    publishingClient.onMessageDelivered = function(msg) {
      if (!Scenario.isInt()) {
        // If there is only one shared subscription (as in this case),
        // MQTT.Cool subscribes to the topic with the original QoS.
        // Therefore, the arrived message cannot have a QoS greater than the
        // subscribed one. That's why here we manipulate the arrived QoS.
        msg.qos = Math.min(data.subscribingQos, msg.qos);
        if (data.clientId) {
          scenarioHandler.publish(data.clientId, 1, msg);
        } else {
          scenarioHandler.sharedPublish(sub, data.seq, msg);
        }
      }
    };

    publishingClient.onError = function(error) {
      async.fail(error);
    };
  }

  function event(topic, qos, payload) {
    var msg = new Message(payload);
    msg.destinationName = topic;
    msg.qos = qos;
    msg.retained = false;
    return msg;
  }
  return MqttClientImplTestSuite;
});

