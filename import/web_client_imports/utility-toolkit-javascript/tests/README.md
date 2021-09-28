# Testing #

This folder contains the tests for the library.

## Run on browser ##

To run the test on a browser, simply open the index.html file. You should keep an eye on the browser console if available; tests should pass even on IE6.
For better results, deploy the project on a web server and run tests accessing the page through it.

## Run on node ##

To run the test on Node.js, install require.js using npm
```
npm install requirejs
```


then call
```
node index.js
```

## Upgrading Libs ##

The utility-toolkit.js, utility-logging.js, and utility-test.js libs contained in this folder are custom builds namespacing the various calsses with the weswit/prefix. (i.e., to require "Inheritance" the "weswit/Inheritance" string must be used. Note that these are not the classes that will be tested as the tests are run on the files contained in the source or built folders).

To upgrade the libs in this folder, go to the build folder of the three toolkits and run

Linux
```
java -cp compiler.jar:js.jar org.mozilla.javascript.tools.shell.Main r.js -o weswit.wrap.build.js
```

Windows
```
java -cp compiler.jar;js.jar org.mozilla.javascript.tools.shell.Main r.js -o weswit.wrap.build.js
```

Then get the files from the builtWeswit folder and drop them here.

### See ###

[utility-toolkit-javascript](https://github.com/Lightstreamer/utility-toolkit-javascript)
[utility-logging-javascript](https://github.com/Lightstreamer/utility-logging-javascript)
[utility-test-javascript](https://github.com/Lightstreamer/utility-test-javascript)
