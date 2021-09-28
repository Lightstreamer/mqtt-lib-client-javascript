define([], function() {
  /**
   * Interface to be used for communicating with a MQTT broker. An instance of
   * <code>Mqttclient</code> interface actually acts as MQTT client.
   * <p>
   * Once obtained by invoking the {@link MQTTExtenderSession#createClient}
   * method, a <code>MqttClient</code> object is already configured to open a
   * connection to the target MQTT broker.<br/>
   * The MqttClient manages an underlying Lightstreamer connection to the MQTT
   * Extender for enabling an <i>end-to-end</i> communication to the broker, as
   * if there was a direct connection between the two end points: this is the
   * so called <i>MQTT over Lightstreamer</i> connection, in which the MQTT
   * Extender takes the role of real <i>MQTT server proxy</i>, as it acts as an
   * intermediary for requests coming form the client and targeted to the
   * broker, as well as for responses and Application Messages coming from the
   * broker and targeted to the client.
   * <p>
   * The MQTT over Lightstreamer connection can be of two types, based on the
   * way a physical MQTT connection is managed on the server side: <i>dedicated
   * </i> and <i>shared</i>:
   * <ul>
   *  <li>A <b>Dedicated Connection</b> is realized when the MQTT Extender
   *    server holds a single MQTT connection devoted to carry all messages to
   *    be exchanged between the <code>MqttClient</code> instance which
   *    has initated the connection, and the target MQTT broker. As a first
   *    consequence, if another <code>MqttClient</code> object or any other
   *    generic external MQTT client connects to the same MQTT broker using an
   *    identical client identiifer, the connection will be closed as per the
   *    MQTT protocol specifications.
  *    <p>
   *    The dedicated connection guarantees full support of the following
   *    features:
   *    <ul>
   *      <li>QoS Levels 0,1 and 2</li>
   *      <li>Persistence of the Session State</li>
   *      <li>Authentication</li>
   *      <li>Will Message</li>
   *    </ul>
   *    <p>
   *    The MQTT Extender server does not take any active role in the management
   *    of the Session State, which is, on the contrary, mantained exclusively
   *    by the two ends of the connection: the MQTT broker and the <code>
   *    MqttClient</code> instance.
   *    <p>
   *    The lifecycle of the <code>MqttClient</code> is bound to the one of
   *    the dedicated MQTT connection realized on the server, namely:
   *    <ul>
   *      <li>a connection request initiated by the client will be propagated
   *        up to the MQTT broker, through the establishment of a MQTT
   *        connection performed by the MQTT Extender server
   *      </li>
   *      <li>a disconnection request initiated by the client will be
   *        propagated up to the MQTT broker, which in turn will close the
   *        connection to the MQTT Extender
   *      </li>
   *      <li>an interruption of the dedicated MQTT connection on the server
   *        side (due to any network issue or problems in the MQTT broker
   *        process), will be propagated back to the client, which in turn will
   *        disconnect from the MQTT Extender (from an implemention point of
   *        view, actually only native subscriptions supporting the MQTT over
   *        Lightstreamer connection will be deactivated)
   *     </li>
   *     <li>an interruption of the Lightstreamer connection on the client side,
   *       due to any network issue with the MQTT Extender server or to an
   *       explicit closing of the <code>MQTTExtenderSession</code>, will be
   *       propagated up to the MQTT broker by shutting down the dedicated MQTT
   *       connection
   *     </li>
   *     <li>any MQTT Extender server failures will cause the interruption of
   *         the dedicated MQTT connection to the MQTT broker, as well as a
   *         Lightstreamer connection outage on the client side
   *     </li>
   *   </ul>
   *   Note that any issue on the Lightstreamer connection detected on the
   *   client side, might cause the client to try a reconnection
   *   (see {@link MqttClient#onReconnectionStart}).
   *  <li>A <b>Shared Connection</b> is realized when the MQTT Extender server
   *    holds a sing MQTT connection that will be shared among all the <code>
   *    MqttClient</code> instances having in common what follows:
   *    <ol>
   *      <li>target MQTT broker</li>
   *      <li>username</li>
   *      <li>password</li>
   *      <li><code>Clean Session</code> flag, which must set to <code>true
   *        </code>
   *      </li>
   *    </ol>
   *    <p>
   *    By exploiting shared connections, the MQTT Extender reduces drastically
   *    the number of newly created MQTT connections to the broker, with the
   *    purpose of optimizing the server side resources.
   *    <p>
   *    Futhermore, it is also possibile to logically merge all subscriptions to
   *    the sampe topic filter requested by the sharing clients into a single
   *    subscription actually activated on the shared MQTT connection. This
   *    allows offloading the fan out to the MQTT Extender, as it will be
   *    responsible to propagate Application Messages flowing on the MQTT
   *    connection up to <b>all</b> subscribing clients.
   *    <p>
   *    The following constraints apply to shared connections:
   *    <ul>
   *      <li>the <code>ClientId</code> cannot be specified; on the contrary, it
   *        has to be set via MQTT Extender configuration file, and will be used
   *        to identify the MQTT Extender server to the target MQTT broker
   *      </li>
   *      <li>the <code>Will Message</code> cannot be specified; also in this
   *        case, it has to has to be set via MQTT Extender configuration file,
   *        and will be used as a connection parameter
   *      </li>
   *      <li>session persistence is not allowed</li>
   *    </ul>
   *    <p>
   *    The lifecycle of the <code>MqttClient</code> is only partially bound to
   *    the one the shared MQTT connection realized on the server, namely:
   *    <ul>
   *      <li>a connection request initiated on the client side will be
   *       "logically" merged to an already active shared MQTT connection; the
   *       shared MQTT connection will be established only at the very first
   *       time that a client connects to the broker.
   *      </li>
   *      <li>a disconnection request initiated on the client side will cause
   *        only a "logical" detaching from the shared MQTT connection, which,
   *        on the contrary, will be closed only at the very last time that a
   *        client disconnects from the broker
   *      </li>
   *      <li>an interruption of the shared the MQTT connection on the server
   *        side (due to network issues or problems in the MQTT broker process),
   *        will be propagated back to <b>all</b> the clients which are sharing
   *        the connection; the clients, in turn, will disconnect from the MQTT
   *        Extender, as already illustrated for the <i>Dedicated Connection</i>
   *        case
   *     </li>
   *     <li>an interruption of the Lightstreamer connection on the client side,
   *       due to any network issue with the MQTT Extender server or to an
   *       explicit closing of the <code>MQTTExtenderSession</code>, will be
   *       managed by the MQTT Extender as a "logical" detaching of all
   *       interested <code>MqttClient</code> instances from the shared MQTT
   *       connection
   *     </li>
   *     <li>any MQTT Extender server failures will cause the interruption of
   *       the shared MQTT connection to the MQTT broker, as well as a
   *       Lightstreamer connection outage on the client side
   *     </li>
   *   </ul>
   *   Note that any issue on the Lightstreamer connection detected on the
   *   client side, might cause the client to try a reconnection
   *   (see {@link MqttClient#onReconnectionStart}).
   *
   * @exports MqttClient
   * @interface
   */
  function MqttClient() { }

  MqttClient.prototype = {

    /**
     * Property to be bound to a callback function invoked when the MQTT over
     * Lightstreamer connection to the target MQTT broker is lost.
     * <p>
     * The MQTT over Lightsreamer connection is lost when one of the following
     * condition occurs:
     * <ul>
     *   <li>regular disconnection initiated on the client side, through
     *     invocation of the {@link MqttClient#disconnect} method
     *   </li>
     *   <li>disconnection from the MQTT Extender triggered on the client
     *     side, through invocation of the {@link MQTTExtenderSession#close}
     *     method on the <code>MQTTExtenderSession</code> instance used to
     *     create the client
     *   </li>
     *   <li>interruption of the MQT connection between the MQTT Extender and
     *     the MQTT broker
     *   </li>
     *   <li>stop of the reconnection attempts which follow an interruption of
     *     the underlying Lightstreamer connection to the MQTT Extender
     *   </li>
     * </ul>
     * After losing the connection, the client switches to the disconnected
     * status, from which it would be possible to start a new connection.
     *
     * @type {OnConnectionLost}
     */
    onConnectionLost: null,

    /**
     * Callback function to bind the {@link MqttClient#onConnectionLost}
     * property, and that will be called in case the MQTT over Lightsreamer
     * connection to the target MQTT broker is lost.
     *
     * @callback OnConnectionLost
     * @param {!Object} responseObject - An object whose properties contain the
     *   details about the connection lost event.
     * @param {number} responseObject.errorCode - The error code, which can be
     *   one of the following:
     *   <ul>
     *     <li><code>0</code> => <i>Successful disconnection</i><br/>
     *       when the clients has initiated a regular disconnection (without
     *       waiting )
     *     </li>
     *     <li><code>10</code> = <i>Connection error to the MQTT Extender</i>
     *       <br/>
     *       when the underlying Lightstreamer connection to the MQTT Extender
     *       has been interrupted and the reconnection attempts which follows
     *       have been stopped
     *     </li>
     *     <li><code>11</code> => <i>Connection error to the MQTT broker</i>
     *       <br/>
     *       when the MQTT connection between the MQTT extender has been
     *       interrupted
     *     </li>
     *     <li><code>12</code> => <i>Disconnection from the MQTT Extender</i>
     *       <br/>
     *       when the {@link MQTTExtenderSession#close} method has been invoked
     *       on the <code>MQTTExtenderSession</code> instance used to create the
     *       client
     *     </li>
     *   </ul>
     * @param {string} responseObject.errorMessage - The description of the
     *   error, as specified above.
     */

    /**
     * Property to be bound to a callback function invoked when an attempt to
     * re-establish the MQTT over Lightstreamer connection, which has been
     * interrupted because of an issue between the client and the MQTT Extender,
     * is being started.
     * <p>
     * More specifically, the callback is called in case of interruption of
     * the underlying Lightstreamer connection to the MQTT Extender (due to
     * network issues or problems in the MQTT Extender server process) while the
     * client is currently in connected status. If the client, on the contrary,
     * is currently in disconnected status, a new connection to the target MQT
     * broker will be rejected immediately, and the callback will not be called
     * (see {@link OnConnectionFailure}, case <code>errorCode=10</code>).
     * <p>
     * As the (even temporary) interruption of the Lightstreamer connection
     * causes the failure of end-to-end MQTT over Lightstreamer connection, the
     * client has to be able to preserve its current state, which might be
     * resumed once the connection is restored.<br/>
     * In the case of <i>Dedicated Connection</i> started with session
     * persistence, the clients state consists of:
     * <ol>
     *   <li>QoS 0 messages sent to the MQTT broker, but not yet acknowledged
     *     by the MQTT Extender
     *   </li>
     *   <li>QoS 1 and QoS 2 messages sent to the MQTT broker, but not
     *     completely acknowledged
     *   </li>
     *   <li>QoS 2 messages received from the MQTT broker, but not
     *     completely acknowledged.
     *   </li>
     * </ol>
     * Note that point 2 and 3 are compliant with the definition of <i>Session
     * State</i> on the client side as stated in the <i>MQTT Specifications</i>;
     * instead, the point 1 goes beyond such definition as no recovery action
     * is normally required to be taken for QoS 0 messages.
     * <p>
     * In the case of <i>Shared Connection</i> or <i>Dedicated Connection</i>
     * started without session persistence, the client state consists of:
     * <ol>
     *   <li>QoS 0 messages sent to the MQTT broker, but not yet acknowledged
     *     by the MQTT Extender
     *   </li>
     *   <li>QoS > 1 messages sent to the MQTT broker, but not yet acknowledged
     *     by the MQTT Extender
     *   </li>
     *   <li>Active subscriptions.</li>
     * </ol>
     * <p>
     * The callback will be invoked indefinitely until one of the following
     * events occurs:
     * <ul>
     *   <li>the underlying Lightstreamer connection to the MQTT Extender has
     *     been restored
     *   </li>
     *   <li>an explicit invocation of the {@link MqttClient#disconnect}
     *     method has been performed in the body of the provided callback
     *     (recommended way to stop definitively the reconnection attempts).
     *     <br/>
     *   </li>
     * </ul>
     * The latter point also implies that the client state will not be resumed
     * in case of a subsequent attempt to reconnect a client which was
     * previously started without session persistence.
     *
     * @type {OnReconnectionStart}
     */
    onReconnectionStart: null,

    /**
     * Callback function to bind the {@link MqttClient#onReconnectionStart}
     * property and that will be called when an attempt to re-establish the
     * MQTT over Lightstreamer connection, which has been interrupted because of
     * an issue between the client and the MQTT Extender, is being started.
     * @callback OnReconnectionStart
     */

    /**
     * Property to be bound to a callback function invoked upon a successful
     * restoration of the MQTT over Lightstreamer connection, which has been
     * interrupted because of an issue between the client and the MQTT Extender.
     * <p>
     * More specifically, as soon as the underlying Lightstreamer connection is
     * restored, the silent cooperation between the client and the MQTT Extender
     * server attempts to re-establish the end-to-end MQTT over Lightstreamer
     * connection to the target MQTT broker, after that the client state (as
     * defined in the {@link MqttClient#onReconnectionStart} will be resumed as
     * follows:
     * <ul>
     *   <li>in the case of <i>Dedicated Connection</i> started with session
     *     persistence:
     *     <ul>
     *       <li>sent QoS 0 messages, not yet acknowledged by the MQTT Extender,
     *         will be redelivered, although notification ({@link
     *         MqttClient#onMessageDelivered}) will no longer take place
     *       </li>
     *       <li>sent QoS 1 and 2 messages, not yet completely acknowledged,
     *         will be reprocessed as per the reached level of acknowledgement
     *       </li>
     *       <li>received QoS 2 messages, not yet completely acknowledged
     *         to the MQTT broker, will be reprocessed as per the reached level
     *         of acknowledgement
     *       </li>
     *     </ul>
     *   </li>
     *   <li>in the case of <i>Shared Connection</i> or <i>Dedicated
     *     Connection</i> started without session persistence:
     *     <ul>
     *       <li>active subscriptions will be resubmitted silently</li>
     *       <li>sent QoS 0 messages, not yet acknowledged by the MQTT Extender,
     *         will be redelivered, although notification ({@link
     *         MqttClient#onMessageDelivered}) will no longer take place
     *       </li>
     *       <li>sent QoS > 1 messages, not yet acknowledged by the MQTT
     *         Extender, will be redelivered; in this case the flow of
     *         notification will prosecute as if the messages had been sent for
     *         the first time, namely, the {@link MqttClient#onMessageDelivered}
     *         will be invoked as expected. Furthermore, message redelivery
     *         triggered on the client side could cause duplicates, since on the
     *         server side the same message can be sent and acknowledged
     *         completely before the Lightstreamer connection is interrupted:
     *         this specific condition represents a concern in the case of QoS 2
     *         messages, as the <i>MQTT Specifications</i> do not allow
     *         duplicates.
     *       </li>
     *     </ul>
     *   </li>
     * </ul>
     *
     * @type {OnReconnectionComplete}
     */
    onReconnectionComplete: null,

    /**
     * Callback function to bind the {@link MqttClient#onReconnectionComplete}
     * property, and that will be called upon a successful restoration of the
     * MQTT over Lightstreamer connection, which has been interrupted
     * because of an issue between the client and the MQTT Extender.
     *
     * @callback OnReconnectionComplete
     */

    /**
     * Property to be bound to a callback function invoked upon receiving an
     * Application Message sent by the MQTT broker.
     * <p>
     * An Application Message is sent by the MQTT broker to the MQTT Extender,
     * which then forwards them to the client after appropriate processing.
     * <p>
     * On the client side, the message handling is based on the following
     * factors:
     * <ul>
     *   <li>the QoS level at which the MQTT broker sends the message</li>
     *   <li>the type of the current MQTT over Lightstreamer connection (shared
     *     or dedicated)
     *   </li>
     *   <li>session persistence, which is allowed only in the case of dedicated
     *     connection.
     *   </li>
     * </ul>
     * <p>
     * In particular:
     * <ul>
     *   <li>for a <i>Shared Connection</i> and a <i>Dedicated Connection</i>
     *     started <b>without</b> session persistence, the invocation occurs
     *     when the MQTT Extender forwards the message to the client as soon as
     *     the delivery of control packets exchanged on the server side and
     *     relative to the {@link http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718099|delivery protocol}
     *     for the specified QoS level, has been completed.
     *     <p>
     *     Furthermore, for a <i>Shared Connection</i> the same message is
     *     forwarded to all other <code>MqttClient</code> instances which
     *     share the same physical MQTT connection managed by the MQTT Extender
     *     and that have subscribed to the same topic filter, even specifing a
     *     different QoS level. As consequence of this, it could be possible
     *     that the {@link Message#qos} property associated to the received
     *     <code>Message</code> instance gets downgraded from the value actually
     *     granted by the MQTT broker, because the sole existing subscription on
     *     the server side has been submitted with the maximum QoS level among
     *     the ones of the shared subscriptions submitted by the clients;
     *   </li>
     *   <li>for a <i>Dedicated Connection</i> started <b>with</b> session
     *     persistence, invocation occurs in accordance with the flow of control
     *     packets exchanged between the client and the MQTT broker (through the
     *     MQTT Extender) and relative to the aforementioned delivery protocol.
     *     More specifically:
     *     <ul>
     *       <li>upon receiving a QoS 0 message, the callback is invoked
     *         immediately without any further elaboration
     *       <li>upon receiving a QoS 1 message, a PUBACK control packet is sent
     *         back and then the callback is invoked
     *       </li>
     *       <li>upon receiving a QoS 2 message, it is stored immediately and
     *         then a PUBREC control packet is sent back; upon receiving the
     *         PUBREL control packet, the message is finally removed from the
     *         storage and then the PUBCOMP control packet is sent back.
     *       </li>
     *     </ul>
     * </ul>
     *
     * @type {OnMessageArrived}
     */
    onMessageArrived: null,

    /**
     * Callback function to bind the {@link MqttClient#onMessageArrived}
     * property, and that will be called upon receiving an Application Message.
     *
     * @callback OnMessageArrived
     * @param {!Message} message - The incoming Application Message.
     */

    /**
     * Property to be bound to a calllback function invoked when the delivery
     * process of an Application Message is complete.
     * <p>
     * An invocation of the {@link MqttClient#send} method initiates the
     * delivery process, which depends on the following factors:
     * <ul>
     *   <li>the QoS level used to deliver the Application Message</li>
     *   <li>the type of the current MQTT over Lightstreamer connection (shared
     *     or dedicated)
     *   </li>
     *   <li>session persistence, which is allowed only in the case of a
     *     dedicated connection.
     *   </li>
     * </ul>
     * <p>
     * In the case of QoS 0 message, the callback is invoked once the message
     * has been delivered to the underlying Lightstreamer connection
     * (irrespective of the connection type), and before any possible
     * authorization issues which might be raised when the message is actually
     * received by the MQTT Extender (see {@link
     * MqttClient#onMessageAuthorizationFailure}).
     * <p>
     * In the case of QoS > 1 message, the callback is invoked on the basis of
     * the connection type, as follows:
     * <ul>
     *   <li>for a <i>Shared Connection</i> and a <i>Dedicated Connection</i>
     *     started <b>without</b> session persistence, the invocation occurs
     *     when the MQTT Extender sends back the acknowledgement that the flow
     *     of control packets exchanged on the server side and relative to the
     *     {@link http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718099|delivery protocol}
     *     for the specified QoS level, has been completed
     *   </li>
     *   <li>for a <i>Dedicated Connection</i> started <b>with</b> session
     *     persistence, invocation occurs in accordance wih the flow of control
     *     packets exchanged between the client and the MQTT broker and relative
     *     to the aforementioned delivery protocol. More specifically:
     *     <ul>
     *       <li>for QoS 1 message, upon receiving the PUBACK control packet,
     *         the callback is invoked and then the message is removed from the
     *         storage
     *       </li>
     *       <li>for QoS 2 message, upon receiving the PUBCOMP control packet,
     *         the callback is invoked and then the message is removed from the
     *         storage.
     *       </li>
     *     </ul>
     *   </li>
     * </ul>
     * <p>
     * Note that for QoS > 1 message, the callback will be never invoked in
     * case of authorization issues raised by the MQTT Extender configured hook
     * (see {@link MqttClient#onMessageAuthorizationFailure}). In such scenario,
     * if session persistence is active, then the message is also removed from
     * the storage.
     *
     * @type {OnMessageDelivered}
     */
    onMessageDelivered: null,

    /**
     * Callback function to bind the {@link MqttClient#onMessageDelivered}
     * property, and that will be called  when the delivery process of an
     * Application Message is complete.
     *
     * @callback OnMessageDelivered
     * @param {!Message} message - The delivered Application Message.
     */

    /**
     * Property to be bound to a callback invoked when the MQTT Extender
     * configured hook raises an issue while checking the authorization for
     * publishing the specified message.
     * <p>
     * The authorization phase is triggered once the message received by the
     * MQTT Extender is passed to the hook before being sent to the target
     * MQTT broker. In case of authorizaztion failure, the message is rejected
     * immediately and a specific error is sent back by the MQTT Extender to the
     * client. As consequence of this, the {@link MqttClient#onMessageDelivered}
     * will never be called for this message, unless its QoS value is 0, which
     * on the contrary casues an instant invocation of the callbacl.
     *
     * @type {OnMessageAuthorizationFailure}
     */
    onMessageAuthorizationFailure: null,

    /**
     * Callback function to bind the
     * {@link MqttClient#onMessageAuthorizationFailure} property, and that will
     * be called when the MQTT Extender configured hook raises an issue while
     * checking the authorization for publishing the specified message.
     *
     * @callback OnMessageAuthorizationFailure
     * @param {!Message} - The Application Message which failed to be
     *   authorized.
     * @param {Object} responseObject - An object whose properties contain the
     *   details about the authorization failure.
     * @param {number} responseObject.errorCode - The error code, which can be
     *   one of the following:
     *   <ul>
     *   <li><code>-6</code> => "<i>Unauthorized publishing</i>"
     *   <li><code>-7</code> => "<i>Fail to check publishing authorization</i>"
     *   </ul>
     * @param {string} responseObject.errorMessage - The description of the
     *   error, as specified above.
     */

    /**
     * Opens a MQTT over Lightstreamer connection to target MQTT broker.
     * <p>
     * The ways through which the connection to the broker has to be
     * established have been specified by the parameters supplied to the
     * {@link MQTTExtenderSession#createClient} method, invoked to create this
     * <code>MqttClient</code> instance.<br/>
     * Upon successful acknowledgement of the connection request (notified
     * through the {@link OnConnectionSuccess} callback if properly assigned)
     * the client switches to the conntected status.
     *
     * @param {Object=} connectOptions - An object containing the properties
     *   which specify the options to be used for connecting to the target
     *   MQTT broker. If not supplied (or set to <code>null</code>), the default
     *   values apply as specified below.
     * @param {string=} connectOptions.username - The username to be used for
     *   authenticating with the target MQTT broker.<br/>
     *   Note that an empty string (<code>''</code>) is considered as a valid
     *   username.
     * @param {string=} connectOptions.password - The password to be used for
     *   authenticating with the target MQTT broker.<br/>
     *   Note that an empty string (<code>''</code>) is considerd a valid
     *   password.
     * @param {Message=} connectOptions.willMessage - The message to be stored
     *   to the target MQT broker and that is to be published to the <i>Will
     *   Topic</i>, in case that the MQTT over Lightstreamer connection closes
     *   abruptly.
     *   <p>
     *   Note that in the case of <i>Shared Connection</i>, as <i>Will Message
     *   </i> is not allowed, such property must be left unset (or, at least,
     *   should be set to <code>null</code>), otherwise an exception
     *   will be thrown.
     * @param {boolean=} connectOptions.cleanSession=true - If set to <code>
     *   false</code>, indicates that session persistence is required, otherwise
     *   any previous session will be discarded upon successful connection.
     *   <p>
     *   Note that in the case of <i>Shared Connection</i>, as persistent
     *   session is not allowed, such flag must be set to <code>true</code> or
     *   left unset, otherwise an exception will be thrown.
     * @param {MqttStorage=} connectOptions.storage - Instance of the {@link
     *   MqttStorage} interface, which provides a custom implementation of the
     *   persistence layer, needed to store the session as required when the
     *   <code>cleanSession</code> flag is set to <code>false</code>.
START_Node.js_JSDOC_EXCLUDE
     *   If no instance is provided (or <code>null</code>), the default
     *   implementation based on the usage of the <i>localStorage</i> property
     *   supplied by the browser will be used.
END_Node.js_JSDOC_EXCLUDE
START_Web_JSDOC_EXCLUDE
     *   If no instance is provided (or <code>null</code>), the default
     *   implementation based on the usage of the local file system will be
     *   used.
END_Web_JSDOC_EXCLUDE
     *   <p>
     *   Before using the <code>MqttStorage</code> (either the provided custom
     *   implementation or the default one), a preliminary compliance self-test
     *   is performed and, in case of the observed functioning is not as
     *   expected (for example due to some implementation errors), an exception
     *   will be thrown.
START_Node.js_JSDOC_EXCLUDE
     *   In particular, in the case of default implementation, the self-test
     *   might fail because of issues related to the usage of the
     *   <i>localStorage</i> property, for example due to the switching to the
     *   <i>Privacy Mode</i>, which may affect the proper functioning of the
     *   local storage in some browsers.
END_Node.js_JSDOC_EXCLUDE
START_Web_JSDOC_EXCLUDE
     *   In particular, in the case of default implementation, the self-test
     *   might fail because of issues related to the usage of the local
     *   file system.
END_Web_JSDOC_EXCLUDE
     *   <p>
     *   Note that in the case of <i>Shared Connection</i>, as persistent
     *   session is not allowed, such property must be left unset (or, at leat,
     *   should be set to <code>null</code>) otherwise an exception will be
     *   thrown.
START_Web_JSDOC_EXCLUDE
     * @param {?string=} connectOptions.storePath='./mqttextender-storage' -
     *   Path of the directory to be provided to the default storage
     *   implementation, in the case the <code>connectOptions.storage</code> is
     *   not speciifed. Such directory will host the files used to persist data
     *   related to the session.
END_Web_JSDOC_EXCLUDE
     * @param {?OnConnectionSuccess=} connectOptions.onSuccess - Callback
     *   function invoked upon a successful acknowledgement of the connection
     *   request to the target MQTT broker.
     * @param {?OnConnectionFailure=} connectOptions.onFailure - Callback
     *   function invoked in case of connection failure to the target MQTT
     *   broker (even due to connection issues with the MQTT Extender).
     * @throws {Error} If the client is not disconnected, or the number and/or
     *   the type of passed arguments (and relative properties) are not valid.
     */
    connect: function(connectOptions) { },

    /**
     * Callback function to be assigned to the <code>onSuccess</code> property
     * of the argument of the {@link MqttClient#connect} method, and that will
     * be called upon a successful acknowledgement of the connection request to
     * the target MQTT broker.
     *
     * @callback OnConnectionSuccess
     */

    /**
     * Callback function to be assigned to the <code>onFailure</code> property
     * of the argument of the {@link MqttClient#connect} method, and that will
     * be called in case of connection failure to the target MQTT broker.
     *
     * @callback OnConnectionFailure
     * @param {!Object} responseObject - An object whose properties contain the
     *   details about the connection failure.
     * @param {number} responseObject.errorCode - The error code, which can be
     *   one of the values specified in the following sections:
     *   <ul>
     *     <li><i>Connect Return codes</i> detailed in the <i>MQTT
     *       Specification</i>, sent by the target MQTT broker to the MQTT
     *       Extender (and from there forwarded to the client):
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
     *     <li>Configuration and authorization issues on the MQTT Extender:
     *       <ul>
     *         <li><code>-3</code> => <i>MQTT broker configuration not valid</i>
     *         </li>
     *         <li><code>-4</code> => <i>Unauthorized connection to the MQTT
     *           broker</i>
     *         </li>
     *         <li><code>-5</code> = <i>Fail to check connection authorization
     *           to the MQTT broker</i>
     *         </li>
     *       </ul>
     *     </li>
     *     <li>Connection issues:
     *       <ul>
     *         <li><code>10</code> => <i>Connection error to the MQTT Extender
     *           </i><br/>
     *           when the underlying Lightstreamer connection to MQTT Extender
     *           has been interrupted, just before issuing the connection
     *           request
     *         </li>
     *         <li><code>11</code> => <i>Connection error to the MQTT broker</i>
     *           <br/>
     *           when the MQTT connection between the MQTT Extender and the
     *           target MQTT broker cannot be established, do to any network
     *           issue or problems in the MQTT broker process
     *         </li>
     *         <li><code>12</code> => <i>Disconnection from the MQTT Extender
     *           </i><br/>
     *           when the {@link MQTTExtenderSession#close} method is invoked
     *           on the <code>MQTTExtenderSession</code> instance used to create
     *           the client, just before an acknowledgement of the connection
     *           request is received
     *         </li>
     *       </ul>
     *     </li>
     *   </ul>
     * <p>
     * @param {string} responseObject.errorMessage - The description of the
     *   error, as specified above.
     */

    /**
     * Sends an Application Message to be published to a topic.
     * <p>
     * The method can be used in two different ways, on the basis of the number
     * and the type of the provided arguments:
     * <ul>
     * <li>Single argument</li>
     * The method takes a single argument, which is a {@link Message} instance
     * wrapping the Application Message (and related details) to be published.
     * <br/>For example:
     * <pre>
     * // Prepare the Message instance
     * var msg = new Message('My Message!')
     * msg.destinationName = 'my_topic';
     * msg.qos = 1;
     * msg.retained = false;
     *
     * // Send the prepared message (client is an already connected MqttClient instance).
     * client.send(msg);
     * </pre>
     * </li>
     *
     * <li>Multiple arguments</li>
     * The method takes up to four arguments, which specify the Application
     * Message and the related details.<br/>
     * For example:
     * <pre>
     * // Send the message specified by means of the provided arguments.
     * client.send('My Message!', 'my_topic', 1, false);
     * </pre>
     * </li>
     * </ui>
     * Note also that it is not allowed to provide arguments in a mixed form,
     * otherwise an exception will be thrown.
     *
     * @param {!(string|Message)} topic - In the case of a {@link Message}
     *   instance, the Application Message (and related details) to be pulished.
     *   <p>
     *   In the case of a <code>string</code> value, the name of the topic to
     *   which the Application Message is to be pulished, as specified in {@link
     *   Message#destinationName}.
     * @param {!(string|ArrayBuffer|Int8Array|Uint8Array|Int16Array|Uint16Array|
     *   Int32Array|Uint32Array|Float32Array|Float64Array)=} payload - The
     *   payload of the Application Message, as it were provided to the
     *   {@link Message} constructor.
     * @param {number=} qos=0 - The Quality of Service level for delivery of the
     *   Application Message, as specified in {@link Message#qos}.
     *   <p>
     *   Note that any provided value different from <code>0</code>,
     *   <code>1</code> and <code>2</code> is not allowed, otherwise an
     *   exception will be thrown.
     * @param {boolean=} retained=false - The retained flag, as specified in
     *   {@link Message#retained}.
     * @throws {Error} if the client is disconnected, the number and/or the
     *   type of passed arguments are not valid.
     */
    send: function(topic, payload, qos, retained) { },

    /**
     * Disconnects from the target MQTT broker.
     * <p>
     * After invoking the method, the client switches to the disconnected status
     * and the {@link MqttClient#onConnectionLost} is invoked.<br/>
     * The underlying Lightstreamer connection to the MQTT Extender servers
     * remain active, as it may serve other connected <code>MqttClient</code>
     * objects produced by the same {@link MQTTExtenderSession} intance.
     * <p>
     * Note that from the disconnected status, the client can open a new
     * connection through the {@link MqttClient#connect} method.
     *
     * @throws {Error} If the client is already disconnected.
     */
    disconnect: function() { },

    /**
     * Subscribes to the topic(s) indicated by the given <code>topicFilter
     * </code>.
     * <p>
     * Since the provided <code>topicFiler</code> may contain <i>wildcards</i>,
     * it can allow subscriptions to mulitple topics at once.
     * @param {string} topicFilter - The topic filter, which indicates one or
     *   more topics to subscribe to.
     * @param {Object=} subscribeOptions - An object containing the properties
     *   which specify the options to be used for controlling the subscription.
     *   If not supplied (or set to <code>null</code>), the default values
     *   apply as specified below.
     * @param {number=} subscribeOptions.qos=0 - The maximum <i>Quality Of
     *   Service</i> with which the target MQTT broker is allowed to send
     *   Application Messages.
     *   <p>
     *   Note that any provided value different from <code>0</code>, <code>1
     *   </code> and <code>2</code> is not allowed, otherwise an exception will
     *   be thrown.
     * @param {number=} subscribeOptions.requestedMaxFrequency - The maximum
     *   update frequency (expressed in updates per second), to be requested to
     *   the MQTT Extender for all messages subscribed with <i>QoS</i>
     *   <code>0</code>. If not supplied, the update frequency will be managed
     *   as unlimted.<br/>
     *   Note that this feature is available only in the case of <i>Shared
     *   Connection</i>, whereas in the case of <i>Dedicated Connection</i> such
     *   value is ignored.
     *   <p>
     *   Note also that any provided value different from a positive <code>
     *   number</code> is not allowed, otherwise an exception will be thrown.
     * @param {?OnSubscriptionSuccess=} subscribeOptions.onSuccess - Callback
     *   function invoked upon a successfull acknowledgement of the requested
     *   subscription.
     * @param {?OnSubscriptionFailure=} subscribeOptions.onFailure - Callback
     *   function invoked in case of failure of the requested subscription.
     * @param {?OnSubscriptionHandle=} subscribeOptions.onSubscriptionHandler -
     * @param {?OnAuthorizationFailure=} subscribeOptions.onAuthorizationFailure
     *   Callback function invoked in case of an issue raised by the MQTT
     *   Extender configured hook while checking the authorization for the
     *   requested subscription.
     * @throws {Error} If the client is disconnected, or the number and/or the
     *   type of passed arguments (and relative properties) are not valid.
     */
    subscribe: function(topicFilter, subscribeOptions) { },

    /**
     * Callback function to be assigned to the <code>onSuccess</code> property
     * of the argument of the {@link MqttClient#subscribe} method, and that will
     * be called upon a successful acknowledgement of the requested
     * subscription.
     *
     * @callback OnSubscriptionSuccess
     * @param
     * @param {number} grantedQoS - The max Quality of Service level granted by
     * the MQTT broker, for the requested subscription.
     */

    /**
     * Callback function to be assigned to the <code>onFailure</code> property
     * of the argument of the {@link MqttClient#subscribe} method, and that will
     * be called in case of failure of the requested subscription.
     *
     * @callback OnSubscriptionFailure
     * @param {number} errorCode - The error code of the failure, as returned
     *   by the MQTT broker.
     */

    /**
     * Callback function to be assigned to the
     * <code>onAuthorizationFailure</code> property of the argument of the
     * {@link MqttClient#subscribe} method, and that will be called in case of
     * an issue raised by the MQTT Extender configured hook while checking
     * the authorization for the requested subscription.
     *
     * @callback OnAuthorizationFailure
     * @param {!Object} responseObject - An object whose properties contain the
     *   details about the authorization failure.
     * @param {number} responseObject.errorCode - The error code, which can
     *   be one of the following:
     *   <ul>
     *   <li><code>-8</code> => "<i>Unauthorized subscription</i>"
     *   <li><code>-9</code> => "<i>Fail to check subscription auhtorization
     *     </i>"
     *   </ul>
     * @param {string} responseObject.errorMessage - The description of the
     *   error, as specified above.
     */

    /**
     * Callback function to be assigned to the
     * <code>onSubscriptionJandle</code> property of the argument of the
     * {@link MqttClient#subscribe} method, and that will be called in case of
     * an issue raised by the MQTT Extender configured hook while checking
     * the authorization for the requested subscription.
     *
     * @callback OnSubscriptionHandle
     * @param {!SubscriptionHandler} subscriptionHandler - An object...
     */

    /**
     * Unsubscribes from the topic(s) indicated by the given <code>topicFilter
     * </code>.
     * <p>
     * Since the provided <code>topicFiler</code> may contain <i>wildcards</i>,
     * it can allow unsubscriptions from mulitple topics at once.
     *
     * @param {string} topicFilter - The topic filter, which indicates one or
     *   more topics to unsubscribe from.
     * @param {Object=} unsubscribeOptions - An object containing the properties
     *   which specify the options to be used for controlling the
     *   unsubscription.
     * @param {?OnSuccessUnsubscribe=} unsubscribeOptions.onSuccess -
     *   Callback function invoked upon a successfull acknowledgement of the
     *   requested unsubscription.
     * @param {?OnFailureUnsubscribe=} unsubscribeOptions.onFailure -
     *   Callback function expected to be called in case of failure of the
     *   requested unsubscription.
     *   <p>
     *   Note that this function is not actually employed in the current
     *   implementation of the library, as the <i>MQTT Specifications</i> does
     *   not define any behaviour in case of unsubscription failure. As a
     *   consequence of this, such function is only formally provided, but
     *   future use cannot be ruled out.
     * @throws {Error} If the client is disconnected, or the number and/or the
     *   type of passed arguments (and relative properties) are not valid.
     */
    unsubscribe: function(topicFilter, unsubscribeOptions) { },

    /**
     * Callback function to be assigned to the <code>onSuccess</code> property
     * of the argument of the {@link MqttClient#unsubscribe} method, and that
     * will be called upon a successful acknowledgement of the requested
     * unsubscription.
     *
     * @callback OnSuccessUnsubscribe
     */

    /**
     * Callback function to be assigned to the <code>onFailure</code> property
     * of the argument of the {@link MqttClient#unsubscribe} method, and that
     * will be called in case of failure of the requested unsubscription.
     *
     * @callback OnFailureUnsubscribe
     * @param {Object} responseObject - An object whose properties contain the
     *   details about the unsubscription failure.
     * @param {number} responseObject.errorCode - The error code.
     * @param {string} responseObject.errorMessage - The description of the
     *   error.
     */
  };
});
