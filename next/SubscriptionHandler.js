define([], function() {
  /**
   * Interface to be implemented for
   * @exports SubscriptionHandler
   * @interface
   */
  function SubscriptionHandler() { }

  /**
   */
  SubscriptionHandler.prototype = {
    /**
     * Update the maximum update frequency (expressd in updates per second), to
     * to be requested to the MQTT  for all messages subscribed with
     * <i>QoS</i> <code>0</code> to the topic filter managed by this handler.
     * @param {number} requestedMaxFrequency - The maximum update frequency.
     */
    changeFrequency: function(requestedMaxFrequency) { }
  };
});
