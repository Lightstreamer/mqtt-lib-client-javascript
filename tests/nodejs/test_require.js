/* Script for executing unit tests on Nodejs for the mqtt library.
   It is possible to test either the sources or the AMD compiled version.

   USAGE:
   node test_require.js [min]
 */

var min = false;
var commonLibsFolder = '../common_libs';
var requirejs = require('requirejs');

var define = requirejs.define;

var moreDeps = ['../test_cases/allSuites.js'];
moreDeps.push(commonLibsFolder + '/suites.js');
moreDeps.push(commonLibsFolder + '/scenario.js');
moreDeps.push(commonLibsFolder + '/docker.js');

function loadMinDep() {
  // Adding dependency to the AMD version of the mqtt library.
  moreDeps.push('../../deploy_Node.js/npm/mqtt.cool_AMD.js');
  requirejs.config({
    deps: moreDeps,
    nodeRequire: require,
    paths: {
      'test': '../test_cases'
    }
  });
}

function loadSourceDeps() {
  moreDeps.push('../../import/node_client_bin/lib/lightstreamer_all.js');
  requirejs.config({
    deps: moreDeps,
    nodeRequire: require,
    baseUrl: '../../source/',
    paths: {
      'test': '../tests/test_cases',
      'app': '../tests/nodejs/app'
    },
    callback: function(module1, module2) {
      remapLibraryModule();
    }
  });
}

function remapLibraryModule() {
  define('Json', ['utils/Json'], function(Json) {
    return Json;
  });
  define('Objects', ['utils/Objects'], function(Objects) {
    return Objects;
  });
  define('Env', ['utils/Env'], function(Env) {
    return Env;
  });
  define('Store', ['store/Store'], function(Store) {
    return Store;
  });
  define('MqttClientImpl', ['impl/MqttClientImpl'],
    function(MqttClientImpl) {
      return MqttClientImpl;
    });
  define('MqttConnectOptions', ['impl/MqttConnectOptions'],
    function(MqttConnectOptions) {
      return MqttConnectOptions;
    });
  define('MQTTCoolSessionImpl', ['impl/MQTTCoolSessionImpl'],
    function(MQTTCoolSessionImpl) {
      return MQTTCoolSessionImpl;
    });
  define('MqttSubscribeOptions', ['impl/MqttSubscribeOptions'],
    function(MqttSubscribeOptions) {
      return MqttSubscribeOptions;
    });
  define('MqttUnsubscribeOptions', ['impl/MqttUnsubscribeOptions'],
    function(MqttUnsubscribeOptions) {
      return MqttUnsubscribeOptions;
    });
  define('DefaultStorage', ['store/DefaultStorage'],
    function(DefaultStorage) {
      return DefaultStorage;
    });
}

if (process.argv.length > 1) {
  process.argv.forEach(function(val, index, array) {
    if (index <= 1) {
      return;
    } else if (index == 2) {
      min = val == 'min';
    }
  });
}

if (min) {
  loadMinDep();
} else {
  loadSourceDeps();
}

requirejs(['app/main']);