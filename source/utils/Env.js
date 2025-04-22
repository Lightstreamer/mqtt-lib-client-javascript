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


  var isNodeJSVar = typeof process == 'object' && (/node(\.exe)?$/
    .test(process.execPath) || (process.node && process.v8) ||
    (process.versions && process.versions.node && process.versions.v8));

  var Env = {

    isNodeJs: function() {
      return isNodeJSVar;
    },

    /**
     * Decode a Base64 string.
     *
     * @param {string} encoded - The Bas64 encoded string to decode.
     * @return {string} The decoded string.
     */
    decodeFromBase64: function(encoded) {
      if (Env.isNodeJs()) {
        return new Buffer(encoded, 'base64').toString();
      } else {
        return atob(encoded);
      }
    },

    /**
     * Encode a string into Base64 string.
     *
     * @param {string} decoded - The string to encode into a Base64 string.
     * @return {string} The encoded Base64 string.
     */
    encodeToBase64: function(decoded) {
      if (Env.isNodeJs()) {
        return new Buffer(decoded).toString('base64');
      } else {
        return btoa(decoded);
      }
    }
  };

  Env['isNodeJs'] = Env.isNodeJs;
  Env['decodeFromBase64'] = Env.decodeFromBase64;
  Env['encodeToBase64'] = Env.encodeToBase64;

  export default Env;
