'use strict';
define(['Suites', 'Env'],
  function(Suites, Env) {
    var envSuite = Suites.newSuite();
    var suite = envSuite.suite;
    var test = envSuite.test;
    var matcher = envSuite.matcher;

    suite('Env class Tests', function() {

      test('1. when invoking encodeToBase64',
        function(data) {
          var message = Env.encodeToBase64(data.toEncode);
          matcher('Should be equal to ', message).isEqual(data.encoded);
        }, function() {
          return [
            { toEncode: 'hello14', encoded: 'aGVsbG8xNA==' }
          ];
        });
    });

    return envSuite;
  });

