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
import Objects from '../utils/Objects';

  // Allowed keys and relative types.
  var types = {
    'onSuccess': { 'type': 'function', 'nullable': 'true' },
    'onFailure': { 'type': 'function', 'nullable': 'true' }
  };

  /**
   * @constructor
   * @param {Object=} unsubscribeOptions
   * @ignore
   */
  var MqttUnsubscribeOptions = function(unsubscribeOptions) {
    this._unsubscribeOptions = unsubscribeOptions || {};

    for (var key in unsubscribeOptions) {
      if (types[key]) {
        Objects.checkTypeAndSet(unsubscribeOptions[key], types[key]['type'],
          key, this._unsubscribeOptions, types[key]['nullable']);
      }
    }
  };

  MqttUnsubscribeOptions.prototype = {

    /**
     *
     */
    onSuccess: function() {
      Objects.invoke(this._unsubscribeOptions, 'onSuccess');
    },

    /**
     *
     * @param {!Object} responseObject
     */
    onFailure: function(responseObject) {
      Objects.invoke(this._unsubscribeOptions, 'onFailure', [responseObject]);
    }

  };

  MqttUnsubscribeOptions.prototype['onSuccess'] = MqttUnsubscribeOptions
    .prototype.onSuccess;
  MqttUnsubscribeOptions.prototype['onFailure'] = MqttUnsubscribeOptions
    .prototype.onFailure;

  export default MqttUnsubscribeOptions;
