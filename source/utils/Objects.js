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
import LoggerManager from '../LoggerManager';

  var logger = LoggerManager.getLoggerProxy('mqtt.cool');

  /**
   * @typedef {Object} InternalEventType
   * @property {number} code
   * @property {string} message
   * @private
   */

  var Objects = {};

  /**
   * @param {!Object} scope -
   * @param {string} callbackName -
   * @param {!Array=} params -
   * @return {Object|undefined}
   */
  Objects.invoke = function(scope, callbackName, params) {
    logger.debug('Invoking <' + callbackName + '> on [' + scope + '] object');

    /** @type {function=} */
    var func = scope[callbackName];

    if (func) {
      try {
        if (typeof params != 'undefined') {
          return func.apply(scope, params);
        } else {
          return func.apply(scope);
        }
      } catch (err) {
        var _exception = err;
        logger.error('Exception [' + err + '] while invoking <' + callbackName +
          '> on [' + scope + '] object');
        throw Error(err);
      } finally {
        if (!_exception) {
          logger.debug('<' + callbackName + '> successfully invoked.');
        }
      }
    } else {
      //logger.debug('No <' + callbackName + '> found');
    }
  };

  /**
   * @param {Object} object -
   * @return {boolean}
   */
  Objects.isEmpty = function(object) {
    if (undefined !== Object.keys) {
      // Using ECMAScript 5 feature.
      return (0 === Object.keys(object).length);
    } else {
      // Using legacy compatibility mode.
      for (var key in object) {
        if (object.hasOwnProperty(key)) {
          return false;
        }
      }
      return true;
    }
  };

  /**
   * Checks whether the provided object is of the specified type.
   *
   * @param {Object} object -
   * @param {string} type -
   * @param {string} name -
   * @param {boolean=} nullable=false -
   */
  Objects.checkType = function(object, type, name, nullable) {
    nullable = nullable || false;
    if (object == null) {
      if (nullable) {
        return;
      } else {
        var errorMsg = 'Invalid [' + name + '] value: ';
        if (object === null) {
          errorMsg += 'null';
        } else {
          errorMsg += 'undefined';
        }
        throw new Error(errorMsg);
      }
    }

    var objectType = typeof object;
    if (objectType !== type) {
      throw new Error('Invalid [' + name + '] value: ' + object);
    }
  };

  /**
   * After checking whether the provide object is of the specified type, put a
   * key "name" on the target object.
   *
   * @param {!Object} object -
   * @param {string} type -
   * @param {string} name -
   * @param {Object} target -
   * @param {boolean=} nullable=false -
   */
  Objects.checkTypeAndSet = function(object, type, name, target, nullable) {
    //if (typeof object !== 'undefined' && object !== null) {
    Objects.checkType(object, type, name, nullable);
    target[name] = object;
    //}
  };

  /**
   * @param {Array<function>} functions -
   * @param {Object} obj -
   */
  Objects.checkFunctions = function(functions, obj) {
    // Check callbacks.
    functions.forEach(
      function(fun) {
        /** @type {?function} */
        var callback = obj[fun];
        var callbackType = typeof callback;
        if (callback != null && callbackType !== 'undefined' &&
          callbackType !== 'function') {
          throw Error('Invalid [' + fun + '] value: ' + callback);
        }
      });
  };

  /**
   * @param {string} str -
   * @param {string=} name -
   * @param {number=} maxlength -
   * @return {string}
   */
  Objects.checkUTF8 = function(str, name, maxlength) {
    name = name ? ' [' + name + '] ' : ' ';
    if (typeof str === 'string') {
      try {
        var utf8_encoded = encodeURIComponent(str);
      } catch (ex) {
        throw Error('Argument' + name + 'not encodable as UTF-8 string');
      }

      var max = 65535;
      if (typeof maxlength != 'undefined') {
        max = maxlength;
      }

      if (utf8_encoded.length > max) {
        throw Error('Argument' + name + 'exceeded max length: <' +
          utf8_encoded.length + '>');
      }

      return utf8_encoded;
    } else {
      throw Error('Invalid' + name + 'argument: <' + str + '>');
    }
  };

  /**
   * @param {number} code - The event code
   * @param {?string=} message - The event message
   * @return {InternalEventType}
   */
  Objects.makeEvent = function(code, message) {
    return {
      'code': code,
      'message': message || ''
    };
  };

  /**
   * Define a new errorResponse type as the following object literal:
   *
   * @typedef {Object} ErrorEvent
   * @property {number} errorCode
   * @property {string=} errorMessage
   * @private
   */

  /**
   * @param {number} code - The error code
   * @param {?string=} message - The error message
   * @return {ErrorEvent}
   */
  Objects.makeErrorEvent = function(code, message) {
    var errorEvent = { 'errorCode': code };
    if (typeof message !== 'undefined' && message != null) {
      errorEvent['errorMessage'] = message;
    }

    return errorEvent;
  };

  Objects['checkType'] = Objects.checkType;
  Objects['checkTypeAndSet'] = Objects.checkTypeAndSet;
  Objects['checkUTF8'] = Objects.checkUTF8;
  Objects['invoke'] = Objects.invoke;
  Objects['makeEvent'] = Objects.makeEvent;
  Objects['makeErrorEvent'] = Objects.makeErrorEvent;

  export default Objects;
