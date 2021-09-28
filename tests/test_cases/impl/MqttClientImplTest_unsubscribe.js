'use strict';
define(['Suites', 'LoggerManager', 'openSession', 'MqttClientImpl', 'Objects',
  'Message', 'Scenario'],
function(Suites, LoggerManager, openSession, MqttClientImpl, Objects, Message,
  Scenario) {

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

  // Uncomment the following to enable the skipping features.
  var xsuite = MqttClientImplTestSuite.xsuite;
  var xtest = MqttClientImplTestSuite.notest;
  var xasyncTest = MqttClientImplTestSuite.noasyncTest;

  var scenarioHandler = null;
  var session = null;
  var mqttClient = null;

  suite('Unsubscription tests', function() {

    suite('a. Test invalid unsubscribing parameters and illegal states',
      function() {
        before(function(async) {
          /*
           * For the purpose of this unit test, there is no need to
           * distinguish between a dedicated connection and a shared one.
           */
          var mockOnly = true;
          scenarioHandler = Scenario.setupConnack(0, function(serverAddress) {
            openSession(serverAddress, {
              onConnectionSuccess: function(mqttCoolSession) {
                session = mqttCoolSession;
                mqttClient = session.createClient('default', 'clientId');
                async.done();
              },

              onConnectionFailure: function(errType) {
                async.fail(errType);
              }
            });
          }, mockOnly);
        }, true);

        after(function(async) {
          setTimeout(function() {
            if (session) {
              session.close();
            }
            async.done();
          }, 1500);
        }, true);

        test(1, 'when unsubscribe() method cannot be invoked because the '
          + 'client is disconnected', function() {
          matcher('Should throw an exception for invalid state',
            function() {
              mqttClient.unsubscribe('topic', {});
            }).throws(new Error('Invalid state'));
        });

        asyncTest(2, 'when invoking unsubscribe() method supplying an invalid '
          + 'invalid topicFilter: ', function(async, data) {
          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Should throw an exception for invalid '
                + 'topicFilter',
              function() {
                mqttClient.unsubscribe(data);
              }).throws(new Error('Invalid [topicFilter] argument: <' + data
                + '>'));
              async.done();
            }
          });

        }, function() {
          return [
            { comment: '<1>', value: 1 },
            { comment: '<true>', value: true },
            { comment: '<{}>', value: {} },
            { comment: '<"a string>"', value: 'a string' },
            { comment: '<[1,2,3]>', value: [1, 2, 3] },
            { comment: '<undefined>', value: undefined },
            { comment: '<null>', value: null }];
        });

        asyncTest(3, 'when invoking unsubscribe() method supplying invalid '
          +  'unsubscribe options: ', function(async, data) {
          mqttClient.connect({
            onSuccess: function() {
              asyncMatcher(async, 'Should throw an exception for invalid '
                + 'callbacks', function() {
                mqttClient.unsubscribe('topicFilter', data.opt);
              }).throws(data.err);
              async.done();
            }
          });

        }, function() {
          return [
            {
              comment: '{ onSuccess: 1 }',
              opt: { onSuccess: 1 },
              err: new Error('Invalid [onSuccess] value: 1')
            },
            {
              comment: '{ onFailure: "hello" }',
              opt: { onFailure: 'hello' },
              err: new Error('Invalid [onFailure] value: hello')
            }];
        });
      });

    suite('b. Test onSuccess() callback', function() {
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

            onConnectionFailure: function(errType) {
              async.fail(errType);
            }
          });
        });
      }, true);

      after(function(async) {
        setTimeout(function() {
          if (session) {
            session.close();
          }
          async.done();
        }, 1500);
      }, true);

      asyncTest(4, 'when invoking unsubscribe() from a NOT subscribed '
        + 'topicFilter,', function(async, data) {
        mqttClient = session.createClient('default', data.clientId);

        mqttClient._setProtocolListener({
          onSharedUnsubscription: function(sub) {
            if (data.clientId) {
              async.fail('Should have not been called');
              return;
            }
            asyncMatcher(async, 'Should be undefined', sub).isUndefined();
          },

          onUnsubscribe: function(unsubPacket) {
            if (!data.clientId) {
              async.fail('Should have not been called');
              return;
            }

            asyncMatcher(async, 'The internal sent messages table should '
              + 'contain 1 item', mqttClient._getSent()).isOfLength(1);

            var sent = mqttClient._getSent();
            var packetId = unsubPacket.body['packetId'];
            asyncMatcher(async, 'Should be a UNSUBSCRIBE packet',
              sent[packetId].body.type).is('UNSUBSCRIBE');

            asyncMatcher(async, 'The internal received messages table should '
              + 'be empty', mqttClient._getReceived()).isOfLength(0);

            asyncMatcher(async, 'The message queue should contain 1 item',
              mqttClient._getMessageQueueSize()).is(1);

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'Should be a UNSUBSCRIBE packet',
              queue[0].body['type']).is('UNSUBSCRIBE');

            asyncMatcher(async, 'Should be the same packet', queue[0])
              .is(sent[packetId]);

            asyncMatcher(async, 'Should be the same packet', unsubPacket)
              .is(queue[0]);

            asyncMatcher(async, 'Should not be any source subscribe packet',
              unsubPacket['sourceSubPacket']).isUndefined();

            setTimeout(function() {
              scenarioHandler.unsuback(data.clientId, packetId);
            }, 500);
          }
        });

        mqttClient.connect({
          onSuccess: function() {
            mqttClient.unsubscribe('topic', {
              onSuccess: function() {
                checkFinalState(async, data.clientId);
                async.done();
              }
            });
          }
        });
      }, function() {
        return [
          {
            comment: ' in case of shared connection',
            clientId: undefined
          },
          {
            comment: ' in case of dedicated connection',
            clientId: 'mqttcooltest-4'
          }
        ];
      });

      asyncTest(5, 'when invoking unsubscribe() from a subscribed topicFilter',
        function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          var onSharedUnsubscriptionInvoked = false;
          var listener = {
            onSharedSubscription: function(subscription) {
              setTimeout(function() {
                scenarioHandler.sharedSuback(subscription, 0);
              }, 500);

            },

            onSubscribe: function(subPacket) {
              setTimeout(function() {
                scenarioHandler.suback(data.clientId,
                  subPacket.body.packetId);
              }, 500);
            },

            onSharedUnsubscription: function(sharedSubscription) {
              asyncMatcher(async, 'The Shared Subscription is NOT undefined',
                sharedSubscription).not.is(undefined);
              asyncMatcher(async, 'The Shared Subscription is NOT null',
                sharedSubscription).not.is(null);
              onSharedUnsubscriptionInvoked = true;
            },

            onUnsubscribe: function(unsubPacket) {
              asyncMatcher(async, 'The internal sent messages table should '
                + 'contain 1 item', mqttClient._getSent()).isOfLength(1);

              var sent = mqttClient._getSent();
              var packetId = unsubPacket.body['packetId'];
              asyncMatcher(async, 'Should be a UNSUBSCRIBE packet',
                sent[packetId].body.type).is('UNSUBSCRIBE');

              asyncMatcher(async, 'The internal received messages table '
                + 'should be empty', mqttClient._getReceived()).isOfLength(0);

              asyncMatcher(async, 'The message queue should contain 1 item',
                mqttClient._getMessageQueueSize()).is(1);

              var queue = mqttClient._getMessageQueue();
              asyncMatcher(async, 'Should be a UNSUBSCRIBE packet',
                queue[0].body['type']).is('UNSUBSCRIBE');

              asyncMatcher(async, 'Should be the same packet', queue[0])
                .is(sent[packetId]);

              asyncMatcher(async, 'Should be the same packet', unsubPacket)
                .is(queue[0]);

              setTimeout(function() {
                scenarioHandler.unsuback(data.clientId, packetId);
              }, 500);
            }
          };
          track(listener);

          mqttClient._setProtocolListener(listener);

          mqttClient.connect({
            cleanSession: data.cleanSession,
            onSuccess: function() {
              // Subscribe upon successful connection.
              subscribe();
            }
          });

          function subscribe() {
            setTimeout(function() {
              mqttClient.subscribe('topicFilter', {
                onSuccess: function(rc) {
                  // Unsubscribe upon successful subscription.
                  unsubscribe();
                }
              });
            }, 500);
          }

          function unsubscribe() {
            setTimeout(function() {
              mqttClient.unsubscribe('topicFilter', {
                onSuccess: function() {
                  if (!data.clientId) {
                    asyncMatcher(async, 'onSharedUnsubscription should have '
                      + 'been invoked', onSharedUnsubscriptionInvoked).is(true);
                  }
                  checkFinalState(async, data.clientId);
                  async.done();
                }
              });
            }, 500);
          }
        }, function() {
          return [
            {
              comment: ' in case of shared connection',
              clientId: undefined,
              cleanSession: true // just to avoid invalid state exception
            },
            {
              comment: ' in case of dedicated connection and cleanSession set '
                + 'to false',
              clientId: 'mqttcooltest-5_1',
              cleanSession: false
            },
            {
              comment: ' in case of dedicated connection and cleanSession set '
                + 'to true',
              clientId: 'mqttcooltest-5_2',
              cleanSession: true
            }
          ];
        });

      asyncTest(6, 'when invoking subscribe()-subscribe()-unsubscribe()',
        function(async, data) {
          mqttClient = session.createClient('default');

          mqttClient.connect({
            onSuccess: subSubUnsub
          });

          function subSubUnsub() {
            var subscribedOnce = false, subscribedTwice = false;
            mqttClient.subscribe('topicFilter', {
              onSuccess: function(rc) {
                subscribedOnce = true;
              }
            });
            mqttClient.subscribe('topicFilter', {
              onSuccess: function(rc) {
                subscribedTwice = true;
              }
            });
            mqttClient.unsubscribe('topicFilter', {
              onSuccess: function() {
                asyncMatcher(async, 'Subscribed once', subscribedOnce).isEqual(true);
                asyncMatcher(async, 'Subscribed twice', subscribedTwice).isEqual(true);
                checkFinalState(async);
                async.done();
              }
            });
          }
        });

      asyncTest(7, 'when invoking subscribe()-async unsubscribe()',
        function(async, data) {
          mqttClient = session.createClient('default');

          mqttClient.connect({
            onSuccess: subAsyncUnsub
          });

          function subAsyncUnsub() {
            mqttClient.subscribe('topicFilter', {
              onSuccess: function(rc) {
                mqttClient.unsubscribe('topicFilter', {
                  onSuccess: function() {
                    checkFinalState(async);
                    async.done();
                  }
                });
              }
            });
          }
        });

      asyncTest(8, 'when invoking subscribe()-async unsubscribe()-async subscribe',
        function(async, data) {
          mqttClient = session.createClient('default');

          mqttClient.connect({
            onSuccess: subAsyncUnsub
          });

          function subAsyncUnsub() {
            mqttClient.subscribe('topicFilter', {
              onSuccess: function(rc) {
                mqttClient.unsubscribe('topicFilter', {
                  onSuccess: function() {
                    mqttClient.subscribe('topicFilter', {
                      onSuccess: function() {
                        async.done();
                      }
                    });
                  }
                });
              }
            });
          }
        });

      asyncTest(9, 'when invoking subscribe()-async subscribe() & unsubscribe()',
        function(async, data) {
          mqttClient = session.createClient('default');

          mqttClient.connect({
            onSuccess: subscribeAsyncSubscribeAndUnsubscribe
          });

          function subscribeAsyncSubscribeAndUnsubscribe() {
            var subscribed = false;
            mqttClient.subscribe('topicFilter', {
              onSuccess: function(rc) {
                mqttClient.subscribe('topicFilter', {
                  onSuccess: function() {
                    subscribed = true;
                  }
                });
                mqttClient.unsubscribe('topicFilter', {
                  onSuccess: function() {
                    asyncMatcher(async, 'Subscribed yet', subscribed).isEqual(true);
                    async.done();
                  }
                });
              }
            });
          }
        });

    });
  });

  function checkFinalState(async, clientId) {
    asyncMatcher(async, 'The internal sent messages table should be empty',
      mqttClient._getSent()).isOfLength(0);
    asyncMatcher(async, 'The internal received messages table should be empty',
      mqttClient._getReceived()).isOfLength(0);
    asyncMatcher(async, 'The message queue should be empty',
      mqttClient._getMessageQueueSize()).is(0);
    asyncMatcher(async, 'The Shared Subscription Store be empty',
      mqttClient._getActiveSharedSubscriptions()).isOfLength(0);

    if (clientId) {
      // In case of dedicated connection, additional check is that the
      // store should be empty.
      asyncMatcher(async, 'The Store should be empty',
        mqttClient._getStore().size()).is(0);

    }
  }

  return MqttClientImplTestSuite;
});
