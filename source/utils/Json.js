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
import Message from '../Message';
import Env from './Env';
  /**
    * @typedef {{ suback:number, seq:?number, destinationName:string,
    *          qos:number, retained:boolean, duplicate:boolean,
    *          payload:string}}
    * @private
    */
  var realTimeEventType;

  var Json = {
    /**
      * @param {realTimeEventType} jsonMessage -
      * @return {Message}
      */
    decodeMessageFromJson: function(jsonMessage) {
      var base64EncodedPayloadString = jsonMessage['payload'];
      var decodedData = Env.decodeFromBase64(base64EncodedPayloadString);
      var decodedPayloadBuffer = new Uint8Array(decodedData.length);
      for (var i = 0; i < decodedData.length; i++) {
        decodedPayloadBuffer[i] = decodedData.charCodeAt(i);
      }

      /** @type {Message} */
      var message = new Message(decodedPayloadBuffer);
      message['destinationName'] = jsonMessage['destinationName'];
      message['qos'] = parseInt(jsonMessage['qos'], 10) || 0;
      message['retained'] = jsonMessage['retained'] || false;
      message.setDuplicate(jsonMessage['duplicate'] || false);
      return message;
    },

    /**
     * @param {Message} message -
     * @return {realTimeEventType} jsonMessage
     */
    encodeMessageToJson: function(message) {
      var base64EncodedPayloadString =
        Env.encodeToBase64(message['payloadString']);

      return {
        'payload': base64EncodedPayloadString,
        'destinationName': message['destinationName'],
        'qos': message['qos'],
        'retained': message['retained'],
        'duplicate': message['duplicate']
      };
    }
  };

  Json['decodeMessageFromJson'] = Json.decodeMessageFromJson;
  Json['encodeMessageToJson'] = Json.encodeMessageToJson;

  export default Json;
