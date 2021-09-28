'use strict';
define(['../utils/Objects'], function(Objects) {

  // Allowed keys and relative types.
  var types = {
    'onSuccess': { 'type': 'function', 'nullable': 'true' },
    'onFailure': { 'type': 'function', 'nullable': 'true' }
  };

  /**
   * @constructor
   * @param {Object=} unsubscribeOptions
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

  return MqttUnsubscribeOptions;
});