define(["AbstractTest", "Inheritance", "ASSERT", "MqttExtender", "Message"],
    function(AbstractTest, Inheritance, ASSERT, MqttExtender, Message) {  
  
  var testLogger = AbstractTest.testLogger;
  
  var ResubscriptionTest = function(message, subscriptionRequest) {
    this._callSuperConstructor(ResubscriptionTest);
    this.testMessage = message;
    this.subrequest = subscriptionRequest;
  };
  
  ResubscriptionTest.getInstances = function() {
      /* Prepare binary test message. */
      var binaryMsgs = [];
      for (var i = 0; i < 3; i++) {
          binaryMsgs[i] = new Message(new Uint8Array([1,2,3,4]));
          binaryMsgs[i].destinationName = "A/B";
          binaryMsgs[i].qos = i;
          binaryMsgs[i].retained = false;
      }
      
      /* Prepare text test message. */
      var textMessage = new Message("Text Messge");
      textMessage.destinationName = "test";
      textMessage.qos = 0;
      textMessage.retained = false;
      
      return [
          //new ResubscriptionTest(binaryMsgs[0], { qos : [0 , 0], topicFilter:"A/B"} ),
          //new ResubscriptionTest(binaryMsgs[0], { qos : [0 , 1], topicFilter:"A/B"} ),
          new ResubscriptionTest(binaryMsgs[0], { qos : [1 , 0], topicFilter:"A/B"} ),
          //new ResubscriptionTest(binaryMsgs[0], { qos : [1 , 1], topicFilter:"A/B"} )
      ];
  };
  
  ResubscriptionTest.prototype = {
      
      toString : function() {
          return "[ResubscriptionTest]";
      },
      
      stop : function() {
          this.lsClient.disconnect();
          //this.end();
          
          var self = this;
          
          // This pause is required in order to execute each single test in complete isolatio,
          // giving the Lightstreamer Server to unsubscribing from each item.
          
          setTimeout(function () {
              self.end();
          }, 1500);
      },
      
      start : function() {
          this._callSuperMethod(ResubscriptionTest, "start");
          var that = this;
          this.lsClient = null;
          var testMessage = this.testMessage;
          
          this.onSuccessCount = 0;
        
          MqttExtender.createClientFactory("http://localhost:8080", "", "", {
              
              onConnectionRetry : function(lsClient) {
                  ASSERT.fail("Attempting a connection retry");
                  that.stop();
              },
              
              onLsClient : function(lsClient) {
                  that.lsClient = lsClient;
              },
              
              onClientFactory : function(clientFactory) {
                  var receivingClient = clientFactory.createClient("default");
                  var sendingClient = clientFactory.createClient("default", "1111");
                  sendingClient.connect({
                      onSuccess : function() {
                          sendingClient.send(that.testMessage);
                          that.startReceiving(receivingClient, that);
                      }   
                  });
                  
                  sendingClient.onMessageDelivered = function(message) {
                      that.startReceiving(receivingClient, that);
                  }
                  
                  receivingClient.onConnectionLost = function(responseObject) {
                      ASSERT.verifyValue("Receiving client gracefully disconnected", 0, responseObject.errorCode);
                      //sendingClient.disconnect();
                      that.stop();
                  }
                  
                  receivingClient.onMessageArrived = function(message) {
                      ASSERT.verifyNotNull("Message arrived", message);
                      ASSERT.verifyValue("It is a retained message", message.retained, true, true);
                      
                  }
              },
          });
      },
      
      startReceiving : function(receivingClient, ctx) {
          receivingClient.connect({
              
              onFailure : function(responseObject) {
                  ASSERT.fail("Connection error ---> " + JSON.stringify(responseObject));
                  that.stop();
              },
              
              onSuccess : function() {
                  testLogger.info("Connected to the MQTT broker!");
                  testLogger.info("Subscribing to " + ctx.subrequest.topicFilter + " with qos " + ctx.subrequest.qos[0]);
                  receivingClient.subscribe(ctx.subrequest.topicFilter, {

                      qos : ctx.subrequest.qos[0],
                      
                      onSuccess : function(grantedQoS) {
                          ctx.onSuccessCount++;
                          ASSERT.verifyValue("First subscription", 1, ctx.onSuccessCount);
                          ASSERT.verifyValue("Comparing qos...", this.qos, grantedQoS);
                          
                          setTimeout(function() {
                              testLogger.info("Resubscribing to " + ctx.subrequest.topicFilter + " with qos " + ctx.subrequest.qos[1])
                              receivingClient.subscribe(ctx.subrequest.topicFilter, {

                                  qos : ctx.subrequest.qos[1],
                                  
                                  onSuccess : function(grantedQoS) {
                                      ctx.onSuccessCount++;
                                      ASSERT.verifyValue("Second subscription", 2, ctx.onSuccessCount);
                                      ASSERT.verifyValue("Comparing qos...", this.qos, grantedQoS);
                                      receivingClient.disconnect();
                                  },
                                  
                                  onFailure : function(errorCode) {
                                      ASSERT.fail("Subscription failure with error code " + errorCode);
                                      receivingClient.disconnect();
                                  }
                              
                              });
                          }, 2000);

                          
                      },
                      
                      onFailure : function(errorCode) {
                          ASSERT.fail("Subscription failure with error code " + errorCode);
                          receivingClient.disconnect();
                      }
                  
                  });
              },
            
          });
      }
  };
  
  Inheritance(ResubscriptionTest, AbstractTest, true, true);
  return ResubscriptionTest;
  
});