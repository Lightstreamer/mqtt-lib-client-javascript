define(['AbstractTest', 'Inheritance', 'ASSERT', 'MqttExtender', 'Message'],
    function(AbstractTest, Inheritance, ASSERT, MqttExtender, Message) {

        var testLogger = AbstractTest.testLogger;

        var ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic = function(message) {
            this._callSuperConstructor(ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic);
            this.testMessage = message;
        };

        ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic.getInstances = function() {
            /* Prepare text test message. */
            var textMessage = new Message('Text Messge');
            textMessage.destinationName = 'test';
            textMessage.qos = 0;
            textMessage.retained = false;

            return [new ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic(textMessage)];
        };

        ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic.prototype = {

            toString: function() {
                return '[ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic]';
            },

            stop: function() {
                this.lsClient.disconnect();
                this.end();
            },

            start: function() {
                this._callSuperMethod(ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic, 'start');
                var that = this;
                this.lsClient = null;
                var testMessage = this.testMessage;
                var subscribed = false;

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
                        var sendingClient = clientFactory.createClient('default');

                        receivingClient.onConnectionLost = function(responseObject) {
                            ASSERT.verifyValue('Receiving client gracefully disconnected', 0, responseObject.errorCode);
                            sendingClient.disconnect();
                        };

                        sendingClient.onConnectionLost = function(responseObject) {
                            ASSERT.verifyValue('Sending client gracefully disconnected', 0, responseObject.errorCode);
                            that.stop();
                        };


                        sendingClient.onMessageArrived = function(message) {
                            ASSERT.fail('Message should not have been received');
                            sendingClient.disconnect();
                        };

                        receivingClient.onMessageArrived = function(message) {
                            ASSERT.verifyOk('Receiver Client has received the message', message)
                            testLogger.info('Sender Client is subscribing to the same topic filter');

                            sendingClient.subscribe(testMessage.destinationName, {

                                qos: 0,

                                onSuccess: function(grantedQoS) {
                                    ASSERT.verifyValue('Sender Client Subscribed to same topic filter', this.qos, grantedQoS);
                                }
                            });

                            // Give a chance to receive a message on the second subscription...
                            setTimeout(function() {
                                receivingClient.disconnect();
                            }, 2000);
                        };

                        receivingClient.connect({

                            onFailure: function(responseObject) {
                                ASSERT.fail('Connection error ---> ' + JSON.stringify(responseObject));
                                that.stop();
                            },

                            onSuccess: function() {
                                testLogger.info('Receiver Client connected, subscribing..');
                                receivingClient.subscribe(testMessage.destinationName, {

                                    qos: 0,

                                    onSuccess: function(grantedQoS) {
                                        ASSERT.verifyValue('Receiver Client subscribed', this.qos, grantedQoS);
                                        testLogger.info('Connecting Sender Client');

                                        /* Prepare the connect options. */
                                        sendingClient.connect({

                                            onSuccess: function() {
                                                testLogger.info('Sender Client Connected, sending a new message');
                                                sendingClient.send(testMessage);
                                            },

                                            onFailure: function(responseObject) {
                                                ASSERT.fail('Connection error ---> ' + JSON.stringify(responseObject));
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

        Inheritance(ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic, AbstractTest, true, true);
        return ShouldNotReceiveSameMessageOnSubsequentSubscriptionOnSameTopic;

    });