var testPrefix = 'test';
var testCaseList = [
  'MessageTest',
  'store/StoreTest',
  'utils/JsonTest',
  'utils/EnvTest',
  'utils/ObjectsTest',
  'openSessionTest',
  'impl/MqttConnectOptionsTest',
  'impl/MqttSubscribeOptionsTest',
  'impl/MqttUnsubscribeOptionsTest',
  'impl/MQTTCoolSessionImplTest',
  'impl/MqttClientImplTest_connection',
  'impl/MqttClientImplTest_subscribe',
  'impl/MqttClientImplTest_publish',
  'impl/MqttClientImplTest_unsubscribe'
];
testCaseList.forEach(function(value, index, array) {
  array[index] = testPrefix + '/' + value;
});

define('allSuites', testCaseList, function() {
  /*for (var i = 0; i < arguments.length; i++) {
    console.log('Typeof :' + typeof arguments[i]);
  }*/
  return arguments;
});