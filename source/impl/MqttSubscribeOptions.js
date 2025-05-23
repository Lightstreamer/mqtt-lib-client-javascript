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
    'qos': { 'type': 'number' },
    'maxFrequency': { 'type': 'number' },
    'onSuccess': { 'type': 'function', 'nullable': true },
    'onFailure': { 'type': 'function', 'nullable': true },
    'onNotAuthorized': { 'type': 'function', 'nullable': true }
  };

  /**
   * @constructor
   * @param {Object=} subscribeOptions
   * @ignore
   */
  var MqttSubscribeOptions = function(subscribeOptions) {
    /** @type {!Object} */
    this._subscribeOptions = {
      'qos': 0,
      'maxFrequency': 'unlimited'
    };

    for (var key in subscribeOptions) {
      if (types[key]) {
        Objects.checkTypeAndSet(subscribeOptions[key], types[key]['type'], key,
          this._subscribeOptions, types[key]['nullable']);
      }
    }

    /** @type {number} */
    var qos = this._subscribeOptions['qos'];
    if (qos !== 0 && qos !== 1 && qos !== 2) {
      throw Error('Invalid [QoS] value: ' + qos);
    }

    /*
     * If specified, check for a positive number. Otherwise, 'unlimited' is
     * passed to the native Lightstreamer Subscription.
     */
    var maxFrequency = this._subscribeOptions['maxFrequency'];
    if (typeof maxFrequency == 'number' && maxFrequency <= 0) {
      throw Error('maxFrequency must be a positive number: ' + maxFrequency);
    }
  };


  MqttSubscribeOptions.prototype = {

    /**
     * @return {number}
     */
    getQoS: function() {
      return this._subscribeOptions['qos'];
    },

    /**
     * @return {number}
     */
    getRequestedMaxFrequency: function() {
      return this._subscribeOptions['maxFrequency'];
    },

    /**
     * @param {number} grantedQos
     */
    onSuccess: function(grantedQos) {
      Objects.invoke(this._subscribeOptions, 'onSuccess',
        [{ 'grantedQos': grantedQos }]);
    },

    /**
     * @param {number} errorCode
     */
    onFailure: function(errorCode) {
      Objects.invoke(this._subscribeOptions, 'onFailure',
        [Objects.makeErrorEvent(errorCode)]);
    },

    /**
     *
     * @param {Object} responseObject
     */
    onNotAuthorized: function(responseObject) {
      Objects.invoke(this._subscribeOptions, 'onNotAuthorized',
        [responseObject]);
    }
  };

  MqttSubscribeOptions.prototype['getQoS'] = MqttSubscribeOptions.prototype
    .getQoS;

  MqttSubscribeOptions.prototype['getRequestedMaxFrequency'] =
    MqttSubscribeOptions.prototype.getRequestedMaxFrequency;

  MqttSubscribeOptions.prototype['onSuccess'] = MqttSubscribeOptions.prototype
    .onSuccess;

  MqttSubscribeOptions.prototype['onFailure'] = MqttSubscribeOptions.prototype
    .onFailure;

  MqttSubscribeOptions.prototype['onNotAuthorized'] =
    MqttSubscribeOptions.prototype.onNotAuthorized;

  export default MqttSubscribeOptions;
