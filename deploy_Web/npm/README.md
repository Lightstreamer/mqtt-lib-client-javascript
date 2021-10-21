# MQTT.Cool Web Client #

## Overview ##
The MQTT.Cool Web Client is a JavaScript library for the development of MQTT.Cool clients running inside the web browser.

The library enables any HTML page to act as an *MQTT* client; that is, ready to send and receive real-time MQTT messages to/from any MQTT broker connected to the MQTT.Cool server.

## Installation ##

### npm
The library is available as npm package, so you can download and install it through:

```
npm install mqtt.cool-web-client
```

Then load it from local `node_modules`:
```html
<html>
<head>
  <script src="./node_modules/mqtt.cool-web-client/dist/mqtt.cool.js"></script>
  ...
</html>
```

### cdn
The library is also available on [unpkg](https://unpkg.com/mqtt.cool-web-client),
to which you can point directly in the script tag:
```html
<script src="https://unpkg.com/mqtt.cool-web-client@2.0.0/dist/mqtt.cool.js"></script>
```

## Development
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
- Based on Lightstreamer SDK for Web Clients version 8.0.3 build 1800.
- Compatible with code developed with the previous version.

## Changelog
See detailed changes on https://mqtt.cool/download/changelog/?component=web&version=2.0.0

## Documentation
- [API Reference](https://docs.mqtt.cool/web-client-sdk/2.0.0/api/index.html)
- Chapter ["Client Application Development"](https://docs.mqtt.cool/server/guides/MQTT.Cool+Getting+Started+Guide.html#_client_application_development) of _Getting Started Guide_

For further details, visit the [SDK section](https://mqtt.cool/download/web-client-sdk-latest/) on the MQTT.Cool site.