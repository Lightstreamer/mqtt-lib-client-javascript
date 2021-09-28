define([], function() {
  /**
   * Interface to be implemented for receiving events related to the creation of
   * {@link MQTTCoolSession} instances.
   * <p>
   * The methods of this interface are invoked asynchronously upon a call of
   * {@link openSession}. Note that it is not mandatory to implement
   * all the interface methods, as the missing ones will be ignored;
   * nevertheless, it is recommended to supply at least an implementation of
   * {@link MQTTCoolListener#onConnectionSuccess}, to get the reference to the
   * provided <code>MQTTCoolSession</code> instance.
   * <p>
   * To implement this interface, it is only required to create a JavaScript
   * object as follows:
   * <pre>
   * var listener = {
   *
   *   onLsClient : function(lsClient) { ... },
   *
   *   onConnectionSuccess : function(mqttCoolSession) { ... },
   *
   *   onConnectionFailure : function(errorType, errorCode, errorMessage) { ... }
   * }
   * </pre>
   * @exports MQTTCoolListener
   * @interface
   */
  function MQTTCoolListener() { }

  /**
   * The embedded Lightstreamer client instance that is used internally to
   * connect to PRODUCT_JSNAME_PLACEHOLDER.
   * @external LightstreamerClient
   * @see {@link EXTERNAL_APIDOC_REFERENCE/LightstreamerClient.html|LightstreamerClient}
   */

  MQTTCoolListener.prototype = {
    /**
     * First event handler that will be fired when the embedded
     * <code>LightstreamerClient</code> instance has been created and
     * initialized, but before the connection to PRODUCT_JSNAME_PLACEHOLDER is
     * established.
     *
     * <p>The event offers the possibility to further customize the
     * <code>LightstreamerClient</code> instance just before the connection is
     * actually issued. It can also be used to attach a
     * {@link EXTERNAL_APIDOC_REFERENCE/ClientListener.html|ClientListener} to the given instance.
     *
     * @param {!external:LightstreamerClient} lsClient - The client instance
     *   that will be used internally to connect to PRODUCT_JSNAME_PLACEHOLDER.
     */
    onLsClient: function(lsClient) { },

    /**
     * Event handler invoked when a connection to PRODUCT_JSNAME_PLACEHOLDER is
     * established.
     *
     * @param {!MQTTCoolSession} mqttCoolSession - <code>MQTTCoolSession</code>
     *   instance to be used to create new <code>MqttClient</code> objects.
     */
    onConnectionSuccess: function(mqttCoolSession) { },

    /**
     * Event handler invoked to notify that the requested connection to
     * PRODUCT_JSNAME_PLACEHOLDER cannot be established.
     *
     * @param {string} errorType - The error type, which can be one of the
     *   following:
     *   <ul>
     *     <li><code>SERVER_ERROR</code>, in the case of an
     *       PRODUCT_JSNAME_PLACEHOLDER server specific issue.
     *    </li>
     *    <li><code>UNAUTHORIZED_SESSION</code>, when the plugged Hook denies
     *      the authorization to open a session, or raises an issue while
     *      performing its checking activities.
     *    </ul>
     * @param {number=} errorCode - The error code, whose value depends on the
     *   <code>errorType</code>, as follows:
     *   <ul>
     *     <li>For <code>SERVER_ERROR</code>, the <code>errorCode</code> is one
     *       of the possible value as detailed in the documentation of
     *       {@linkcode EXTERNAL_APIDOC_REFERENCE/ClientListener.html#onServerError|ClientListener#onServerError}
     *       event handler.
     *     </li>
     *     <li>For <code>UNAUTHORIZED_SESSION</code>, the <code>errorCode</code>
     *       is given by the specific plugged Hook.
     *     </li>
     *   </ul>
     * @param {string=} errorMessage - The description of the error, if any.
     */
    onConnectionFailure: function(errorType, errorCode, errorMessage) { }
  };
});
