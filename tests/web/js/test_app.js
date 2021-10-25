var library = 'mqtt.cool-test';
var params = document.location.search.substring(1).split('&');
var min = params.indexOf('min') != -1;

var libFolder = '../common_libs';
var testCaseFolderName = 'test_cases';

var moreDeps = ['../' + testCaseFolderName + '/allSuites.js'];
moreDeps.push(libFolder + '/suites.js');
moreDeps.push(libFolder + '/scenario.js');
moreDeps.push(libFolder + '/docker.js');

function loadMinDep() {
  moreDeps.push('lib/' + library + '.js');
  requirejs.config({
    deps: moreDeps,
    config: {
      'mqttcool':{
        'ns': ''
      }
    },
    paths: {
      'test': '../../' + testCaseFolderName
    },
    callback: start
  });
}

function loadSourceDeps() {
  moreDeps.push('../../import/web_client_bin/lib/lightstreamer_all.js');
  requirejs.config({
    deps: moreDeps,
    baseUrl: '../../source/',
    paths: {
      'test': '../tests/' + testCaseFolderName,
      'app': '../tests/web/js/app'
    },
    callback: function() {
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
  define('Errors', ['utils/Errors'], function(Errors) {
    return Errors;
  });
  define('Store', ['store/Store'], function(Store) {
    return Store;
  });
  define('DefaultStorage', ['store/DefaultStorage'], function(DefaultStorage) {
    return DefaultStorage;
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
  start();
}

if (min) {
  loadMinDep();
} else {
  loadSourceDeps();
}

function start() {
  define('XMLHttpRequest', ['XMLHttpRequest'],
    function() {
      return XMLHttpRequest;
    });

  requirejs(['Scenario'], function(Scenario) {
    var query = document.location.search;
    var params = query.substring(1).split('&');
    var isMinified = params.indexOf('min') != -1;
    var isIntegration = params.indexOf('int') != -1;
    Scenario.setMinified(isMinified);
    Scenario.setInt(isIntegration);
  });

  requirejs(['app/main']);
}