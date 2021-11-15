import Objects from '../utils/Objects';
import LoggerManager from '../LoggerManager';

    var logger = LoggerManager.getLoggerProxy('mqtt.cool');

    // Allowed keys and relative types.
    var types = {
      'username': { 'type': 'string', 'nullable': true },
      'password': { 'type': 'string', 'nullable': true },
      'cleanSession': { 'type': 'boolean' },
      'willMessage': { 'type': 'object', 'nullable': true },
      'storage': { 'type': 'object', 'nullable': true },
      'storePath': { 'type': 'string', 'nullable': true },
      'onSuccess': { 'type': 'function', 'nullable': true },
      'onFailure': { 'type': 'function', 'nullable': true },
      'onNotAuthorized': { 'type': 'function', 'nullable': true }
    };

    /**
     * @constructor
     * @param {{username:string,
     *          password:string,
     *          cleanSession:boolean,
     *          willMessage:Message,
     *          storage:MqttStorage,
     *          storePath:?string,
     *          onSuccess:?function,
     *          onFailure:?function,
     *          onNotAuthorized:?function}=} connectOptions
     * @ignore
     */
    var MqttConnectOptions = function(connectOptions) {
      // Prepare default not nullable settings.
      this._connectOptions = {
        'cleanSession': true
      };

      for (var key in connectOptions) {
        if (types[key]) {
          Objects.checkTypeAndSet(connectOptions[key], types[key]['type'], key,
            this._connectOptions, types[key]['nullable']);
        }
      }

      this._connectOptions['storePath'] = this._connectOptions['storePath'] ||
        'mqttcool-storage';

      // Further check for the will message which may have been provided.
      var willMessage = this._connectOptions['willMessage'];
      if (willMessage && !willMessage['destinationName']) {
        throw Error('Invalid [destinationName] value for [willMessage]: '
          + willMessage['destinationName']);
      }
    };

    MqttConnectOptions.prototype = {

      /**
       * @return {string|undefined}
       */
      getUsername: function() {
        return this._connectOptions['username'];
      },

      /**
       * @return {string|undefined}
       */
      getPassword: function() {
        return this._connectOptions['password'];
      },

      /**
       * @return {boolean}
       */
      getCleanSession: function() {
        return this._connectOptions['cleanSession'];
      },

      /**
       * @return {Message|undefined}
       */
      getWillMessage: function() {
        return this._connectOptions['willMessage'];
      },

      /**
       * @return {MqttStorage|undefined}
       */
      getStorage: function() {
        return this._connectOptions['storage'];
      },

      /**
       * @return {string|undefined}
       */
      getStorePath: function() {
        return this._connectOptions['storePath'];
      },

      /**
       *
       */
      onSuccess: function() {
        this._debug('Invoking onSuccess');
        Objects.invoke(this._connectOptions, 'onSuccess');
      },

      /**
       *
       * @param {Object} responseObject
       */
      onFailure: function(responseObject) {
        this._debug('Invoking onFailure with: ', responseObject);
        Objects.invoke(this._connectOptions, 'onFailure', [responseObject]);
      },

      /**
       *
       * @param {Object} responseObject
       */
      onNotAuthorized: function(responseObject) {
        this._debug('Invoking onNotAuthorized with: ', responseObject);
        Objects.invoke(this._connectOptions, 'onNotAuthorized',
          [responseObject]);
      },

      /**
       * 
       * @param {*} message 
       * @param {*} [object] 
       */
      _debug: function(message, object) {
        logger.debug('MqttConnectionOptions.' + message + JSON.stringify(
          object || ''));
      },

      toJson: function() {
        return JSON.stringify(this._connectOptions);
      }
    };

    MqttConnectOptions.prototype['getUsername'] =
      MqttConnectOptions.prototype.getUsername;
    MqttConnectOptions.prototype['getPassword'] =
      MqttConnectOptions.prototype.getPassword;
    MqttConnectOptions.prototype['getCleanSession'] =
      MqttConnectOptions.prototype.getCleanSession;
    MqttConnectOptions.prototype['getWillMessage'] =
      MqttConnectOptions.prototype.getWillMessage;
    MqttConnectOptions.prototype['getStorage'] =
      MqttConnectOptions.prototype.getStorage;
    MqttConnectOptions.prototype['getStorePath'] =
      MqttConnectOptions.prototype.getStorePath;
    MqttConnectOptions.prototype['onSuccess'] =
      MqttConnectOptions.prototype.onSuccess;
    MqttConnectOptions.prototype['onFailure'] =
      MqttConnectOptions.prototype.onFailure;
    MqttConnectOptions.prototype['onNotAuthorized'] =
      MqttConnectOptions.prototype.onNotAuthorized;

    export default MqttConnectOptions;
