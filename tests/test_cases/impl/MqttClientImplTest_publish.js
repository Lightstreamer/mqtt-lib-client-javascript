'use strict';
define(['Suites', 'LightstreamerClient', 'LoggerManager', 'MqttClientImpl',
  'Store', 'Objects', 'Message', 'openSession', 'Scenario', 'DefaultStorage'],
function(Suites, LightstreamerClient, LoggerManager, MqttClientImpl, Store,
  Objects, Message, openSession, Scenario, DefaultStorage) {

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
   * A simple listener to catch connection events.
   */
  function ConnectionListener() { }

  ConnectionListener.prototype = {

    connected: function() { },

    notConnected: function() { },

    connectionLost: function() { },

    onReconnection: function() { }
  };

  /**
   * The MqttClient instance under test
   * @type {MqttClient}
   */
  var mqttClient = null;

  /**
   * The selected scenario handler for connection
   * @type {Scenario}
   */
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
  var serverCrash =  function(sh, callback) {
    sh.stopMQTTCool(callback);
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
  var networkIssue =  function(sh, callback) {
    sh.networkIssue(callback);
  };

  /**
   * Trigger a network recovery.
   * @param {*} sh the scenario handler
   */
  var networkRecovery = function(sh, callback) {
    sh.recoverConnection(callback);
  };

  suite('Publishing tests', function() {
    var invalidArgumentException = new Error('Invalid argument');
    suite('a. Test invalid publishing parameters and illegal states',
      function() {

        beforeSuite(function(async) {
          Scenario.restartServices(function() {
            async.done();
          });
        }, true);

        before(function(async) {
          // For the purpose of this unit test, there is no need to
          // distinguish between a dedicated connection and a shared one.
          Scenario.setupConnack(0, function(serverAddress, handle) {
            scenarioHandler = handle;

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

        asyncTest(1, 'when invoking send() method supplying invalid arguments',
          function(async, data) {
            mqttClient.connect({
              onSuccess: function() {
                asyncMatcher(async, 'Should throw an exception for invalid '
                  + 'arguments',
                function() {
                  if (data.arg === 'No argument') {
                    mqttClient.send();
                  } else {
                    mqttClient.send(data.arg);
                  }

                }).throws(data.err);
                checkFinalState(async);
                async.done();
              }
            });

          }, function() {
            return [
              {
                arg: 'No argument', err: new Error('Invalid arguments length')
              },
              { arg: undefined, err: invalidArgumentException },
              { arg: 'string', err: invalidArgumentException },
              { arg: 1, err: invalidArgumentException },
              {
                arg: new Message('noTopic'),
                err: new Error('Invalid [destinationName] argument')
              }
            ];
          });

        test(2, 'when send() method cannot be invoked because the client is'
          + ' disconnected',
        function() {
          matcher('Should throw an exception for invalid state',
            function() {
              mqttClient.send();
            }).throws(new Error('Invalid state'));
          checkSyncFinalState();
        });
      }
    );

    suite('b. Test message delivery', function() {
      beforeSuite(function(async) {
        Scenario.restartServices(function() {
          async.done();
        });
      }, true);

      before(function(async) {
        // Clear the localStorage.
        new DefaultStorage().clearAll();

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
      }, true);

      after(function() {
        if (session) {
          session.close();
        }
      });

      asyncTest(3, 'when onMessageDelivered() callback is invoked upon calling '
         + 'calling the send() method passing a message with QoS = 0 ',
      function(async, data) {
        mqttClient = session.createClient('default', data.clientId);

        var expectedMessages = data.exp.length;
        var deliveredMessages = 0;

        mqttClient.onMessageNotAuthorized = function() {
          async.fail();
        };

        mqttClient._setProtocolListener({
          beforePublishing: function(packet) {
            var packetId = packet.body.packetId;
            asyncMatcher(async, 'Packet id should be null', packetId).is(null);
          }
        });

        mqttClient.onMessageDelivered = function(msg) {
          asyncMatcher(async, 'Delivered message should be equal to the '
            + 'expected one', msg).isEqual(data.exp[deliveredMessages]);
          deliveredMessages++;
          if (deliveredMessages == expectedMessages) {
            // Post-pone final check, as internal structures are empty out
            // only after exiting the onMessageDelivered() callback.
            setTimeout(function() {
              checkFinalState(async);
              async.done();
            }, 200);
          }
        };

        mqttClient.onMessageNotAuthorized = function() {
          async.fail('Should not have been invoked');
        };

        mqttClient.connect({
          onSuccess: function() {
            data.args.forEach(function(args) {
              Objects.invoke(mqttClient, 'send', args);
            });
          },

          onFailure: function() {
            async.fail();
          },

          onNotAuthorized: function() {
            async.fail();
          }
        });
      }, function() {
        // Prepare arguments to send() method, without specifying the QoS,
        // which has a default value of 0.
        var send_params1 = ['cool/topic', 'test1'];
        // Prepare the expected delivered Message instance.
        var expectedDelivered1 = new Message('test1');
        expectedDelivered1.destinationName = 'cool/topic';

        // Prepare arguments to send() method, this time also specifying the
        // default value of QoS.
        var send_params2 = ['cool/topic', 'test2', 0];
        // Prepare the expected delivered Message instance.
        var expectedDelivered2 = new Message('test2');
        expectedDelivered2.destinationName = 'cool/topic';

        // Prepare unique argument to send() method: a Message instance.
        // In this case, the delivered instance is expected to be the same
        // as the delivered one.
        var toDeliver3 = new Message('test3');
        toDeliver3.destinationName = 'cool/topic';

        var toDeliver4 = new Message('test4');
        toDeliver4.destinationName = 'cool/topic';

        return [
          {
            comment: 'through separate topic and payload arguments, in a '
              +  'shared shared connection.',
            clientId: undefined,
            args: [send_params1],
            exp: [expectedDelivered1]
          },
          {
            comment: 'through separate topic, payload and qos arguments to '
              + 'send multiple messages, in a shared connection.',
            clientId: undefined,
            args: [send_params1, send_params2],
            exp: [expectedDelivered1, expectedDelivered2]
          },
          {
            comment: 'through separate topic and payload arguments, in a '
              + 'dedicated connection.',
            clientId: 'mqttcooltest-client-3_1',
            args: [send_params1],
            exp: [expectedDelivered1]
          },
          {
            comment: 'through separate topic, payload and qos arguments to '
              + 'send multiple messages, in a dedicated connection.',
            clientId: 'mqttcooltest-client-3_2',
            args: [send_params1, send_params2],
            exp: [expectedDelivered1, expectedDelivered2]
          },
          {
            comment: 'through a Message instance, in a shared connection.',
            clientId: undefined, args: [[toDeliver3]], exp: [toDeliver3]
          },
          {
            comment: 'through Message instances, to send multiple messages in '
              + 'a shared connection.',
            clientId: undefined,
            args: [[toDeliver3], [toDeliver4]],
            exp: [toDeliver3, toDeliver4]
          },
          {
            comment: 'through a Message instance, in a dedicated connection.',
            clientId: 'mqttcooltest-client-3_3', args: [[toDeliver3]],
            exp: [toDeliver3]
          },
          {
            comment: 'through Message instances, to send multiple messages in, '
              + 'a dedicated connection.',
            clientId: 'mqttcooltest-client-3_4',
            args: [[toDeliver3], [toDeliver4]],
            exp: [toDeliver3, toDeliver4]
          }
        ];
      });

      asyncTest(4, 'when onMessageDelivered() callback is invoked upon calling '
        + 'the send() method passing a message with QoS > 0, in the case of '
        +  'shared connection', function(async, data) {
        mqttClient = session.createClient('default');

        var messageListener = {
          onMessage: function() { }
        };
        track(messageListener);

        mqttClient.onMessageDelivered = function(msg) {
          messageListener.onMessage(msg);
        };

        mqttClient._setProtocolListener({

          onPublish: function(packet) {
            scenarioHandler.deliveryComplete(mqttClient._getConnectionId(),
              packet.body.packetId);
          },

          onDeliveryCompleteReceived: function(packetId) {
            asyncMatcher(async, 'onMessageDelivered() should not have been '
            + ' invoked before receiving an ack',
            messageListener.onMessage).not.isInvoked();

            asyncMatcher(async, 'The internal sent messages should contain one '
              + 'item', mqttClient._getSent()).isOfLength(1);

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'The message queue should contain 1 item',
              queue.length).is(1);

            asyncMatcher(async, 'Should be a PUBLISH packet',
              queue[0].body.type).is('PUBLISH');

            asyncMatcher(async, '"packetId" should be as expected',
              queue[0].body.packetId).is(packetId);

            asyncMatcher(async, 'Packets should be the same',
              queue[0]).is(mqttClient._getSent()[packetId]);
          },

          onDeliveryCompleteProcessed: function(packetId) {
            asyncMatcher(async, 'onMessageDelivered() should have been invoked '
              + 'after receiving an ack', messageListener.onMessage)
              .isInvoked().with(data.exp);

            setTimeout(function() {
              checkFinalState(async);
              async.done();
            }, 200);
          }
        });

        // Upon success connection, invokes send() with parameters supplied
        // by the 'data' argument.
        mqttClient.connect({
          onSuccess: function() {
            Objects.invoke(mqttClient, 'send', data.args);
          }
        });
      }, function() {
        // Preparing test input data as array of parameters (QoS1).
        var send_params1 = ['cool/topic', 'Message with QoS 1', 1];
        // The expected result is a Message instance
        var expDelivered1 = new Message('Message with QoS 1');
        expDelivered1.destinationName = 'cool/topic';
        expDelivered1.qos = 1;

        // Preparing test input data as array of parameters (QoS2).
        var send_params2 = ['cool/topic', 'Message with QoS 2', 2];
        // The expected result is a Message instance
        var expDelivered2 = new Message('Message with QoS 2');
        expDelivered2.destinationName = 'cool/topic';
        expDelivered2.qos = 2;

        // Preparing test input data as a Message instance (QoS1).
        // No need to prepare corresponding result instance, as they must
        // match.
        var message3 = new Message('Message with QoS 1');
        message3.destinationName = 'cool/topic';
        message3.qos = 1;

        // Preparing test input data as a Message instance (QoS1).
        // No need to prepare corresponding result instance, as they must
        // match.
        var message4 = new Message('Message with QoS 2');
        message4.destinationName = 'cool/topic';
        message4.qos = 2;

        return [
          { args: send_params1, exp: expDelivered1 },
          { args: send_params2, exp: expDelivered2 },
          { args: [message3], exp: message3 },
          { args: [message4], exp: message4 }
        ];
      });

      asyncTest(5, 'when onMessageDelivered() callback is invoked upon calling '
        + 'the send() method passing a message with QoS = 1, in the case of '
        + 'dedicated connection', function(async, data) {
        mqttClient = session.createClient('default', data.clientId);

        var messageListener = {
          onMessage: function() { }
        };
        track(messageListener);

        mqttClient.onMessageDelivered = function(msg) {
          messageListener.onMessage(msg);
        };

        mqttClient._setProtocolListener({
          onPubAckReceived: function(packetId) {
            if (data.cleanSession) {
              async.fail('Should not have been invoked');
              return;
            }

            asyncMatcher(async, 'onMessageDelivered() should not have been '
              + 'invoked before receiving an ack',
            messageListener.onMessage).not.isInvoked();

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'The message queue should contain 1 item',
              queue.length).is(1);

            asyncMatcher(async, 'The internal sent messages should contain '
              + 'one item', mqttClient._getSent()).isOfLength(1);

            var packet = mqttClient._getSent()[packetId];

            asyncMatcher(async, 'Should be a PUBLISH packet',
              packet.body.type).is('PUBLISH');

            asyncMatcher(async, '"packetId" should be as expected',
              packet.body.packetId).is(packetId);

            asyncMatcher(async, 'Packets should be the same',
              queue[0]).is(packet);

            asyncMatcher(async, 'The size of the store should be 1',
              mqttClient._getStore().size()).is(1);

            var sent = mqttClient._getStore()._getByPacketIdAndState(1,
              Store.ITEM_STATE.SENT);
            asyncMatcher(async, 'The Store should contain a PUBLISH packet',
              sent.body.type).is('PUBLISH');
          },

          onPublish: function(packet) {
            var packetId = packet.body.packetId;
            if (data.cleanSession) {
              scenarioHandler.deliveryComplete(
                mqttClient._getConnectionId(), packetId);
            } else {
              scenarioHandler.puback(data.clientId, packetId);
            }
          },

          onPubAckProcessed: function() {
            if (data.cleanSession) {
              async.fail('Should not have been invoked');
              return;
            }

            asyncMatcher(async, 'onMessageDelivered() should have been invoked '
            + 'invoked after receiving an ack', messageListener.onMessage)
              .isInvoked().with(data.exp);

            checkFinalState(async, data.clientId);
            async.done();
          },

          onDeliveryCompleteReceived: function(packetId) {
            if (!data.cleanSession) {
              async.fail('Should not have been invoked');
              return;
            }

            asyncMatcher(async, 'onMessageDelivered() should not have been '
              + 'invoked before receiving an ack',
            messageListener.onMessage).not.isInvoked();

            asyncMatcher(async, 'The internal sent messages should contain one '
              + 'item', mqttClient._getSent()).isOfLength(1);

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'The message queue should contain 1 item',
              queue.length).is(1);

            asyncMatcher(async, 'Should be a PUBLISH packet',
              queue[0].body.type).is('PUBLISH');

            asyncMatcher(async, '"packetId" should be as expected',
              queue[0].body.packetId).is(packetId);
          },

          onDeliveryCompleteProcessed: function() {
            if (!data.cleanSession) {
              async.fail('Should not have been invoked');
              return;
            }

            asyncMatcher(async, 'onMessageDelivered() should have been invoked '
              + 'after receiving an ack', messageListener.onMessage)
              .isInvoked().with(data.exp);

            checkFinalState(async, data.clientId);
            setTimeout(function() {
              async.done();
            }, 200);
          }
        });

        // Upon success connection, invokes send() with the parameters supplied
        // by the 'data' argument.
        mqttClient.connect({
          cleanSession: data.cleanSession,
          onSuccess: function() {
            Objects.invoke(mqttClient, 'send', data.args);
          }

        });

      }, function() {
        // Preparing test input data as array of parameters (QoS1).
        var message_params = ['cool/topic', 'Message with QoS 1', 1];
        // The expected result is a Message instance
        var expectedDelivered = new Message('Message with QoS 1');
        expectedDelivered.destinationName = 'cool/topic';
        expectedDelivered.qos = 1;

        // Preparing test input data as a Message instance (QoS1).
        // No need to prepare corresponding result instance, as they must
        // match.
        var message_instance = new Message('Message with QoS 1');
        message_instance.destinationName = 'cool/topic';
        message_instance.qos = 1;

        return [
          {
            clientId: 'mqttcooltest-client-5_1',
            comment: ' and clean session set to true (separate topic, ' +
                  'payload and qos arguments)',
            cleanSession: true,
            args: message_params,
            exp: expectedDelivered
          },
          {
            clientId: 'mqttcooltest-client-5_2',
            comment: ' and clean session set to false (separate topic, ' +
                  'payload and qos arguments)',
            cleanSession: false,
            args: message_params,
            exp: expectedDelivered
          },
          {
            clientId: 'mqttcooltest-client-5_3',
            comment: ' and clean session set to true (a single Message ' +
                  'instance)',
            cleanSession: true,
            args: [message_instance],
            exp: message_instance
          },
          {
            clientId: 'mqttcooltest-client-5_4',
            comment: ' and clean session set to false (a single Message ' +
                  'instance)',
            cleanSession: false,
            args: [message_instance],
            exp: message_instance
          }
        ];
      });

      asyncTest(6, 'when onMessageDelivered() callback is invoked upon ' +
        'calling the send() method passing a message with QoS = 2, in the ' +
        'case of dedicated connection', function(async, data) {
        mqttClient = session.createClient('default', data.clientId);

        var messageListener = {
          onMessage: function() { }
        };
        track(messageListener);

        mqttClient.onMessageDelivered = function(msg) {
          messageListener.onMessage(msg);
        };

        mqttClient._setProtocolListener({
          onPubRecReceived: function(packetId, internalProcess) {
            if (data.cleanSession) {
              async.fail('Should not have been invoked');
            }

            asyncMatcher(async, 'onMessageDelivered() should not have been '
              + 'invoked before receiving a PUBCOMP',
            messageListener.onMessage).not.isInvoked();

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'The message queue should contain 1 item',
              queue.length).is(1);

            asyncMatcher(async, 'The internal sent messages should contain '
              + 'one item', mqttClient._getSent()).isOfLength(1);

            var packet = mqttClient._getSent()[packetId];
            asyncMatcher(async, 'Should be a PUBLISH packet', packet.body.type)
              .is('PUBLISH');

            asyncMatcher(async, 'Packets should be the same', queue[0])
              .is(packet);

            asyncMatcher(async, 'The store should contain 1 item',
              mqttClient._getStore().size()).is(1);

            var storeItem = mqttClient._getStore().
              _getByPacketIdAndState(packetId, Store.ITEM_STATE.SENT);
            asyncMatcher(async, 'The Store should contain a sent item with the '
              + '"pubrecReceived" set to false',
            storeItem.pubrecReceived).is(false);

            internalProcess();
          },

          onPubRecProcessed: function(packetId) {
            if (data.cleanSession) {
              async.fail('Should not have been invoked');
            }

            asyncMatcher(async, 'onMessageDelivered() should not have been '
              + 'invoked before receiving a PUBCOMP',
            messageListener.onMessage).not.isInvoked();

            asyncMatcher(async, 'The size of the store should be 1',
              mqttClient._getStore().size()).is(1);

            var storeItem = mqttClient._getStore().
              _getByPacketIdAndState(1, Store.ITEM_STATE.SENT);
            asyncMatcher(async, 'The Store should contain a sent item with the '
              + '"pubrecReceived" set to true',
            storeItem.pubrecReceived).is(true);

            asyncMatcher(async, 'The internal sent messages should contain one '
              + 'item', mqttClient._getSent()).isOfLength(1);

            var packet = mqttClient._getSent()[packetId];
            asyncMatcher(async, 'Should be a PUBLISH packet', packet.body.type)
              .is('PUBLISH');

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'The message queue should contain 1 item',
              queue.length).is(1);

            asyncMatcher(async, 'Packets should be the same', queue[0])
              .is(packet);

            scenarioHandler.pubcomp(data.clientId, packetId);
          },

          onPublish: function(packet) {
            var packetId = packet.body.packetId;
            if (!data.cleanSession) {
              scenarioHandler.pubrec(data.clientId, packetId);
            } else {
              scenarioHandler.deliveryComplete(
                mqttClient._getConnectionId(), packetId);
            }
          },

          onPubCompProcessed: function() {
            if (data.cleanSession) {
              async.fail('Should not have been invoked');
            }

            asyncMatcher(async, 'onMessageDelivered() should have been invoked '
              + 'after receiving a PUBCOMP',
            messageListener.onMessage).isInvoked().with(data.exp);
            setTimeout(function() {
              checkFinalState(async, data.clientId);
              async.done();
            }, 200);
          },

          onDeliveryCompleteReceived: function(packetId) {
            if (!data.cleanSession) {
              async.fail('Should not have been invoked');
              return;
            }

            asyncMatcher(async, 'onMessageDelivered() should not have been '
              + 'invoked before receiving an ack',
            messageListener.onMessage).not.isInvoked();

            asyncMatcher(async, 'The internal sent messages should contain '
              + 'one item', mqttClient._getSent()).isOfLength(1);

            var queue = mqttClient._getMessageQueue();
            asyncMatcher(async, 'The message queue should contain 1 item',
              queue.length).is(1);

            asyncMatcher(async, 'Should be a PUBLISH packet',
              queue[0].body.type).is('PUBLISH');

            asyncMatcher(async, '"packetId" should be as expected',
              queue[0].body.packetId).is(packetId);
          },

          onDeliveryCompleteProcessed: function() {
            if (!data.cleanSession) {
              async.fail('Should not have been invoked');
              return;
            }

            asyncMatcher(async, 'onMessageDelivered() should have been invoked '
              + 'after receiving an ack', messageListener.onMessage).isInvoked()
              .with(data.exp);

            checkFinalState(async, data.clientId);
            setTimeout(function() {
              async.done();
            }, 200);
          }
        });

        // Upon success connection, invokes send() with the parameters
        // supplied by the 'data' argument.
        mqttClient.connect({
          cleanSession: data.cleanSession,

          onSuccess: function() {
            Objects.invoke(mqttClient, 'send', data.args);
          }
        });

      }, function() {
        // Preparing test input data as array of parameters (QoS2).
        var message_params = ['cool/topic', 'Message with QoS 2', 2];

        // The expected result is a Message instance.
        var expectedDelivered = new Message('Message with QoS 2');
        expectedDelivered.destinationName = 'cool/topic';
        expectedDelivered.qos = 2;

        // Preparing test input data as a Message instance (QoS1).
        // No need to prepare corresponding result instance, as they must
        // match.
        var message_instance = new Message('Message with QoS 2');
        message_instance.destinationName = 'cool/topic';
        message_instance.qos = 2;

        return [
          {
            clientId: 'mqttcooltest-client-6_1',
            comment: ' and clean session set to true (separate topic, payload '
              + 'and qos arguments)',
            cleanSession: true,
            args: message_params, exp: expectedDelivered
          },
          {
            clientId: 'mqttcooltest-client-6_2',
            comment: ' and clean session set to false (separate topic, payload '
              + 'and qos arguments)',
            cleanSession: false,
            args: message_params, exp: expectedDelivered
          },
          {
            clientId: 'mqttcooltest-client-6_3',
            comment: ' and clean session set to true (a single Message '
              + 'instance argument)',
            cleanSession: true,
            args: [message_instance], exp: message_instance
          },
          {
            clientId: 'mqttcooltest-client-6_4',
            comment: ' and clean session set to false (a single Message ' +
              'instance argument)',
            cleanSession: false,
            args: [message_instance], exp: message_instance
          }
        ];
      });

      asyncTest(7, 'when invoking send() method multiple times passing Message '
        + 'instance with QoS > 0, to check the order of notification ',
      function(async, data) {
        mqttClient = session.createClient('default', data.clientId);

        var delivered = [];
        mqttClient.onMessageDelivered = function(msg) {
          delivered.push(msg);
          if (delivered.length == data.messages.length) {
            asyncMatcher(async, 'Order of notification should be equal to the '
              + 'delivery one', delivered).isEqual(data.messages);

            // Give the opportunity to clear the internal state before checking.
            setTimeout(function() {
              checkFinalState(async, data.clientId);
              async.done();
            }, 100);
          }
        };

        mqttClient.onError = function(error) {
          async.fail(error);
        };

        mqttClient._setProtocolListener({

          onPubRecProcessed: function(packetId) {
            if (data.cleanSession) {
              async.fail('Should not have been invoked');
            }

            delay(function() {
              scenarioHandler.pubcomp(data.clientId, packetId);
            }, 100);
          },

          onPublish: function(packet) {
            var packetId = packet.body.packetId;
            var qos = packet.body.message.qos;
            if (!data.cleanSession) {
              if (qos == 1) {
                scenarioHandler.puback(data.clientId, packetId);
              } else if (qos == 2) {
                scenarioHandler.pubrec(data.clientId, packetId);
              }
            } else {
              scenarioHandler.deliveryComplete(
                mqttClient._getConnectionId(), packetId);
            }
          }
        });

        mqttClient.connect({

          cleanSession: data.cleanSession,

          onSuccess: function() {
            for (var m = 0; m < data.messages.length; m++) {
              var message = data.messages[m];
              mqttClient.send(message);
            }
          }
        });

      }, function() {
        var msg1 = new Message('QoS(1) msg 1');
        msg1.destinationName = 'cool/topic';
        msg1.qos = 1;

        var msg2 = new Message('QoS(1) msg 2');
        msg2.destinationName = 'cool/topic';
        msg2.qos = 1;

        var msg3 = new Message('QoS(1) msg 3');
        msg3.destinationName = 'cool/topic';
        msg3.qos = 1;

        var msg4 = new Message('QoS(2) msg 4');
        msg4.destinationName = 'cool/topic';
        msg4.qos = 2;

        var msg5 = new Message('QoS(2) msg 5');
        msg5.destinationName = 'cool/topic';
        msg5.qos = 2;

        var msg6 = new Message('QoS(2) msg 6');
        msg6.destinationName = 'cool/topic';
        msg6.qos = 2;
        return [
          {
            comment: ' in case of dedicated connection and clean session' +
                  ' set to true',
            cleanSession: true,
            clientId: 'mqttcooltest-client-7_1',
            messages: [msg1, msg2, msg3, msg4, msg5, msg6]
          },
          {
            comment: ' in case of dedicated connection and clean session' +
                  ' set to false',
            cleanSession: false,
            clientId: 'mqttcooltest-client-7_2',
            messages: [msg1, msg2, msg3, msg4, msg5, msg6]
          },
          {
            comment: ' in case of shared connection',
            cleanSession: true,
            clientId: undefined,
            messages: [msg1, msg2, msg3, msg4, msg5, msg6]
          }
        ];
      });

      asyncTest(8, 'when two separate client instances, using a shared '
        + 'connection, invoke send() method multiple times passing Message '
        + 'instance with QoS > 0, to check that each client manages its own '
        + 'packet identifiers.', function(async, data) {
        mqttClient = session.createClient('default');
        var mqttClient2 = session.createClient('default');

        var totalMessages = 0;
        function allMessagesSent() {
          totalMessages += 2;
          if (totalMessages == 4) {
            mqttClient2.disconnect();
            async.done();
          }
        }

        var deliveredByClient1 = [];
        var deliveredByClient2 = [];
        function messageDelivered(msg, delivered, expected) {
          delivered.push(msg);
          if (delivered.length == 2) {
            asyncMatcher(async, 'Delivered messages should be those expected',
              delivered).isEqual(expected);
            allMessagesSent();
          } else if (delivered.length > expected.length) {
            async.fail('More message than expected');
          }
        }

        mqttClient.onMessageDelivered = function(msg) {
          messageDelivered(msg, deliveredByClient1, data.client1);
        };

        mqttClient._setProtocolListener({
          onPublish: function(pubPacket) {
            delay(function() {
              scenarioHandler.deliveryComplete(
                mqttClient._getConnectionId(), pubPacket.body.packetId);

            }, 500);
          }
        });

        mqttClient.connect({
          onSuccess: function() {
            // First two messages are sent by client1.
            for (var m = 0; m < data.client1.length; m++) {
              mqttClient.send(data.client1[m]);
            }
          }
        });

        mqttClient2.onMessageDelivered = function(msg) {
          messageDelivered(msg, deliveredByClient2, data.client2);
        };

        mqttClient2._setProtocolListener({
          onPublish: function(pubPacket) {
            delay(function() {
              scenarioHandler.deliveryComplete(
                mqttClient2._getConnectionId(), pubPacket.body.packetId);
            }, 500);
          }
        });

        mqttClient2.connect({
          onSuccess: function() {
            // Second messages are sent by client2.
            for (var m = 0; m < data.client2.length; m++) {
              mqttClient2.send(data.client2[m]);
            }
          }
        });

      }, function() {
        var msg1 = new Message('QoS(1) msg from client1');
        msg1.destinationName = 'cool/topic';
        msg1.qos = 1;

        var msg2 = new Message('QoS(2) msg from client1');
        msg2.destinationName = 'cool/topic';
        msg2.qos = 2;

        var msg3 = new Message('QoS(1) msg from client2');
        msg3.destinationName = 'cool/topic';
        msg3.qos = 1;

        var msg4 = new Message('QoS(2) msg from client 2');
        msg4.destinationName = 'cool/topic';
        msg4.qos = 2;

        return [
          {
            client1: [msg1, msg2],
            client2: [msg1, msg2]
          }
        ];
      });
    });

    suite('c. Test unauthorized publishing', function() {
      beforeSuite(function(async) {
        Scenario.restartServices(function() {
          async.done();
        });
      }, true);

      before(function(async, testId, data) {
        Scenario.setupUnauthorizedPublishing(data.errorMessage,
          function(serverAddress, handler) {
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
      }, true);

      after(function() {
        if (session) {
          session.close();
        }
      });

      asyncTest(9, 'when onMessageNotAuthorized() callback is invoked ',
        function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          mqttClient.onMessageDelivered = function(msg) {
            if (data.msg.qos > 0) {
              async.fail('onMessageDelivered() should not have been invoked');
            } else {
              asyncMatcher(async, 'Message should be as expected', msg)
                .isEqual(data.msg);
            }
          };

          mqttClient.onMessageNotAuthorized =
              function(msg, responseObject) {
                asyncMatcher(async, 'Message should be as expected', msg)
                  .isEqual(data.msg);
                asyncMatcher(async, '', responseObject)
                  .isEqual(data.expectedResponse);
                async.done();
              };

          mqttClient.connect({
            onSuccess: function() {
              mqttClient.send(data.msg);
            },

            onFailure: function(responseObject) {
              async.fail(responseObject.errorMessage);
            }
          });

        }, function() {
          function prepareMessage(topic) {
            var messages = [];
            for (var qos = 0; qos < 3; qos++) {
              var buffer = new Uint8Array([1, 2, 3, 4]);
              var msg = new Message(buffer);
              msg.qos = qos;
              msg.destinationName = topic;
              messages.push(msg);
            }

            return messages;
          }

          var simpleDeniedMessages = prepareMessage('not_authorize');
          var notAuthorizedWitExceptionMessages =
              prepareMessage('not_authorize_with_exception');

          return [
            {
              comment: 'for a qos 0 Message, in case of shared connection with '
                + 'custom exception',
              clientId: undefined,
              msg: notAuthorizedWitExceptionMessages[0],
              exp: notAuthorizedWitExceptionMessages[0],
              errorMessage:
                  '{ "code":1, "message": "Publishing not allowed"}',

              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Publishing not allowed'
              }
            },
            {
              comment: 'for a qos 0 Message, in case of shared connection with '
                + 'unspecified exception',
              msg: simpleDeniedMessages[0],
              exp: simpleDeniedMessages[0]
            },
            {
              comment: 'for a qos 1 Message, in case of shared connection with '
                + 'custom exception',
              clientId: undefined,
              msg: notAuthorizedWitExceptionMessages[1],
              exp: notAuthorizedWitExceptionMessages[1],
              errorMessage:
                  '{ "code":1, "message": "Publishing not allowed"}',
              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Publishing not allowed'
              }
            },
            {
              comment: 'for a qos 1 Message, in case of shared connection with '
                + 'unspecified exception',
              clientId: undefined,
              msg: simpleDeniedMessages[1],
              exp: simpleDeniedMessages[1]
            },
            {
              comment: 'for a qos 2 Message, in case of shared connection with '
                + 'custom exception',
              clientId: undefined,
              msg: notAuthorizedWitExceptionMessages[2],
              exp: notAuthorizedWitExceptionMessages[2],
              errorMessage:
                  '{ "code":1, "message": "Publishing not allowed"}',
              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Publishing not allowed'
              }
            },
            {
              comment: 'for a qos 2 Message, in case of shared connection with '
                + 'unspecified exception',
              clientId: undefined,
              msg: simpleDeniedMessages[2],
              exp: simpleDeniedMessages[2]
            },
            {
              comment: 'for a qos 0 Message, in case of dedicated connection '
                + 'with custom exception',
              clientId: 'mqttcooltest-client',
              msg: notAuthorizedWitExceptionMessages[0],
              exp: notAuthorizedWitExceptionMessages[0],
              errorMessage:
                  '{ "code":1, "message": "Publishing not allowed"}',
              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Publishing not allowed'
              }
            },
            {
              comment: 'for a qos 0 Message, in case of dedicated connection ' +
                + 'with unspecified exception',
              clientId: 'mqttcooltest-client-9_1',
              msg: simpleDeniedMessages[0],
              exp: simpleDeniedMessages[0]
            },
            {
              comment: 'for a qos 1 Message, in case of dedicated connection '
                +  'with custom exception',
              clientId: 'mqttcooltest-client-9_2',
              msg: notAuthorizedWitExceptionMessages[1],
              exp: notAuthorizedWitExceptionMessages[1],
              errorMessage:
                  '{ "code":1, "message": "Publishing not allowed"}',
              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Publishing not allowed'
              }
            },
            {
              comment: 'for a qos 1 Message, in case of dedicated connection '
                +  'with unspecified exception',
              clientId: 'mqttcooltest-client-9_3',
              msg: simpleDeniedMessages[1],
              exp: simpleDeniedMessages[1]
            },
            {
              comment: 'for a qos 2 Message, in case of dedicated connection '
                + 'with custom exception',
              clientId: 'mqttcooltest-client-9_4',
              msg: notAuthorizedWitExceptionMessages[2],
              exp: notAuthorizedWitExceptionMessages[2],
              errorMessage:
                  '{ "code":1, "message": "Publishing not allowed"}',
              expectedResponse: {
                errorCode: 1,
                errorMessage: 'Publishing not allowed'
              }
            },
            {
              comment: 'for a qos 2 Message, in case of dedicated connection '
                +  'with unspecified exception',
              clientId: 'mqttcooltest-client-9_5',
              msg: simpleDeniedMessages[2],
              exp: simpleDeniedMessages[2]
            }
          ];
        });

    });

    suite('d. Test recovery of messages in case of reconnection',
      function() {
        var eventListener = null;
        before(function(async) {
          // Clear the localStorage.
          new DefaultStorage().clearAll();

          eventListener = {
            onMessage: function() { },
            onRecovery: function() { }
          };
          track(eventListener);

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
          setTimeout(function() {
            if (session) {
              session.close();
            }
            async.done();
          }, 1500);
        }, true);

        /**
           * @param {Object} async -
           * @param {MqttClient} client -
           * @param {number} items -
           * @param {number} expectedQos -
           * @private
           */
        function matchPublishFromTheQueue(async, client, items, expectedQos) {
          if (expectedQos == 0) {
            asyncMatcher(async, 'The internal sent messages should be empty',
              client._getSent()).isOfLength(0);
          } else {
            asyncMatcher(async, 'The internal sent messages should contain '
              + items + ' items', client._getSent()).isOfLength(items);
          }

          var queue = client._getMessageQueue();
          var sentMessages = client._getSent();
          asyncMatcher(async, 'The message queue should contain ' + items
            + ' items', queue.length).is(items);

          Object.keys(sentMessages).forEach(function(packetId) {
            var message = sentMessages[packetId];
            asyncMatcher(async, 'Should be a PUBLISH packet', message.body.type)
              .is('PUBLISH');

            /*asyncMatcher(async, 'The PUBLISH packet should not have been ' +
                  'processed', message.processed).is(0);*/
          });
        }

        asyncTest(10, 'when, in a shared connection, not acknowledged pending '
          + 'messages are recovered and then sent after a reconnection due to ',
        function(async, data) {
          mqttClient = session.createClient('default');

          mqttClient.onMessageDelivered = function(msg) {
            eventListener.onMessage(msg);
          };

          mqttClient.onReconnectionStart = function() {
            mqttClient.onReconnectionStart = null;
            mqttClient.send('cool/topic', 'message', data.qos);
            mqttClient.send('cool/topic', 'message2', data.qos);
            setTimeout(function() {
              if (data.qos == 0) {
                asyncMatcher(async, 'onMessageDelivered() should have been '
                  + 'invoked, even if the message has not been really '
                  + 'delivered to MQTT.Cool', eventListener.onMessage)
                  .isInvoked();
              } else {
                asyncMatcher(async, 'onMessageDelivered() should not have been '
                 + 'invoked', eventListener.onMessage).not.isInvoked();
              }

              matchPublishFromTheQueue(async, mqttClient, 2, data.qos);

              data.recovery(scenarioHandler, function() {
                if (Scenario.isInt()) {
                  return;
                }
                var connectionId = mqttClient._getConnectionId();
                if (data.qos > 0) {
                  scenarioHandler.deliveryComplete(connectionId, 1);
                  scenarioHandler.deliveryComplete(connectionId, 2);
                }
              });
            }, 500);
          };

          mqttClient.onReconnectionComplete = function() {
            eventListener.onRecovery();
            if (data.qos == 0) {
              setTimeout(function() {
                checkFinalState(async);
                async.done();
              }, 3500);
            }
          };

          if (data.qos > 0) {
            var deliverCompleteEventCount = 0;
            mqttClient._setProtocolListener({
              onDeliveryCompleteProcessed: function() {
                deliverCompleteEventCount++;
                if (deliverCompleteEventCount == 2) {
                  asyncMatcher(async, 'onMessageDelivered() should have been '
                    + 'invoked after reconnection',
                  eventListener.onMessage).isInvoked().times(2);
                  asyncMatcher(async, 'onReconnectionComplete should have been '
                    + 'invoked', eventListener.onRecovery).isInvoked();
                  checkFinalState(async);
                  async.done();
                }
              }
            });
          }

          mqttClient.connect({
            onSuccess: function() {
              // Start the issue, just before sending the messages
              data.issue(scenarioHandler);
            }
          });

        }, function() {
          return [
            { comment: 'MQTT.Cool server crash (Qos 0)', qos: 0,
              issue: serverCrash,
              recovery: serverRecovery
            },
            { comment: 'MQTT.Cool server crash (Qos 1)', qos: 1,
              issue: serverCrash,
              recovery: serverRecovery
            },
            { comment: 'MQTT.Cool server crash (Qos 2)', qos: 2,
              issue: serverCrash,
              recovery: serverRecovery
            },
            { comment: 'network issues (Qos 0)', qos: 0,
              issue: networkIssue,
              recovery: networkRecovery
            },
            { comment: 'network issues (Qos 1)', qos: 1,
              issue: networkIssue,
              recovery: networkRecovery
            },
            { comment: 'network issues (Qos 2)', qos: 2,
              issue: networkIssue,
              recovery: networkRecovery
            }
          ];
        });

        asyncTest(11, 'when QoS 0 pending messages are recovered and then sent '
          + 'after a reconnection due to ', function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          mqttClient.onMessageDelivered = function(msg) {
            eventListener.onMessage(msg);
          };

          mqttClient.onError = function(error) {
            async.fail(error);
          };

          mqttClient.onReconnectionStart = function() {
            mqttClient.onReconnectionStart = null;
            mqttClient.send('cool/topic_11', 'message11_1', 0);
            mqttClient.send('cool/topic_11', 'message11_2', 0);

            setTimeout(function() {
              asyncMatcher(async, 'onMessageDelivered() should have been '
                + 'invoked, even if the message has not been really delivered '
                + 'to MQTT.Cool', eventListener.onMessage).isInvoked();
              matchPublishFromTheQueue(async, mqttClient, 2, 0);
              data.recovery(scenarioHandler);
            }, 500);
          };

          mqttClient.onReconnectionComplete = function() {
            eventListener.onRecovery();
            setTimeout(function() {
              checkFinalState(async, data.clientId);
              async.done();
            }, 4000);
          };

          mqttClient.connect({
            cleanSession: data.cleanSession,

            onSuccess: function() {
              // Start an issue.
              data.issue(scenarioHandler);
            }
          });
        }, function() {
          return [
            {
              comment: 'network issues, in a dedicated connection with clean '
                + 'session set to true',
              clientId: 'mqttcooltest-client-11_1',
              cleanSession: true,
              issue: networkIssue,
              recovery: networkRecovery
            },
            {
              comment: 'network issues, in a dedicated connection with clean '
                + 'session set to false',
              clientId: 'mqttcooltest-client-11_2',
              cleanSession: false,
              issue: networkIssue,
              recovery: networkRecovery
            },
            {
              comment: 'MQTT.Cool server crash, in a dedicated connection with '
                + 'clean session set to true',
              clientId: 'mqttcooltest-client-11_3',
              cleanSession: true,
              issue: serverCrash,
              recovery: serverRecovery
              ,
            },
            {
              comment: 'MQTT.Cool server crash, in a dedicated connection with '
                + 'clean session set to false',
              clientId: 'mqttcooltest-client-11_4',
              cleanSession: false,
              issue: serverCrash,
              recovery: serverRecovery
            }
          ];
        });

        asyncTest(12, 'when not acknowledged QoS 1 pending messages are '
          + 'recovered and then sent after a reconnection due to  ',
        function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          mqttClient.onMessageDelivered = function(msg) {
            eventListener.onMessage(msg);
          };

          mqttClient.onReconnectionStart = function() {
            mqttClient.onReconnectionStart = null;
            mqttClient.send('cool/topic', 'message', 1);
            mqttClient.send('cool/topic', 'message1', 1);

            setTimeout(function() {
              asyncMatcher(async, 'onMessageDelivered() should not have been '
                + 'been invoked', eventListener.onMessage).not.isInvoked();

              matchPublishFromTheQueue(async, mqttClient, 2, 1);

              var connId = mqttClient._getConnectionId();
              data.recovery(scenarioHandler, function() {
                // PUBACK make sense only in the case of persistent session.
                if (!data.cleanSession) {
                  scenarioHandler.puback(data.clientId, 1);
                  scenarioHandler.puback(data.clientId, 2);
                } else {
                  scenarioHandler.deliveryComplete(connId, 1);
                  scenarioHandler.deliveryComplete(connId, 2);
                }
              });
            }, 500);
          };

          mqttClient.onReconnectionComplete = function() {
            eventListener.onRecovery();
          };

          var eventCounter = 0;
          mqttClient._setProtocolListener({
            onPubAckProcessed: function() {
              if (data.cleanSession) {
                async.fail('Should not have been invoked');
                return;
              }
              eventCounter++;
              if (eventCounter == 2) {
                asyncMatcher(async, 'onMessageDelivered() should have been '
                  + 'invoked after reconnection',
                eventListener.onMessage).isInvoked().times(2);
                asyncMatcher(async, 'onReconnectionComplete should have been '
                  + 'invoked', eventListener.onRecovery).isInvoked();
                checkFinalState(async, data.clientId);
                async.done();
              }
            },

            onDeliveryCompleteProcessed: function() {
              if (!data.cleanSession) {
                async.fail('Should not have been invoked');
                return;
              }
              eventCounter++;
              if (eventCounter == 2) {
                asyncMatcher(async, 'onMessageDelivered() should have been '
                  + 'invoked after reconnection',
                eventListener.onMessage).isInvoked().times(2);
                asyncMatcher(async, 'onReconnectionComplete should have been '
                  + 'invoked', eventListener.onRecovery).isInvoked();
                checkFinalState(async, data.clientId);
                async.done();
              }
            }
          });

          mqttClient.connect({
            cleanSession: data.cleanSession,
            onSuccess: function() {
              // Start an issue.
              data.issue(scenarioHandler);
            }
          });
        }, function() {
          return [
            {
              clientId: 'mqttcooltest-client-12_1',
              comment: 'MQTT.Cool server crash, in a dedicated connection with '
                + 'clean session set to true',
              cleanSession: true,
              issue: serverCrash,
              recovery: serverRecovery
            },
            {
              clientId: 'mqttcooltest-client-12_2',
              comment: 'MQTT.Cool server crash, in a dedicated connection with '
                + 'clean session set to false',
              cleanSession: false,
              issue: serverCrash,
              recovery: serverRecovery
            },
            {
              clientId: 'mqttcooltest-client-12_3',
              comment: 'network issues, in a dedicated connection with clean'
                + 'session set to true',
              cleanSession: true,
              issue: networkIssue,
              recovery: networkRecovery
            },
            {
              clientId: 'mqttcooltest-client-12_4',
              comment: 'network issues, in a dedicated connection with clean'
              + 'session set to false',
              cleanSession: false,
              issue: networkIssue,
              recovery: networkRecovery
            }
          ];
        });

        asyncTest(13, 'when not acknowledged QoS 2 pending messages are '
          + 'recovered and then sent after a reconnection due to ',
        function(async, data) {
          mqttClient = session.createClient('default', data.clientId);

          mqttClient.onMessageDelivered = function(msg) {
            eventListener.onMessage(msg);
          };

          var canRecover = true;
          var messageSent = false;
          mqttClient.onReconnectionStart = function() {
            if (!messageSent) {
              // Here we are sure to be in the middle of a network issue.
              // Very hard testing just after triggering networkIssue(), because
              // you can't establish exactly whether the message delivery
              // completes or not, and we want NOT!
              mqttClient.send('cool/topic', 'message', 2);
              messageSent = true; // To avoid message redelivery.
            }

            if (canRecover) {
              canRecover = false;
              asyncMatcher(async, 'onMessageDelivered() should not have been '
                + 'invoked', eventListener.onMessage).not.isInvoked();
              matchPublishFromTheQueue(async, mqttClient, 1, 2);
              data.recovery(scenarioHandler, function() {
                if (!data.cleanSession) {
                  scenarioHandler.pubrec(data.clientId, 1);
                } else {
                  var connId = mqttClient._getConnectionId();
                  scenarioHandler.deliveryComplete(connId, 1);
                }
              });
            }
          };

          mqttClient.onReconnectionComplete = function() {
            eventListener.onRecovery();
          };

          mqttClient.onError = function(exception) {
            async.fail(exception);
          };

          var onPubRecInvocations = 0;
          var onPubCompCount = 0;
          var onDeliveryCompletedEventCounter = 0;
          mqttClient._setProtocolListener({
            onPubRecReceived: function(packetId, internalProcess) {
              if (data.cleanSession) {
                async.fail('Should not have been invoked');
                return;
              }
              onPubRecInvocations++;

              // Start another network issue upon receiving the first ack.
              if (onPubRecInvocations == 1) {
                canRecover = true;
                data.issue(scenarioHandler, internalProcess);
                return;
              }

              // Simulate receiving a PUBCOMP upon second attempt to delivery
              // the message.
              if (onPubRecInvocations == 2) {
                internalProcess();
                delay(function() {
                  scenarioHandler.pubcomp(data.clientId, packetId);
                }, 500);
              }
            },

            onPubCompProcessed: function() {
              if (data.cleanSession) {
                async.fail('Should not have been invoked');
                return;
              }
              onPubCompCount++;
              asyncMatcher(async, 'onMessageDelivered() should have been '
                + 'invoked after reconnecting',
              eventListener.onMessage).isInvoked().times(1);

              // Invoke checkFinalState with a delay to let the PUBREL
              // packet to be removed from the message queue, so that the
              // latter results empty.
              setTimeout(function() {
                checkFinalState(async, data.clientId);
                async.done();
              }, 200);
            },

            onDeliveryCompleteProcessed: function() {
              if (!data.cleanSession) {
                async.fail('Should not have been invoked');
                return;
              }
              onDeliveryCompletedEventCounter++;
              if (onDeliveryCompletedEventCounter == 1) {
                // Invoke final checks with a delay to ensure that all expected
                // events get actually triggered.
                setTimeout(function() {
                  asyncMatcher(async, 'onMessageDelivered() should have been '
                    + 'invoked after reconnection',
                  eventListener.onMessage).isInvoked();
                  asyncMatcher(async, 'onReconnectionComplete() should have '
                    + 'been invoked', eventListener.onRecovery).isInvoked();
                  checkFinalState(async, data.clientId);
                  async.done();
                }, 1500);
              }
            }
          });

          mqttClient.connect({
            cleanSession: data.cleanSession,
            onSuccess: function() {
              // Start an  issue.
              data.issue(scenarioHandler);
            }
          });
        }, function() {
          return [
            {
              comment: 'MQTT.Cool server crash, in a dedicated connection with '
                + 'clean session set to true',
              cleanSession: true,
              clientId: 'mqttcooltest-client-13_1',
              issue: serverCrash,
              recovery: serverRecovery,
            },
            {
              comment: 'MQTT.Cool server crash, in a dedicated connection with '
                + 'clean session set to false',
              clientId: 'mqttcooltest-client-13_2',
              cleanSession: false,
              issue: serverCrash,
              recovery: serverRecovery,
            },
            {
              comment: 'network issues, in a dedicated connection with clean '
                + 'session set to true',
              cleanSession: true,
              clientId: 'mqttcooltest-client-13_3',
              issue: networkIssue,
              recovery: networkRecovery,
            },
            {
              comment: 'network issues, in a dedicated connection with clean '
                + 'session set to false',
              clientId: 'mqttcooltest-client-13_4',
              cleanSession: false,
              issue: networkIssue,
              recovery: networkRecovery,
            }
          ];
        });
      });

    suite('e. Test restoring of session', function() {
      var eventListener = null;

      before(function(async) {
        // Clear the localStorage.
        new DefaultStorage().clearAll();

        eventListener = {
          onMessage: function() { },
          onRecovery: function() { }
        };
        track(eventListener);

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

      after(function() {
        if (session) {
          session.close();
        }
      });

      asyncTest(14, 'when restoring the session after sending a not '
        + 'acknowledged QoS 1 message ', function(async) {
        var clientId = 'mqttcooltest-client_14';
        mqttClient = session.createClient('default', clientId);

        // Prepare the expected delivered message.
        var expectedMessageDelivered = new Message('message_14');
        expectedMessageDelivered.destinationName = 'topic_14';
        expectedMessageDelivered.qos = 1;
        expectedMessageDelivered._setDuplicate(true);

        mqttClient.onMessageDelivered = function() {
          async.fail('This client instance should not have been notified of '
            + ' of any message');
        };

        mqttClient.onError = function() {
          // Upon onError callback, another client will connect, using the same
          // clientId and keeping the clean session set to false, in order to
          // restore the previous session.
          setTimeout(function() {
            mqttClient = session.createClient('default', clientId);

            mqttClient.onMessageDelivered = function(msg) {
              asyncMatcher(async, 'The notified message should be as expected '
                + 'expected', msg).isEqual(expectedMessageDelivered);
              // Post-pone final check, as internal structures are empty out
              // only after exiting the onMessageDelivered() callback.
              setTimeout(function() {
                checkFinalState(async, clientId);
                async.done();
              }, 1000);
            };

            mqttClient._setProtocolListener({
              onConnAckReceived: function() {
                delay(function() {
                  scenarioHandler.puback(clientId, 1);
                }, 200);
              }
            });

            mqttClient.connect({
              cleanSession: false
            });
          }, 1000);
        };

        mqttClient._setProtocolListener({
          onConnAckReceived: function(connAck) {
            if (connAck['sessionPresent']) {
              async.fail('No session should be present');
            }
            delay(function() {
              scenarioHandler.puback(clientId, 1);
            }, 200);
          },

          onPubAckReceived: function() {
            // Upon receiving a PUBACK packet, throw an Error to interrupt this
            // session.
            throw new Error('Fake failure to interrupt the session');
          }
        });

        mqttClient.connect({
          cleanSession: false,
          onSuccess: function() {
            // The PUBLISH packet will be sent and a corresponding PUBACK
            // packet will be received.
            mqttClient.send('topic_14', 'message_14', 1);
          }
        });
      });

      asyncTest(15, 'when restoring the session after sending a not '
        + 'acknowledged QoS 2 message ', function(async) {
        var clientId = 'mqttcooltest-client_15';
        mqttClient = session.createClient('default', clientId);

        // Prepare the expected delivered message.
        var expectedMessageDelivered = new Message('message_15');
        expectedMessageDelivered.destinationName = 'topic_15';
        expectedMessageDelivered.qos = 2;
        expectedMessageDelivered._setDuplicate(true);

        mqttClient.onMessageDelivered = function() {
          async.fail('This client instance should not have been notified of '
            + 'of any message');
        };

        mqttClient.onError = function() {
          // Upon onError callback, another client will connect, using
          // the same clientId and keeping the cleanSession set to false,
          // in order to restore the previous session.
          setTimeout(function() {
            mqttClient = session.createClient('default', clientId);

            mqttClient.onMessageDelivered = function(msg) {
              asyncMatcher(async, 'The notified message should be as '
                + 'expected', msg).isEqual(expectedMessageDelivered);
              // Post-pone final check, as internal structures are empty out
              // only after exiting the onMessageDelivered() callback.
              setTimeout(function() {
                checkFinalState(async, clientId);
                async.done();
              }, 200);
            };

            mqttClient._setProtocolListener({
              onConnAckReceived: function(connAck) {
                delay(function() {
                  scenarioHandler.pubrec(clientId, 1);
                }, 200);
              },

              onPubRecProcessed: function() {
                delay(function() {
                  scenarioHandler.pubcomp(clientId, 1);
                }, 200);
              }
            });

            mqttClient.connect({ cleanSession: false  });
          }, 1000);

        };

        mqttClient._setProtocolListener({
          onConnAckReceived: function(connAck) {
            if (connAck['sessionPresent']) {
              async.fail('No session should be present');
            }
            delay(function() {
              scenarioHandler.pubrec(clientId, 1);
            }, 200);
          },

          onPubRecReceived: function() {
            // Upon receiving a PUBREC packet, throw an Error to interrupt
            // this session. This allows to test a session restore which
            // starts from a stored PUBLISH packet with the "pubrecReceived"
            // flag set to true, hence triggering the delivery of a
            // PUBREL as first packet.
            throw new Error('Fake failure to interrupt the session');
          }
        });

        mqttClient.connect({
          cleanSession: false,
          onSuccess: function() {
            // The PUBLISH packet will be sent and a corresponding PUBREC
            // packet will be received.
            mqttClient.send('topic_15', 'message_15', 2);
          }
        });
      });

    });

    function checkFinalState(async, clientId) {
      asyncMatcher(async, 'The internal sent messages table should be empty',
        mqttClient._getSent()).isOfLength(0);
      asyncMatcher(async, 'The internal message queue should be empty',
        mqttClient._getMessageQueueSize()).is(0);

      // In case of dedicated connection, additional check is that the
      // store should be empty.
      if (clientId) {
        asyncMatcher(async, 'The Store should be empty',
          mqttClient._getStore().size()).is(0);
      }
    }

    function checkSyncFinalState(clientId) {
      matcher('The internal sent messages table should be empty',
        mqttClient._getSent()).isOfLength(0);
      matcher('The internal message queue should be empty',
        mqttClient._getMessageQueueSize()).is(0);

      // In case of dedicated connection, additional check is that the
      // store should be empty.
      if (clientId) {
        matcher('The Store should be empty', mqttClient._getStore().size())
          .is(0);
      }
    }
  });

  return MqttClientImplTestSuite;
});