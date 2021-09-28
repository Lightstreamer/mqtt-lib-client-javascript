# BRANDED_PRODUCT_NAME_PLACEHOLDER Node.js Client #

## Overview ##
The BRANDED_PRODUCT_NAME_PLACEHOLDER Node.js Client is a JavaScript library for the development of BRANDED_PRODUCT_NAME_PLACEHOLDER clients running on the Node.js runtime.

The library enables JavaScript applications to act as an *MQTT* client; that is, ready to send and receive real-time MQTT messages to/from any MQTT broker connected to the BRANDED_PRODUCT_NAME_PLACEHOLDER server.

## Installation ##

The library is available as npm package, so you can download and install it through:

```
npm install LIBRARY_NAME_PLACEHOLDER-node-client
```

## Development
Access the module:

```js
const mqttcool = require("LIBRARY_NAME_PLACEHOLDER-node-client");
```

Open a session against the BRANDED_PRODUCT_NAME_PLACEHOLDER server, create an MQTT client and connect to the MQTT broker:

```js
mqttcool.openSession('http://my.BRANDED_PRODUCT_NAME_PLACEHOLDER.server:8080', 'my_user', 'my_password', {
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
- SERVER_COMPATIBILITY_PLACEHOLDER.
- LIGHTSTREAMER_SDK_PLACEHOLDER.
- Compatible with code developed with the previous version.

## Changelog
See detailed changes on HOME_PAGE_PLACEHOLDER/download/changelog/?component=nodejs&version=VERSION_PLACEHOLDER

## Documentation
- [API Reference](NODEJS_API_REFERENCE_PLACEHOLDER)
- Chapter ["Client Application Development"](ONLINE_GUIDE_PLACEHOLDER#_client_application_development) of _Getting Started Guide_

For further details, visit the [SDK section](NODEJS_CLIENT_DOWNLOAD_URL_PLACEHOLDER) on the BRANDED_PRODUCT_NAME_PLACEHOLDER site.