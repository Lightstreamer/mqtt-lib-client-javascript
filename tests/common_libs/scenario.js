define('Scenario', ['openSession', 'MqttClientImpl', 'Env', 'Docker'],
  function(openSession, MqttClientImpl, Env, Docker) {

    // To be used in the case of  docker running from a virtual machine
    //var dockerMachineAddress = '192.168.99.100';

    // To be used for Docker for Windows
    var dockerMachineAddress = '127.0.0.1';
    var dockerMachinePort = 2375;
    //var dockerMachinePort = 8080;
    var exposedPort = 8080;
    var keepAliveUrl = 'http://' + dockerMachineAddress + ':' + exposedPort;

    // The MQTT.Cool server address.
    var SERVER_ADDRESS = 'http://' + dockerMachineAddress + ':' + exposedPort;
    var COOL_CONTAINER = 'mqtt.cool-server';
    var BROKER_CONTAINER = 'mosquitto-server';
    var PROXY_CONTAINER = 'nginx-server';

    var keepAliveMap = {};
    keepAliveMap[COOL_CONTAINER] = keepAliveUrl;
    keepAliveMap[BROKER_CONTAINER] = keepAliveUrl;
    keepAliveMap[PROXY_CONTAINER] = 'http://localhost:80';

    // The Docker wrapper, initialized with host configuration.
    var docker = new Docker(dockerMachineAddress + ':' + dockerMachinePort,
      keepAliveMap);

    var COOL_NETWORK = 'cool_network';

    var dockerWrapperCounter = 0;

    var DockerWrapper = function(lsFactoryReset) {
      this._id = dockerWrapperCounter++;
      // Enable the fake flag in the case of testing against an MQTT.Cool server
      // started from Eclipse workspace.
      this.fake = false;
      if (typeof lsFactoryReset == 'undefined' || lsFactoryReset) {
        openSession.__resetFactory();
      }
      var initialStatus = DockerWrapper.STATUS['STARTED'];
      this.status = {};
      this.status[COOL_CONTAINER] = initialStatus;
      this.status[BROKER_CONTAINER] = initialStatus;
      this.status[PROXY_CONTAINER] = initialStatus;
      this.networkStatus = DockerWrapper.NETWORK_STATUS['CONNECTED'];
    };

    DockerWrapper.STATUS = {
      'STOPPED': 0,
      'STARTING': 1,
      'STARTED': 2,
      'STOPPING': 3
    };

    DockerWrapper.NETWORK_STATUS = {
      'CONNECTED': 0,
      'DISCONNECTED': 1,
    };

    DockerWrapper.restartServices = function(callback) {
      var wrapper = new DockerWrapper();
      wrapper.restartServices(function() {
        callback(SERVER_ADDRESS, wrapper);
      });
      return wrapper;
    };

    DockerWrapper.prototype = {

      toString: function() {
        return 'DockerWrapper type';
      },

      networkIssue: function(func) {
        this.stopService(PROXY_CONTAINER, func);
      },

      /**
       * Makes a pause of the specified milliseconds.
       *
       * @param {number} time - The pause time in milliseconds.
       */
      pause: function(time) {
        var date = new Date();
        var curDate = null;
        do { curDate = new Date(); }
        while (curDate - date < time);
      },

      recoverConnection: function(func) {
        this.startService(PROXY_CONTAINER, func);
      },

      publish: function() {
        // Do nothing
      },

      puback: function() {
        // Do nothing
      },

      pubrec: function() {
        // Do nothing
      },

      pubrel: function() {
        // Do nothing
      },

      pubcomp: function() {
        // Do nothing
      },

      deliveryComplete: function() {
        // Do nothing
      },

      sharedSuback: function() {
        // Do nothing
      },

      sharedPublish: function() {
        // Do nothing
      },

      suback: function() {
        // Do nothing
      },

      unsuback: function() {
        // Do nothing
      },

      startService: function(service, onStartFunction, onFailureFunction) {
        if (this.fake) {
          onStartFunction();
          return;
        }

        var self = this;
        function doStart() {
          setTimeout(function() {
            docker.startContainer(service, function() {
              self.status[service] = DockerWrapper.STATUS['STARTED'];
              if (onStartFunction) {
                onStartFunction();
              }
            }, onFailureFunction);
          }, 500);
        }

        docker.inspect(service, function(response) {
          var res = JSON.parse(response);
          var status = res.State.Status;
          switch (status) {
            case 'created':
            case 'removing':
            case 'dead':
            case 'paused':
              if (onFailureFunction) {
                onFailureFunction('Unmanageable status ' + status);
                break;
              }
              throw new Error('Unmanageable status ' + status);

            case 'running':
              var check = setInterval(function() {
                var currentStatus = self.status[service];
                if (currentStatus == DockerWrapper.STATUS['STOPPED']) {
                  clearInterval(check);
                  doStart();
                }
              }, 200);
              break;

            case 'exited':
              doStart();
              break;

            default:
              break;
          }
        });
      },

      stopService: function(service, onStopFunction, onFailureFunction) {
        if (this.fake) {
          onStopFunction();
          return;
        }

        var self = this;
        docker.inspect(service, function(response) {
          var res = JSON.parse(response);
          var status = res.State.Status;
          switch (status) {
            case 'created':
            case 'removing':
            case 'dead':
            case 'paused':
              if (onFailureFunction) {
                onFailureFunction('Unmanageable status ' + status);
                break;
              }
              throw new Error('Unmanageable status ' + status);

            case 'running':
              setTimeout(function() {
                self.status[service] = DockerWrapper.STATUS['STOPPING'];
                docker.stopContainer(service, function() {
                  self.status[service] = DockerWrapper.STATUS['STOPPED'];
                  if (onStopFunction) {
                    onStopFunction();
                  }
                }, onFailureFunction);
              }, 500);
              break;

            case 'exited':
              self.status[service] = DockerWrapper.STATUS['STOPPED'];
              if (onStopFunction) {
                onStopFunction();
              }
              break;

            default:
              break;
          }
        });
      },

      restartService: function(service, onRestartFunction, onFailureFunction) {
        if (this.fake) {
          this.status[service] = DockerWrapper.STATUS['STARTED'];
          onRestartFunction();
          return;
        }

        var self = this;
        var onRestart = function() {
          self.status[service] = DockerWrapper.STATUS['STARTED'];
          if (onRestartFunction) {
            onRestartFunction();
          }
        };

        docker.restartContainer(service, onRestart, onFailureFunction);
      },

      startMQTTCool: function(onStartFunction, onFailureFunction) {
        this.startService(COOL_CONTAINER, onStartFunction, onFailureFunction);
      },

      stopMQTTCool: function(onStopFunction) {
        this.stopService(COOL_CONTAINER, onStopFunction);
      },

      restartMQTTCool: function(onRestartFunction, onFailureFunction) {
        this.restartService(COOL_CONTAINER, onRestartFunction,
          onFailureFunction);
      },

      startBroker: function(onStartFunction, onFailureFunction) {
        this.startService(BROKER_CONTAINER, onStartFunction, onFailureFunction);
      },

      stopBroker: function(onStopFunction) {
        this.stopService(BROKER_CONTAINER, onStopFunction);
      },

      restartBroker: function(onRestartFunction, onFailureFunction) {
        this.restartService(BROKER_CONTAINER, onRestartFunction,
          onFailureFunction);
      },

      restartServiceIfNeeded(service, onRestart) {
        var self = this;
        docker.inspect(service, function(response) {
          var res = JSON.parse(response);
          if (res.State.Status != 'running') {
            self.restartService(service, onRestart);
          } else {
            // The container for proxy is already running, start all other
            // services.
            if (onRestart) {
              onRestart();
            }
          }
        }, function() {
          // The container has not been found: start it;
          self.restartService(service, onRestart);
        });
      },

      restartServices: function(onRestartFunction) {
        if (this.fake) {
          onRestartFunction();
          return;
        }
        var self = this;
        function restart() {
          self.restartMQTTCool(function() {
            self.restartBroker(onRestartFunction);
          });
        }

        docker.inspect(PROXY_CONTAINER, function(response) {
          var res = JSON.parse(response);
          if (res.State.Status != 'running') {
            self.restartService(PROXY_CONTAINER, restart);
          } else {
            // The container for proxy is already running, start all other
            // services.
            restart();
          }
        }, function() {
          // The container for proxy has not been found: start all;
          self.startService(PROXY_CONTAINER, restart);
        });
      }
    };

    /**
     * Mock for LightstreamerClient.
     * @param {string} serverAddress -
     * @param {string} adapterSet -
     * @param {Object=} opt -
     */
    var LightstreamerClientMock = function(serverAddress, adapterSet, opt) {
      this.serverAddress = serverAddress;
      this.adapterSet = adapterSet;
      this.listeners = [];
      this.subscriptions = {};
      this.sendMessageList = [];
      var options = opt || {};
      var self = this;
      this.status = 'DISCONNECTED';
      this.onConnectAction = options.onConnectAction || function() {
        self.status = 'CONNECTED:WS-STREAMING';
        self._dispatchEvent(self.listeners, 'onStatusChange', self.status);
      };
      this.onSubscribeAction = options.onSubscribeAction;
      this.nextIssue = false;

      this.connectionDetails = {

        setUser: function(user) {
          self.user = user;
        },

        getUser: function() {
          return self.user;
        },

        setPassword: function(password) {
          self.password = password;
        },

        getPassword() {
          return self.password;
        },

        getServerAddress: function() {
          return self.serverAddress + '/';
        }
      };
    };

    LightstreamerClientMock.prototype = {

      toString: function() {
        return 'LightstreamerClientMock';
      },

      getStatus: function() {
        return this.status;
      },

      subscribe: function(subscription) {
        var items = subscription.getItems();
        this.subscriptions[items[0]] = subscription;
        if (items[0].indexOf('connection') != -1 && this.onSubscribeAction) {
          this.onSubscribeAction(subscription, UpdateInfo, ConnAck);
        }
      },

      unsubscribe: function(subscription) {
        var items = subscription.getItems();
        delete this.subscriptions[items[0]];
        setTimeout(function() {
          subscription.getListeners().forEach(function(listener) {
            if (listener.onUnsubscription) {
              listener.onUnsubscription();
            }
          });
        }, 100);
      },

      getSubscription: function(topicFilter, qos) {
        for (var item in this.subscriptions) {
          if (item.indexOf('subscribe|' + qos + '|' + topicFilter + '|') !=
            -1) {
            return this.subscriptions[item];
          }
        }
        return null;
      },

      addListener: function(listener) {
        if (this.listeners.indexOf(listener) == -1) {
          this.listeners.push(listener);
          if (listener.onListenStart) {
            listener.onListenStart(this);
          }
        }
      },

      removeListener: function(listener) {
        var listenerIndex = this.listeners.indexOf(listener);
        if (listenerIndex != -1) {
          // Replace with a dummy object, so that current forEach iteration
          // is not affected.
          this.listeners.splice(listenerIndex, 1, {});
        }
      },

      connect: function() {
        var self = this;
        setTimeout(function() {
          self.onConnectAction(self.listeners[0]);
        }, 100);
      },

      disconnect: function() {
        // Allow to stop automatic "DISCONNECTED:WILL-RETRY" messages
        this.nextIssue = false;
        this.status = 'DISCONNECTED';
        this._dispatchEvent(this.listeners, 'onStatusChange', this.status);
        this.listeners = [];
        this.subscriptions = {};
        this.sendMessageList = [];
      },

      sendMessage: function(msg, sequence, delay, listener) {
        // Process custom sendMessage functions a test may have specified to
        // handle a specific scenario.
        var sendMessageListReversed = this.sendMessageList.slice().reverse();
        for (var i = 0; i < sendMessageListReversed.length; i++) {
          var sendMessage = sendMessageListReversed[i];
          if (sendMessage(msg, sequence, delay, listener)) {
            return;
          }
        }

        setTimeout(function(ctx) {
          if (!ctx.nextIssue) {
            listener.onProcessed(msg);
          } else {
            listener.onAbort(msg);
          }
        }, 100, this);
      },

      addSendMessage: function(handler) {
        this.sendMessageList.push(handler);
      },

      networkIssue: function() {
        this.nextIssue = true;
        var self = this;
        var t = setInterval(function() {
          // Simulate automatic reconnection attempt, until an explicit
          // disconnection occurs.
          if (self.nextIssue) {
            self.status = 'DISCONNECTED:WILL-RETRY';
            self._dispatchEvent(self.listeners, 'onStatusChange', self.status);
          } else {
            clearTimeout(t);
          }
        }, 2100); // Tuned parameter, similar to the time elapsed between a
        // container stop request and the actual stop.

      },

      recoverConnection: function(func) {
        // In the case of shared connection, the LightstreamerClient is in
        // charge of automatic and silent resubscription, therefore all items
        // relative to the MQTT connection will be submitted.
        this.nextIssue = false;
        this.status = 'CONNECTED:WS-STREAMING';
        this._dispatchEvent(this.listeners, 'onStatusChange', this.status);
        for (var item in this.subscriptions) {
          var sub = this.subscriptions[item];
          var items = sub.getItems();
          if (items[0].indexOf('connection') != -1) {
            this._dispatchEvent(sub.getListeners(), 'onItemUpdate',
              new UpdateInfo(ConnAck(0)));
          }
        }
        if (func) {
          setTimeout(function() {
            func();
          }, 500);
        }
      },

      _dispatchEvent: function(listeners, event, arg) {
        listeners.forEach(function(listener) {
          if (listener[event]) {
            listener[event](arg);
          }
        });
      },

      _dispatchToDedicated: function(clientId, event, arg) {
        for (var item in this.subscriptions) {
          var sub = this.subscriptions[item];
          var fieldSchema = sub.getFieldSchema();
          if (fieldSchema == 'connection_schema') {
            var tok = sub.getItems()[0].split('|');
            if (tok[9] == clientId) {
              this._dispatchEvent(sub.getListeners(), event, arg);
            }
          }
        }
      },

      stopBroker: function() {
        for (var item in this.subscriptions) {
          var sub = this.subscriptions[item];
          var items = sub.getItems();
          if (items[0].indexOf('connection') != -1) {
            this._dispatchEvent(sub.getListeners(), 'onItemUpdate',
              new UpdateInfo(ConnectionError()));
          }
        }
      },

      puback: function(clientId, id) {
        this._dispatchToDedicated(clientId,
          'onItemUpdate', new UpdateInfo(PubAck(id)));
      },

      pubrec: function(clientId, id) {
        this._dispatchToDedicated(clientId,
          'onItemUpdate', new UpdateInfo(PubRec(id)));
      },

      pubrel: function(clientId, id) {
        this._dispatchToDedicated(clientId,
          'onItemUpdate', new UpdateInfo(PubRel(id)));
      },

      pubcomp: function(clientId, id) {
        this._dispatchToDedicated(clientId, 'onItemUpdate',
          new UpdateInfo(PubComp(id)));
      },

      /**
       * @param {string} clientId -
       * @param {number} packetId -
       * @param {Message} msg;
       */
      publish: function(clientId, packetId, msg) {
        this._dispatchToDedicated(clientId, 'onItemUpdate',
          new UpdateInfo(Publish(packetId, msg)));
      },

      /**
       * @param {string} clientId -
       * @param {number} packetId -
       * @param {number} rc - The suback
       */
      suback: function(clientId, packetId, rc) {
        this._dispatchToDedicated(clientId, 'onItemUpdate',
          new UpdateInfo(SubAck(packetId, rc)));
      },

      /**
       * @param {string} clientId -
       * @param {number} packetId -
       */
      unsuback: function(clientId, packetId) {
        this._dispatchToDedicated(clientId, 'onItemUpdate',
          new UpdateInfo(UnsubAck(packetId)));
      },

      /**
       * @param {string} connectionId -
       * @param {number} packetId -
       */
      deliveryComplete: function(connectionId, packetId) {
        for (var item in this.subscriptions) {
          var sub = this.subscriptions[item];
          var items = sub.getItems();
          if (items[0].indexOf('connection|') == 0 &&
            items[0].indexOf(connectionId) != -1) {
            this._dispatchEvent(sub.getListeners(), 'onItemUpdate',
              new UpdateInfo(DeliveryComplete(packetId)));
          }
        }
      },

      /**
       * Simulate the response of a shared subscription request.
       *
       * @param {Subscription} subscription - The Lightstreamer Subscription
       * instance which embeds the subscription request to a topicFilter.
       * @param {number} returnCode - The simulated return code, which can be:
       * <ul>
       * <li> a positive or zero integer, which indicates a SUBACK code </li>
       * <li> a negative integer, which indicates a CreditsException that will
       * trigger the invocation of onSubscriptionError on the
       * Subscription's listeners, with the specified code.
       * <ul>
       */
      sharedSuback: function(subscription, returnCode) {
        var sub = this.subscriptions[subscription.getItems()[0]];
        if (typeof sub == 'undefined') {
          throw new Error('No subscription!');
        }

        // A positive returnCode indicates a SUBACK code.
        var subscriptionListener = sub.getListeners()[0];
        if (returnCode >= 0) {
          subscriptionListener.onItemUpdate({
            getValue: function(index) {
              if (index == 1) {
                return returnCode;
              }
              return null;
            }
          });
        } else {
          // Otherwise, let's simulate an onSubscriptionError.
          subscriptionListener.onSubscriptionError(returnCode);
        }
      },

      /**
        * @param {Subscription} subscription -
        * @param {number} seq -
        * @param {Message} msg -
        */
      sharedPublish: function(subscription, seq, msg) {
        /*
        var message = {
        // Not Null only for SUBACK events
        'suback': parseInt(item.getValue(1), 10),

        // All the following are not Null only for PUBLISH events.
        'seq': item.getValue(2) ? parseInt(item.getValue(2), 10) : null,
        'destinationName': item.getValue(3),
        'payload': item.getValue(4),
        'qos': parseInt(item.getValue(5), 10),
        'duplicate': item.getValue(6) === '1',
        'retained': item.getValue(7) === '1'
      };*/
        var sub = this.subscriptions[subscription.getItems([0])];
        if (typeof sub == 'undefined') {
          throw new Error('No subscription!');
        }

        // Put in front a null value, which represents the lack of Suback.
        var values = [
          null,
          seq,
          msg.destinationName,
          Env.encodeToBase64(msg.payloadString),
          msg.qos,
          msg.duplicate ? '1' : '0',
          msg.retained ? '1' : '0'
        ];
        sub.getListeners()[0].onItemUpdate({
          getValue: function(index) {
            return values[index - 1];
          }
        });
      }
    };

    /**
     * The CONNACK Control Packet.
     */
    var ConnAck = function(returnCode) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'CONNACK',
          'returnCode': returnCode
        }
      };
    };

    /**
     * The PUBLISH Control Packet.
     * @param {number} packetId -
     * @param {Message} message
     */
    var Publish = function(packetId, message) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'PUBLISH',
          'packetId': packetId,
          'message': {
            'qos': message.qos,
            'destinationName': message.destinationName,
            'retained': message.retained,
            'duplicate': message.duplicate,
            'payload': Env.encodeToBase64(message.payloadString)
          }
        }
      };
    };

    /**
     * The PUBACK Control Packet.
     */
    var PubAck = function(packetId) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'PUBACK',
          'packetId': packetId
        }
      };
    };

    /**
     * The PUBREC Control Packet.
     */
    var PubRec = function(packetId) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'PUBREC',
          'packetId': packetId
        }
      };
    };

    /**
     * The PUBREL Control Packet.
     */
    var PubRel = function(packetId) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'PUBREL',
          'packetId': packetId
        }
      };
    };

    /**
     * The PUBCOMP Control Packet.
     */
    var PubComp = function(packetId) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'PUBCOMP',
          'packetId': packetId
        }
      };
    };

    /**
     * The SUBACK Control Packet.
     */
    var SubAck = function(packetId, rc) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'SUBACK',
          'packetId': packetId,
          'returnCode': [rc]
        }
      };
    };

    /**
     * The UNSUBACK Control Packet.
     */
    var UnsubAck = function(packetId) {
      return {
        'type': 'CONTROL_PACKET',
        'message': {
          'type': 'UNSUBACK',
          'packetId': packetId
        }
      };
    };

    var DeliveryComplete = function(packetId) {
      return {
        'type': 'DELIVERY_COMPLETE',
        'message': packetId
      };
    };

    var ConnectionError = function() {
      return {
        'type': 'CONNECTION_ERROR'
      };
    };

    /**
     * Mock for UpdateInfo.
     *
     * @param {Object} object -
     * @param {?boolean} snapshot -
     */
    function UpdateInfo(object, snapshot) {
      this.object = object;
      this.snapshot = snapshot || false;
    }

    UpdateInfo.prototype = {

      getValue: function(index) {
        return JSON.stringify(this.object);
      },

      isSnapshot: function() {
        return this.snapshot;
      }
    };

    function onSubscribeAction(rc) {
      return function(subscription, UpdateInfo, ConnAck) {
        setTimeout(function() {
          var listener = subscription.getListeners()[0];
          listener.onItemUpdate(new UpdateInfo(ConnAck(rc), true));
        }, 100);
      };
    }

    var Scenario = {
      integration: false,
      minified: false
    };

    /**
     * @param {boolean} integration -
     */
    Scenario.setInt = function(integration) {
      this.integration = integration;
    };

    Scenario.setMinified = function(minified) {
      this.minified = minified;
    };

    Scenario.isInt = function() {
      return this.integration;
    };

    Scenario.isMin = function() {
      return this.minified;
    };

    /**
     * Prepare the mock in order to let a specified ConnAck to be notified to
     * the SubscriptionListener attached to the subscription which manages the
     * MQTT over Lightstreamer connection.
     *
     * @param {number} rc - The simulated return code.
     * @param {function} callback -
     * @param {boolean=} mockOnly -
     */
    Scenario.setupConnack = function(rc, callback, mockOnly) {
      if (typeof rc !== 'number') {
        throw new Error('Invalid [rc] argument');
      }

      if (typeof callback !== 'function') {
        throw new Error('Invalid [callback] argument:');
      }

      if (!Scenario.isInt() || mockOnly) {
        /*
        mockedLsClient.addSendMessage(function(msg, sequence, delay,
          listener) {

          var obj = JSON.parse(msg);
          if (obj['packet'] && obj['packet']['type'] == 'DISCONNECT') {
            setTimeout(function() {
              listener.onProcessed(msg);
              setTimeout(function() {
                var requestId = obj['connectionId'].split('|')[10];
                mockedLsClient.simulateConnectionLost(0, requestId);
              }, 100);
            }, 100);
            return true;
          }
          return false;
        });
        */

        var mockedLsClient = new LightstreamerClientMock(null, null,
          {
            onSubscribeAction: onSubscribeAction(rc),
            tag: 'connackScenario'
          });

        openSession.__lightstreamerFactory = function(serverAdr, adapterSet) {
          mockedLsClient.serverAddress = serverAdr;
          mockedLsClient.adapterSet = adapterSet;
          return mockedLsClient;
        };
        setTimeout(callback, 10, SERVER_ADDRESS, mockedLsClient);
      } else {
        callback(SERVER_ADDRESS, new DockerWrapper());
      }
    };

    function onNewSessionErrorAction(rc, customException) {
      return function(listener) {
        setTimeout(function() {
          listener.onServerError(rc, customException);
        }, 100);
      };
    }

    /**
     * @param {number} errorCode - The error code as sent by the server
     * @param {string} errorMessage - The error message as sent by the server
     * @param {function} callback -
     */
    Scenario.setupSessionFailure = function(errorCode, errorMessage, callback) {
      if (!Scenario.isInt()) {
        openSession.__lightstreamerFactory =
          function(serverAddress, adapterSet) {
            return new LightstreamerClientMock(serverAddress, adapterSet, {
              onConnectAction: onNewSessionErrorAction(errorCode, errorMessage)
            });
          };

        setTimeout(callback, 10, SERVER_ADDRESS);
      } else {
        DockerWrapper.restartServices(function() {
          if (errorCode == 2) {
            openSession['ADAPTER_SET'] = 'WRONG_ADAPTER-SET';
          }
          callback(SERVER_ADDRESS);
        });
      }
    };

    function onSubscribeErrorAction(errType, errMessage) {
      return function(subscription) {
        setTimeout(function() {
          var listener = subscription.getListeners()[0];
          listener.onSubscriptionError(errType, errMessage);
        }, 100);
      };
    }

    /**
     * @param {number} errorType - The error type code as sent by the Server
     * @param {string=} errorMessage - The error message as sent by the Server
     * @param {function} callback -
     * @param {boolean=} mockOnly -
     */
    Scenario.setupConnectionFailure =
      function(errorType, errorMessage, callback, mockOnly) {
        if (!Scenario.isInt() || mockOnly) {

          openSession.__lightstreamerFactory = function(serverAdr, adapterSet) {
            return new LightstreamerClientMock(serverAdr, adapterSet, {
              // TO BE FIXED. A broker connection error is transported through
              // an itemUpdate...
              onSubscribeAction: onSubscribeErrorAction(errorType,
                errorMessage)
            });
          };

          setTimeout(callback, 10, SERVER_ADDRESS);
        } else {
          callback(SERVER_ADDRESS, new DockerWrapper());
        }
      };

    /**
     * Sets the callback to be invoked ...
     * @param {function} callback - Callback to be invoked on connection
     *   establishment to the MQTT.Cool server.
     * @param {boolean=} mockOnly - Indicates whether the passed callback has
     *   to be invoked only by a mocked LightstreamerClient instance.
     */
    Scenario.setupDefault = function(callback, mockOnly) {
      if (!Scenario.isInt() || mockOnly) {
        var mockedLsClient = new LightstreamerClientMock();
        openSession.__lightstreamerFactory = function(serverAdr, adapterSet) {
          mockedLsClient.serverAddress = serverAdr;
          mockedLsClient.adapterSet = adapterSet;
          return mockedLsClient;
        };
        setTimeout(callback, 10, SERVER_ADDRESS, mockedLsClient);
      } else {
        callback(SERVER_ADDRESS, new DockerWrapper());
      }
    };

    /**
     * @param {string=} customMessage - The error message as sent by the Server
     * @param {function} callback -
     */
    Scenario.setupUnauthorizedPublishing = function(customMessage, callback) {
      Scenario.setupConnack(0, function(serverAddress, ls) {
        if (!Scenario.isInt()) {
          ls.addSendMessage(function(msg, b, c, listener) {
            var obj = JSON.parse(msg);
            if (obj.packet && obj.packet.type == 'PUBLISH') {
              setTimeout(function() {
                listener.onDeny(msg, -4, customMessage);
              }, 100);
              return true;
            }
            return false;
          });
        }
        callback(serverAddress, ls);
      });
    };

    /**
     * @param {string} clientId -
      * @param {string=} customMessage - The error message as sent by the Server
      * @param {function} callback -
      */
    Scenario.setupUnauthorizedSubscription = function(clientId, customMessage,
      callback) {

      Scenario.setupConnack(0, function(serverAddress, ls) {
        if (!Scenario.isInt()) {
          if (clientId) {
            ls.addSendMessage(function(msg, b, c, listener) {
              var obj = JSON.parse(msg);
              if (obj.packet && obj.packet.type == 'SUBSCRIBE') {
                setTimeout(function() {
                  listener.onDeny(msg, -5, customMessage);
                }, 100);
                return true;
              }
              return false;
            });
          } else {
            var currentSubscribe = ls.subscribe;
            ls.subscribe = function(subscription) {
              var item = subscription.getItems()[0];
              if (item.substring(0, 9) == 'subscribe') {
                setTimeout(function() {
                  var subscriptionListener = subscription.getListeners()[0];
                  subscriptionListener.onSubscriptionError(-5, customMessage);
                }, 500);
                return;
              }
              currentSubscribe.apply(ls, [subscription]);
            };
          }
        }
        callback(serverAddress, ls);
      });
    };

    Scenario.restartServices = function(onRestartFunction) {
      if (!Scenario.isInt()) {
        onRestartFunction();
        return;
      }

      var lsFactoryReset = false;
      var wrapper = new DockerWrapper(lsFactoryReset);
      wrapper.restartServices(function() {
        onRestartFunction(SERVER_ADDRESS, wrapper);
      });
    };

    Scenario.restartCoolAndStopBroker = function(onRestartFunction) {
      if (!Scenario.isInt()) {
        onRestartFunction();
        return;
      }

      var dockerWrapper = new DockerWrapper();

      var stopBroker = function() {
        dockerWrapper.stopBroker(function() {
          onRestartFunction(SERVER_ADDRESS, dockerWrapper);
        });
      };

      var restartMQTT = function() {
        dockerWrapper.restartMQTTCool(stopBroker);
      };

      dockerWrapper.restartServiceIfNeeded(PROXY_CONTAINER, restartMQTT);
    };

    Scenario.restartCool = function(onRestartFunction) {
      if (!Scenario.isInt()) {
        onRestartFunction();
        return;
      }

      var dockerWrapper = new DockerWrapper();
      dockerWrapper.restartServiceIfNeeded(PROXY_CONTAINER, function() {
        dockerWrapper.restartMQTTCool(function() {
          onRestartFunction(SERVER_ADDRESS, dockerWrapper);
        });
      });
    };

    Scenario.init = function() {
      openSession.__resetFactory();
    };

    Scenario.newMock = function(opt) {
      return new LightstreamerClientMock(opt);
    };

    Scenario.serverAddress = SERVER_ADDRESS;

    /**
     * @param {function} func -
     * @param {number} delay -
     */
    Scenario.delay = function(func, delay) {
      if (!Scenario.isInt()) {
        setTimeout(func, delay);
      }
    };

    return Scenario;
  });
