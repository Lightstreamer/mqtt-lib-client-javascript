# MQTT.Cool Client SDK

[MQTT.Cool](https://mqtt.cool) is a gateway designed for boosting existing [MQTT](https://en.wikipedia.org/wiki/MQTT) brokers by extending their native functionalities with new out-of-the-box features. It provides architecture, performance and security extensions to any third-party MQTT broker.

The MQTT.Cool Client SDK is a JavaScript library for the development of MQTT.Cool clients running inside a web browser or a Node.js container.

The library enables any javascript program to act as an *MQTT* client; that is, ready to send and receive real-time MQTT messages to/from any MQTT broker connected to the MQTT.Cool server.

## Quickstart

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

## npm Packages

The library is available as npm package, so you can download and install it through:

```
npm install mqtt.cool-web-client
```

or

```
npm install mqtt.cool-node-client
```

- [npm Web Package](https://www.npmjs.com/package/mqtt.cool-web-client)

- [npm Node.js Package](https://www.npmjs.com/package/mqtt.cool-node-client)

## Building

To build the library, enter the directory `tools` and run the command `node build_web.js` or the command `node build_node.js`. The first time you should also enter the root directory of the project and run the command `npm install` in order to install the dependencies required by the build scripts. The scripts require Node.js version 14 or greater.

The artifacts generated are saved in the directories `tools/dist-web` and `tools/dist-node`.

## Documentation

- [Getting Started Guide](https://docs.mqtt.cool/server/guides/MQTT.Cool+Getting+Started+Guide.html)

- [Live demos](https://mqtt.cool/demos/)

- [Web API Reference](https://mqtt.cool/docs/web-client-sdk/api/index.html)

- [Node.js API Reference](https://mqtt.cool/docs/nodejs-client-sdk/api/index.html)

## Support

For questions and support please use the [Official Forum](https://mqtt.cool/forum/). The issue list of this page is **exclusively** for bug reports and feature requests.

## License

[Apache 2.0](https://opensource.org/licenses/Apache-2.0)
