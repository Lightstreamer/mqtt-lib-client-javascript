import Message from '../Message';
import Env from './Env';
  /**
    * @typedef {{ suback:number, seq:?number, destinationName:string,
    *          qos:number, retained:boolean, duplicate:boolean,
    *          payload:string}}
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
