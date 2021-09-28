var requirejs = require('requirejs');

requirejs.config({
  deps: ["utility-toolkit.js",
         "utility-logging.js",
         "utility-test.js",
         "../built/utility-toolkit.js"],
  nodeRequire: require
});

global.weswitClassPrefix = "../../source/";
if (process.argv.length > 1) { 
  process.argv.forEach(function (val, index, array) {
    if (index <= 1) {
      return;
    } else if (index == 2 && val == "min") {
      global.weswitClassPrefix = "";
    } 
  });
}


requirejs(["TestRunnerConfiguration"],function(mainRunner) {
  //tests are now running
  mainRunner.addListener({
    onAllTestComplete:function(fails) {
      console.log("");
      if (!global.weswitClassPrefix) {
        console.log("Tests were performed on minified code, run again without parameters to run against sources");
      } else {
        console.log("Tests were performed on sources, run again with the min parameter to run against minified code");
      }
      process.exit();
    }
  });
});