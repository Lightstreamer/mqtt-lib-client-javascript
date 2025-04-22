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
import Env from '../utils/Env';

  // if (Env.isNodeJs()) {
  //   return;
  // }

  /**
   * @constructor
   * @implements {MqttStorage}
   * @ignore
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

  export default DefaultWebStorage;
