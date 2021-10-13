'use strict';
import MqttClientImpl from './MqttClientImpl';
import Objects from '../utils/Objects';
import Env from '../utils/Env';

    /**
     * @constructor
     * @param {string} sessionId -
     * @param {LightstreamerClient} lsClient -
     * @implements {MQTTCoolSession}
     * @ignore
     */
    var MQTTCoolSessionImpl = function(sessionId, lsClient) {
      this._sessionId = sessionId;
      this._lsClient = lsClient;
    };

    var MAX_CLIENT_ID_LENGTH = 23;

    var ALLOWED_SCHEMAS = ['tcp:', 'mqtt:', 'mqtts:', 'ssl:'];

    MQTTCoolSessionImpl.prototype = {

      /**
       * @param {string} brokerReference -
       * @param {?string=} clientId -
       * @return {MqttClient}
       * @throws {Error}
       */
      createClient: function(brokerReference, clientId) {
        Objects.checkType(brokerReference, 'string', 'brokerReference');

        // Start with parsing the brokerReference.
        var parsedRef = '';
        if (Env.isNodeJs()) {
          var url = require('url');
          parsedRef = url.parse(brokerReference);
        } else {
          parsedRef = document.createElement('a');
          parsedRef.href = brokerReference;
        }

        if (ALLOWED_SCHEMAS.indexOf(parsedRef.protocol) == -1) {
          // It is not a dynamic lookup with an explicit URL, let's try with
          // static lookup.
          if (!/^[A-Za-z0-9_-]+$/.test(brokerReference)) {
            throw Error('Invalid [brokerReference] argument: <' +
              brokerReference + '>');
          }
        }

        if (clientId) {
          //Objects.checkUTF8(clientId, 'clientId', MAX_CLIENT_ID_LENGTH);
          Objects.checkUTF8(clientId, 'clientId');
        }

        clientId = clientId || '';
        return new MqttClientImpl(brokerReference, clientId, this._lsClient);
      },

      /**
       *
       */
      close: function() {
        this._lsClient.disconnect();
      },

      toString: function() {
        return String(this._sessionId);
      }
    };

    /** Exporting pubic API */
    MQTTCoolSessionImpl.prototype['createClient'] =
      MQTTCoolSessionImpl.prototype.createClient;
    MQTTCoolSessionImpl.prototype['close'] =
      MQTTCoolSessionImpl.prototype.close;

    export default MQTTCoolSessionImpl;
