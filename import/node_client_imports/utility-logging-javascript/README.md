# Weswit JavaScript Logging Toolkit #

This library exposes a set of logger facilities that can be used to write a logging-library-agnostic code:
using the LoggerManager class, the code will be able to flush its log, even if no logging library is available.
Then, implementing the Logger and LoggerProvider interfaces, it is potentially possible to wrap any 3rd party logging library, 
making it easy to switch from one library to another. The LoggerProvider can also be specified at runtime.

A ready-made simple implementation SimpleLoggerProvider is already provided with this library.
This library relies on the [Weswit JavaScript toolkit](https://github.com/Lightstreamer/utility-toolkit-javascript)

See http://blog.lightstreamer.com/2013/11/visual-layer-of-javascript-client.html to learn more.

## Project Structure ##

*    sources
     Here you can find the source files
*    build
     This folder simply contains the app.build.js configuration to be used to build the library using the [r.js optimizer](https://github.com/jrburke/r.j) and a README.md with some instructions.
