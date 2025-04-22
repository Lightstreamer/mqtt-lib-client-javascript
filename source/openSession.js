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
import {LightstreamerClient} from 'lightstreamer-client-stub';
import Objects from './utils/Objects';
import LoggerManager from './LoggerManager';
import MQTTCoolSessionImpl from './impl/MQTTCoolSessionImpl';
import Errors from './utils/Errors';

  var logger = LoggerManager.getLoggerProxy('mqtt.cool');
  logger.info('Logger SETUP');

  /**
   * @private
   * @param {string} message
   * @throws {!Error}
   */
  function throwError(message) {
    logger.error('ERROR - ' + message);
    throw new Error(message);
  }

  /**
   * Entry point of the BRANDED_PRODUCT_JSNAME_PLACEHOLDER Client library,
   * used to connect to PRODUCT_JSNAME_PLACEHOLDER.
   * <p>
   * The <code>MQTTCool</code> module requests the PRODUCT_JSNAME_PLACEHOLDER
   * server to open new sessions for starting to manage <i>end-to-end</i>
   * communications with MQTT brokers.
   *
   */

  /**
   * A constant string representing the name of the library.
   * @type {string}
   * @public
   * @ignore
   */
  var LIB_NAME = 'library_tag_placeholder';

  /**
     * A constant string representing the version of the library.
     * @type {string}
     * @public
     * @ignore
     */
  var LIB_VERSION = 'version_placeholder build build_placeholder';

  /**
   * The Adapter Set which implements the MQTT.cool server features.
   *
   * @type {string}
   * @private
   */
  var ADAPTER_SET = 'MQTT';

  /**
   * The global session identifier, used to keep track of all sessions opened
   * against the PRODUCT_JSNAME_PLACEHOLDER server.
   * @type {number}
   * @private
   */
  var _sessionId = 0;

  var lightstreamerFactory = function(serverAddress, adapterSet) {
    return new LightstreamerClient(serverAddress, adapterSet);
  };

    /**
     * Connects to the PRODUCT_JSNAME_PLACEHOLDER server specified by the
     * provided address, to request the opening of a new session, which will be
     * encapsulated into an {@link MQTTCoolSession} instance.
     * <p>
     * Once the connection is established, a new instance of
     * <code>MQTTCoolSession</code> will be provided through asynchronous
     * invocation of the {@link MQTTCoolListener#onConnectionSuccess}
     * method.
     * <p>
     * The method can be invoked multiple times to create distinct
     * sessions against the same PRODUCT_JSNAME_PLACEHOLDER server if the same
     * address is supplied.
     *
     * @param {string} serverAddress - The address of the
     *   PRODUCT_JSNAME_PLACEHOLDER server.
     * @param {?string=} username - The username to be used for the
     *   authentication on PRODUCT_JSNAME_PLACEHOLDER.
     * @param {?string=} password - The password to be used for the
     *   authentication on PRODUCT_JSNAME_PLACEHOLDER.
     *   <p>
     *   This argument can be passed only if <code>username</code> is supplied
     *   too; if it is not the case, an exception will be thrown.
     * @param {!MQTTCoolListener} listener - The listener that will receive the
     *   events related to creation of {@link MQTTCoolSession}. It is not
     *   mandatory that this parameter implements the {@link MQTTCoolListener}
     *   interface, but at least it should supply an implementation of the
     *   {@link MQTTCoolListener#onConnectionSuccess} method, otherwise it
     *   would be impossible to get the reference to the
     *   <code>MQTTCoolSession</code> instance.
     *   <p>
     *   Note that this parameter has to be passed as last argument; if it is
     *   not the case, an exception will be thrown.
     * @example <caption>Allowed invocation forms of openSession.</caption>
     *   // Passing all parameters (username and password might be also null)
     *   openSession('http://my.push.server', 'username', 'password', listener);
     *
     *   // Passing only serveAddress, username (which might be null) and listener.
     *   openSession('http://my.push.server', 'username', listener);
     *
     *   // Passing only serverAddress and listener.
     *   openSession('http://my.push.server', listener);
     *
     * @throws {Error} If the provided arguments are invalid.
     * @throws {IllegalArgumentException} If an invalid address is passed.
     *   See {@link EXTERNAL_APIDOC_REFERENCE/ConnectionDetails.html#setServerAddress ConnectionDetails#setServerAddress}
     *   for details.
     * @function openSession
     * @suppress {checkTypes}
     */
  var openSession = function(serverAddress, username, password, listener) {
    logger.debug('Creating a new MQTTCoolSession');
    var _serverAddress;
    var _userName;
    var _password;
    var _listener;
    if (arguments.length >= 2 && arguments.length <= 4) {
      if (arguments.length == 2) {
        /*
           * We assume here that only mandatory arguments are supplied:
           * <serverAddress> and <listener>
           */
        Objects.checkType(arguments[0], 'string', 'serverAddress');
        Objects.checkType(arguments[1], 'object', 'listener');
        _serverAddress = arguments[0];
        _listener = arguments[1];
      } else if (arguments.length == 3) {
        // We assume here that only 3 arguments of 4 are supplied:
        // <serverAddress>, <userName> and <listener>
        Objects.checkType(arguments[0], 'string', 'serverAddress');
        Objects.checkType(arguments[1], 'string', 'username', true);
        Objects.checkType(arguments[2], 'object', 'listener');
        _serverAddress = arguments[0];
        _userName = arguments[1];
        _listener = arguments[2];
      } else if (arguments.length == 4) {
        // We assume here that all arguments are supplied
        Objects.checkType(arguments[0], 'string', 'serverAddress');
        Objects.checkType(arguments[1], 'string', 'username', true);
        Objects.checkType(arguments[2], 'string', 'password', true);
        Objects.checkType(arguments[3], 'object', 'listener');
        _serverAddress = arguments[0];
        _userName = arguments[1];
        _password = arguments[2];
        _listener = arguments[3];
      }
    } else {
      throwError('Please supply the correct number of arguments');
    }

    // Invoke the factory to create a new instance of LightstreamerClient.
    var lsClient = null;
    //lsClient = lightstreamerFactory(_serverAddress, ADAPTER_SET);
    lsClient = Objects.invoke(openSession, '__lightstreamerFactory',
      [_serverAddress, openSession['ADAPTER_SET']]);

    // Set connection details.
    lsClient.connectionDetails.setUser(_userName);
    lsClient.connectionDetails.setPassword(_password);

    // Increment the global session id.
    var newSessionId = _sessionId++;
    var lsSession = new MQTTCoolSessionImpl(newSessionId, lsClient);
    logger.debug('MQTTCoolSession created');

    // Configure the connection listener to handle events related to the
    // life cycle of the LightstreamerClient instance.
    lsClient.addListener({

      onServerError: function(errorCode, errorMessage) {
        /** @type {Errors.Types} */
        var errorType = Errors.fromCode(errorCode);
        var responseObj;
        if (errorType !== Errors.Types.SERVER_ERROR) {
          // In case of MQTT.cool specific error, checks if a custom error
          // message is also provided through a server side generated
          // HookException, which is first formatted and then wrapped inside a
          // CreditsException to be finally sent to the client.
          responseObj = Errors.evalMsg(errorMessage);
        } else {
          // Prepare the response object wrapping error information as sent
          // by the server.
          responseObj = Objects.makeErrorEvent(errorCode, errorMessage);
        }
        lsClient.removeListener(this);
        lsClient.disconnect();
        Objects.invoke(_listener, 'onConnectionFailure', [
          errorType.errType,
          responseObj ? responseObj['errorCode'] : undefined,
          responseObj ? responseObj['errorMessage'] : undefined
        ]);
      },

      onListenStart: function(lsClient) {
        logger.debug('Starting ConnectionListener');
        Objects.invoke(_listener, 'onLsClient', [lsClient]);
      },

      onStatusChange: function(changeStatus) {
        switch (changeStatus) {
          case 'CONNECTED:WS-STREAMING':
          case 'CONNECTED:HTTP-STREAMING':
          case 'CONNECTED:WS-POLLING':
          case 'CONNECTED:HTTP-POLLING':
            // Invoke the 'onConnectionSuccess' callback on the passed
            // instance of MQTTCoolListener, then remove the client
            // listener, as there is no need exists to catch further events.
            Objects.invoke(_listener, 'onConnectionSuccess', [lsSession]);
            lsClient.removeListener(this);
            break;
        }
      }
    });

    // Connect to MQTT.Cool server.
    logger.debug('Connecting to the MQTT.Cool server');
    lsClient.connect();
    logger.debug('Connection request submitted');
  };

  openSession['__lightstreamerFactory'] = lightstreamerFactory;

  openSession['__resetFactory'] = function() {
    openSession['__lightstreamerFactory'] = lightstreamerFactory;
    openSession['ADAPTER_SET'] = 'MQTT';
  };

  openSession['LIB_NAME'] = LIB_NAME;
  openSession['LIB_VERSION'] = LIB_VERSION;
  openSession['ADAPTER_SET'] = ADAPTER_SET;

  export default openSession;
