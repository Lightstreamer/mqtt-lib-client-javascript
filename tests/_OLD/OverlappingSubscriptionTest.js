define(['AbstractTest', 'Inheritance', 'ASSERT', 'MqttExtender', 'Message'],
    function(AbstractTest, Inheritance, ASSERT, MqttExtender, Message) {

        var testLogger = AbstractTest.testLogger;

        var OverlappingSubscriptionTest = function(message, subscriptionRequests) {
            this._callSuperConstructor(OverlappingSubscriptionTest);
            this.testMessage = message;
            this.subscriptionRequests = subscriptionRequests;
            this.maxQosSubscribed = 0;
            for (var i = 0; i < this.subscriptionRequests.length; i++) {
                this.maxQosSubscribed = Math.max(this.subscriptionRequests[i].qos, this.maxQosSubscribed);
            }
        };

        OverlappingSubscriptionTest.getInstances = function() {
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

            var topics = ['A/B', 'A/+', 'A/#'];

            var tests = [];
            for (var i = 0; i <= 2; i++) {
                for (var qos = 0; qos <= 2; qos++) {
                    for (var qos2 = 0; qos2 <= 2; qos2++) {
                        for (var qos3 = 0; qos3 <= 2; qos3++) {
                            var subscriptions = [];
                            subscriptions.push({ topicFilter: 'A/B', qos: qos });
                            subscriptions.push({ topicFilter: 'A/+', qos: qos2 });
                            subscriptions.push({ topicFilter: 'A/#', qos: qos3 });
                            tests.push(new OverlappingSubscriptionTest(binaryMsgs[i], subscriptions));
                        }
                    }
                }
            }
            return tests;
        };

        OverlappingSubscriptionTest.prototype = {

            toString: function() {
                return '[OverlappingSubscriptionTest]';
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
                this._callSuperMethod(OverlappingSubscriptionTest, 'start');
                var that = this;
                this.lsClient = null;
                var testMessage = this.testMessage;
                var subrequests = this.subscriptionRequests;

                var msgCounter = 0;
                var sentDisconnect = false;

                MqttExtender.createClientFactory('http://localhost:8080', '', '', {

                    onConnectionRetry: function(lsClient) {
                        ASSERT.fail('Attempting a connection retry');
                        that.stop();
                    },

                    onLsClient: function(lsClient) {
                        that.lsClient = lsClient;
                    },

                    onClientFactory: function(clientFactory) {
                        var notUnderTestClient = clientFactory.createClient('default');
                        notUnderTestClient.connect({
                            onSuccess: function() {
                                for (var s = 0; s < subrequests.length; s++) {
                                    notUnderTestClient.subscribe(subrequests[s].topicFilter, {

                                        qos: 2,

                                        onSuccess: function(grantedQos) {
                                            testLogger.info('Subscription with qos ' + grantedQos + ' with succes');
                                        }

                                    });
                                }
                            }
                        });

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
                            if (!sentDisconnect) {
                                sentDisconnect = true;
                                setTimeout(function() {
                                    ASSERT.verifyValue('Duplicated message have been skipped', msgCounter, 1, true);
                                    receivingClient.disconnect();
                                    notUnderTestClient.disconnect();
                                }, 500
                                );
                            };


                            ASSERT.verifyNotNull('Message arrived', message);
                            ASSERT.verifyValue('Comparing destinations', testMessage.getDestinationName(), message.getDestinationName(), true);
                            ASSERT.verifyValue('Comparing contents', testMessage.getPayloadAsString(), message.getPayloadAsString(), true);

                            var sentQos = testMessage.getQos();
                            var messageQos = message.getQos();

                            ASSERT.verifyValue('Comparing qos coherence between delivered[' + sentQos + '] and arrived[' + messageQos + ']', sentQos, messageQos, function(qosDelivered, qosArrived) {
                                return qosDelivered >= qosArrived;
                            });

                            var maxQos = that.maxQosSubscribed;
                            ASSERT.verifyValue('Comparing coherence between max qos subscribed[' + maxQos + '] and qos arrived[' + messageQos + ']', maxQos, messageQos, function(maxQosSubscribed, qosArrived) {
                                return maxQosSubscribed >= qosArrived;
                            });

                            msgCounter++;
                            testLogger.info('Increased message counter to ' + msgCounter);
                        };

                        receivingClient.connect({

                            onFailure: function(responseObject) {
                                ASSERT.fail('Connection error ---> ' + JSON.stringify(responseObject));
                                that.stop();
                            },

                            onSuccess: function() {
                                testLogger.info('Connected to the MQTT broker!');
                                testLogger.info('Suscribing...');
                                for (var s = 0; s < subrequests.length; s++) {
                                    receivingClient.subscribe(subrequests[s].topicFilter, {

                                        qos: subrequests[s].qos,

                                        requestedMaxFrequency: 10,

                                        onSuccess: function(grantedQoS) {
                                            ASSERT.verifyValue('Comparing qos...', this.qos, grantedQoS, true);

                                            if (s == subrequests.length) {
                                                /* Prepare the connect options. */
                                                sendingClient.connect({
                                                    onSuccess: function() {
                                                        sendingClient.send(testMessage);
                                                    }
                                                });
                                            }
                                        },

                                        onFailure: function(errorCode) {
                                            ASSERT.fail('Subscription failure with error code ' + errorCode);
                                        }

                                    });
                                }

                            }

                        });
                    }

                });
            }
        };

        Inheritance(OverlappingSubscriptionTest, AbstractTest, true, true);
        return OverlappingSubscriptionTest;

    });
