import Env from '../utils/Env';

  // if (!Env.isNodeJs()) {
  //   return;
  // }

  var storageFolder = './mqttcool-storage';
  var fs = require('fs');
  var path = require('path');

  /**
   * @constructor
   * @implements {MqttStorage}
   * @ignore
   */
  var DefaultNodeJsStorage = function() {
    try {
      fs.readdirSync(storageFolder);
    } catch(e) {
      fs.mkdirSync(storageFolder);
    }
  };

  DefaultNodeJsStorage.prototype = {

    /**
     * @param {string} key -
     * @return {string}
     */
    _getPath: function(key) {
      return path.join(storageFolder, key);
    },

    /**
     * @param {string} key
     * @param {string} value
     */
    set: function(key, value) {
      fs.writeFileSync(this._getPath(key), value);
    },

    /**
     *
     * @param {string} key
     * @return {string}
     */
    get: function(key) {
      try {
        return fs.readFileSync(this._getPath(key), 'utf8');
      } catch (e) {
        return undefined;
      }
    },

    /**
     * @param {string} key
     */
    remove: function(key) {
      fs.unlinkSync(this._getPath(key));
    },

    /**
     * @return {Array<string>}
     */
    keys: function() {
      return fs.readdirSync(storageFolder);
    },

    clearAll: function() {
      fs.rmdirSync(storageFolder);
    }
  };

  DefaultNodeJsStorage.prototype['set'] = DefaultNodeJsStorage.prototype.set;
  DefaultNodeJsStorage.prototype['get'] = DefaultNodeJsStorage.prototype.get;
  DefaultNodeJsStorage.prototype['remove'] =
  DefaultNodeJsStorage.prototype .remove;
  DefaultNodeJsStorage.prototype['keys'] = DefaultNodeJsStorage.prototype.keys;
  DefaultNodeJsStorage.prototype['clearAll'] =
    DefaultNodeJsStorage.prototype.clearAll;

  export default DefaultNodeJsStorage;
