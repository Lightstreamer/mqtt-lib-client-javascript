2.0.0 build 491 (22 Oct 2021)
-----------------------------

**Improvements**

- Rebuilt from Lightstreamer SDK for Node.js Clients version 8.0.3 build 1800.


1.2.4 build 215 (16 Apr 2020)
------------------------------

**Bug Fixes**

- Fixed the client version info sent to the server, as the same fix in the previous version turned out being incorrect.
- Fixed wrong links to external Lightstreamer documentation in the API specification.



1.2.3 build 475 (31 Mar 2020)
-----------------------------

**Bug Fixes**

- Fixed the client version info sent to the server.
- Fixed typos in the `README.md` file of the npm package.



1.2.2 build 437 (26 Apr 2019)
-----------------------------

**Bug Fixes**

- Fixed a bug that prevented dedicated connections from restoring already
submitted subscriptions.



1.2.1 build 425 (19 Dec 2018)
-----------------------------

**Bug Fixes**

- Fixed a bug that caused wrong requests in the case of multiple and consecutive
  invocations of `MqttClient.subscribe` and/or `MqttClient.unsubscribe` methods.



1.2.0 build 400 (23 Nov 2018)
-----------------------------

**Improvements**

- Rebuilt from Lightstreamer SDK for Web Clients version 7.1.3 build 1767.
- Rewritten the `README.md` file included in the npm package.
- Removed the `DOCS-SDKs\sdk-client-web` placeholder folder from version
  **1.2.0** of the MQTT.Cool distribution package: now the SDK has its own
  [dedicated section](https://mqtt.cool/download/web-client-sdk-latest/) on the
  MQTT.Cool site.



1.1.2 build 335 (30 Mar 2018)
-----------------------------

**Bug Fixes**

- Fixed a bug which prevented the retained flag of the `ConnectOptions.willMessage`
  parameter from being encoded correctly in the case of true value.



1.1.1 build 333 (30 Mar 2018)
-----------------------------

**Bug Fixes**

- Fixed a bug which prevented the `ConnectOptions.willMessage` parameter from
  being sent correctly if the QoS is not explicitly set on the `Message` instance.



1.1.0 build 328 (30 Mar 2018)
-----------------------------

**Improvements**

- Rebuilt from Lightstreamer SDK for Web Clients version 7.1.2 build 1752.

**Bug Fixes**

- Fixed typos and statements in the API specification.



1.0.1 build 320 (11 Jan 2018)
-----------------------------

**Improvements**

- Added support for `mqtts` and `ssl` schemas for enabling TLS/SSL connection
  between MQTT.Cool and MQTT brokers through _Dynamic Lookup_.



1.0.1-b2 build 315 (16 Nov 2017)
--------------------------------

**Bug Fixes**

- Fixed a bug which prevented the `ConnectOptions.username` parameter from being
  sent.
- Fixed an exception which could be thrown when setting `ConnectOptions.username`
  or `ConnectOptions.password` to `null`.
- Fixed minor documentation error on `OnSubscriptionSuccess`.



1.0.1-b1 build 311 (11 Oct 2017)
--------------------------------

**Bug Fixes**

Fixed the Regular Expression used to check the `brokerReference` parameter
provided to the `MQTTCoolSession.createClient()` method.



1.0.0 build 308 (21 Jul 2017)
-----------------------------

First public release.