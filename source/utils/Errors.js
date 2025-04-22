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
import Objects from './Objects';

    var mkEvent = Objects.makeErrorEvent;

    /**
     * Global errors.
     * @enum
     * @private
     */
    var Types = {
      /* The following are server side generated error types: code of everyone
         MUST corresponds to the code embedded in the thrown CreditsException
         instance.*/

      UNAUTHORIZED_SESSION:
      {
        code: -1, errType: 'UNAUTHORIZED_SESSION'
      },

      BROKER_CONFIGURATION_NOT_VALID:
      {
        code: -2, errType: 'BROKER_CONFIGURATION_NOT_VALID',
        responseObj: mkEvent(9, 'MQTT broker configuration not valid')
      },

      UNAUTHORIZED_CONNECTION:
      { code: -3, errType: 'UNAUTHORIZED_CONNECTION' },

      UNAUTHORIZED_PUBLISHING:
      { code: -4, errType: 'UNAUTHORIZED_PUBLISHING' },

      UNAUTHORIZED_SUBSCRIPTION:
      { code: -5, errType: 'UNAUTHORIZED_SUBSCRIPTION' },

      CONFLICTING_SELECTOR:
      {
        code: -6, errType: 'CONFLICTING_SELECTOR'
      },

      // In case of Lightstreamer specific error, the code coming from server
      // is a positive integer, therefore the library handles it as a generic
      // error with code 100.
      SERVER_ERROR: { code: 100, errType: 'SERVER_ERROR' },

      /** The following are client side generated error types. */

      BROKER_CONNECTION_REFUSED:
      { code: -10, errType: 'BROKER_CONNECTION_REFUSED' },

      SUCCESSFUL_DISCONNECTION:
      {
        code: -11, errType: 'SUCCESSFUL_DISCONNECTION',
        responseObj: mkEvent(0, 'Successful disconnection')
      },

      MQTTCOOL_CONNECTION_ERROR:
      {
        code: -12, errType: 'MQTTCOOL_CONNECTION_ERROR',
        responseObj: mkEvent(10, 'Connection error to PRODUCT_NAME_PLACEHOLDER')
      },

      MQTT_BROKER_CONNECTION_ERROR:
      {
        code: -13, errType: 'MQTT_BROKER_CONNECTION_ERROR',
        responseObj: mkEvent(11, 'Connection error to the MQTT broker')
      },

      MQTTCOOL_DISCONNECTION:
      {
        code: -14, errType: 'MQTTCOOL_DISCONNECTION',
        responseObj: mkEvent(12, 'Disconnection from PRODUCT_NAME_PLACEHOLDER')
      }
    };

    var Errors = {

      Types: Types,

      invMap: {
        '-1': Types.UNAUTHORIZED_SESSION,
        '-2': Types.BROKER_CONFIGURATION_NOT_VALID,
        '-3': Types.UNAUTHORIZED_CONNECTION,
        '-4': Types.UNAUTHORIZED_PUBLISHING,
        '-5': Types.UNAUTHORIZED_SUBSCRIPTION,
        '-6': Types.CONFLICTING_SELECTOR,
        '-10': Types.BROKER_CONNECTION_REFUSED,
        '-11': Types.SUCCESSFUL_DISCONNECTION,
        '-12': Types.MQTTCOOL_CONNECTION_ERROR,
        '-13': Types.MQTT_BROKER_CONNECTION_ERROR,
        '-14': Types.MQTTCOOL_DISCONNECTION
      },

      /**
       * @param {number} code -
       * @return {Types}
       */
      fromCode: function(code) {
        if (code > 0) {
          return Types.SERVER_ERROR;
        }
        var errorType = Errors.invMap[String(code)];
        return errorType;
      },

      /**
       * @param {?string=} errorMessage -
       * @return {Object=}
       */
      evalMsg: function(errorMessage) {
        if (errorMessage) {
          var wrappedMsg = JSON.parse(errorMessage);
          var responseObj = mkEvent(wrappedMsg['code'], wrappedMsg['message']);
          return responseObj;
        }
        return null;
      }
    };

    export default Errors;
