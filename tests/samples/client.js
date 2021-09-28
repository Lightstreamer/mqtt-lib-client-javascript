require(['LightstreamerClient', 'LoggerManager', 'SimpleLoggerProvider',
  'ConsoleAppender', 'MQTTExtender', 'Message', 'dojo/parser',
  'dojo/query!css3', 'dojox/widget/Standby', 'dojo/dom-construct', 'dojo/dom',
  'dojo/dom-style', 'dijit/layout/ContentPane', 'dijit/form/Button',
  'dijit/form/Form', 'dijit/form/ValidationTextBox', 'dijit/TitlePane',
  'dojo/on', 'dojo/NodeList-dom', 'dojo/domReady!'],
  function(lsClient, LoggerManager, SimpleLoggerProvider, ConsoleAppender,
    MqttExtemder, Message, parser, query, Standby, dom, style, ContentPane,
    Button) {

    var loggerProvider = new SimpleLoggerProvider();
    loggerProvider.addLoggerAppender(new ConsoleAppender('DEBUG',
      'mqtt.extender'));
    loggerProvider.addLoggerAppender(new ConsoleAppender('DEBUG',
      'mqtt.test.client'));

    LoggerManager.setLoggerProvider(loggerProvider);
    var logger = LoggerManager.getLoggerProxy('mqtt.test.client');
    logger.isDebugLogEnabled();
    logger.info('Starting Test Client...');
    query('.inputField').style('display', 'block');

    var mqttClient = null;
    var connected = false;
    var subscriptions = {};
    var factory = null;

    MQTTExtender.createClientFactory('http://localhost:8080', 'noauth1', 'pwd1',
      {

        onConnectionFailure: function(errorCode, errorMessage) {
          console.log('onClientFactoryError: [' + errorCode + '], [' +
            errorMessage + ']');
        },

        onConnectionSuccess: function(clientFactory) {
          factory = clientFactory;
        },

        onClientFactoryError: function(errorCode, errorMessage) {
          console.log('onClientFactoryError ' + errorCode + ',' +
            errorMessage);
        }

      });

    var resetGui = function() {
      connectBtn.set('label', 'Connect');
      publishBtn.set('disabled', true);
      sentMessagesPane.set('open', false);

      /* Clear Publish Pane */
      publishPane.set('open', false);
      payload.set('value', '');
      topic.set('value', '');


      clearSentMsgBtn.set('disabled', true);
      clearReceivedMsgBtn.set('disabled', true);
      connected = false;
    };

    var format = function(responseObject) {
      return responseObject.errorMessage + ' [' + responseObject.errorCode +
        ']';
    };

    var showMsg = function(title, message) {
      dialog.set('title', title);
      dom.byId('dialogMessage').innerHTML = message;
      dialog.show();
    };

    var buildOptions = function(standby) {
      var options = {};

      options.cleanSession = cleanSession.get('value');
      var userNameValue = userName.get('value');
      if (userNameValue.length) {
        options.userName = userNameValue;
      }

      var passwordValue = password.get('value');
      if (passwordValue.length) {
        options.password = passwordValue;
      }

      var lastWillTopic = lwt.get('value');
      var lastWillMessage = lwm.get('value');

      if (!lastWillTopic && lastWillMessage) {
        showMsg('Attention!', 'Please specify a value for Last Will Topic');
        return null;
      }

      if (lastWillTopic) {
        var willMessage = new Message(lastWillMessage);
        willMessage.setDestinationName(lastWillTopic);
        options.willMessage = willMessage;
      }

      options.onSuccess = function() {
        connectBtn.set('label', 'Disconnect');
        connected = true;
        publishBtn.set('disabled', false);
        clearSentMsgBtn.set('disabled', false);
        clearReceivedMsgBtn.set('disabled', false);
        sentMessagesPane.set('open', true);
        publishPane.set('open', true);
        standby.hide();
        showMsg('Connection', 'Connected to Broker!');
      };

      options.onFailure = function(responseObject) {
        console.log('onFailure');
        resetGui();
        standby.hide();
        showMsg('onFailure Event', format(responseObject));
      };

      return options;
    };

    connect = function() {
      if (!connected) {
        if (connectionForm.validate()) {

          var brokerAddress = brokerAddressOrAlias.get('value');
          var clientIdValue = clientId.get('value');

          mqttClient = factory.createClient(brokerAddress, clientIdValue);

          var st = new Standby({ target: 'connection' });
          window.document.body.appendChild(st.domNode);

          var options = buildOptions(st);

          if (options) {
            st.show();
            mqttClient.onConnectionLost = function(responseObject) {
              console.log('onConnectionLost');
              connectBtn.set('label', 'Connect');
              connected = false;
              st.hide();
              showMsg('Connection Lost', format(responseObject));
            };

            mqttClient.onMessageDelivered = function(message) {
              var payload = message.payload;
              var payloadAsString = '';
              var bytes = new Uint8Array(payload);
              for (var i = 0; i < payload.byteLength; i++) {
                payloadAsString += String.fromCharCode(bytes[i]);
              }

              message.payload = payloadAsString;
              var messageStr = JSON.stringify(message);
              var newDiv = domConstruct.toDom('<div>' + messageStr + '</div>');
              domConstruct.place(newDiv, dom.byId('sentMessagesList'));
            };

            mqttClient.onMessageArrived = function(message) {
              var messageStr = JSON.stringify(message);
              var newDiv = domConstruct.toDom('<div>' + messageStr + '</div>');
              domConstruct.place(newDiv, dom.byId('receivedMessagesList'));
            };

            mqttClient.onMessageNotAuthorized = function(responseObject) {
              showMsg('Message denied!', format(responseObject));
            };

            mqttClient.onReconnection = function() {
              console.log('Reconnection...');
              //this.disconnect();
            };

            mqttClient.onError = function(responseObject) {
              console.log('onError');
              connectBtn.set('label', 'Connect');
              connected = false;
              st.hide();
              showMsg('On Error', format(responseObject));
            };

            mqttClient.connect(options);
          }
        }
      } else {
        mqttClient.disconnect();
        resetGui();

      }
    };

    publish = function() {
      if (publishForm.validate()) {
        var topicname = topic.get('value');
        var message = payload.get('value');
        var qos = parseInt(pubQos.get('value'));
        var retained = Boolean(pubRetain.get('value'));

        var bytes = new Uint8Array(message.length);
        for (var i = 0; i < message.length; i++) {
          bytes[i] = message.charCodeAt(i);
        }
        mqttClient.send(topicname, bytes, qos, retained);
      }
    };

    subscribe = function() {
      if (subscribeForm.validate()) {
        var topicFilter = subscribedTopicFilter.get('value');

        if (subscriptions[topicFilter]) {
          showMsg('Attention', 'Topicfilter already subscribed!');
          return;
        }

        var qos = parseInt(subQos.get('value'));
        subscriptions[topicFilter] = qos;

        var subOptions = {};

        subOptions.qos = qos;

        //subOptions.requestedMaxFrequency = 20;

        subOptions.onSuccess = function(grantedQos) {
          subcriptionDialog.hide();

          var subDiv = domConstruct.toDom('<div></div>');
          var filterDiv = domConstruct.toDom('<div style="display: inline; ' +
            'width: 400px;">' + topicFilter + '[Qos: ' + grantedQos +
            ']</div>');
          domConstruct.place(filterDiv, subDiv);
          domConstruct.place(subDiv, dom.byId('subscriptionsList'));
          var btn = new Button({
            label: 'Unsubscribe',
            style: 'float: right; display: inline;',
            onClick: function() {
              mqttClient.unsubscribe(topicFilter, {
                onSuccess: function() {
                  delete subscriptions[topicFilter];
                  showMsg('Unsubscription', 'Unubscriptrion from [' +
                    topicFilter + '] with success');
                },

                onFailure: function() {
                  showMsg('Unsubscription', 'Error in subscriptrion from [' +
                    topicFilter + ']');
                }
              });
            }
          });
          btn.placeAt(subDiv, 'last');
          btn.startup();

          showMsg('Subscription', 'Granted Qos: ' + grantedQos);
        };

        subOptions.onFailure = function(errorCode) {
          subcriptionDialog.hide();
          showMsg('Subscription', 'Error: ' + errorCode);
        };

        subOptions.onAuthorizationFailure = function(responseObject) {
          subcriptionDialog.hide();
          showMsg('Subscription', 'Error: ' + format(responseObject));
        };

        mqttClient.subscribe(topicFilter, subOptions);
      }

    };


    clearSentMessages = function() {
      dom.byId('sentMessagesList').innerHTML = '';
    };

    clearReceivedMessages = function() {
      dom.byId('receivedMessagesList').innerHTML = '';
    };

  });
