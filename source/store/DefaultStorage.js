'use strict';
define(['../utils/Env'], function(Env) {

  if (Env.isNodeJs()) {
    return;
  }

  /**
   * @constructor
   * @implements {MqttStorage}
   */
  var DefaultWebStorage = function() { };

  /**
   * @return {Object} The window.localStorage object.
   * @private
   */
  function getStorage() {
    return window['localStorage'];

  }

  DefaultWebStorage.prototype = {

    /**
     * @param {string} key
     * @param {string} value
     */
    set: function(key, value) {
      getStorage().setItem(key, value);
    },

    /**
     *
     * @param {string} key
     * @return {string}
     */
    get: function(key) {
      return getStorage().getItem(key);
    },

    /**
     * @param {string} key
     */
    remove: function(key) {
      getStorage().removeItem(key);
    },

    /**
     * @return {Array<string>}
     */
    keys: function() {
      return Object.keys(getStorage());
    },

    clearAll: function() {
      getStorage().clear();
    }
  };

  DefaultWebStorage.prototype['set'] = DefaultWebStorage.prototype.set;
  DefaultWebStorage.prototype['get'] = DefaultWebStorage.prototype.get;
  DefaultWebStorage.prototype['remove'] = DefaultWebStorage.prototype.remove;
  DefaultWebStorage.prototype['keys'] = DefaultWebStorage.prototype.keys;
  DefaultWebStorage.prototype['clearAll'] =
    DefaultWebStorage.prototype.clearAll;

  return DefaultWebStorage;
});
