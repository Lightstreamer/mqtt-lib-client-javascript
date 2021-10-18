# MQTT.Cool Node.js Client #

## Overview ##
The MQTT.Cool Node.js Client is a JavaScript library for the development of MQTT.Cool clients running on the Node.js runtime.

The library enables JavaScript applications to act as an *MQTT* client; that is, ready to send and receive real-time MQTT messages to/from any MQTT broker connected to the MQTT.Cool server.

## Installation ##

The library is available as npm package, so you can download and install it through:

```
npm install mqtt.cool-node-client
```

## Development
Access the module:

```js
const mqttcool = require("mqtt.cool-node-client");
```

Open a session against the MQTT.Cool server, create an MQTT client and connect to the MQTT broker:

```js
mqttcool.openSession('http://my.MQTT.Cool.server:8080', 'my_user', 'my_password', {
  onConnectionSuccess: function(mqttCoolSession) {
    var client = mqttCoolSession.createClient('my_mqtt_broker', 'my_client_id');
    client.connect({
      onSuccess: function() {
        console.log("Connected!");
      }
    });
    ...
  }
});
```

Request a Subscription:

```js
client.subscribe("my/cool/topic");
```

Listen for messages:

```js
client.onMessageArrived = function(message) {
  console.log("onMessageArrived:" + message.payloadString);
}
```

Publish a Message to the server:

```js
message = new mqttcool.Message("My Message!");
message.destinationName = "my/cool/topic";
client.send(message)
```

## Compatibility
- Compatible with MQTT.Cool since version 1.2.0.
- Based on Lightstreamer SDK for Node.js Clients version 8.0.3 build 1787.
- Compatible with code developed with the previous version.

## Changelog
See detailed changes on https://mqtt.cool/download/changelog/?component=nodejs&version=2.0.0-alpha

## Documentation
- [API Reference](https://docs.mqtt.cool/nodejs-client-sdk/2.0.0-alpha/api/index.html)
- Chapter ["Client Application Development"](https://docs.mqtt.cool/server/guides/MQTT.Cool+Getting+Started+Guide.html#_client_application_development) of _Getting Started Guide_

For further details, visit the [SDK section](https://mqtt.cool/download/nodejs-client-sdk-latest/) on the MQTT.Cool site.