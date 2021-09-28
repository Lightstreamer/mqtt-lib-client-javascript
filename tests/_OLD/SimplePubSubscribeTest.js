define(['AbstractTest', 'Inheritance', 'ASSERT', 'MqttExtender', 'Message'],
    function(AbstractTest, Inheritance, ASSERT, MqttExtender, Message) {
        var testLogger = AbstractTest.testLogger;

        var SimplePubSubscribeTest = function(message, subscriptionRequest) {
            this._callSuperConstructor(SimplePubSubscribeTest);
            this.testMessage = message;
            this.subscriptionRequest = subscriptionRequest;
        };

        SimplePubSubscribeTest.getInstances = function() {
            /* Prepare binary test message. */
            var binaryMsgs = [];
            for (var i = 0; i < 3; i++) {
                binaryMsgs[i] = new Message(new Uint8Array([1, 2, 3, 4]));
                binaryMsgs[i].destinationName = 'A/B';
                binaryMsgs[i].qos = i;
                binaryMsgs[i].retained = false;
            }

            /* Prepare text test message. */
            var textMessage = new Message('Text Messge');
            textMessage.destinationName = 'A/B';
            textMessage.qos = 0;
            textMessage.retained = false;

            return [
                // Testing subscription with QoS 0 against all possible delivered OoS
                new SimplePubSubscribeTest(binaryMsgs[0], { qos: 0, topicFilter: 'A/B' }),
                new SimplePubSubscribeTest(binaryMsgs[1], { qos: 0, topicFilter: 'A/B' }),
                new SimplePubSubscribeTest(binaryMsgs[2], { qos: 0, topicFilter: 'A/B' }),

                // Testing subscription with QoS 1 for subscription against all possible delivered OoS
                new SimplePubSubscribeTest(binaryMsgs[0], { qos: 1, topicFilter: 'A/B' }),
                new SimplePubSubscribeTest(binaryMsgs[1], { qos: 1, topicFilter: 'A/B' }),
                new SimplePubSubscribeTest(binaryMsgs[2], { qos: 1, topicFilter: 'A/B' }),

                // Testing subscription with QoS 2 for subscription against all possible delivered OoS
                new SimplePubSubscribeTest(binaryMsgs[0], { qos: 2, topicFilter: 'A/B' }),
                new SimplePubSubscribeTest(binaryMsgs[1], { qos: 2, topicFilter: 'A/B' }),
                new SimplePubSubscribeTest(binaryMsgs[2], { qos: 2, topicFilter: 'A/B' }),

                // Testing subscription with QoS 2 for subscription with wildcard against all possible delivered OoS
                new SimplePubSubscribeTest(binaryMsgs[0], { qos: 2, topicFilter: 'A/+' }),
                new SimplePubSubscribeTest(binaryMsgs[1], { qos: 2, topicFilter: 'A/+' }),
                new SimplePubSubscribeTest(binaryMsgs[2], { qos: 2, topicFilter: 'A/+' })
            ];


        };

        SimplePubSubscribeTest.prototype = {

            toString: function() {
                return '[SimplePubSubscribeTest]';
            },

            stop: function() {
                this.lsClient.disconnect();
                var self = this;

                // This pause is required in order to execute each single test in complete isolatio,
                // giving the Lightstreamer Server to unsubscribing from each item.

                setTimeout(function() {
                    self.end();
                }, 1500);

            },

            start: function() {
                this._callSuperMethod(SimplePubSubscribeTest, 'start');
                var that = this;
                this.lsClient = null;
                var testMessage = this.testMessage;
                var subrequest = this.subscriptionRequest;

                MqttExtender.createClientFactory('http://localhost:8080', '', '', {

                    onConnectionRetry: function(lsClient) {
                        ASSERT.fail('Attempting a connection retry');
                        that.stop();
                    },

                    onLsClient: function(lsClient) {
                        that.lsClient = lsClient;
                    },

                    onClientFactory: function(clientFactory) {
                        var receivingClient = clientFactory.createClient('default');

                        // Get a dedicated connection only to publish messages to the MQTT Broker.
                        var sendingClient = clientFactory.createClient('default', '1111');

                        sendingClient.onConnectionLost = function(responseObject) {
                            ASSERT.verifyValue('Sending client gracefully disconnected', 0, responseObject.errorCode);
                            that.stop();
                        };

                        receivingClient.onConnectionLost = function(responseObject) {
                            ASSERT.verifyValue('Receiving client gracefully disconnected', 0, responseObject.errorCode);
                            sendingClient.disconnect();
                        };

                        receivingClient.onMessageArrived = function(message) {
                            ASSERT.verifyNotNull('Message arrived', message);
                            ASSERT.verifyValue('Comparing destinations', testMessage.getDestinationName(), message.getDestinationName(), true);
                            ASSERT.verifyValue('Comparing contents', testMessage.getPayloadAsString(), message.getPayloadAsString(), true);
                            ASSERT.verifyValue('Comparing qos coherence between delivered and arrived', testMessage.getQos(), message.getQos(), function(qosDelivered, qosArrived) {
                                testLogger.info('QoS arrived ---> ' + qosArrived + ', QoS delivered ---> ' + qosDelivered);
                                return qosArrived <= qosDelivered;
                            });

                            ASSERT.verifyValue('Comparing qos coherence between subscribed and arrived', subrequest.qos, message.getQos(), function(qosSubscribed, qosArrived) {
                                testLogger.info('QoS arrived ---> ' + qosArrived + ', QoS subscribed ---> ' + qosSubscribed);
                                return qosArrived <= qosSubscribed;
                            });
                            receivingClient.disconnect();
                        };

                        receivingClient.connect({

                            onFailure: function(responseObject) {
                                ASSERT.fail('Connection error ---> ' + JSON.stringify(responseObject));
                                that.stop();
                            },

                            onSuccess: function() {
                                testLogger.info('Receiving Client Connected to the MQTT broker!');
                                testLogger.info('Suscribing...');
                                receivingClient.subscribe(subrequest.topicFilter, {

                                    qos: subrequest.qos,

                                    requestedMaxFrequency: 10,

                                    onSuccess: function(grantedQoS) {
                                        ASSERT.verifyValue('Subscription with Success', this.qos, grantedQoS, true);

                                        /* Prepare the connect options. */
                                        sendingClient.connect({

                                            onSuccess: function() {
                                                testLogger.info('Sending Client connected to the MQTT broker!');
                                                testLogger.info('Sending test message...');
                                                sendingClient.send(testMessage);
                                            }
                                        });
                                    },

                                    onFailure: function(errorCode) {
                                        ASSERT.fail('Subscription failure with error code ' + errorCode);
                                    }

                                });
                            }

                        });
                    }

                });
            }
        };

        Inheritance(SimplePubSubscribeTest, AbstractTest, true, true);
        return SimplePubSubscribeTest;

    });
