define(["AbstractTest", "Inheritance", "ASSERT", "MqttExtender", "Message"],
    function(AbstractTest, Inheritance, ASSERT, MqttExtender, Message) {  
  
  var testLogger = AbstractTest.testLogger;
  
  var SubackSameTopicFilterDifferentQoS = function(firstQos, secondQos) {
    this._callSuperConstructor(SubackSameTopicFilterDifferentQoS);
    this.firstQos = firstQos;
    this.secondQos = secondQos;
  };
  
  SubackSameTopicFilterDifferentQoS.getInstances = function() {
      
      return [new SubackSameTopicFilterDifferentQoS(0, 1), new SubackSameTopicFilterDifferentQoS(1, 0)];
  };
  
  SubackSameTopicFilterDifferentQoS.prototype = {
      
      toString : function() {
          return "[SubackSameTopicFilterDifferentQoS]";
      },
      
      stop : function() {
          this.lsClient.disconnect();
          this.end();
      },
      
      start : function() {
          this._callSuperMethod(SubackSameTopicFilterDifferentQoS, "start");
          var that = this;
          this.clients = 0;
          var testMessage = this.testMessage;
        
          MqttExtender.createClientFactory("http://localhost:8080", "", "", {
              
              onConnectionRetry : function(lsClient) {
                  ASSERT.fail("Attempting a connection retry");
                  lsClient.disconnect();
                  that.end();
              },
              
              onLsClient : function(lsClient) {
                  that.lsClient = lsClient;
              },
              
              onClientFactory : function(clientFactory) {
                  var client1 = clientFactory.createClient("default");
                  var client2 = clientFactory.createClient("default");
                  
                  client2.onConnectionLost = function(responseObject) {
                      ASSERT.verifyValue("Client 2 disconnected by itself", 0, responseObject.errorCode, true);
                      client1.disconnect();
                  }
                  
                  client1.onConnectionLost = function(responseObject) {
                      ASSERT.verifyValue("Client 1 disconnected by Client 2", 0, responseObject.errorCode, true);
                      that.stop();
                  }
                  
                  client1.connect({
                      
                      onSuccess : function() {
                          testLogger.info("Client 1 connected to the MQTT broker!");
                          testLogger.info("Suscribing to \"test\" with QoS " + that.firstQos);
                          client1.subscribe("test", {

                              qos : that.firstQos,
                              
                              onSuccess : function(grantedQoS) {
                                  ASSERT.verifyValue("Comparing first qos...", this.qos, grantedQoS);
                                  client2.connect({
                                      
                                      onSuccess : function() {
                                          testLogger.info("Client 2 Connected to the MQTT broker!");
                                          testLogger.info("Suscribing to \"test\" with QoS " + that.secondQos);
                                          client2.subscribe("test", {

                                              qos : that.secondQos,
                                              
                                              onSuccess : function(grantedQoS) {
                                                  ASSERT.verifyValue("Comparing second qos...", this.qos, grantedQoS);
                                                  client2.disconnect();
                                              },
                                              
                                              onFailure : function(errorCode) {
                                                  ASSERT.fail("Subscription failure with error code " + errorCode);
                                                  client2.disconnect();
                                              },
                                              
                                              onAuthorizationFailure : function(responseObject) {
                                                  ASSERT.fail(JSON.stringify(responseObject));
                                                  client2.disconnect();
                                              } 
                                          
                                          });
                                      },
                                    
                                  });
                              },
                              
                              onFailure : function(errorCode) {
                                  ASSERT.fail("Subscription failure with error code " + errorCode);
                                  client1.disconnect();
                              },
                              
                              onAuthorizationFailure : function(responseObject) {
                                  ASSERT.fail(JSON.stringify(responseObject));
                                  client1.disconnect();
                              } 
                          
                          });
                      },
                    
                  })
              },
              
          });
      },
  };
  
  Inheritance(SubackSameTopicFilterDifferentQoS, AbstractTest, true, true);
  return SubackSameTopicFilterDifferentQoS;
  
});