import Objects from './utils/Objects';
  /**
   * Constructs a <code>PUBLISH</code> Control Packet wrapper starting from a
   * payload, which can be specified in different formats.
   *
   * @constructor
   *
   * @exports Message
   *
   * @param {!(string|ArrayBuffer|Int8Array|Uint8Array|Int16Array|Uint16Array
   *   |Int32Array|Uint32Array|Float32Array|Float64Array)} payload - The payload
   *   containing the Application Message
   * @throws {Error} If the provided <code>payload</code> is not of the expected
   *   type.
   * @class A wrapper of the <code>PUBLISH</code> Control Packet, used to
   *   transport an <i>Application Message</i> from an <code>MqttClient</code>
   *   to an MQTT broker and vice versa, through an end-to-end connection.
   */
  var Message = function(payload) {
    /**
     * @private
     **/
    this._payload = null;

    if (typeof payload === 'string') {
      var buf = new ArrayBuffer(payload.length);
      this._payload = new Uint8Array(buf);
      for (var i = 0; i < payload.length; i++) {
        this._payload[i] = payload.charCodeAt(i);
      }
    } else if (payload instanceof ArrayBuffer || payload instanceof Int8Array ||
      payload instanceof Uint8Array || payload instanceof Int16Array ||
      payload instanceof Uint16Array || payload instanceof Int32Array ||
      payload instanceof Uint32Array || payload instanceof Float32Array ||
      payload instanceof Float64Array) {

      /**
       * @private
       */
      this._payload = payload;
    } else {
      throw new Error('Invalid [payload] argument');
    }

    /**
     * @private
     */
    this._destinationName = undefined;

    /**
     * @private
     */
    this._duplicate = false;

    /**
     * @private
     */
    this._retained = false;

    /**
     * @private
     */
    this._qos = 0;
  };

  Message.prototype = {
    /**
     * @return {ArrayBuffer|Int8Array|Uint8Array|Int16Array|Uint16Array|
     * Int32Array|Uint32Array|Float32Array|Float64Array}
     * @private
     */
    getPayloadBytes: function() {
      return this._payload;
    },

    /**
     * @return {string}
     * @private
     */
    getPayloadString: function() {
      var buf = this._payload.buffer;
      return String.fromCharCode.apply(null, new Uint8Array(buf));
    },

    /**
     * @return {string|undefined}
     * @private
     */
    getDestinationName: function() {
      return this._destinationName;
    },

    /**
     * @param {string} dest -
     * @private
     */
    setDestinationName: function(dest) {
      // Check UTF8 compliance.
      var utf8_encoded = Objects.checkUTF8(dest, 'destinationName');

      if (utf8_encoded.length == 0) {
        throw Error('Argument [destinationName] must be at least one ' +
          'character long');
      }

      if (dest.indexOf('#') != -1 || dest.indexOf('+') != -1) {
        throw Error('Argument [destinationName] cannot contain wildcard ' +
          'characters');
      }
      this._destinationName = dest;
    },

    /**
     * @param {boolean} dup -
     * @private
     */
    setDuplicate: function(dup) {
      Objects.checkType(dup, 'boolean', 'duplicate');
      this._duplicate = dup;
    },

    /**
     * @return {boolean}
     * @private
     */
    getDuplicate: function() {
      return this._duplicate;
    },

    /**
     * @return {boolean}
     * @private
     */
    getRetained: function() {
      return this._retained;
    },

    /**
     * @param {boolean} retained -
     * @private
     */
    setRetained: function(retained) {
      Objects.checkType(retained, 'boolean', 'retained');
      this._retained = retained;
      return;
    },

    /**
     * @return {number}
     * @private
     */
    getQos: function() {
      return this._qos;
    },

    /**
     * @param {number} qos -
     * @private
     */
    setQos: function(qos) {
      if (typeof qos === 'number' && (qos >= 0 && qos <= 2)) {
        this._qos = qos;
        return;
      }

      throw new Error('Invalid [qos] argument');
    }
  };

  // Export only for the purpose of unit testing.
  Message.prototype['_setDuplicate'] = Message.prototype.setDuplicate;

  Object.defineProperties(Message.prototype, {
    /**
    * The duplicate flag. If set to <code>true</code>, indicates that the
    * <code>PUBLISH</code> Control Packet containing the Application Message
    * could be a redelivery of an earlier attempt.
    * <p>
    * Note that this is a <i>read only</i> property as it can only be set on
    * the instances received from the MQTT broker.
    *
    * @name Message#duplicate
    * @type {boolean}
    * @readonly
    * @default <code>false</code>
    * @public
    */
    'duplicate': {
      get: Message.prototype.getDuplicate
    },

    /**
     * The retained flag. If set to <code>true</code>, specifies that the MQTT
     * broker has to store the Application Message and its QoS,
     * so that the <code>PUBLISH</code> Control Packet can be delivered to
     * clients immediately after they subscribe to a matching topic name.
     * <p>
     * A <code>Message</code> instance received from the MQTT broker has the
     * retain flag set to <code>true</code>, if the message is sent as a
     * consequence of a subscription made after the message has been published
     * with the retain flag set to <code>true</code>.
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>boolean</code> type.
     *
     * @name Message#retained
     * @type {boolean}
     * @default <code>false</code>
     * @public
     */
    'retained': {
      get: Message.prototype.getRetained,
      set: Message.prototype.setRetained
    },

    /**
     * The Quality of Service level for delivery of the Application Message as
     * specified below:
     * <ul>
     * <li>0 - At most once delivery</li>
     * <li>1 - At least once delivery</li>
     * <li>2 - Exactly once delivery</li>
     * </ul>
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * different from any of the ones specified above.
     *
     * @name Message#qos
     * @type {number}
     * @default <code>0</code>
     * @public
     */
    'qos': {
      get: Message.prototype.getQos,
      set: Message.prototype.setQos
    },

    /**
     * The name of the topic to which the Application Message is published. This
     * property is mandatory when sending an Application Message through the
     * {@link MqttClient#send} method.
     * <p>
     * When setting this property, an Error is thrown if the provided value is
     * not of <code>string</code> type.
     *
     * @name Message#destinationName
     * @type {string}
     * @public
     */
    'destinationName': {
      get: Message.prototype.getDestinationName,
      set: Message.prototype.setDestinationName
    },

    /**
     * The payload as an ArrayBuffer.
     *
     * @name Message#payloadBytes
     * @type {ArrayBuffer}
     * @readonly
     * @public
     */
    'payloadBytes': {
      get: Message.prototype.getPayloadBytes
    },

    /**
     * The payload as a string.
     *
     * @name Message#payloadString
     * @type {string}
     * @readonly
     * @public
     */
    'payloadString': {
      get: Message.prototype.getPayloadString
    }
  });

  export default Message;
