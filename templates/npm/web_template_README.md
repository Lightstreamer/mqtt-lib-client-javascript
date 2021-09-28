# BRANDED_PRODUCT_NAME_PLACEHOLDER Web Client #

## Overview ##
The BRANDED_PRODUCT_NAME_PLACEHOLDER Web Client is a JavaScript library for the development of BRANDED_PRODUCT_NAME_PLACEHOLDER clients running inside the web browser.

The library enables any HTML page to act as an *MQTT* client; that is, ready to send and receive real-time MQTT messages to/from any MQTT broker connected to the BRANDED_PRODUCT_NAME_PLACEHOLDER server.

## Installation ##

### npm
The library is available as npm package, so you can download and install it through:

```
npm install LIBRARY_NAME_PLACEHOLDER-web-client
```

Then load it from local `node_modules`:
```html
<html>
<head>
  <script src="./node_modules/LIBRARY_NAME_PLACEHOLDER-web-client/dist/LIBRARY_NAME_PLACEHOLDER.js"></script>
  ...
</html>
```

### cdn
The library is also available on [unpkg](https://unpkg.com/LIBRARY_NAME_PLACEHOLDER-web-client),
to which you can point directly in the script tag:
```html
<script src="https://unpkg.com/LIBRARY_NAME_PLACEHOLDER-web-client@VERSION_PLACEHOLDER/dist/LIBRARY_NAME_PLACEHOLDER.js"></script>
```

## Development
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
See detailed changes on HOME_PAGE_PLACEHOLDER/download/changelog/?component=web&version=VERSION_PLACEHOLDER

## Documentation
- [API Reference](WEB_API_REFERENCE_PLACEHOLDER)
- Chapter ["Client Application Development"](ONLINE_GUIDE_PLACEHOLDER#_client_application_development) of _Getting Started Guide_

For further details, visit the [SDK section](WEB_CLIENT_DOWNLOAD_URL_PLACEHOLDER) on the BRANDED_PRODUCT_NAME_PLACEHOLDER site.