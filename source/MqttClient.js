
  /**
   * Interface to be used for communicating with an MQTT broker. An
   * <code>MqttClient</code> instance actually acts as MQTT client.
   * <p>
   * <code>MqttClient</code> enables a virtual <i>end-to-end</i> connection to
   * the broker as if there was a direct link between the two end points.
   * A virtual end-to-end connection comprises the following two distinct
   * links:
   * <ul>
   *   <li><b>MQTT channel</b>, which is the logical channel established over
   *     the physical PRODUCT_JSNAME_PLACEHOLDER connection, between
   *     <code>MqttClient</code> and the PRODUCT_JSNAME_PLACEHOLDER server.
   *   </li>
   *   <li><b>broker connection</b>, which is the physical MQTT connection
   *     between the PRODUCT_JSNAME_PLACEHOLDER server and the MQTT broker.
   *   </li>
   * </ul>
   * In an end-to-end connection, PRODUCT_JSNAME_PLACEHOLDER takes the role
   * of a real <i>MQTT server proxy</i>, as it acts as an intermediary for the
   * MQTT Control Packets wrapped into
   * <i>PRODUCT_JSNAME_PLACEHOLDER Protocol</i> messages and transported over
   * the MQTT channel, as well as for the MQTT Control Packets transported
   * <i>as is</i> over the broker connection.
   * <p>
   * Once obtained by invoking the {@link MQTTCoolSession#createClient}
   * method, an <code>MqttClient</code> object is already configured to open a
   * connection to the target MQTT broker.
   * <p>
   * Based on the way a broker connection is managed on the server side,
   * an end-to-end connection can be of two types, <i>dedicated</i> or
   * <i>shared</i>:
   * <ul>
   *   <li><b>Dedicated End-to-End Connection</b>.
   *   <p>
   *     For each <code>MqttClient</code> that is provided with a valid client
   *     identifier at the time of creation through
   *     <code>MQTTCoolSession</code>, PRODUCT_JSNAME_PLACEHOLDER establishes
   *     on the server side a dedicated broker connection devoted to carrying
   *     all the messages to be exchanged with the target MQTT server. As a
   *     first consequence, if another <code>MqttClient</code> object or any
   *     other generic external MQTT client connects to the same MQTT broker
   *     using an identical client identifier, the connection will be closed as
   *     per the <i>MQTT Protocol Specifications</i>.
  *      <p>
   *     A dedicated end-to-end connection guarantees full support of the
   *     following features:
   *     <ul>
   *       <li>QoS Levels 0,1, and 2</li>
   *       <li>persistence of the Session state</li>
   *       <li>Will Message</li>
   *     </ul>
   *     <p>
   *     Note that the PRODUCT_JSNAME_PLACEHOLDER server does not take any
   *     active role in the management of the Session state, which is, on the
   *     contrary, maintained exclusively by the two ends of the connection: the
   *     MQTT broker and the <code>MqttClient</code> instance.
   *     <p>
   *     In a dedicated end-to-end connection, the life-cycle events relative to
   *     <code>MqttClient</code>, MQTT channel, and dedicated broker connection
   *     are tied together, namely:
   *     <ul>
   *       <li>A connection request initiated by <code>MqttClient</code> (which
   *         means a newly created MQTT channel) will be propagated up to the
   *         MQTT broker through the establishment of a new dedicated broker
   *         connection.
   *       </li>
   *       <li>A disconnection request initiated by <code>MqttClient</code>
   *         (which means the closure of the MQTT channel) will be propagated up
   *         to the MQTT broker, which in turn will close the dedicated broker
   *         connection.
   *       </li>
   *       <li>An interruption of the dedicated broker connection (due to any
   *         network issue or to a problem in the MQTT broker process) will be
   *         propagated back to <code>MqttClient</code>, which in turn will
   *         disconnect from MQTT.cool by closing the MQTT channel.
   *       </li>
   *       <li>An interruption of the PRODUCT_JSNAME_PLACEHOLDER connection on
   *         the client side (due to any network issue or to an explicit
   *         <code>MQTTCoolSession</code> closing) will be propagated up to the
   *         MQTT broker by shutting down the dedicated broker connection.
   *       </li>
   *       <li>Any PRODUCT_JSNAME_PLACEHOLDER server failure will cause
   *         interruption of both the dedicated broker connection on the server
   *         side and the PRODUCT_JSNAME_PLACEHOLDER connection on the client
   *       </li>side.
   *     </ul>
   *     Note that any issue on the PRODUCT_JSNAME_PLACEHOLDER connection
   *     detected on the client side will cause the <code>MqttClient</code>
   *     instance to try a reconnection (see
   *     {@link MqttClient#onReconnectionStart}).
   *   </li>
   *   <li><b>Shared End-to-End Connection</b>
   *     <p>
   *     A shared end-to-end connection is realized when
   *     PRODUCT_JSNAME_PLACEHOLDER holds a single broker connection that will
   *     be shared among all those <code>MqttClient</code> instances (even
   *     hosted on different network locations) with the following common
   *     characteristics:
   *     <ol>
   *       <li>No client identifier has been passed at the time of creation from
   *         <code>MQTTCoolSession</code>.
   *       </li>
   *       <li>Connect to the same MQTT broker, along with identical username
   *         and password, if any.
   *       </li>
   *     </ol>
   *     <p>
   *     By exploiting this mechanism, PRODUCT_JSNAME_PLACEHOLDER drastically
   *     reduces the number of newly created MQTT connections to the broker,
   *     with the purpose of optimizing the server side resources.
   *     <p>
   *     Futhermore, all the subscriptions to the same topic filter requested by
   *     the sharing clients will be logically merged into one single MQTT
   *     subscription, which is actually activated on the shared broker
   *     connection. This enables offloading the fan out to
   *     PRODUCT_JSNAME_PLACEHOLDER, as it will be responsible for propagating
   *     messages flowing on the MQTT channel up to all subscribing clients.
   *     <p>
   *     The following constraints apply to shared connections:
   *     <ul>
   *       <li>QoS levels 1 and 2 are only partially supported.</li>
   *       <li>The <code>ClientId</code> cannot be specified explicitly; on the
   *         contrary, it will be generated by appending a random string to the
   *         <code>clientid_prefix</code> parameter to be configured in
   *         <code>mqtt_master_connector_conf.xml</code>.
   *       </li>
   *       <li>Session persistence is <b>not</b> supported, which means that the
   *         <code>Clean Session</code> flag must be set to <code>true</code>
   *         (or left unchanged).
   *       </li>
   *       <li>Will Message cannot be specified explicitly on the client side,
   *           but only globally and for all clients sharing a connection, once
   *           again through the <code>mqtt_master_connector_conf.xml</code>
   *           file.
   *       </li>
   *     </ul>
   *     <p>
   *     In a shared end-to-end connection, the life-cycle events relative to
   *     <code>MqttClient</code>, MQTT channel, and shared broker connection are
   *     only partially tied together, namely:
   *     <ul>
   *       <li>A connection request initiated by <code>MqttClient</code>
   *         implies that the newly created MQTT channel will be logically
   *         joined to an already active shared broker connection; the shared
   *         MQTT connection will be established only the very first time that
   *         an <code>MqttClient</code> instance connects to the broker.
   *       </li>
   *       <li>A disconnection request initiated by <code>MqttClient</code>
   *         (which means closure of the MQTT channel) will cause only a logical
   *         <i>detaching</i> from the shared broker connection, which will be
   *         closed gracefully (that is, via an explicit <code>DISCONNECT</code>
   *         Control Packet) only the very last time that an
   *         <code>MqttClient</code> instance disconnects from the broker.
   *       </li>
   *       <li>An interruption of the shared broker connection (due to any
   *         network issue or to a problem in the MQTT broker process) will be
   *         propagated back to all sharing <code>MqttClient</code> instances,
   *         which in turn will disconnect from PRODUCT_JSNAME_PLACEHOLDER by
   *         closing the relative MQTT channels.
   *       </li>
   *       <li>An interruption of the PRODUCT_JSNAME_PLACEHOLDER connection on
   *         the client side (due to any network issue or to an explicit
   *         <code>MQTTCoolSession</code> closing) will be managed by
   *         PRODUCT_JSNAME_PLACEHOLDER as a logical detaching of all the
   *         engaged MQTT channels from the shared broker connection, which
   *         will be closed gracefully only when no more MQTT channels are
   *         attached.
   *       </li>
   *       <li>Any PRODUCT_JSNAME_PLACEHOLDER server failure will cause the
   *         interruption of the shared broker connection on the server side a
   *         well as all the engaged MQTT.cool connections on the client side.
   *       </li>
   *     </ul>
   *     Note that any issue on the PRODUCT_JSNAME_PLACEHOLDER connection
   *     detected on the client side will cause the <code>MqttClient</code>
   *     instance to try a reconnection (see
   *     {@link MqttClient#onReconnectionStart}).
   *   </li>
   * </ul>
   * @interface
   */
  function MqttClient() { }

  MqttClient.prototype = {

    /**
     * The property to be bound to the callback function which will be invoked
     * when the end-to-end connection is lost.
     * <p>
     * The end-to-end connection is lost when one of the followings condition
     * occurs:
     * <ul>
     *   <li>A regular disconnection initiated on the client side, through
     *     invocation of the {@link MqttClient#disconnect} method.
     *   </li>
     *   <li>A disconnection from PRODUCT_JSNAME_PLACEHOLDER triggered on the
     *     client side, through invocation of the {@link MQTTCoolSession#close}
     *     method on the same <code>MQTTCoolSession</code> instance that
     *     originated this <code>MqttClient</code> object.
     *   </li>
     *   <li>An interruption of the broker connection.
     *   </li>
     *   <li>Stop of the reconnection attempts that follow an interruption of
     *     the PRODUCT_JSNAME_PLACEHOLDER connection.
     *   </li>
     * </ul>
     * <p>
     * After losing the connection, the <code>MqttClient</code> instance
     * switches to the disconnected status, from which it would be possible to
     * start a new connection.
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>function</code> type.
     *
     * @type {OnConnectionLost}
     */
    onConnectionLost: null,

    /**
     * Callback function that is invoked when the end-to-end connection is lost.
     *
     * @callback OnConnectionLost
     * @see {@link MqttClient#onConnectionLost}
     * @param {!Object} responseObject - The object whose properties contain the
     *   details about the connection lost event.
     * @param {number} responseObject.errorCode - The error code, which can be
     *   one of the following:
     *   <ul>
     *     <li><code>0</code> => <i>Successful disconnection</i><br/>
     *       when <code>MqttClient</code> has initiated a regular disconnection
     *       (without waiting for a response sent back by
     *       PRODUCT_JSNAME_PLACEHOLDER)
     *     </li>
     *     <li><code>10</code> = <i>Connection error to
     *       PRODUCT_JSNAME_PLACEHOLDER</i>
     *       <br/>
     *       when the underlying PRODUCT_JSNAME_PLACEHOLDER connection has been
     *       interrupted and the reconnection attempts that follow have been
     *       stopped
     *     </li>
     *     <li><code>11</code> => <i>Connection error to the MQTT broker</i>
     *       <br/>
     *       when the broker connection has been interrupted
     *     </li>
     *     <li><code>12</code> => <i>Disconnection from
     *       PRODUCT_JSNAME_PLACEHOLDER</i><br/>
     *       when the {@link MQTTCoolSession#close} method has been invoked on
     *       the <code>MQTTCoolSession</code> instance used to create the
     *       <code>MqttClient</code> instance
     *     </li>
     *   </ul>
     * @param {string} responseObject.errorMessage - The description of the
     *   error, as specified above.
     */

    /**
     * The property to be bound to the callback function invoked when an attempt
     * to re-establish the current end-to-end connection, which has been
     * interrupted because of an issue between <code>MqttClient</code> and
     * PRODUCT_JSNAME_PLACEHOLDER, has started.
     * <p>
     * More specifically, the callback is called in case of interruption of
     * the underlying PRODUCT_JSNAME_PLACEHOLDER connection (due to network
     * issue or to problems in the PRODUCT_JSNAME_PLACEHOLDER server process)
     * while the <code>MqttClient</code> instance is currently in the connected
     * status. If the connection was interrupted just before
     * <code>MqttClient</code> connects through the {@link MqttClient#connect}
     * method, then a connection failure will be immediately triggered: see
     * {@link OnConnectionFailure}, <code>errorCode=10</code>.
     * <p>
     * The provided <i>reconnection</i> feature allows to try to transparently
     * re-establish the connection to the PRODUCT_JSNAME_PLACEHOLDER server
     * while also preserving the current <i>session state</i>, which could be
     * resumed once the connection has been restored.<br/>
     * <p>
     * The session state depends on the current end-to-end connection type:
     * <ul>
     *   <li>For a shared connection and a dedicated connection <b>without</b>
     *     session persistence, the session state consists of:
     *     <ol>
     *       <li>All messages sent to the MQTT broker, but not yet acknowledged
     *         by the PRODUCT_JSNAME_PLACEHOLDER server.
     *       </li>
     *       <li>All the current active subscriptions.</li>
     *     </ol>
     *   </li>
     *   <li>For a dedicated connection <b>with</b> session persistence, the
     *     session state consists of:
     *     <ol>
     *       <li>QoS 0 messages sent to the MQTT broker, but not yet
     *         acknowledged by the PRODUCT_JSNAME_PLACEHOLDER server.
     *       </li>
     *       <li>QoS 1 and QoS 2 messages sent to the MQTT broker, but not
     *         completely acknowledged.
     *       </li>
     *       <li>QoS 2 messages received from the MQTT broker, but not
     *         completely acknowledged.
     *       </li>
     *     </ol>
     *     Note that points 2 and 3 are compliant with the definition of
     *     <i>Session state in the Client</i> as stated in the MQTT Protocol
     *     Specifications; instead, point 1 goes beyond such definition as no
     *     recovery action is normally required for QoS 0 messages.
     *   </li>
     * </ul>
     * <p>
     * The callback will be invoked indefinitely until one of the following
     * events occurs:
     * <ul>
     *   <li>The underlying PRODUCT_JSNAME_PLACEHOLDER connection has been
     *     restored.
     *   </li>
     *   <li>An explicit invocation of the {@link MqttClient#disconnect}
     *     method has been performed in the body of the provided callback
     *     (recommended way to stop definitively any reconnection attempt).
     *   </li>
     * </ul>
     * The latter point also implies that there will not be any further chances
     * to resume the state of <code>MqttClient</code> that is without a
     * persistent session.
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>function</code> type.
     *
     * @type {OnReconnectionStart}
     */
    onReconnectionStart: null,

    /**
     * Callback function that is invoked when an attempt to re-establish the
     * end-to-end connection, which has been interrupted because of an issue
     * between <code>MqttClient</code> and PRODUCT_JSNAME_PLACEHOLDER, has
     * started.
     * @callback OnReconnectionStart
     * @see {@link MqttClient#onReconnectionStart}
     */

    /**
     * The property to be bound to the callback function invoked upon a
     * successful restoration of the end-to-end connection, which has been
     * interrupted because of an issue between <code>MqttClient</code> and
     * PRODUCT_JSNAME_PLACEHOLDER.
     * <p>
     * More specifically, as soon as the underlying PRODUCT_JSNAME_PLACEHOLDER
     * connection is restored, the <code>MqttClient</code> instance
     * and the PRODUCT_JSNAME_PLACEHOLDER server cooperate silently in order to
     * fully restore the whole end-to-end connection, whereupon the session
     * state (as defined in {@link MqttClient#onReconnectionStart}) will be
     * resumed as follows:
     * <ul>
     *   <li>For a shared connection and a dedicated connection <b>without</b>
     *     session persistence:
     *     <ul>
     *       <li>All the active subscriptions will be resubmitted silently.</li>
     *       <li>Sent QoS 0 messages, not yet acknowledged by the
     *         PRODUCT_JSNAME_PLACEHOLDER server, will be be redelivered,
     *         although the {@link MqttClient#onMessageDelivered} notification
     *         will no longer take place.
     *       </li>
     *       <li>Sent QoS > 0 messages, not yet acknowledged by the
     *         PRODUCT_JSNAME_PLACEHOLDER server, will be redelivered; in this
     *         case, the flow of notification will prosecute as if the messages
     *         had been sent for the first time, which means that
     *         {@link MqttClient#onMessageDelivered} will be invoked as
     *         expected.
     *         <p>
     *         Furthermore, message redelivery triggered on the client
     *         side could cause duplicates because on the server side, the same
     *         message may be sent and acknowledged completely before the
     *         end-to-end is interrupted: this specific condition represents a
     *         concern in the case of QoS 2 messages as the MQTT Protocol
     *         Specifications do not allow duplicates.
     *       </li>
     *     </ul>
     *   </li>
     *   <li>For a dedicated connection <b>with</b> session persistence:
     *     <ul>
     *       <li>Sent QoS 0 messages, not yet acknowledged by the
     *         PRODUCT_JSNAME_PLACEHOLDER server, will be redelivered, although
     *         the {@link MqttClient#onMessageDelivered} notification will no
     *         longer take place.
     *       </li>
     *       <li>Sent QoS 1 and 2 messages, not yet completely acknowledged,
     *         will be reprocessed as per the reached level of acknowledgement.
     *       </li>
     *       <li>Received QoS 2 messages, not yet completely acknowledged to the
     *         MQTT broker, will be reprocessed as per the reached level of
     *         acknowledgement.
     *       </li>
     *     </ul>
     *   </li>
     * </ul>
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>function</code> type.
     *
     * @type {OnReconnectionComplete}
     */
    onReconnectionComplete: null,

    /**
     * Callback function that is invoked upon a successful restoration of the
     * end-to-end connection, which has been interrupted because of an issue
     * between <code>MqttClient</code> and PRODUCT_JSNAME_PLACEHOLDER.
     *
     * @callback OnReconnectionComplete
     * @see {@link MqttClient#onReconnectionComplete}
     */

    /**
     * The property to be bound to the callback function invoked upon receiving
     * an Application Message sent by the MQTT broker.
     * <p>
     * An Application Message is sent by the MQTT broker to
     * PRODUCT_JSNAME_PLACEHOLDER, which then forwards it to the
     * <code>MqttClient</code> instance after appropriate processing.
     * <p>
     * On the client side, the message handling is based on the following
     * factors:
     * <ul>
     *   <li>The QoS level at which the MQTT broker sends the message.</li>
     *   <li>The current end-to-end connection type (shared or dedicated).
     *   </li>
     *   <li>Whether the session is persistent, which is allowed only in the
     *     case of dedicated connection.
     *   </li>
     * </ul>
     * <p>
     * In particular:
     * <ul>
     *   <li>For a shared connection and a dedicated connection <b>without</b>
     *     session persistence, the invocation occurs when
     *     PRODUCT_JSNAME_PLACEHOLDER forwards the message to the client as
     *     soon as the delivery of the Control Packets exchanged on the server
     *     side and relative to the
     *     {@link http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718099|delivery protocol}
     *     for the specified QoS level, has been completed.
     *     <p>
     *     Furthermore, for a shared connection the same message is forwarded to
     *     all the other <code>MqttClient</code> instances that share the
     *     broker connection and have subscribed to the same topic filter, even
     *     specifying a different QoS level. As consequence of this, it could be
     *     possible that the {@link Message#qos} value of the received
     *     <code>Message</code> instance gets downgraded from the value actually
     *     granted by the MQTT broker because the sole existing subscription on
     *     the server side has been submitted with the maximum QoS level among
     *     the ones of the fanout subscriptions requested by the clients.
     *   </li>
     *   <li>For a dedicated connection <b>with</b> session persistence,
     *     invocation occurs in accordance with the flow of the Control Packets
     *     exchanged between <code>MqttClient</code> and the MQTT broker and
     *     relative to the aforementioned delivery protocol. More specifically:
     *     <ul>
     *       <li>Upon receiving a QoS 0 message, the callback is invoked
     *         immediately without any further elaboration.
     *       <li>Upon receiving a QoS 1 message, a <code>PUBACK</code> Control
     *         Packet is sent back and then the callback is invoked.
     *       </li>
     *       <li>Upon receiving a QoS 2 message, it is stored immediately and
     *         then a <code>PUBREC</code> Control Packet is sent back; upon
     *         receiving the <code>PUBREL</code> Control Packet, the message is
     *         finally removed from the local storage, the callback is invoked
     *         and then the <code>PUBCOMP</code> Control Packet is sent back.
     *       </li>
     *     </ul>
     * </ul>
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>function</code> type.
     *
     * @type {OnMessageArrived}
     */
    onMessageArrived: null,

    /**
     * Callback function that is invoked upon receiving an Application Message.
     *
     * @callback OnMessageArrived
     * @see {@link MqttClient#onMessageArrived}
     * @param {!Message} message - The incoming Application Message.
     */

    /**
     * The property to be bound to the callback function invoked when the
     * delivery process of an Application Message is complete.
     * <p>
     * An invocation of the {@link MqttClient#send} method initiates the
     * delivery process, whose successful completion depends on the following
     * factors:
     * <ul>
     *   <li>The QoS level used to deliver the Application Message.</li>
     *   <li>The current end-to-end connection type (shared or dedicated).
     *   </li>
     *   <li>Whether the session is persistent, which is allowed only in the
     *     case of a dedicated connection.
     *   </li>
     * </ul>
     * <p>
     * In the case of QoS 0 message, the callback is invoked once the message
     * has been delivered to the underlying PRODUCT_JSNAME_PLACEHOLDER channel
     * (irrespective of the connection type), and before any possible
     * authorization issue which could be raised when the message is actually
     * received by PRODUCT_JSNAME_PLACEHOLDER (see
     * {@link MqttClient#onMessageNotAuthorized}).
     * <p>
     * In the case of QoS > 0 message, the callback is invoked on the basis of
     * the connection type as follows:
     * <ul>
     *   <li>For a shared connection and a dedicated connection <b>without</b>
     *     session persistence, the invocation occurs when
     *     PRODUCT_JSNAME_PLACEHOLDER sends back the acknowledgement that
     *     the flow of the Control Packets exchanged on the server side and
     *     relative to the
     *     {@link http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718099|delivery protocol}
     *     for the specified QoS level has been completed.
     *   </li>
     *   <li>For a dedicated connection <b>with</b> session persistence, the
     *     invocation occurs in accordance wih the flow of the Control Packets
     *     exchanged between <code>MqttClient</code> and the MQTT broker and
     *     relative to the aforementioned delivery protocol. More specifically:
     *     <ul>
     *       <li>For QoS 1 message, upon receiving the <code>PUBACK</code>
     *         Control Packet, the callback is invoked and then the message is
     *         removed from the local storage.
     *       </li>
     *       <li>For QoS 2 message, upon receiving the <code>PUBREC</code>
     *         Control Packet, the message state is updated on the local storage
     *         and then the <code>PUBREL</code> Control Packet is sent back;
     *         upon receiving the <code>PUBCOMP</code> Control Packet, the
     *         callback is invoked and then the message is finally removed from
     *         the local storage.
     *       </li>
     *     </ul>
     *   </li>
     * </ul>
     * <p>
     * Note that for QoS > 0 message, the callback will be never invoked in the
     * case of any authorization issue raised by the plugged Hook (see
     * {@link MqttClient#onMessageNotAuthorized}). In such scenario, the message
     * is also removed from the local storage if session persistence is active.
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>function</code> type.
     *
     * @type {OnMessageDelivered}
     */
    onMessageDelivered: null,

    /**
     * Callback function that is invoked when the delivery process of an
     * Application Message completes.
     *
     * @callback OnMessageDelivered
     * @see {@link MqttClient#onMessageDelivered}
     * @param {!Message} message - The delivered Application Message.
     */

    /**
     * The property to be bound to the callback function invoked when the
     * plugged Hook denies the authorization for publishing, or raises an issue
     * while performing its checking activities.
     * <p>
     * The authorization phase is triggered once the message received by
     * PRODUCT_JSNAME_PLACEHOLDER is passed to the Hook, before being sent to
     * the target MQTT broker. In the case of authorization failure, the message
     * is rejected immediately and a specific error is sent back by
     * PRODUCT_JSNAME_PLACEHOLDER to <code>MqttClient</code>. As consequence of
     * this, {@link MqttClient#onMessageDelivered} will never be called for this
     * message, unless its QoS value is <code>0</code>, which on the contrary
     * causes an instant invocation of the callback.
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>function</code> type.
     *
     * @type {OnMessageNotAuthorized}
     */
    onMessageNotAuthorized: null,

    /**
     * Callback function that is invoked when the plugged Hook denies the
     * authorization for publishing the specified message, or raises an issue
     * while performing its checking activities.
     *
     * @callback OnMessageNotAuthorized
     * @see {@link MqttClient#onMessageNotAuthorized}
     * @param {!Message} message - The Application Message that failed to be
     *   authorized.
     * @param {Object=} responseObject - The object whose properties contain the
     *   details about the authorization failure. Note that the object is
     *   supplied only if the plugged Hook raises an issue while checking the
     *   authorization for the requested publishing, whereas nothing is supplied
     *   when the Hook simply denies the request.
     * @param {number} responseObject.errorCode - The error code, which is
     *   dependent on the specific plugged Hook.
     * @param {string} responseObject.errorMessage - The description of the
     *   error, which is dependent on the specific plugged Hook.
     */

    /**
     * Opens an end-to-end connection to the target MQTT broker.
     * <p>
     * The ways through which the connection to the broker has to be
     * established have been specified by the parameters supplied to the
     * {@link MQTTCoolSession#createClient} method, which is invoked to create
     * this <code>MqttClient</code> instance.<br/>
     * Upon successful acknowledgement of the connection request (notified
     * through the {@link OnConnectionSuccess} callback if properly set)
     * the <code>MqttClient</code> instance switches to the connected status.
     *
     * @param {ConnectOptions=} connectOptions - The object whose properties
     *   specify the options to be used for controlling the connection to the
     *   target MQTT broker. If not supplied (or <code>null</code>), then its
     *   default values apply.
     * @throws {Error} If <code>MqttClient</code> is currently in the connected
     *   status or the provided argument is invalid.
     */
    connect: function(connectOptions) { },

    /**
     * @typedef {Object} ConnectOptions - Object containing the properties which
     *   specify the options to be used for controlling the connection to the
     *   target MQTT broker. If not supplied to the
     *   {@link MqttClient#connect} method, then the default values apply as
     *   specified below.
     *   <p>
     *   Note that if the provided properties are not of the expected type,
     *   then an exception will be thrown on {@link MqttClient#connect}
     *   invocation.
     * @see {@link MqttClient#connect}
     * @property {string=} username - The username to be used for authenticating
     *   with the target MQTT broker.
     *   <p>
     *   Note that an empty string (<code>''</code>) is considered as a valid
     *   username.
     * @property {string=} password - The password to be used for authenticating
     *   with the target MQTT broker.
     *   <p>
     *   Note that an empty string (<code>''</code>) is considered a valid
     *   password.
     * @property {Message=} willMessage - The message to be stored to the target
     *   MQTT broker and that is to be published to the Will Topic if the
     *   end-to-end connection closes abruptly (or any other event mentioned in
     *   the MQTT Protocol Specifications).
     *   <p>
     *   Note that in the case of shared connection, which does not allow
     *   Will Message, the property must be left unset (or, at least, should be
     *   set to <code>null</code>), otherwise an exception will be thrown on
     *  {@link MqttClient#connect} invocation.
     * @property {boolean=} cleanSession=true - If set to <code>false</code>,
     *   indicates that session persistence is required, otherwise any previous
     *   session will be discarded upon successful connection.
     *   <p>
     *   Note that in the case of shared connection, which does not allow a
     *   persistent session, the flag must be set to <code>true</code> or left
     *   unset, otherwise an exception will be thrown on
     *  {@link MqttClient#connect} invocation.
     * @property {MqttStorage=} storage - <code>MqttStorage</code> instance,
     *   which provides a custom implementation of the persistence layer, needed
     *   to store the session as required when the <code>cleanSession</code>
     *   flag is set to <code>false</code>.
START_Node.js_JSDOC_EXCLUDE
     *   If no instance is provided (or <code>null</code>), then the default
     *   implementation based on the <i>localStorage</i> property supplied by
     *   the browser will be used.
END_Node.js_JSDOC_EXCLUDE
START_Web_JSDOC_EXCLUDE
     *   If no instance is provided (or <code>null</code>), then the default
     *   implementation based on the local file system will be used.
END_Web_JSDOC_EXCLUDE
     *   <p>
     *   Before using the <code>MqttStorage</code> (either the provided custom
     *   implementation or the default one), a preliminary compliance self-test
     *   is performed and an exception will be thrown on
     *   {@link MqttClient#connect} invocation if the observed functioning is
     *   not as expected (for example due to some implementation errors).
START_Node.js_JSDOC_EXCLUDE
     *   In particular, in the case of default implementation, the self-test
     *   could fail because of issues related to the usage of the
     *   <i>localStorage</i> property, for example due to the switching to the
     *   <i>Privacy Mode</i>, which may affect the proper functioning of the
     *   local storage in some browsers.
END_Node.js_JSDOC_EXCLUDE
START_Web_JSDOC_EXCLUDE
     *   In particular, in the case of default implementation, the self-test
     *   could fail because of issues related to the usage of the local file
     *   system.
END_Web_JSDOC_EXCLUDE
     *   <p>
     *   Note that in the case of shared connection, which does not allow a
     *   persistent session, the property must be left unset (or, at least,
     *   should be set to <code>null</code>), otherwise an exception will be
     *   thrown on {@link MqttClient#connect} invocation.
START_Web_JSDOC_EXCLUDE
     * @property {?string=} storePath='./mqttcool-storage' -
     *   The path of the directory to be provided to the default storage
     *   implementation, in the case the <code>connectOptions.storage</code> is
     *   not specified. This directory will host the files used to persist data
     *   related to the session.
END_Web_JSDOC_EXCLUDE
     * @property {OnConnectionSuccess=} onSuccess - The callback
     *   function invoked upon a successful acknowledgement of the connection
     *   request to the target MQTT broker; afterwards, the
     *   <code>MqttClient</code> instance switches to the connected status.
     * @property {OnConnectionFailure=} onFailure - The callback
     *   function invoked in the case of any issue with either the target MQTT
     *   broker or the PRODUCT_JSNAME_PLACEHOLDER server.
     * @property {OnConnectionNotAuthorized=} onNotAuthorized -
     *   The callback function invoked when the plugged Hook denies the
     *   authorization to connect to the target MQTT broker, or raises an issue
     *   while performing its checking activities.
     */

    /**
     * Callback function that is invoked upon a successful acknowledgement of
     * the connection request to the target MQTT broker.
     *
     * @callback OnConnectionSuccess
     * @see the <code>onSuccess</code> property of {@link ConnectOptions}
     */

    /**
     * Callback function that is invoked in the case of connection failure to
     * the target MQTT broker.
     *
     * @callback OnConnectionFailure
     * @see the <code>onFailure</code> property of {@link ConnectOptions}
     * @param {!Object} responseObject - The object whose properties contain the
     *   details about the connection failure.
     * @param {number} responseObject.errorCode - The error code, which can be
     *   one of the values specified in the following sections:
     *   <ul>
     *     <li>The <i>Connect Return</i> codes as detailed in the MQTT Protocol
     *       Specification, sent by the target MQTT broker to
     *       PRODUCT_JSNAME_PLACEHOLDER (and from there forwarded to
     *       <code>MqttClient</code>):
     *       <ul>
     *         <li><code>1</code> => <i>Connection Refused: unacceptable
     *           protocol version</i>
     *         </li>
     *         <li><code>2</code> => <i>Connection Refused: identifier rejected
     *           </i>
     *         </li>
     *         <li><code>3</code> => <i>Connection Refused: server unavailable
     *           </i>
     *         </li>
     *         <li><code>4</code> => <i>Connection Refused: bad user name or
     *           password</i>
     *         </li>
     *         <li><code>5</code> => <i>Connection Refused: not authorized</i>
     *         </li>
     *       </ul>
     *     </li>
     *     <li>Configuration and connection issues:
     *       <ul>
     *         <li><code>9</code> => <i>MQTT broker configuration not valid</i>
     *         </li>
     *         <li><code>10</code> => <i>Connection error to
     *           PRODUCT_JSNAME_PLACEHOLDER</i><br/>
     *           when the underlying PRODUCT_JSNAME_PLACEHOLDER connection has
     *           been interrupted just before issuing the connection request
     *         </li>
     *         <li><code>11</code> => <i>Connection error to the MQTT broker</i>
     *           <br/>
     *           when the broker connection cannot be established, due to any
     *           network issue or problem in the MQTT broker process
     *         </li>
     *         <li><code>12</code> => <i>Disconnection from
     *           PRODUCT_JSNAME_PLACEHOLDER</i><br/>
     *           when the {@link MQTTCoolSession#close} method has been
     *           invoked on the <code>MQTTCoolSession</code> instance used
     *           to create the <code>MqttClient</code> instance, just before an
     *           acknowledgement of the connection request is received
     *         </li>
     *       </ul>
     *     </li>
     *     <li>Server error:
     *       <ul>
     *         <li><code>100</code> => <i>{'errorCode':&lt;code&gt;,
     *           'errorMessage':&lt;message&gt;}</i><br/>
     *           when an PRODUCT_JSNAME_PLACEHOLDER specific issue occurs, whose
     *           details are formatted as a JSON string in
     *           <code>responseObject.errorMessage</code>: see
     *           {@link EXTERNAL_APIDOC_REFERENCE/SubscriptionListener.html#onSubscriptionError SubscriptionListener#onSubscriptionError}
     *           for all possible values of <code>&lt;code&gt;</code> (consider
     *           only the positive ones) and <code>&lt;message&gt;</code>.
     *         </li>
     *       </ul>
     *     </li>
     *   </ul>
     * @param {string} responseObject.errorMessage - The description of the
     *   error, as specified above.
     */

    /**
     * Callback function that is invoked when the plugged Hook denies the
     * authorization to connect to the target MQTT broker, or raises an issue
     * while performing its checking activities.
     * <p>
     * The authorization phase is triggered once the connection request received
     * by PRODUCT_JSNAME_PLACEHOLDER is passed to the Hook, before the actual
     * broker connection is established. In the case of authorization failure,
     * the request is rejected immediately and a specific error is sent back by
     * PRODUCT_JSNAME_PLACEHOLDER to <code>MqttClient</code>. As consequence of
     * this, neither {@link OnConnectionSuccess} nor {@link OnConnectionFailure}
     * will be called for the requested connection.
     *
     * @callback OnConnectionNotAuthorized
     * @see the <code>onNotAuthorized</code> property of {@link ConnectOptions}.
     * @param {Object=} responseObject - The object whose properties contain the
     *   details about the authorization failure. Note that the object is
     *   supplied only if the plugged Hook raises an issue while checking the
     *   authorization to connect to the MQTT broker, whereas nothing is
     *   supplied when the Hook simply denies the request.
     * @param {number} responseObject.errorCode - The error code, which is
     *   dependent on the specific plugged Hook.
     * @param {string} responseObject.errorMessage - The description of the
     *   error, which is dependent on the specific plugged Hook.
     */

    /**
     * Sends an Application Message to be published to a topic.
     * <p>
     * The method can be used in two different ways, on the basis of the number
     * and the type of the provided arguments:
     * <ul>
     *   <li>Single Argument Form</li>
     *   The method takes just one argument, which is a {@link Message} instance
     *   wrapping the Application Message (and related details) to be published.
     *   <br/>
     *   For example:
     *   <pre>
     *   // Prepare the Message instance
     *   var msg = new Message('My Message!')
     *   msg.destinationName = 'my/topic';
     *   msg.qos = 1;
     *   msg.retained = false;
     *
     *   // Send the prepared message (client is an already connected MqttClient object).
     *   client.send(msg);
     *   </pre>
     *
     *   <li>Multiple Arguments Form</li>
     *   The method takes up to four arguments that specify the Application
     *   Message (and the related details) to be published.<br/>
     *   For example:
     *   <pre>
     *   // Send the message specified by means of the provided arguments.
     *   client.send('my/topic', 'My Message!', 1, false);
     *   </pre>
     * </ui>
     * Note also that it is not allowed to provide arguments in a mixed form; if
     * this is the case, then an exception will be thrown.
     *
     * @param {!(string|Message)} topic - In the case of a {@link Message}
     *   instance, the Application Message (and related details) to be
     *   published.
     *   <p>
     *   In the case of a <code>string</code> value, the name of the topic to
     *   which the Application Message is to be published as specified in
     *   {@link Message#destinationName}.
     * @param {!(string|ArrayBuffer|Int8Array|Uint8Array|Int16Array|Uint16Array|
     *   Int32Array|Uint32Array|Float32Array|Float64Array)=} payload - The
     *   payload of the Application Message, as it was provided to the
     *   {@link Message} constructor.
     *   <p>
     *   Note that in the case of <i>Multiple arguments</i>, this parameter is
     *   <b>mandatory</b>.
     * @param {number=} qos=0 - The Quality of Service level for delivery of the
     *   Application Message as specified in {@link Message#qos}.
     *   <p>
     *   Note that any provided value different from <code>0</code>,
     *   <code>1</code> and <code>2</code> will provoke an exception.
     * @param {boolean=} retained=false - The retained flag as specified in
     *   {@link Message#retained}.
     * @throws {Error} if <code>MqttClient</code> is currently in the
     *   disconnected status or the provided arguments are invalid.
     */
    send: function(topic, payload, qos, retained) { },

    /**
     * Disconnects from the target MQTT broker.
     * <p>
     * After sending the <code>DISCONNECT</code> Control Packet,
     * <code>MqttClient</code> immediately switches to the disconnected status
     * and closes the underlying MQTT channel, which provokes
     * {@link MqttClient#onConnectionLost} to be fired.<br/>
     * The PRODUCT_JSNAME_PLACEHOLDER connection remains up as it may serve the
     * MQTT channels owned by the other connected <code>MqttClient</code>
     * objects that share the same parent {@link MQTTCoolSession} instance.
     * <p>
     * Note that from the disconnected status, an <code>MqttClient</code> is
     * allowed to open a new connection through the {@link MqttClient#connect}
     * method.
     *
     * @throws {Error} If <code>MqttClient</code> is currently in the
     *   disconnected status.
     */
    disconnect: function() { },

    /**
     * Subscribes to the topic(s) indicated by the given
     * <code>topicFilter</code>.
     * <p>
     * Because the provided <code>topicFiler</code> may contain
     * <i>wildcards</i>, it allows to subscribe to multiple topics at once.
     * @param {string} topicFilter - The topic filter, which indicates one or
     *   more topics to subscribe to.
     * @param {SubscribeOptions=} subscribeOptions - The object whose properties
     *   specify the options to be used for controlling the subscription. If not
     *   supplied (or <code>null</code>), then its default values apply.
     * @throws {Error} If <code>MqttClient</code> is currently in the
     *   disconnected status or the provided arguments are invalid.
     */
    subscribe: function(topicFilter, subscribeOptions) { },

    /**
     * @typedef {Object=} SubscribeOptions - Object containing the properties
     *   that specify the options to be used for controlling the subscription.
     *   If not supplied to the {@link MqttClient#subscribe} method, then the
     *   default values apply as specified below.
     *   <p>
     *   Note that if the provided properties are not of the expected type, then
     *   an exception will be thrown on {@link MqttClient#subscribe} invocation.
     * @see <code>subscribeOptions</code> property of
     *  {@link MqttClient#subscribe}
     * @property {number=} qos=0 - The maximum Quality Of Service with which the
     *   the target MQTT broker is allowed to send Application Messages.
     *   <p>
     *   Note that any provided value different from <code>0</code>,
     *   <code>1</code> and <code>2</code> will provoke an exception to be
     *   thrown on {@link MqttClient#subscribe} invocation.
     * @property {number=} maxFrequency - The maximum update frequency
     *   (expressed in updates per second) to be requested to
     *   PRODUCT_JSNAME_PLACEHOLDER for all messages subscribed with QoS
     *   <code>0</code>. If not supplied, then the update frequency will be
     *   managed as unlimited.
     *   <p>
     *   Note that this feature is available only in the case of shared
     *   connection, whereas in the case of dedicated connection</i> this value
     *   is ignored.
     *   <p>
     *   Note also that any provided value different from a positive <code>
     *   number</code> will provoke an exception to be thrown on
     *  {@link MqttClient#subscribe} invocation.
     * @property {OnSubscriptionSuccess=} onSuccess - The callback function
     *   invoked upon a successful acknowledgement of the requested
     *   subscription.
     * @property {OnSubscriptionFailure=} onFailure - The callback function
     *   invoked in the case of failure of the requested subscription.
     * @property {OnSubscriptionNotAuthorized=} onNotAuthorized - The callback
     *   function invoked when the plugged Hook denies the authorization for the
     *   requested subscription, or raises an issue while performing its
     *   checking activities.
     */

    /**
     * Callback function that is invoked upon a successful acknowledgement of
     * the requested subscription.
     *
     * @callback OnSubscriptionSuccess
     * @see <code>onSuccess</code> property of {@link SubscribeOptions}
     * @param {!Object} responseObject - The object whose properties contain the
     *   details about the successful acknowledgement.
     * @param {number} responseObject.grantedQos - The max Quality of Service
     *   level granted by the MQTT broker for the requested subscription.
     */

    /**
     * Callback function that is invoked in the case of failure of the requested
     * subscription.
     *
     * @callback OnSubscriptionFailure
     * @see <code>onFailure</code> property of {@link SubscribeOptions}
     * @param {!Object} responseObject - The object whose properties contain the
     *   details about the connection failure.
     * @param {number} responseObject.errorCode - The error code of the failure,
     *   as returned by the MQTT broker.
     */

    /**
     * Callback function that is invoked when the plugged Hook denies the
     * authorization for the requested subscription, or raises an issue while
     * performing its checking activities.
     * <p>
     * The authorization phase is triggered once the subscription request
     * received by PRODUCT_JSNAME_PLACEHOLDER is passed to the Hook, before
     * being sent to the target MQTT broker. In the case of authorization
     * failure, the request is rejected immediately and a specific error is sent
     * back by PRODUCT_JSNAME_PLACEHOLDER to <code>MqttClient</code>. As
     * consequence of this, the {@link OnSubscriptionSuccess} will never be
     * called for the requested subscription.
     *
     * @callback OnSubscriptionNotAuthorized
     * @see <code>onNotAuthorized</code> property of {@link SubscribeOptions}
     * @param {!Object=} responseObject - The object whose properties contain
     *   the details about the authorization failure. Note that the object is
     *   supplied only if the plugged Hook raises an issue while checking the
     *   authorization for the requested subscription, whereas nothing is
     *   supplied when the Hook simply denies the request.
     * @param {number} responseObject.errorCode - The error code, which is
     *   dependent on the specific plugged Hook.
     * @param {string} responseObject.errorMessage - The description of the
     *   error, which is dependent on the specific plugged Hook.
     */

    /**
     * Unsubscribes from the topic(s) indicated by the given <code>topicFilter
     * </code>.
     * <p>
     * Because the provided <code>topicFiler</code> may contain
     * <i>wildcards</i>, it can allow unsubscriptions from multiple topics at
     * once.
     *
     * @param {string} topicFilter - The topic filter, which indicates one or
     *   more topics to unsubscribe from.
     * @param {UnsubscribeOptions=} unsubscribeOptions - The object whose
     *   properties specify the options to be used for controlling the
     *   unsubscription.
     * @throws {Error} If <code>MqttClient</code> is in the disconnected status
     *   or the provided arguments are invalid.
     */
    unsubscribe: function(topicFilter, unsubscribeOptions) { },

    /**
     * @typedef {Object=} UnsubscribeOptions - Object containing the properties
     *   which specify the options to be used for controlling the
     *   unsubscription.
     *   <p>
     *   Note that if the provided properties are not of the expected type,
     *   then an exception will be thrown on {@link MqttClient#unsubscribe}
     *   invocation.
     * @see <code>unsubscribeOptions</code> property of
     *   {@link MqttClient#unsubscribe}
     * @property {OnUnsubscribeSuccess=} onSuccess - The callback function
     *   invoked upon a successful acknowledgement of the requested
     *   unsubscription.
     * @property {OnUnsubscribeFailure=} onFailure - The callback function
     *   expected to be called in case of failure of the requested
     *   unsubscription.
     *   <p>
     *   Note that this function is not actually employed by the current
     *   implementation of the library as the MQTT Protocol Specifications does
     *   not define any behavior in case of unsubscription failure. As a
     *   consequence of this, this function is only formally provided, but
     *   future use cannot be ruled out.
     */

    /**
     * Callback function that is invoked upon a successful acknowledgement of
     * the requested unsubscription.
     *
     * @callback OnUnsubscribeSuccess
     * @see <code>onSuccess</code> property of {@link MqttClient#unsubscribe}
     */

    /**
     * Callback function that is invoked in the case of failure of the requested
     * unsubscription.
     *
     * @callback OnUnsubscribeFailure
     * @see <code>onFailure</code> property of {@link MqttClient#unsubscribe}
     * @param {Object} responseObject - The object whose properties contain the
     *   details about the unsubscription failure.
     * @param {number} responseObject.errorCode - The error code.
     * @param {string} responseObject.errorMessage - The description of the
     *   error.
     */

    /**
     * NB Without this dummy declaration marking the end of the class, jsdoc doesn't
     * recognize the declarations above.
     * @private
     */
    dummy: function() {}
  };
  