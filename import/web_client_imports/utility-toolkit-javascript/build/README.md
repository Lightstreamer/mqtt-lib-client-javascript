
# Build the toolkit #

To build the toolkit, some tools are required:

*     Java must be installed and possibly available in the path
*     Download compiler.jar from [https://developers.google.com/closure/compiler/](https://developers.google.com/closure/compiler/)
*     Download js.jar from [https://developer.mozilla.org/en-US/docs/Rhino/Download_Rhino](https://developer.mozilla.org/en-US/docs/Rhino/Download_Rhino)
*     ~~Download r.js from [https://github.com/jrburke/r.j](https://github.com/jrburke/r.j)~~ A custom build of r.js is currently included. It was generated from [https://github.com/mone/r.js](https://github.com/mone/r.js)

Put the downloaded files in this folder, then run

Linux
```
java -cp compiler.jar:js.jar org.mozilla.javascript.tools.shell.Main r.js -o app.build.js
```

Windows
```
java -cp compiler.jar;js.jar org.mozilla.javascript.tools.shell.Main r.js -o app.build.js
```

Built files will be available in the built folder. Note that the lightstreamer-widgets.js file
will contain all the modules together with modules imported from the [utility-toolkit](https://github.com/mone/Weswit/utility-toolkit-javascript), 
[utility-logging](https://github.com/mone/Weswit/utility-logging-javascript), and [utility-test](https://github.com/mone/Weswit/utility-test-javascript) 
libraries.

# Generate The Documentation #

Get [JSDoc 3](https://github.com/jsdoc3/jsdoc)

Assuming you have the jsdoc folder in your path, call 
```
jsdoc --destination ../docs ../source
```
Documentation will appear in the docs folder.
