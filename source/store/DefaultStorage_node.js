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
