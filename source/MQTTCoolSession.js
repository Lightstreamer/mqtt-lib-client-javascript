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

  /**
   * Encapsulation of a session opened against PRODUCT_JSNAME_PLACEHOLDER, from
   * which to create {@link MqttClient} objects used to communicate with MQTT
   * brokers.
   * <p>
   * An instance of <code>MQTTCoolSession</code>, which is created by invoking
   * the {@link openSession} function, manages an
   * <i>PRODUCT_JSNAME_PLACEHOLDER connection</i> to handle the bidirectional
   * communications between <b>all</b> <code>MqttClient</code> instances it can
   * create and the target PRODUCT_JSNAME_PLACEHOLDER server, in order to
   * support <i>end-to-end</i> communications with an MQTT broker.
   *
   * @interface
   */
  function MQTTCoolSession() { }

  MQTTCoolSession.prototype = {
    /**
     * Creates a new <code>MqttClient</code> instance, specifying how to
     * address the MQTT broker to connect to, as well as the modalities by which
     * the physical MQTT connection has to be set up and managed on the server
     * side.
     * <p>
     * The returned <code>MqttClient</code> is configured to address the target
     * MQTT broker on the basis of the provided <code>brokerReference</code>
     * parameter. The following two different approaches are available (see
     * the <i>BRANDED_PRODUCT_JSNAME_PLACEHOLDER Getting Started Guide</i> for
     * more in-depth information):
     * <ul>
     *   <li><b>Static Lookup</b>, activated when <code>brokerReference</code>
     *     is a <i>connection_alias</i> corresponding to a static configuration
     *     already provided in the <code>mqtt_master_connector_conf.xml</code>
     *     file. Upon invoking the {@link MqttClient#connect} method on the
     *     <code>MqttClient</code> instance, the PRODUCT_JSNAME_PLACEHOLDER
     *     server will resolve the supplied alias by looking up the target
     *     configuration and will connect to the specified broker using all the
     *     other relative connection settings.
     *     <p>
     *     As an example, in the case the
     *     <code>mqtt_master_connector_conf.xml</code>
     *     file is populated with the following entries:
     *     <ol>
     *       <li><code>"local_server"  => "mqtt://localhost:1883"</code></li>
     *       <li><code>"remote_server" => "mqtt://&lt;remote_host&gt;:2883"</code>
     *       </li>
     *     </ol>
     *     <p>
     *     an invocation like:
     *     <pre><code>mqttCoolSession.createClient(&quot;local_server&quot;);</code></pre>
     *     will create an <code>MqttClient</code> instance enabled to establish
     *     a connection with an MQTT broker listening on tcp port 1883 of the
     *     same machine of PRODUCT_JSNAME_PLACEHOLDER.
     *     <p>
     *     Similarly:
     *     <pre><code>mqttCoolSession.createClient(&quot;remote_server&quot;);</code></pre>
     *     will make an <code>MqttClient</code> ready to connect to an MQTT
     *     broker listening on tcp port 2883 of <code>&lt;remote_host&gt;</code>
     *     address.
     *   </li>
     *   <li><b>Dynamic Lookup</b>, triggered when <code>brokerReference</code>
     *     is an explicit URI. Upon calling the {@link MqttClient#connect}
     *     method, the PRODUCT_JSNAME_PLACEHOLDER server will bypass any
     *     provided static configurations and will try to connect to the MQTT
     *     broker running on the host at the supplied address.
     *     <p>
     *     As an example, the following invocation:
     *     <pre><code>mqttCoolSession.createClient(&quot;tcp://test.mosquitto.org:1883&quot;)</code></pre>
     *     will trigger an MQTT connection to the publicly accessible instance of
     *     the "Mosquitto" broker.
     *   </li>
     * </ul>
     * <p>
     * The optional <code>clientId</code> parameter identifies the client to the
     * target MQTT broker, as per the <i>MQTT Protocol Specifications</i>,
     * namely:
     * <ul>
     *   <li>For an <code>MqttClient</code> instance for which a valid
     *     <code>clientId</code> value is provided, the
     *     PRODUCT_JSNAME_PLACEHOLDER server will set up a
     *     <i>dedicated connection</i>.
     *   </li>
     *   <li>An <code>MqttClient</code> instance for which the
     *      <code>clientId</code> is not specified will be <i>logically</i>
     *      joined to a <i>shared connection</i>.
     *   </li>
     * </ul>
     * <p>
     * See the documentation of the {@link MqttClient} interface for more
     * details on how dedicated and shared connections are managed by the
     * PRODUCT_JSNAME_PLACEHOLDER server.
     *
     * @param {string} brokerReference - The reference of the MQTT broker with
     *   which PRODUCT_JSNAME_PLACEHOLDER has to establish a new connection.
     *   <p>
     *   As detailed above, the lookup type to be used to identify and contact
     *   the MQTT broker is determined by the format, which can be:
     *   <ul>
     *     <li>In the case of <code>Static Lookup</code>, a generic string valid
     *       with respect to the Regular Expression: <code>/^[A-Za-z0-9_-]+$/</code>.
     *     </li>
     *     <li>In the case of <code>Dynamic Lookup</code>, a URI in one of the
     *       following forms:
     *       <ul>
     *         <li><code>"tcp://&lt;mqtt_broker_address&gt;:&lt;mqtt_broker_port&gt;"</code>
     *         </li>
     *         <li><code>"mqtt://&lt;mqtt_broker_address&gt;:&lt;mqtt_broker_port&gt;"</code>
     *         </li>
     *         <li><code>"mqtts://&lt;mqtt_broker_address&gt;:&lt;mqtt_broker_port&gt;"</code>
     *         </li>
     *         <li><code>"ssl://&lt;mqtt_broker_address&gt;:&lt;mqtt_broker_port&gt;"</code>
     *         </li>
     *       </ul>
     *     </li>
     *    </li>
     * </ul>
     * @param {?string=} clientId - The client identifier to be used to identify
     *   the newly created client to the MQTT broker.
     *   <p>
     *   If a non-empty string is provided, it has to be <code>UTF-8</code>
     *   encodable. In this case, a dedicated connection will be set up.
     *   <p>
     *   Empty string and <code>null</code> are equivalent to a non-provided
     *   value. In this case, a shared connection will be set up.
     * @return {MqttClient} An object implementing the {@link MqttClient}
     *   interface, already configured to establish a connection to the target
     *   MQTT broker.
     * @throws {Error} If the provided arguments are invalid.
     */
    createClient: function(brokerReference, clientId) { },

    /**
     * Disconnects from PRODUCT_JSNAME_PLACEHOLDER by closing the underlying
     * PRODUCT_JSNAME_PLACEHOLDER connection.
     * <p>
     * The disconnection also causes all <code>MqttClient</code> objects created
     * from this instance to be closed and notified through the
     * {@link MqttClient#onConnectionLost} callback.
     */

    close: function() { }
  };

