/* Script for executing unit tests on Nodejs for the production-ready mqtt
   library (which is generated as CommonJS module).

   USAGE:
   node test.js [int]

   OPTIONS:
      int        run integration tests instead of unit tests.
*/

var nameStack = [];
global.define = function(name, deps, readyFunc) {
  if (arguments.length == 2) {
    var newDeps = name;
    readyFunc = deps;
    deps = newDeps;
    name = nameStack.pop();
  }

  //console.log('Defining <' + name +'>');

  // Prepare the map object containing references to the exported symbols.
  var dependencies = mqtt_cool;

  // Add symbol for the Suites test library.
  dependencies['Suites'] = Suites;
  dependencies['XMLHttpRequest'] = XMLHttpRequest;

  // Read and resolve dependencies.
  var resolvedDeps = [];
  for (var j = 0; j < deps.length; j++) {
    var dep = deps[j];
    //console.log('Resolving dep <' + dep + '> for ' + name);
    if (dep.startsWith('test/')) {
      /* Since the test case module does not specify any name, as name use the
       * the dependency string as defined in the allSuites and push the
       * the same in the name stack, which will be popped later.
       */
      nameStack.push(dep);
      require('../test_cases/' + dep.substr(5));
      //console.log('Required: ' + dep);
    }
    var dependency = dependencies[dep];
    if (dependency) {
      //console.log('Got dep <' + dep + '> for ' + name);
      resolvedDeps.push(dependency);
    } else {
      throw 'No dependency <' + dep + '> found';
    }

  }

  // Invoke the function bound to the "define" function of the test module.
  var returnedObj = readyFunc.apply(this, resolvedDeps);

  dependencies[name] = returnedObj;
  //console.log('Added dep: ' + name);
};

var integrationTest = false;
if (process.argv.length > 1) {
  process.argv.forEach(function(val, index, array) {
    if (index <= 1) {
      return;
    } else if (index == 2) {
      integrationTest = val == 'int';
    }
  });
}

var library = 'mqtt.cool';
var commonLibsFolder = '../common_libs';
var mqtt_cool = require('./lib/' + library + '-test.js');
var Suites = require(commonLibsFolder + '/suites.js');

// Load the XMLHttpRequest package to be injected later on docker module.
var xhrc = require('../../node_modules/xmlhttprequest');
var XMLHttpRequest = xhrc.XMLHttpRequest;

// Load first the Docker module, as it does not have any dependencies.
require(commonLibsFolder + '/docker.js');

// Then, load the Scenario module, which depends on the Docker module. Thus
// global.define succeeds in resolving such dependency.
require(commonLibsFolder + '/scenario.js');

// From the exported simbols, retrieve Scenario .
var Scenario = mqtt_cool['Scenario'];
Scenario.setMinified(true);
Scenario.setInt(integrationTest);

// Load the module containing references to the test case scripts.
require('../test_cases/allSuites.js');


// Load the module which run the tests.
require('./app/main.js');
