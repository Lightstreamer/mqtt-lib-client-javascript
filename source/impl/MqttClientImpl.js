/*
 * Copyright (C) 2017 Lightstreamer Srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {LightstreamerClient} from 'lightstreamer-client-stub';
import {Subscription} from 'lightstreamer-client-stub';
import LoggerManager from '../LoggerManager';
import Objects from '../utils/Objects';
import Errors from '../utils/Errors';
import Json from '../utils/Json';
import Env from '../utils/Env';
import Store from '../store/Store';
import Message from '../Message';
import MqttSubscribeOptions from './MqttSubscribeOptions';
import MqttUnsubscribeOptions from './MqttUnsubscribeOptions';
import MqttConnectOptions from './MqttConnectOptions';

    var logger = LoggerManager.getLoggerProxy('mqtt.cool');

    /**
     * Identifies the unique instance of MqttClient.
     * @type {number}
     * @private
     */
    var counter = 0;

    /**
      * All possible Client states.
      * enum {number}
      * @private
      */
    var STATUS = {
      'DISCONNECTED': 0,
      'CONNECTING': 1,
      'CONNECTED': 2,
      'RETRY': 3,
      'RECOVERY': 4,
      'DISCONNECTING': 5,

      getStr: function(statusValue) {
        for (var statusKey in STATUS) {
          if (STATUS[statusKey] == statusValue) {
            return statusKey;
          }
        }
      }
    };

    /**
     *
     * CONNACK RC Meaning.
     * @private
     */
    var CONNACK_RC = {
      0: 'Connection Accepted',
      1: 'Connection Refused: unacceptable protocol version',
      2: 'Connection Refused: identifier rejected',
      3: 'Connection Refused: server unavailable',
      4: 'Connection Refused: bad user name or password',
      5: 'Connection Refused: not authorized'
    };

    /**
     * @param {?string=} value -
     * @return {string}
     * @private
     */
    function encode(value) {
      if (typeof value == 'undefined' || value == null) {
        return '#';
      }

      if (!value) {
        return '$';
      }

      return Objects.checkUTF8(value);
    }

    /**
     * @param {!Array<string>} filterLevels
     * @param {string} topicName
     * @return {boolean}
     * @private
     */
    function matchSubscription(filterLevels, topicName) {
      // Split topic name to match with in separated levels. A topic name
      // cannot contains wildcards.
      var topicNameLevels = topicName.split('/');

      // Filter levels cannot be more than topic levels.
      if (filterLevels.length > topicNameLevels.length) {
        return false;
      }

      /** @type {number} */
      var min = Math.min(topicNameLevels.length, filterLevels.length);

      var matches = true;
      var i = 0;
      for (; i < min && matches; i++) {
        if (filterLevels[i] === '#') {
          return true;
        }

        matches = (topicNameLevels[i] === filterLevels[i] ||
          filterLevels[i] === '+');
      }

      return matches && i == topicNameLevels.length;
    }

    /**
     * @typedef {Object} RealTimeEvent
     * @property {number} suback
     * @property {?number} seq
     * @property {string} destinationName
     * @property {number} qos
     * @property {boolean} retained
     * @property {boolean} duplicate
     * @property {string} payload
     * @private
     */

    /**
     * @param {ItemUpdate} item
     * @return {RealTimeEvent}
     * @private
     */
    function decodeEventFromItem(item) {
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
      };

      return message;
    }

    /**
     * @constructor
     * @param {Object} body - Object literal containing the properties to be
     *   packaged as a JSON string for later delivery to MQTT.Cool.
     * @param {boolean=} requireAck - Optional flag indicating whether the
     *   packet requires an acknowledge back from MQTT.Cool.
     * @ignore
     */
    var Packet = function(body, requireAck) {
      this['body'] = body;

      /** @type {boolean} */
      this.notified = false;

      /**
       * Indicate whether this packet has to be processed immediately.
       * @type {boolean}
       */
      this.immediateDelivery = true;

      /** @type {boolean} */
      this.requireAck =
        (typeof requireAck != 'undefined') ? requireAck : false;

      /**
       * Use this style as it will be checked in unit tests, which will use
       * the minified version too.
       * @type {number}
       */
      this['processed'] = 0;

      /**
       * Use this style as it will be checked in unit tests, which will use
       * the minified version too.
       * @type {number}
       */
      this['aborted'] = 0;
    };

    /**
     * @enum {string}
     * @private
     */
    Packet.Type = {
      CONNECT: 'CONNECT',
      CONNACK: 'CONNACK',
      DISCONNECT: 'DISCONNECT',
      SUBSCRIBE: 'SUBSCRIBE',
      UNSUBSCRIBE: 'UNSUBSCRIBE',
      SUBACK: 'SUBACK',
      UNSUBACK: 'UNSUBACK',
      PUBLISH: 'PUBLISH',
      PUBACK: 'PUBACK',
      PUBREL: 'PUBREL',
      PUBREC: 'PUBREC',
      PUBCOMP: 'PUBCOMP'
    };

    /**
     * @return {!Packet}
     * @private
     */
    Packet.newDISCONNECT = function() {
      return new Packet({ 'type': Packet.Type.DISCONNECT }, false);
    };

    /**
     * @param {Message} message
     * @return {!Packet}
     * @private
     */
    Packet.newPUBLISH = function(message) {
      var pub = new Packet({
        'type': Packet.Type.PUBLISH,
        'packetId': null,
        'message': Json.encodeMessageToJson(message)
      });
      return pub;
    };

    /**
     * @param {number} packetId
     * @return {!Packet}
     * @private
     */
    Packet.newPUBACK = function(packetId) {
      return new Packet({ 'type': Packet.Type.PUBACK, 'packetId': packetId },
        false);
    };

    /**
     * @param {number} packetId
     * @return {!Packet}
     * @private
     */
    Packet.newPUBREC = function(packetId) {
      return new Packet({ 'type': Packet.Type.PUBREC, 'packetId': packetId },
        false);
    };

    /**
     * @param {number} packetId
     * @param {boolean=} restored - Specifies whether this PUBREL packet is
     *   relative to a redelivery in the context of a session restore.
     * @return {!Packet}
     * @private
     */
    Packet.newPUBREL = function(packetId, restored) {
      var pubRelBody = { 'type': Packet.Type.PUBREL, 'packetId': packetId };
      if (typeof restored !== 'undefined') {
        pubRelBody['restored'] = restored;
      }
      return new Packet(pubRelBody, false);
    };

    /**
     * @param {number} packetId
     * @return {!Packet}
     * @private
     */
    Packet.newPUBCOMP = function(packetId) {
      return new Packet(
        {
          'type': Packet.Type.PUBCOMP, 'packetId': packetId
        },
        false);
    };

    /**
     * @param {number} packetId
     * @param {string} topicFilter
     * @param {number} qos
     * @param {function} options
     * @return {!Packet}
     * @private
     */
    Packet.newSUBSCRIBE = function(packetId, topicFilter, qos, options) {
      var subPacket = new Packet({
        'type': Packet.Type.SUBSCRIBE,
        'packetId': packetId,
        'topicFilter': topicFilter,
        'qos': qos
      }, true);
      subPacket.options = options;
      return subPacket;
    };

    /**
     * @param {number} packetId
     * @param {string} topicFilter
     * @param {function} options
     * @param {Packet} subPacket
     * @return {!Packet}
     * @private
     */
    Packet.newUNSUBSCRIBE = function(packetId, topicFilter, options,
      subPacket) {
      var unsubPacket = new Packet({
        'type': Packet.Type.UNSUBSCRIBE,
        'packetId': packetId,
        'topicFilter': topicFilter
      }, true);
      unsubPacket.options = options;
      unsubPacket['sourceSubPacket'] = subPacket;
      return unsubPacket;
    };

    Packet.prototype = {

      /**
       * @param {string} connectionId
       * @return {string}
       * @private
       */
      getEncoded: function(connectionId) {
        /** @type {{connectionId:string, packet}} */
        var coolPacket = {
          'connectionId': connectionId,
          'packet': this['body']
        };

        return JSON.stringify(coolPacket);
      },

      /**
       * Returns a JSON string of the current Packet internal status.
       * @return {string} - JSON string of the Packet internal status
       * @private
       */
      getStatus: function() {
        var status = {
          'type': this['body']['type'],
          'packetId': this['body']['packetId'],
          'processed': this['processed'],
          'aborted': this['aborted'],
          'notified': this.notified
        };

        return JSON.stringify(status);
      },

      /**
       * @param {number} code
       * @private
       */
      onSuccess: function(code) { },

      /**
       * @private
       */
      onFailure: function() { }

    };

    /**
     * @private
     * @constructor
     * @param {Object} [delegate]
     */
    var ProtocolListener = function(delegate) {
      this._delegate = delegate;
    };

    ProtocolListener.prototype = {

      /**
       * @param {number} packetId -
       * @private
       */
      onConnAckReceived: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onConnAckReceived', [packetId]);
        }
      },

      /**
       * Event handler invoke soon after the subscription request is submitted.
       *
       * @param {Packet} subPacket -
       * @private
       */
      onSubscribe: function(subPacket) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSubscribe', [subPacket]);
        }
      },

      /**
       * @param {number} packetId -
       * @param {number} returnCode -
       * @private
       */
      onSubAckReceived: function(packetId, returnCode) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSubAckReceived', [packetId,
            returnCode]);
        }
      },

      /**
       * @param {number} packetId -
       * @param {number} returnCode -
       * @private
       */
      onSubAckProcessed: function(packetId, returnCode) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSubAckProcessed', [packetId,
            returnCode]);
        }
      },

      /**
       * @param {Subscription} subscription -
       * @private
       */
      onSharedSubscription: function(subscription) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSharedSubscription',
            [subscription]);
        }
      },

      /**
       * @param {Subscription} subscription -
       * @param {RealTimeEvent} event -
       * @private
       */
      onSharedSubscriptionAckReceived: function(subscription, event) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSharedSubscriptionAckReceived',
            [subscription, event]);
        }
      },

      /**
       * @param {Subscription} subscription -
       * @param {RealTimeEvent} event -
       * @private
       */
      onSharedSubscriptionAckProcessed: function(subscription, event) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSharedSubscriptionAckProcessed',
            [subscription, event]);
        }
      },

      /**
       * @param {Subscription} [subscription] -
       * @private
       */
      onSharedUnsubscription: function(subscription) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onSharedUnsubscription',
            [subscription]);
        }
      },

      /**
        * Event handler invoke soon after the unsubscription request has been
        * submitted.
        * @param {!Packet} unsubPacket -
        * @private
        */
      onUnsubscribe: function(unsubPacket) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onUnsubscribe', [unsubPacket]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onUnsubAckReceived: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onUnsubAckReceived', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onUnsubAckProcessed: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onUnsubAckProcessed', [packetId]);
        }
      },

      /**
       * @param {Packet} packet -
       * @private
       */
      onPublishReceived: function(packet) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPublishReceived', [packet]);
        }
      },

      /**
       * @param {Packet} packet -
       * @private
       */
      onPublishProcessed: function(packet) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPublishProcessed', [packet]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubAckReceived: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubAckReceived', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubAckProcessed: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubAckProcessed', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @param {function} doOnPubRec -
       * @private
       */
      onPubRecReceived: function(packetId, doOnPubRec) {
        if (this._delegate &&
          typeof this._delegate['onPubRecReceived'] == 'function') {
          Objects.invoke(this._delegate, 'onPubRecReceived', [packetId,
            doOnPubRec]);
        } else {
          doOnPubRec();
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubRecProcessed: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubRecProcessed', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubRelReceived: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubRelReceived', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubRelProcessed: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubRelProcessed', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubCompReceived: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubCompReceived', [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onPubCompProcessed: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPubCompProcessed', [packetId]);
        }
      },


      /**
       * @param {number} pubPacket -
       * @private
       */
      beforePublishing: function(pubPacket) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'beforePublishing', [pubPacket]);
        }
      },

      /**
       * @param {number} pubPacket -
       * @private
       */
      onPublish: function(pubPacket) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onPublish', [pubPacket]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onDeliveryCompleteReceived: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onDeliveryCompleteReceived',
            [packetId]);
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      onDeliveryCompleteProcessed: function(packetId) {
        if (this._delegate) {
          Objects.invoke(this._delegate, 'onDeliveryCompleteProcessed',
            [packetId]);
        }
      }
    };

    /**
      * @constructor
      * @implements {MqttClient}
      * @param {string} brokerAlias
      * @param {string} clientId
      * @param {!LightstreamerClient} lsClient
      * @ignore
      */
    var MqttClientImpl = function(brokerAlias, clientId, lsClient) {
      logger.debug('Creating a new instance of MqttClient');

      /**
       * @type {string}
       * @private
       */
      this._brokerAddress = brokerAlias;

      /**
       * @type {string}
       * @private
       */
      this._clientId = clientId;

      /**
       * @type {LightstreamerClient}
       * @private
       */
      this._lsClient = lsClient;
      //this._lsClient.addListener(this);

      /**
       * @type {ProtocolListener}
       * @private
       */
      this._protocolListener = new ProtocolListener();

      /**
       * @type {Function}
       * @private
       */
      this._selectorStrategy = null;

      /**
       * @type {Function}
       * @private
       */
      this._onConnectionLost = null;

      /**
       * @type {Function}
       * @private
       */
      this._onReconnectionStart = null;

      /**
       * @type {Function}
       * @private
       */
      this._onReconnectionComplete = null;

      /**
       * @type {Function}
       * @private
       */
      this._onMessageArrived = null;

      /**
       * @type {Function}
       * @private
       */
      this._onMessageDelivered = null;

      /**
       * @type {Function}
       * @private
       */
      this._onMessageNotAuthorized = null;

      // Initialize client status.
      this._init();

      logger.logInfo('New MqttClient instance created:', this._clientId);
    };

    MqttClientImpl.prototype = {

      _getClientId: function() {
        return this._clientId;
      },

      _getConnectionOptions: function() {
        return this._mqttConnectOptions;
      },

      _getStore: function() {
        return this._store;
      },

      _getBrokerAddress: function() {
        return this._brokerAddress;
      },

      _getStatus: function() {
        return this._status;
      },

      _getConnectionId: function() {
        var cleanSession = this._mqttConnectOptions.getCleanSession() ? '1' :
          '0';
        var connectionId = [
          this._brokerAddress,
          encode(this._mqttConnectOptions.getUsername()),
          encode(this._mqttConnectOptions.getPassword()),
          cleanSession,
          this._clientId,
          this._requesterId].join('|');

        return connectionId;
      },

      _peek: function() {
        if (this._message_queue.length > 0) {
          return this._message_queue[this._message_queue.length - 1];
        }

        return undefined;
      },

      _getMessageQueueSize: function() {
        return this._message_queue.length;
      },

      _getMessageQueue: function() {
        return this._message_queue;
      },

      _getSentMessages: function() {
        return this._sentMessages;
      },

      _getReceivedMessages: function() {
        return this._receivedMessages;
      },

      _getActiveSubscriptions: function() {
        return this._activeSubscriptions;
      },

      _getActiveSharedSubscriptions: function() {
        return this._activeSharedSubs;
      },

      _setProtocolListener: function(listener) {
        this._protocolListener = new ProtocolListener(listener);
      },

      _setSelectorStrategy: function(func) {
        this._selectorStrategy = func;
      },

      /**
       * @throws {Error}
       * @private
       */
      _checkState: function() {
        if (this._status == STATUS['DISCONNECTED'] ||
          this._status == STATUS['DISCONNECTING']) {
          logger.logError('Invalid state:', STATUS.getStr(this._status));
          throw Error('Invalid state');
        }
      },

      /**
       * @override
       */
      disconnect: function() {
        this._checkState();

        if (this._status == STATUS['RETRY'] || this._status == STATUS['RECOVERY']) {
          logger.debug('Disconnect invoked forcibly while trying to recover' +
            ' the connection, stopping');
          this._stop(Errors.Types.MQTTCOOL_CONNECTION_ERROR);
          return;
        }

        if (this._status == STATUS['CONNECTING']) {
          logger.debug('Disconnect invoked forcibly while connecting, ' +
            'stopping');
          this._stop(Errors.Types.MQTTCOOL_DISCONNECTION);
          return;
        }

        this._status = STATUS['DISCONNECTING'];

        // Since messages are sent in order, we are sure that the
        // DISCONNECT packet arrives to MQTT.Cool and from there to the MQTT
        // broker, just after all previous messages have been sent.
        // Without sending an explicit DISCONNECT packet, we would not be able
        // to distinguish, on the server side, between an explicit disconnect
        // request and an unsubscription from the connection item. Therefore
        // it would be impossible from the server behalf to explicitly
        // disconnect from the MQTT broker.
        // On the other hand, for a shared connection, the message has only
        // the purpose of logging the operation on the server side.
        var self = this;
        var disconnectPacket = Packet.newDISCONNECT();
        disconnectPacket.postProcess = function() {
          setTimeout(function() {
            self._stop(Errors.Types.SUCCESSFUL_DISCONNECTION);
          }, 0);
        };
        disconnectPacket.postAbort = disconnectPacket.postProcess;
        this._sendMessage(disconnectPacket);
        logger.debug('DISCONNECT packet scheduled for delivery');
      },

      /**
       * @override
       */
      subscribe: function(topicFilter, opt_subscribeOptions) {
        var qos = 0;
        if (opt_subscribeOptions) {
          qos = opt_subscribeOptions['qos'] || qos;
        }
        logger.debug('Subscribing to topicFilter <' + topicFilter + '> with ' +
          'QoS <' + qos + '>');

        // Invocation allowed only if not DISCONNECTED.
        this._checkState();

        // Check UTF8 compliance for the topicFilter argument.
        Objects.checkUTF8(topicFilter, 'topicFilter');

        // Set up the subscription options. This may throw an Exception in case
        // of wrong options.
        var opt = new MqttSubscribeOptions(opt_subscribeOptions);

        // Dispatch the subscription.
        this._doSubscribe(topicFilter, opt);
        logger.info('Subscription scheduled for being sent to MQTT.Cool');
      },

      /**
       * @override
       */
      unsubscribe: function(topicFilter, unsubscribeOptions) {
        // Invocation allowed only if not DISCONNECTED.
        this._checkState();

        // Check UTF8 compliance for the topicFilter argument.
        Objects.checkUTF8(topicFilter, 'topicFilter');

        // Set up the unsubscription options. This may throw an Exception in case
        // of wrong options.
        var opt = new MqttUnsubscribeOptions(unsubscribeOptions);
        this._doUnsubscribe(topicFilter, opt);
      },

      /**
       * @override
       */
      send: function(topic, payload, qos, retained) {
        logger.logDebug('Sending a message');
        this._checkState();

        var message = null;

        if (arguments.length == 0) {
          logger.error('Invalid arguments length');
          throw new Error('Invalid arguments length');
        }

        if (arguments.length == 1) {
          logger.debug('Passed one parameter only, checking if is of right ' +
            'type');
          if (!(topic instanceof Message)) {
            throw new Error('Invalid argument');
          }
          logger.debug('The passed parameter is a Message');

          // The first formal argument is actually a Message instance.
          message = topic;

          // In case of the destinationName field is not initialized.
          if (!message['destinationName']) {
            throw Error('Invalid [destinationName] argument');
          }
        } else {
          logger.debug('Passed ' + arguments.length + ' parameters, building ' +
            'a Message instance');
          message = new Message(payload);

          // All following assignments may throw an Exception.
          message['destinationName'] = topic;

          if (arguments.length >= 3) {
            message['qos'] = qos;
          }

          if (arguments.length >= 4) {
            message['retained'] = retained;
          }
          logger.debug('Message instance built');
        }

        this._doSend(message);
        logger.info('Message scheduled for being sent to MQTT.Cool');
      },

      /**
       * @override
       */
      connect: function(mqttConnectOptions) {
        logger.debug('Connecting to the MQTT broker through the MQTT.Cool...');
        if (this._status != STATUS['DISCONNECTED']) {
          logger.logError('Invalid state:', STATUS.getStr(this._status));
          throw Error('Invalid state');
        }

        var connectOptions = new MqttConnectOptions(mqttConnectOptions);
        if (logger.isDebugLogEnabled()) {
          logger.logDebug('Connection Options built:', connectOptions.toJson());
        }

        // Initialize the store in case of dedicated connection without
        // clean session.
        if (this._clientId) {
          // Check if local storage can be open.
          logger.debug('Opening the store');
          var store = new Store();
          var storeEnabled = store.open(this._brokerAddress, this._clientId,
            connectOptions.getStorage());
          if (storeEnabled) {
            this._store = store;
            logger.debug('The store is enabled');
          } else {
            logger.warn('The store is NOT enabled');
          }

          // In case of clean session set to false, it is mandatory to have a
          // working local storage, otherwise it would be impossible to
          // store the session state.
          if (!connectOptions.getCleanSession() && !storeEnabled) {
            throw Error('No Local Storage is available');
          }
        } else {
          // Check the coherence among supplied parameters.
          if (!connectOptions.getCleanSession()) {
            throw Error('Invalid [cleanSession] value for a shared ' +
              'connection: ' + connectOptions.getCleanSession());
          }

          if (connectOptions.getWillMessage()) {
            throw Error('Invalid [willMessage] value for a shared ' +
              'connection: ' + connectOptions.getWillMessage());
          }

          if (connectOptions.getStorage()) {
            throw Error('Invalid [storage] value for a shared connection: ' +
              connectOptions.getStorage());
          }
        }

        this._mqttConnectOptions = connectOptions;

        var willMessage = this._mqttConnectOptions.getWillMessage() ||
          {
            'qos': '',
            'destinationName': '',
            'retained': '',
            'payloadString': '',
          };

        // Concatenate the tokens relative to the Will Message.
        var willMessagePart = [
          String(willMessage['qos']),
          encode(willMessage['destinationName']),
          willMessage['retained'] === true ? '1' : '0',
          Env.encodeToBase64(willMessage['payloadString'])
        ].join('|');

        var itemName = 'connection' + '|' + willMessagePart + '|' +
          this._getConnectionId();

        var snapshot = this._clientId ? 'no' : 'yes';
        this._connectionSubscription = new Subscription('DISTINCT');
        this._connectionSubscription.setItems([itemName]);
        this._connectionSubscription.setFieldSchema('connection_schema');
        this._connectionSubscription.setDataAdapter('Connector');
        this._connectionSubscription.setRequestedSnapshot(snapshot);
        this._connectionSubscription.setRequestedMaxFrequency('unfiltered');
        this._connectionSubscription.addListener(this);
        logger.debug('Connection Subscription built');

        this._status = STATUS['CONNECTING'];
        this._lsClient.addListener(this);
        this._lsClient.subscribe(this._connectionSubscription);
        if (this._lsClient.getStatus() == 'DISCONNECTED:TRYING-RECOVERY') {
          this.onStatusChange(this._lsClient.getStatus());
        }
        logger.info('Connection request submitted to MQTT.Cool');
      },

      _init: function() {
        /**
         * Subscription to handle communications with Lightstreamer server.
         * @type {Subscription}
         * @private
         */
        this._connectionSubscription = null;

        /**
         * Map of messaging requiring an ack.
         * @type {!Object<number, Packet>}
         * @private
         */
        this._sentMessages = {};

        /**
         * Map of received PUBLISH messages.
         * @type {!Object<number, Packet>}
         * @private
         */
        this._receivedMessages = {};

        /**
         * Array of pending messages to be sent in the sending order.
         * @type {!Array<Packet>}
         * @private
         */
        this._message_queue = [];

        /**
         * The packetId counter.
         * @type {number}
         * @private
         */
        this._messageCounter = 0;

        /**
         * Submitted subscriptions by their topic filter. This map is only used
         * for automatic resubmission in case of disconnection from MQTT.Cool
         * in a dedicated connection with clean session set to true.
         * @type {!Object<string, Packet>}
         * @private
         */
        this._activeSubscriptions = {};

        /**
         * Submitted shared subscriptions mapped by their topic filter.
         * @type {!Object<string, Subscription>}
         * @private
         */
        this._activeSharedSubs = {};

        /**
         * Keeps the last sequence id for that topic, in order to avoid
         * duplicate or unordered messages.
         * @type {!Object<string, Object>}
         * @private
         */
        this._orderedSequencesForTopic = {};

        /**
         * @type {?internalEventType}
         * @private
         */
        this._lastEvent = null;

        /**
         * Connection options for MQTT broker.
         * @type {!MqttConnectOptions}
         * @private
         */
        this._mqttConnectOptions = null;

        /**
         * The storage for persistence session.
         * @type {!Store}
         * @private
         */
        this._store = null;

        /**
         * Initial STATUS.
         * @type {STATUS}
         * @private
         */
        this._status = STATUS['DISCONNECTED'];

        /**
         * Connection request counter, which allows to differentiate the
         * connection item at every connection.
         * @type {number}
         * @private
         */
        this._requesterId = counter++;
      },

      /**
       * @param {Errors.Types} errorType -
       * @param {Object=} customMsg -
       */
      _stop: function(errorType, customMsg) {
        // Unsubscribe from current shared subscriptions.
        for (var topicFilter in this._activeSharedSubs) {
          this._lsClient.unsubscribe(
            this._activeSharedSubs[topicFilter].subscription);
        }

        if (this._connectionSubscription) {
          this._lsClient.unsubscribe(this._connectionSubscription);
        }
        this._lsClient.removeListener(this);

        // Save here the current state of the variables, before resetting them.

        /** @type {STATUS} */
        var currentStatus = this._status;

        /** @type string */
        var currentStatusStr = STATUS.getStr(currentStatus);

        /** @type {MqttConnectOptions} */
        var currentConnectOptions = this._mqttConnectOptions;

        // Reset the client state.
        this._init();

        if (errorType instanceof Error) {
          logger.logError('Client stop due to an error', errorType);
          Objects.invoke(this, 'onError', [errorType]);
          return;
        }

        switch (currentStatus) {
          /*case STATUS['DISCONNECTED']:
            logger.debug('Client already disconnected, nothing to do.');
            break;
            */

          case STATUS['CONNECTING']:
            logger.debug('Client in CONNECTING status, interrupt and notify ' +
              'by invoking of "onFailure()"');

            var responseObj;

            if (errorType == Errors.Types.UNAUTHORIZED_CONNECTION) {
              logger.debug('Unauthorized connection, interrupt and notify by' +
                'invoking of "onNotAuthorized()"');
              responseObj = Errors.evalMsg(customMsg);
              currentConnectOptions.onNotAuthorized(responseObj);
            } else if (errorType == Errors.Types.BROKER_CONNECTION_REFUSED) {
              currentConnectOptions.onFailure(customMsg);
            } else if (errorType == Errors.Types.SERVER_ERROR) {
              responseObj = Objects.makeErrorEvent(errorType.code, customMsg);
              currentConnectOptions.onFailure(responseObj);
            } else {
              currentConnectOptions.onFailure(errorType.responseObj);
            }
            break;

          case STATUS['CONNECTED']:
          case STATUS['DISCONNECTING']:
            logger.debug('Client in ' + currentStatusStr + ' status, ' +
              'interrupt and notify by invoking "onConnectionLost()"');
            Objects.invoke(this, 'onConnectionLost', [errorType.responseObj]);
            break;

          case STATUS['RETRY']:
          case STATUS['RECOVERY']:
            logger.debug('Client in ' + currentStatus + ' status, interrupt ' +
              'and notify by invoking "onConnectionLost()"');
            Objects.invoke(this, 'onConnectionLost', [errorType.responseObj]);
            break;

          default:
            break;
        }
      },

      onSubscriptionError: function(code, message) {
        var event = Objects.makeErrorEvent(code, message);
        logger.logWarn('Subscription Error:', event);
        var errorType = Errors.fromCode(code);
        if (errorType == Errors.Types.SERVER_ERROR) {
          message = 'SERVER_ERROR=> code: <' + code + '>, message: <' +
            message + '>';
        }
        this._stop(errorType, message);
      },

      /**
       * Pushes a packet into the message queue.
       *
       * @param {Packet} packet - The packet to be pushed into the message
       *   queue.
       * @private
       */
      _pushMessage: function(packet) {
        this._message_queue.push(packet);
        if (packet.immediateDelivery) {
          this._sendMessage(packet);
        }
      },

      /**
       * Adds a packet to the beginning of the message queue, in order to be
       * the first sent.
       *
       * @param {!Packet} packet - The packet to be put to the front of the
       *   message queue.
       * @param {boolean=} opt_autoSend - An optional flag which indicates
       *   whether the message queue has to be processed immediately.
       * @private
       */
      _offerMessage: function(packet, opt_autoSend) {
        this._message_queue.unshift(packet);
        if (opt_autoSend || typeof opt_autoSend == 'undefined') {
          this._sendMessage(packet);
        }
      },

      /**
       * Removes the specified packet from the message queue.
       *
       * @param {Packet|function} packet - The Packet instance to be removed
       *   from the message queue, or the callback function to be executed for
       *   each element of the message queue to find the packet to removed.
       * @private
       */
      _removeMessage: function(packet) {
        var packetIndex = -1;
        if (typeof packet == 'function') {
          for (var i = 0; i < this._message_queue.length; i++) {
            if (packet(this._message_queue[i])) {
              packetIndex = i;
              break;
            }
          }
        } else {
          packetIndex = this._message_queue.indexOf(packet);
        }

        if (packetIndex != -1) {
          var removed = this._message_queue.splice(packetIndex, 1);
          logger.logDebug('Removed packet: ' + removed[0].getStatus() +
            ' from the message queue');
        } else {
          logger.logDebug('No packet to remove has been found');
        }
      },

      /**
       * @private
       */
      _processQueue: function() {
        logger.debug('Queue processing...');

        if (this._message_queue.length == 0) {
          logger.debug('No messages to process from the Queue');
          return;
        }

        var queue = this._message_queue.slice().reverse();
        /** @type {Packet} */
        var packet = null;
        while ((packet = queue.pop())) {
          this._sendMessage(packet);
          logger.debug('Submitted packet: ' + packet.getStatus());
        }

        logger.debug('Queue processed');
      },

      /**
       * Sends a Packet to MQTT.Cool through the LightstreamerClient.sendMessage
       * method.
       *
       * @param {!Packet} packet - The packet to be sent.
       * @private
       */
      _sendMessage: function(packet) {
        logger.debug('Sending: ' + packet.getStatus());
        var encodedData = packet.getEncoded(this._getConnectionId());
        var self = this;
        this._lsClient.sendMessage(encodedData, 'PROTOCOL', 2000, {
          onProcessed: function(/** originalMessage */) {
            // If this packet does not require any ack, remove it immediately
            // from the message queue, to avoid redelivery in case of
            // reconnection.
            if (!packet.requireAck) {
              self._removeMessage(packet);
            }
            packet['processed']++;
            logger.logDebug('Processed:', packet.getStatus());
            if (packet.postProcess) {
              packet.postProcess();
            }
          },

          onDiscarded: function(originalMessage) {
            logger.warn('Message discarded');
          },

          onAbort: function(originalMessage, sentOnNetwork) {
            packet['aborted']++;
            logger.logWarn('Aborted for requester ' + self._requesterId +
              ' <sent ' + sentOnNetwork + '>:', packet.getStatus());
            if (packet.postAbort) {
              packet.postAbort();
            }
          },

          onDeny: function(originalMessage, code, message) {
            logger.warn('Message denied: (' + code + ', ' + message + ')');

            // Removed from messages requiring an ack.
            if (packet.requireAck) {
              logger.debug('Removing the message from sent messages, as it ' +
                'requires an ack');
              delete self._sentMessages[packet['body']['packetId']];
            }

            // Remove from message queue to avoid redelivery in case of
            // reconnection.
            self._removeMessage(packet);

            // Invoke the associated callback, if any.
            if (packet.onDenied) {
              packet.onDenied(code, message);
            }
          },

          onError: function(originalMessage) {
            logger.logWarn('onError while sending < ' + packet.getStatus() +
              '> for requestId:' + self._requesterId);
            packet.failed = true;
          }

        }, false);
      },

      /**
       * @param {string} topicFilter - The topic filter.
       * @param {!MqttSubscribeOptions} mqttSubscribeOptions -
       *   The subscribe options.
       * @private
       */
      _doSubscribe: function(topicFilter, mqttSubscribeOptions) {
        if (this._clientId) {
          this._doDedicatedSubscribe(topicFilter, mqttSubscribeOptions);
        } else {
          this._doSharedSubscribe(topicFilter, mqttSubscribeOptions);
        }
      },

      /**
       * To request a subscription in the case of dedicated connection, send
       * a message.
       *
       * @param {string} topicFilter - The topic filter to subscribe to.
       * @param {!MqttSubscribeOptions} mqttSubscribeOptions - The subscribe
       *   options.
       * @private
       */
      _doDedicatedSubscribe: function(topicFilter, mqttSubscribeOptions) {
        /** @type {?Packet} */
        var subPacket = Packet.newSUBSCRIBE(++this._messageCounter,
          topicFilter,
          mqttSubscribeOptions.getQoS(),
          mqttSubscribeOptions);

        subPacket.onDenied = function(errCode, errMsg) {
          // errType MUST BE Errors.Types.UNAUTHORIZED_SUBSCRIPTION
          var errType = Errors.fromCode(errCode);
          var responseObj = Errors.evalMsg(errMsg);
          mqttSubscribeOptions.onNotAuthorized(responseObj);
        };

        this._sentMessages[subPacket['body']['packetId']] = subPacket;
        this._pushMessage(subPacket);
        logger.debug('SUBSCRIBE packet scheduled for delivery');

        this._protocolListener.onSubscribe(subPacket);
      },

      /**
       * Requests a subscription in the case of shared connection, by means
       * of native Lightstreamer subscription.
       *
       * @param {string} topicFilter - The topic filter to subscribe to.
       * @param {!MqttSubscribeOptions} options - The subscribe options.
       * @private
       */
      _doSharedSubscribe: function(topicFilter, options) {
        var activeSubscription = this._activeSharedSubs[topicFilter];

        // Managing resubscription (even with same QoS, as allowed by the MQTT
        // protocol).
        if (activeSubscription) {
          var self = this;
          var resubscribe = function(subscription) {
            subscription.addListener({
              onUnsubscription: function() {
                subscription.removeListener(this);
                self._submitSharedSubscription(topicFilter, options);
              }
            });
            self._lsClient.unsubscribe(subscription);
          };
          if (activeSubscription.subscription.isSubscribed()) {
            resubscribe(activeSubscription.subscription);
          } else {
            activeSubscription.tasks.push(resubscribe);
          }
        } else {
          this._submitSharedSubscription(topicFilter, options);
        }
      },

      /**
       * @param {string} topicFilter -
       * @param {!MqttSubscribeOptions} options -
       * @private
       */
      _submitSharedSubscription: function(topicFilter, options) {
        var qos = options.getQoS();
        var itemName = 'subscribe|' + qos + '|' + encode(topicFilter) + '|' +
          this._getConnectionId();
        var sharedSubscription = new Subscription('MERGE');
        sharedSubscription.setItems([itemName]);
        sharedSubscription.setFieldSchema('subscribe_schema');
        sharedSubscription.setDataAdapter('Connector');
        sharedSubscription.setRequestedSnapshot('no');

        var selectorStrategy = this._selectorStrategy || function() {
          var selector = Math.random().toString(36).slice(-10);
          return selector;
        };

        sharedSubscription.setSelector(selectorStrategy());
        sharedSubscription.setRequestedMaxFrequency(qos > 0 ? 'unfiltered' :
          options.getRequestedMaxFrequency());

        // Register this subscription by the topicFilter.
        var activeSubscription = this._activeSharedSubs[topicFilter];
        if (activeSubscription) {
          activeSubscription.subscription = sharedSubscription;
        } else {
          this._activeSharedSubs[topicFilter] = {
            // Lightstreamer Subscription
            subscription: sharedSubscription,

            // Keep track of all matched topics.
            matchedDestinations: {},

            // Queue of tasks to be executed upon SUBACK
            tasks: [],
          };
        }

        var self = this;
        var subscriptionListener = {
          notified: false,

          onListenStart: function(subscription) {
            self._protocolListener.onSharedSubscription(subscription);
          },

          onSubscription: function() {
            logger.debug('Subscription on shared connection to <' + topicFilter
              + '> has ' + 'been submitted to MQTT.Cool');

            // Send a subscribe packet to actually submit the subscription
            // request to the MQTT broker. This way, ack and messages coming
            // from the MQTT broker can be transported by the Lightstreamer
            // subscription just acknowledged.
            logger.debug('Sending SUBSCRIBE packet to enable the MQTT ' +
              'subscription');
            var subPacket = Packet.newSUBSCRIBE(-1, topicFilter, qos);
            subPacket.requireAck = false;
            self._sendMessage(subPacket);
          },

          onSubscriptionError: function(code, message) {
            logger.logWarn('Received error for subscription on shared ' +
              'connection', code, message);
            var errType = Errors.fromCode(code);

            // For the moment, just unsubscribe here, waiting for an answer by
            // Simone about strange reconnection attempts in case of
            // CreditsException.
            self._lsClient.unsubscribe(sharedSubscription);

            switch (errType) {
              // The Hook denied the authorization.
              case Errors.Types.UNAUTHORIZED_SUBSCRIPTION:
                // Evaluate the custom message if any.
                var responseObj = Errors.evalMsg(message);
                options.onNotAuthorized(responseObj);
                return;

              // Conflicting selector.
              case Errors.Types.CONFLICTING_SELECTOR:
                logger.warn('Conflicting selector, resubmitting a new ' +
                  'subscription with a new Selector');
                self._submitSharedSubscription(topicFilter, options);
                return;

              default:
                // Other kinds of error should not occur (the ones with a
                // positive code).
                logger.logWarn('Unmanageable error code', code);
            }
          },

          onItemUpdate: function(itemUpdate) {
            /** @type {RealTimeEvent} */
            var event = decodeEventFromItem(itemUpdate);
            var eventString = JSON.stringify(event);
            logger.logDebug('Received event for SharedSubscription',
              self._getConnectionId(), eventString);

            // SUBACK event is identified by a non null return code of the
            // "suback" field.
            if (!isNaN(event['suback'])) {
              logger.debug('SUBACK event for topicFilter: ' + topicFilter);
              self._protocolListener.onSharedSubscriptionAckReceived(
                sharedSubscription, event);

              /**
               * The real suback got as response from the MQTT broker and then
               * forwarded by MQTT.Cool to this client.
               * @type {number}
               */
              var returnCode = event['suback'];

              if (returnCode >= 0x00 && returnCode <= 0x02) {
                if (this.notified) {
                  logger.debug('Subscription already notified');
                } else {
                  logger.debug('Subscription not already notified');

                  // The notified QoS, which MUST NOT be greater than subscribed
                  // one, which might get downgraded by MQTT.Cool.
                  // This could happen when another subscription has been
                  // submitted by other clients, using a greater QoS. Since MQTT
                  // Cool submits, for all subscriptions to the same topic
                  // filter, the one with the maximum QoS, it could notify back
                  // a QoS which may be greater than the one requested at client
                  // side.

                  /** @type { number } */
                  var notifiedQos = Math.min(options.getQoS(), returnCode);
                  if (notifiedQos < returnCode) {
                    logger.debug('Notified QoS downgraded from <' + returnCode
                      + '> to <' + notifiedQos + '>');
                  }

                  // Mark this subscription as notified.
                  this.notified = true;

                  // Add other information on the already register subscription.
                  var activeSharedSub = self._activeSharedSubs[topicFilter];
                  activeSharedSub.notifiedQos = notifiedQos;
                  activeSharedSub.qos = returnCode;

                  // Split the topicFilter of into separate levels.
                  activeSharedSub.filterLevels = topicFilter.split('/');

                  // Execute subscription and unsubscription requests that may
                  // have arrived in between.
                  var task = activeSharedSub.tasks.shift();
                  if (task) {
                    task(sharedSubscription);
                  }

                  // Call onSuccess callback.
                  options.onSuccess(notifiedQos);
                }
              } else if (returnCode == 0x80) {
                // Invoke onFailure event if the packet has already been
                // notified to the client with success.
                self._lsClient.unsubscribe(sharedSubscription);
                sharedSubscription.removeListener(this);
                options.onFailure(returnCode);
              } else {
                throw new Error('Unexpected return code: ' + returnCode);
              }
              self._protocolListener.onSharedSubscriptionAckProcessed(
                sharedSubscription, event);
              return;
            }

            // Lookup the shared subscription by the topicFilter.
            var thisSharedSub = self._activeSharedSubs[topicFilter];

            // Iterate over all active shared subscriptions in order
            // to get the max subscribed QoS.
            for (var activeSharedKey in self._activeSharedSubs) {
              var currentSubscription = self._activeSharedSubs[activeSharedKey];

              // Skip itself.
              if (currentSubscription === thisSharedSub) {
                continue;
              }

              if (currentSubscription.qos > qos &&
                matchSubscription(currentSubscription.filterLevels,
                  event['destinationName'])) {
                logger.debug('Found a matching subscription with greater qos' +
                  ', skipping');
                return;
              }
            }

            var destinationInfo =
              self._orderedSequencesForTopic[event['destinationName']];
            if (!destinationInfo) {
              // Keep track of the destination, only the first time.
              destinationInfo = {
                destinationName: event['destinationName'],
                seqId: 0,
                subscriptions: {}
              };

              // Populate the inverse map.
              self._orderedSequencesForTopic[event['destinationName']] =
                destinationInfo;
            } else if (event['seq'] <= destinationInfo.seqId) {
              logger.debug('Seq Id ' + event['seq'] + ' already received, ' +
                'skipping');
              return;
            }

            // Update destination info with new sequence id.
            destinationInfo.seqId = event['seq'];

            // Update the map of all shared subscriptions referencing
            // this destination.
            destinationInfo.subscriptions[topicFilter] = thisSharedSub;

            // On this shared subscription, update the destination map
            // with a reference to this destination.
            thisSharedSub.matchedDestinations[event['destinationName']] =
              destinationInfo;

            // The notified qos may be downgraded to follow the one
            // submitted by the subscription.
            if (thisSharedSub.notifiedQos < event['qos']) {
              logger.debug('Message QoS downgraded from <' + event['qos'] +
                '> to <' + thisSharedSub.notifiedQos + '>');
            }
            event['qos'] = Math.min(event['qos'], thisSharedSub.notifiedQos);

            // Notify of the message by invoking the onMessageArrived()
            // callback.
            self._messageArrived(event);
          }
        };

        sharedSubscription.addListener(subscriptionListener);
        this._lsClient.subscribe(sharedSubscription);
      },

      /**
       * @param {!String} topicFilter
       * @param {!MqttUnsubscribeOptions} unsubscribeOptions
       */
      _doUnsubscribe: function(topicFilter, unsubscribeOptions) {
        if (this._clientId) {
          this._doDedicatedUnsubscribe(topicFilter, unsubscribeOptions);
        } else {
          this._doSharedUnsubscribe(topicFilter, unsubscribeOptions);
        }
      },

      /**
       *
       * @param {!String} topicFilter
       * @param {!MqttUnsubscribeOptions} unsubscribeOptions
       * @private
       */
      _doSharedUnsubscribe: function(topicFilter, unsubscribeOptions) {
        logger.logDebug('Unsubscribing shared subscription from:', topicFilter);

        var activeSubscription = this._activeSharedSubs[topicFilter];
        if (activeSubscription) {
          logger.logDebug('Found subscription on shared connection ' +
            'associated with:', topicFilter);

          var self = this;
          var unsubscribe = function(subscription) {
            // Get the native Lightstreamer subscription for adding a specific
            // listener that will handle the explicit unsubscription option.
            // We do that here and not in the listener created at the time
            // of subscription request because that listener will be also
            // triggered even in case of _stop invocation, where we do not want
            // any specific unsubscription action to take place.
            subscription.addListener({
              onUnsubscription: function() {
                delete self._activeSharedSubs[topicFilter];
                logger.logDebug('Received onUnsubscription() event related to ' +
                  'unsubscribing from: ', topicFilter);

                // Iterate over all destination infos associated with this
                // subscription.
                for (var topicName in activeSubscription.matchedDestinations) {
                  var destinationInfo = self._orderedSequencesForTopic[topicName];
                  delete destinationInfo.subscriptions[topicFilter];
                  if (Objects.isEmpty(destinationInfo.subscriptions)) {
                    delete self._orderedSequencesForTopic[topicName];
                  }
                }

                subscription.removeListener(this);
                unsubscribeOptions.onSuccess();

                logger.logDebug('Removed subscription on shared connection ' +
                  'mapped by "' + topicFilter + '"');
                logger.info('Successful completion of unsubscription request ' +
                  'from "' + topicFilter + '"');
              }
            });

            self._lsClient.unsubscribe(subscription);
            self._protocolListener.onSharedUnsubscription(subscription);
            logger.info('Submitted unsubscription request from "' + topicFilter +
              '"');
          }

          var lsSubscription = activeSubscription.subscription;
          if (!lsSubscription.isSubscribed()) {
            activeSubscription.tasks.push(unsubscribe);
          } else {
            unsubscribe(lsSubscription);
          }
        } else {
          logger.logWarn('No subscription on shared connection found for ' +
            'topicFilter:', topicFilter);
          logger.debug('Notifying in any case');
          this._protocolListener.onSharedUnsubscription();
          unsubscribeOptions.onSuccess();
        }
      },

      /**
       * @param {!string} topicFilter
       * @param {!MqttUnsubscribeOptions} unsubscribeOptions
       * @private
       */
      _doDedicatedUnsubscribe: function(topicFilter, unsubscribeOptions) {
        // Lookup the subscription request associated with the same topicFilter.
        // This information is required for later removal once the UNSUBACK has
        // arrived.
        var sourceSubPacket = this._activeSubscriptions[topicFilter];

        // Build the UNSUBSCRIBE packet.
        var unsubPacket = Packet.newUNSUBSCRIBE(++this._messageCounter,
          topicFilter, unsubscribeOptions, sourceSubPacket);

        this._sentMessages[unsubPacket['body']['packetId']] = unsubPacket;
        this._pushMessage(unsubPacket);

        this._protocolListener.onUnsubscribe(unsubPacket);
      },

      /**
       * @param {Message} message - The Message instance to send.
       * @private
       */
      _doSend: function(message) {
        // Prepare the packet to be sent.
        var publishPacket = Packet.newPUBLISH(message);

        if (message['qos'] > 0) {
          // Since qos > 0, set a packetId and a request for ack.
          publishPacket['body']['packetId'] = ++this._messageCounter;
          publishPacket.requireAck = true;

          // Store the message in the case of dedicated connection with
          // persistent session.
          if (!this._mqttConnectOptions.getCleanSession()) {
            logger.debug('Storing message into the Store with SENT state');
            this._store.store(publishPacket['body'], Store.ITEM_STATE['SENT']);
          }

          // Save the message for QoS management.
          this._sentMessages[publishPacket['body']['packetId']] = publishPacket;
        }

        var self = this;

        // Add the callback for handling hook response in case of unauthorized
        // publishing.
        publishPacket.onDenied = function(errCode, errMsg) {
          var packetId = publishPacket['body']['packetId'];

          // Remove the message from the Store in case of QoS > 0 (and hence
          // a packetId) and dedicated connection.
          if (packetId && !self._mqttConnectOptions.getCleanSession()) {
            logger.debug('Removing the message from the Store');
            self._store.remove(packetId, Store.ITEM_STATE['SENT']);
          }

          logger.debug('Invoking "onMessageNotAuthorized" callback');
          var errType = Errors.fromCode(errCode);
          if (errType == Errors.Types.UNAUTHORIZED_PUBLISHING) {
            Objects.invoke(self, 'onMessageNotAuthorized',
              [message, Errors.evalMsg(errMsg)]);
          } else {
            logger.logWarn('Unmanageable error code', errCode);
          }
        };

        this._protocolListener.beforePublishing(publishPacket);

        this._pushMessage(publishPacket);
        logger.debug('Scheduled PUBLISH packet for delivery');

        // In the case of Qos 0, notify immediately the app that the message has
        // been delivered, without waiting for the round-trip.
        if (message['qos'] == 0) {
          logger.debug('Invoking now "onMessageDelivered" callback, as QoS 0');
          // Wrap the invocation of messageDelivered inside setTimeout to
          // force a scheduled execution at the next opportunity, not
          // immediately. This avoid some strange conditions to occur: for
          // example, it has been proved that a disconnect() call inside the
          // callback will take precedence over the packet delivery.
          setTimeout(function() {
            self._messageDelivered(message);
          });
        }

        this._protocolListener.onPublish(publishPacket);
      },

      /**
       * @param {Object<string, string>} message -
       * @private
       */
      _messageDelivered: function(message) {
        var msg = message;
        if (!(message instanceof Message)) {
          msg = Json.decodeMessageFromJson(message);
        }
        Objects.invoke(this, 'onMessageDelivered', [msg]);
      },

      /**
       * @param {Object<string, string>} message -
       * @private
       */
      _messageArrived: function(message) {
        /** @type {Message} */
        var msg = Json.decodeMessageFromJson(message);
        Objects.invoke(this, 'onMessageArrived', [msg]);
      },

      /**
       * @private
       */
      _processPendingMessages: function() {
        logger.debug('Submitting pending messages');

        // First of all, process the current active subscriptions, tracked
        // in the case of dedicated connection with clean session set to true.
        logger.debug('Iterating over ' + Object.keys(this._activeSubscriptions).length + ' active subscriptions');
        logger.debug('Active subscriptions ' + this._activeSubscriptions);
        for (var topicFilter in this._activeSubscriptions) {
          // Remove the original packet id, a new one is required since it's
          // a new subscription from a MQTT point of view.
          var newPacketId = ++this._messageCounter;
          var subscribePacket = this._activeSubscriptions[topicFilter];
          subscribePacket['body']['packetId'] = newPacketId;

          // Store and submit the packet, by putting it in front of the
          // message queue for further processing. Moreover, autosend flag
          // is set to false, because we want to process the message queue
          // at once, only after it has been filled up with all pending
          // messages.
          this._sentMessages[newPacketId] = subscribePacket;
          this._offerMessage(subscribePacket, false);
        }

        this._processQueue();
        logger.info('Pending messages submitted');
      },

      /**
       * @param {!Packet} subPacket
       * @private
       */
      _addSubscriptionToStore: function(subPacket) {
        var topicFilter = subPacket['body']['topicFilter'];
        if (!this._activeSubscriptions[topicFilter]) {
          this._activeSubscriptions[topicFilter] = subPacket;
          logger.logDebug('Tracked subscription to filter:', topicFilter);
        } else {
          logger.debug('Subscription to [' + topicFilter + '] filter ' +
            'already tracked.');
        }
      },

      /**
       *
       * @param {Packet} subPacket
       * @private
       */
      _removeSubscriptionFromStore: function(subPacket) {
        if (subPacket) {
          var topicFilter = subPacket['body']['topicFilter'];
          if (this._activeSubscriptions[topicFilter]) {
            delete
              this._activeSubscriptions[topicFilter];
            logger.logDebug('Subscription to {topicFilter} removed:',
              topicFilter);
          } else {
            logger.logDebug('No Subscription to:', topicFilter);
          }
        } else {
          // In this case we not throw any 'Broken Protocol' exception, as
          // the MQTT Protocol allow that.
          logger.warn('The arrived UNSUBACK does not match any SUBSCRIBE ' +
            'request');
        }
      },

      onItemUpdate: function(updateInfo) {
        var eventString = updateInfo.getValue(1);
        logger.debug('Received event: ' + eventString + ' on client  ' +
          this._requesterId + ', isSnapshot: ' + updateInfo.isSnapshot());

        var event = /** @type {{type:string, message}} */
          JSON.parse(eventString);

        try {
          if (typeof event['type'] == 'undefined') {
            throw Error('Malformed event, no "type" has been specified');
          }
          switch (event['type']) {
            // Occurs in the following cases:
            //  1) When the target MQTT broker is not reachable from MQTT.Cool
            //     while establishing a new connection started from the client.
            //
            //  2) Issues with the target MQTT broker after a connection has
            //     bean established
            case 'CONNECTION_ERROR':
              this._stop(Errors.Types.MQTT_BROKER_CONNECTION_ERROR);
              break;

            // Occurs in a shared connection or in a dedicated connection
            // without management of persistence session (clean session set to
            // true).
            case 'DELIVERY_COMPLETE':
              if (!this._mqttConnectOptions.getCleanSession()) {
                logger.error('Unexpected event');
                throw new Error('Event not allowed');
              }
              this._onDeliveryComplete(event['message']);
              break;

            case 'CONTROL_PACKET':
              var controlPacket = event['message'];
              var type = controlPacket['type'];
              if (!type) {
                throw Error('Malformed packet, no "type" has been specified');
              }

              // In the case of shared connection, CONNACK is the only allowed
              // control packet, otherwise the protocol has been broken.
              if (!this._clientId && type != Packet.Type.CONNACK) {
                logger.error('Unexpected event');
                throw new Error('Event not allowed');
              }
              this._handleControlPacket(controlPacket);
              break;

            default:
              break;
          }
        } catch (e) {
          var error = e;
          if (!(e instanceof Error)) {
            error = new Error(e);
          }
          this._stop(error);
        }
      },

      /**
       * @param {{type:string, packetId:number, returnCode:number,
       *          returnCodes:Array<number>, sessionPresent:boolean,
       *          message}} packet - The Control Packet embedded in the
       *          real-time update.
       * @private
       */
      _handleControlPacket: function(packet) {
        var packetId = packet['packetId'];
        switch (packet['type']) {
          case Packet.Type.CONNACK:
            this._onConnAck(packet);
            break;

          case Packet.Type.SUBACK:
            this._onSubAck(packetId, packet['returnCode'][0]);
            break;

          case Packet.Type.UNSUBACK:
            this._onUnsubAck(packetId);
            break;

          case Packet.Type.PUBACK:
            this._onPubAck(packetId);
            break;

          case Packet.Type.PUBREC:
            this._onPubRec(packetId);
            break;

          case Packet.Type.PUBREL:
            this._onPubRel(packetId);
            break;

          case Packet.Type.PUBCOMP:
            this._onPubComp(packetId);
            break;

          case Packet.Type.PUBLISH:
            this._onPublishReceived(packet);
            break;
        }
      },

      /**
       * @private
       */
      _handleLocalStore: function() {
        // Clear up the local storage if the client has been started with
        // clean session set to true.
        if (this._mqttConnectOptions.getCleanSession()) {
          if (this._store) {
            this._store.clear();
          }
          return;
        }

        // Otherwise restore the persistent state.
        var self = this;
        this._store.processInOrder(function(storeItem) {
          // Build a Packet instance from the data contained into the storeItem.
          var packet = new Packet(storeItem.body, true);
          var packetId = packet['body']['packetId'];

          // Update the global message counter so that all packets sent after
          // the restore will be tagged in the right sequence with a packet id.
          self._messageCounter = packetId;

          switch (storeItem.state) {
            case Store.ITEM_STATE['SENT']:
              packet['body']['message'].duplicate = true;
              var toSend = null;
              if (storeItem.pubrecReceived) {
                // If a PUBREC has been received for this PUBLISH packet,
                // the message to be redelivered is a PUBREL.
                toSend = Packet.newPUBREL(packetId, true);

                // Tag the PUBLISH packet has already processed too: this allows
                // not to throw a 'Broken Protocol' error upon receiving a
                // PUBCOMP.
                packet['processed'] = 1;
              } else {
                // If a PUBREC has not been received for this PUBLISH packet,
                // then the PUBLISH itself must be redelivered.
                toSend = packet;
              }
              logger.logDebug('Populating sent messages with the PUBLISH ' +
                'packet with packet id:', packetId);
              self._sentMessages[packetId] = packet;

              logger.logDebug('Removing duplicates from the message queue');
              // Remove from the message queue the same PUBLISH packet, if any,
              // to avoid duplicate delivery.
              self._removeMessage(function(msg) {
                if (msg['body']['type'] == Packet.Type.PUBLISH &&
                  msg['body']['packetId'] == packetId) {
                  return true;
                }
                return false;
              });
              logger.logDebug('PUBLISH packet scheduled for delivery');

              // Enqueue the message without immediate delivery.
              toSend.immediateDelivery = false;
              self._pushMessage(toSend);
              break;
            case Store.ITEM_STATE['RECEIVED']:
              logger.logDebug('Insert into into the map of received messages' +
                ' a PUBLISH packet with packet id:', packetId);
              self._receivedMessages[packetId] = packet;
              break;
          }
        }, function() {
          logger.debug('Session restored');
        });
      },

      /**
       * Event handler on CONNACK packet.
       * @param {Packet} connAckPacket - The received CONNACK Packet.
       * @private
       */
      _onConnAck: function(connAckPacket) {
        logger.debug('Handling CONNACK');
        this._protocolListener.onConnAckReceived(connAckPacket);

        /**
         * The return code of the received CONNACK.
         * @type {number}
         */
        var returnCode = connAckPacket['returnCode'];
        if (returnCode == 0) {
          // returnCode 0 means that the connection has been established with
          // success.
          logger.logDebug('Connection Accepted for client:', this._requesterId);
          var isRecovery = false;
          var oldStatus = this._status;
          if (oldStatus == STATUS['CONNECTING']) {
            this._status = STATUS['CONNECTED'];
          } else if (oldStatus == STATUS['RETRY']) {
            this._status = STATUS['CONNECTED'];
            isRecovery = true;
          } else {
            logger.logError('Unexpected CONNACK packet as current status is',
              STATUS.getStr(this._status));
            return new Error('Broken protocol on CONNACK reception');
          }
          logger.logDebug('Status switched from ' + STATUS.getStr(oldStatus) +
            ' to ' + STATUS.getStr(this._status));

          if (this._clientId) {
            // Restore previous session only in the case of dedicated connection
            // and clean session set to false.
            this._handleLocalStore();
          }

          // Resubmit all pending messages.
          logger.debug('Starting to process pending messages');
          this._processPendingMessages();

          // In case of recovery, notify the app.
          if (isRecovery) {
            Objects.invoke(this, 'onReconnectionComplete');
          } else {
            // Notify the app of the successful connection.
            this._mqttConnectOptions.onSuccess();
          }
        } else {
          // Got a returnCode !=0, the connection has been refused.
          logger.logWarn('Connection refused with error code:', returnCode);

          this._stop(Errors.Types.BROKER_CONNECTION_REFUSED,
            Objects.makeErrorEvent(returnCode, CONNACK_RC[returnCode]));
        }
      },

      /**
       * @param {number} packetId -
       * @private
       */
      _onDeliveryComplete: function(packetId) {
        logger.logDebug('Completion of message delivery for packetId:',
          packetId);

        this._protocolListener.onDeliveryCompleteReceived(packetId);

        /** @type {Packet} */
        var publishPacket = this._sentMessages[packetId];
        if (publishPacket != null) {
          // PUBLISH packet originating this response must be removed from
          // messages requiring an ack.
          logger.debug('Removing from sent messages');
          delete this._sentMessages[packetId];

          // Remove from message queue to avoid redelivery in case of
          // reconnection.
          this._removeMessage(publishPacket);

          logger.debug('Invoking onMessageDelivered() callback now, as the ' +
            'message has been delivered');
          this._messageDelivered(publishPacket['body']['message']);
        } else {
          logger.warn('No packetId : ' + packetId + ' found!');
        }

        this._protocolListener.onDeliveryCompleteProcessed(packetId);
      },

      /**
       * @param {number} packetId -
       * @param {number} returnCode -
       * @throws {Error} in case of no subscription packet has been found for
       *   the provided packetId
       * @private
       */
      _onSubAck: function(packetId, returnCode) {
        logger.logDebug('Handling SUBACK <' + returnCode + '> for packetId',
          packetId);
        this._protocolListener.onSubAckReceived(packetId, returnCode);

        /** @type {Packet} */
        var subPacket = this._sentMessages[packetId];
        if (subPacket) {
          var type = subPacket['body']['type'];
          if (type !== Packet.Type.SUBSCRIBE) {
            logger.error('The matched packet is a ' + type + ', but a ' +
              'SUBSCRIBE is expected');
            throw new Error('Broken protocol on SUBACK reception');
          }
          delete this._sentMessages[packetId];

          // Remove the message from the message queue.
          this._removeMessage(subPacket);

          // In the case of session with state (cleanSession = false), remove
          // the subscription once it has been acknowledged, in order to avoid
          // resubmission while reconnecting.
          if (returnCode != 0x80) {
            if (!subPacket.notified) {
              // Track subscriptions in case of clean session set to true, in
              // order to let them redelivered in case of reconnection.
              if (this._mqttConnectOptions.getCleanSession()) {
                this._addSubscriptionToStore(subPacket);
              }

              // Mark as notified to avoid multiple notifications to the client.
              subPacket.notified = true;

              // Invoke the onSuccess() callback.
              subPacket.options.onSuccess(returnCode);
            } else {
              logger.debug('Subscription already notified');
            }
          } else {
            // Invoke the onFailure() callback even if the packet has already
            // been notified to the client with success.
            subPacket.options.onFailure(returnCode);
          }
        } else {
          logger.error('The arrived SUBACK does not match any SUBSCRIBE ' +
            'request');
          throw new Error('Broken protocol on SUBACK reception');
        }

        this._protocolListener.onSubAckProcessed(packetId, returnCode);
      },

      /**
       * @param {number} packetId
       * @private
       */
      _onUnsubAck: function(packetId) {
        logger.logDebug('Handling UNSUBACK for packetId', packetId);
        this._protocolListener.onUnsubAckReceived(packetId);

        /** @type {Packet} */
        var unsubPacket = this._sentMessages[packetId];
        if (unsubPacket) {
          var type = unsubPacket['body']['type'];
          if (type !== Packet.Type.UNSUBSCRIBE) {
            logger.error('The matched packet is a ' + type + ', but a ' +
              'UNSUBSCRIBE is expected');
            throw new Error('Broken protocol on UNSUBACK reception');
          }
          delete this._sentMessages[packetId];

          // Remove the message from the message queue.
          this._removeMessage(unsubPacket);

          // Remove the Subscription associated with the topicFilter of the
          // UNSUBSCRIBE request.
          this._removeSubscriptionFromStore(unsubPacket['sourceSubPacket']);

          // Invoke the onSuccess() callback.
          unsubPacket.options.onSuccess();
        } else {
          logger.error('The arrived UNSUBACK does not match any UNSUBSCRIBE ' +
            'request');
          throw new Error('Broken protocol on UNSUBACK reception');
        }

        this._protocolListener.onUnsubAckProcessed(packetId);
      },

      /**
       * @param {Packet} pubPacket -
       * @param {number} expectedQos -
       * @param {boolean=} checkProcessed -
       * @private
       */
      _checkPubProtocol: function(pubPacket, expectedQos, checkProcessed) {
        var message = pubPacket['body']['message'];
        var type = pubPacket['body']['type'];
        var qos = message['qos'];

        // Check packet type.
        if (type !== Packet.Type.PUBLISH) {
          logger.error('The matched packet is a ' + type + ', but a PUBLISH' +
            ' is expected');
          throw new Error('Broken protocol');
        }

        // Check QoS
        if (qos != expectedQos) {
          logger.error('The matched packet has QoS ' + qos + ', but ' +
            expectedQos + ' is expected');
          throw new Error('Broken protocol');
        }

        if (checkProcessed && pubPacket['processed'] == 0) {
          logger.error('The matched packet has not been processed yet');
          throw new Error('Broken protocol');
        }
      },

      /**
       * @param {Packet} subPacket -
       * @param {number} expectedQos -
       * @private
       */
      _checkSubProtocol: function(subPacket, expectedQos) {
        var type = subPacket['body']['type'];

        // Check packet type.
        if (type !== Packet.Type.SUBSCRIBE) {
          logger.error('The matched packet is a ' + type + ', but a SUBSCRIBE' +
            ' is expected');
          throw new Error('Broken protocol');
        }

        // Check QoS
        /*if (qos != expectedQos) {
          logger.error('The matched packet has QoS ' + qos + ', but ' +
            expectedQos + ' is expected');
          throw new Error('Broken protocol');
        }*/
      },

      /**
       * @param {number} packetId
       * @private
       */
      _onPubAck: function(packetId) {
        logger.logDebug('Handling PUBACK for packetId', packetId);

        this._protocolListener.onPubAckReceived(packetId);

        /** @type {Packet} */
        var pubPacket = this._sentMessages[packetId];
        if (pubPacket) {
          this._checkPubProtocol(pubPacket, 1);
          logger.debug('Removing the message from sent messages, as it ' +
            'requires an ack');
          delete this._sentMessages[packetId];

          // Remove the message from the message queue to avoid redelivery in
          // case of reconnection.
          this._removeMessage(pubPacket);

          // Invoke the onMessageDelivered() callback.
          this._messageDelivered(pubPacket['body']['message']);

          // Remove the message from the local storage.
          logger.debug('Removing the message from the Store');
          this._store.remove(packetId, Store.ITEM_STATE['SENT']);
        } else {
          logger.warn('The arrived PUBACK does not match any PUBLISH message');
          new Error('Broken Protocol on PUBACK reception');
        }

        this._protocolListener.onPubAckProcessed(packetId);
      },

      /**
       *
       * @param {number} packetId
       * @private
       */
      _onPubRec: function(packetId) {
        logger.logDebug('Handling PUBREC for packetId', packetId);
        var self = this;
        function doOnPubRec() {
          /** @type {Packet} */
          var pubPacket = self._sentMessages[packetId];
          if (pubPacket) {
            var expectedQos = 2;
            self._checkPubProtocol(pubPacket, expectedQos);

            // Override into the store the same PUBLISH packet, by adding
            // information about the received PUBREC Packet. That allows to send
            // a corresponding PUBREL while restoring the local state upon a
            // restart.
            logger.debug('Storing the message into the Store with SENT state ' +
              'and "pubrecReceived" flag set to true');
            self._store.store(pubPacket['body'], Store.ITEM_STATE['SENT'], true);

            // Send a PUBREL packet.
            self._sendMessage(Packet.newPUBREL(packetId));
            logger.debug('PUBREL packet scheduled for delivery');
          } else {
            logger.warn('The arrived PUBREC does not match any PUBLISH message');
            new Error('Broken Protocol on PUBREC reception');
          }
          self._protocolListener.onPubRecProcessed(packetId);
        }

        this._protocolListener.onPubRecReceived(packetId, doOnPubRec);
      },

      /**
       * @param {number} packetId
       * @private
       */
      _onPubRel: function(packetId) {
        logger.logDebug('Handling PUBREL for packetId', packetId);
        this._protocolListener.onPubRelReceived(packetId);

        /** @type {?Packet} */
        var pubPacket = this._receivedMessages[packetId];
        if (pubPacket) {
          var expectedQos = 2;
          this._checkPubProtocol(pubPacket, expectedQos, false);
          logger.debug('Removing the message from the map of received PUBLISH' +
            ' messages');
          delete this._receivedMessages[packetId];

          // Remove the PUBLISH message from the Store.
          this._store.remove(packetId, Store.ITEM_STATE['RECEIVED']);

          // Notify of the message by invoking the onMessageArrived() callback.
          this._messageArrived(pubPacket['body']['message']);
        } else {
          // In this case we not throw any 'Broken Protocol' Error, as this
          // PUBREL may be a redelivery in response of a previous PUBREC, which
          // did not arrive to the sender.
          logger.warn('The arrived PUBREL does not match any PUBLISH message');
        }

        // Always flow a PUBCOMP packet,
        this._sendMessage(Packet.newPUBCOMP(packetId));

        logger.debug('PUBCOMP packet scheduled for delivery');
        this._protocolListener.onPubRelProcessed(packetId);
      },

      /**
       * @param {number} packetId
       * @private
       */
      _onPubComp: function(packetId) {
        logger.logDebug('Handling PUBCOMP for packetId', packetId);
        this._protocolListener.onPubCompReceived(packetId);

        var pubPacket = this._sentMessages[packetId];
        if (pubPacket) {
          this._checkPubProtocol(pubPacket, 2);

          // Invoke the onMessageDelivered() callback.
          this._messageDelivered(pubPacket['body']['message']);

          // PUBLISH packet originating this PUBCOMP response must be
          // removed from both the sent messages and the message queue.
          delete this._sentMessages[packetId];
          this._removeMessage(pubPacket);

          logger.debug('Removing the message from the Store');
          this._store.remove(pubPacket['body']['packetId'],
            Store.ITEM_STATE['SENT']);
        } else {
          logger.warn('The arrived PUBCOMP does not match any PUBLISH message');
          throw new Error('Broken protocol on PUBCOMP reception');
        }

        this._protocolListener.onPubCompProcessed(packetId);
      },

      /**
       *
       * @param {{type:string, packetId:number, message:Object}} pubPacket
       * @private
       */
      _onPublishReceived: function(pubPacket) {
        var receivedPub = new Packet(pubPacket);
        var packetId = receivedPub['body']['packetId'];
        logger.logDebug('Handling PUBLISH with packetId:', packetId);
        this._protocolListener.onPublishReceived(pubPacket);

        var qos = receivedPub['body']['message']['qos'];

        // Notify of the message by invoking the onMessageArrived() callback if
        // Qos is 0 or clean session is set to true.
        if (qos == 0 || this._mqttConnectOptions.getCleanSession()) {
          this._messageArrived(receivedPub['body']['message']);
        } else {
          switch (qos) {
            case 1:
              // Send a PUBACK packet.
              this._sendMessage(Packet.newPUBACK(packetId));

              // Notify of the message by invoking the onMessageArrived()
              // callback.
              this._messageArrived(receivedPub['body']['message']);
              break;

            case 2:
              logger.logDebug('Inserted into the map of received messages a ' +
                'PUBLISH packet with packet id:', packetId);
              this._receivedMessages[packetId] = receivedPub;
              this._store.store(receivedPub['body'],
                Store.ITEM_STATE['RECEIVED']);

              // Send a PUBREC packet.
              this._sendMessage(Packet.newPUBREC(packetId));
              break;

            default:
              break;
          }
        }
        this._protocolListener.onPublishProcessed(receivedPub);
      },

      /**
       * @param {number}status
       * @private
       */
      _tryRecovery: function(status, lsStatus) {
        var statusStr = STATUS.getStr(status);
        logger.debug('Handling connection recovery while in status ' +
          statusStr + ' and LS in status ' + lsStatus);
        switch (status) {
          case STATUS['CONNECTING']:
            this._stop(Errors.Types.MQTTCOOL_CONNECTION_ERROR);
            break;

          case STATUS['CONNECTED']:
          case STATUS['RETRY']:
          case STATUS['RECOVERY']:
            if (lsStatus == 'DISCONNECTED:WILL-RETRY') {
              logger.debug('Switching status to RETRY');
              this._status = STATUS['RETRY'];
            } else if (lsStatus == 'DISCONNECTED:TRYING-RECOVERY') {
              logger.debug('Switching status to RECOVERY');
              this._status = STATUS['RECOVERY'];
            }
            Objects.invoke(this, 'onReconnectionStart');
            break;

          default:
            logger.logWarn('No action found for status:', statusStr);
            break;
        }
      },

      onServerError: function(errorCode, errorMessage) {
        logger.error('errorCode' + errorCode + ', errorMessage:' + errorMessage);
      },

      onStatusChange: function(changedStatus) {
        logger.logDebug('Status changed -->', changedStatus);
        if (changedStatus.indexOf('CONNECTED:') == 0
          && this._status == STATUS['RECOVERY']) {
          this._status = STATUS['CONNECTED'];
          // Notify that A recovery succeeded
          Objects.invoke(this, 'onReconnectionComplete');
        } else if (changedStatus == 'DISCONNECTED:WILL-RETRY'
          || changedStatus == 'DISCONNECTED:TRYING-RECOVERY') {
          try {
            this._tryRecovery(this._status, changedStatus);
          } catch (e) {
            var error = e;
            if (!(error instanceof Error)) {
              error = new Error(e);
            }
            this._stop(error);
          }
        } else if (changedStatus == 'DISCONNECTED') {
          // This event is triggered by MQTTCoolSession.close().
          this._stop(Errors.Types.MQTTCOOL_DISCONNECTION);
        }
      },

      /**
       * @param {function} onConnectionLost -
       * @private
       */
      _setOnConnectionLost: function(onConnectionLost) {
        Objects.checkType(onConnectionLost, 'function', 'onConnectionLost',
          true);
        this._onConnectionLost = onConnectionLost;
      },

      /**
       * @private
       */
      _getOnConnectionLost: function() {
        return this._onConnectionLost;
      },

      /**
       * @private
       */
      _setOnReconnectionStart: function(OnReconnectionStart) {
        Objects.checkType(OnReconnectionStart, 'function',
          'onReconnectionStart', true);
        this._onReconnectionStart = OnReconnectionStart;
      },

      /**
       * @private
       */
      _getOnReconnectionStart: function() {
        return this._onReconnectionStart;
      },

      /**
       * @private
       */
      _setOnReconnectionComplete: function(onReconnectionComplete) {
        Objects.checkType(onReconnectionComplete, 'function',
          'onReconnectionComplete', true);
        this._onReconnectionComplete = onReconnectionComplete;
      },

      /**
       * @return {function}
       * @private
       */
      _getOnReconnectionComplete: function() {
        return this._onReconnectionComplete;
      },

      /**
       * @param {function} onMessageArrived
       * @private
       */
      _setOnMessageArrived: function(onMessageArrived) {
        Objects.checkType(onMessageArrived, 'function', 'onMessageArrived',
          true);
        this._onMessageArrived = onMessageArrived;
      },

      /**
       * @return {function}
       * @private
       */
      _getOnMessageArrived: function() {
        return this._onMessageArrived;
      },

      /**
       * @param {function} onMessageDelivered -
       * @private
       */
      _setOnMessageDelivered: function(onMessageDelivered) {
        Objects.checkType(onMessageDelivered, 'function', 'onMessageDelivered',
          true);
        this._onMessageDelivered = onMessageDelivered;
      },

      /**
       * @return {function}
       * @private
       */
      _getOnMessageDelivered: function() {
        return this._onMessageDelivered;
      },

      /**
       * @param {function} onMessageNotAuthorized -
       * @private
       */
      _setOnMessageNotAuthorized: function(onMessageNotAuthorized) {
        Objects.checkType(onMessageNotAuthorized, 'function',
          'onMessageNotAuthorized', true);
        this._onMessageNotAuthorized = onMessageNotAuthorized;
      },

      /**
       * @return {function}
       * @private
       */
      _getOnMessageNotAuthorized: function() {
        return this._onMessageNotAuthorized;
      }
    };

    MqttClientImpl['STATUS'] = STATUS;
    MqttClientImpl.prototype['onItemUpdate'] = MqttClientImpl.prototype
      .onItemUpdate;

    // Exporting only for purpose of unit tests of the minified version.
    MqttClientImpl.prototype['_getClientId'] =
      MqttClientImpl.prototype._getClientId;
    MqttClientImpl.prototype['_getConnectionId'] =
      MqttClientImpl.prototype._getConnectionId;
    MqttClientImpl.prototype['_getConnectionOptions'] =
      MqttClientImpl.prototype._getConnectionOptions;
    MqttClientImpl.prototype['_getStore'] = MqttClientImpl.prototype._getStore;
    MqttClientImpl.prototype['_getBrokerAddress'] =
      MqttClientImpl.prototype._getBrokerAddress;
    MqttClientImpl.prototype['_getStatus'] = MqttClientImpl.prototype.
      _getStatus;
    MqttClientImpl.prototype['_getSent'] = MqttClientImpl.prototype.
      _getSentMessages;
    MqttClientImpl.prototype['_getReceived'] = MqttClientImpl.prototype.
      _getReceivedMessages;
    MqttClientImpl.prototype['_getMessageQueueSize'] = MqttClientImpl.prototype.
      _getMessageQueueSize;
    MqttClientImpl.prototype['_getMessageQueue'] = MqttClientImpl.prototype.
      _getMessageQueue;
    MqttClientImpl.prototype['_peek'] = MqttClientImpl.prototype.
      _peek;
    MqttClientImpl.prototype['_getActiveSubscriptions'] = MqttClientImpl.
      prototype._getActiveSubscriptions;
    MqttClientImpl.prototype['_getActiveSharedSubscriptions'] = MqttClientImpl.
      prototype._getActiveSharedSubscriptions;
    MqttClientImpl.prototype['_setProtocolListener'] = MqttClientImpl.
      prototype._setProtocolListener;

    MqttClientImpl.prototype['_setSelectorStrategy'] = MqttClientImpl.
      prototype._setSelectorStrategy;

    // Exporting pubic API methods.
    MqttClientImpl.prototype['connect'] = MqttClientImpl.prototype.connect;
    MqttClientImpl.prototype['disconnect'] = MqttClientImpl.prototype
      .disconnect;
    MqttClientImpl.prototype['send'] = MqttClientImpl.prototype.send;
    MqttClientImpl.prototype['subscribe'] = MqttClientImpl.prototype
      .subscribe;
    MqttClientImpl.prototype['unsubscribe'] = MqttClientImpl.prototype
      .unsubscribe;

    // Exporting pubic API properties for setting and getting callbacks.
    Object.defineProperties(MqttClientImpl.prototype, {

      'onConnectionLost': {
        set: MqttClientImpl.prototype._setOnConnectionLost,
        get: MqttClientImpl.prototype._getOnConnectionLost
      },

      'onReconnectionStart': {
        set: MqttClientImpl.prototype._setOnReconnectionStart,
        get: MqttClientImpl.prototype._getOnReconnectionStart
      },

      'onReconnectionComplete': {
        set: MqttClientImpl.prototype._setOnReconnectionComplete,
        get: MqttClientImpl.prototype._getOnReconnectionComplete
      },

      'onMessageArrived': {
        set: MqttClientImpl.prototype._setOnMessageArrived,
        get: MqttClientImpl.prototype._getOnMessageArrived
      },

      'onMessageDelivered': {
        set: MqttClientImpl.prototype._setOnMessageDelivered,
        get: MqttClientImpl.prototype._getOnMessageDelivered
      },

      'onMessageNotAuthorized': {
        set: MqttClientImpl.prototype._setOnMessageNotAuthorized,
        get: MqttClientImpl.prototype._getOnMessageNotAuthorized
      }
    });

    export default MqttClientImpl;
