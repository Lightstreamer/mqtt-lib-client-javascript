'use strict';
define(['Suites', 'Json', 'Env', 'Message'],
  function(Suites, Json, Env, Message) {
    var messageSuite = Suites.newSuite();
    var suite = messageSuite.suite;
    var test = messageSuite.test;
    var matcher = messageSuite.matcher;

    suite('Json class Tests', function() {

      test('1. when decoding from a real-time event related to a published' +
        ' Message',
      function(data) {
        var message = Json.decodeMessageFromJson(data.event);
        matcher('Should be equal', message).isEqual(data.exp);
      }, function() {
        var msg1 = {
          'destinationName': 'topic',
          'payload': Env.encodeToBase64('msg')
        };
        var exp1 = new Message('msg');
        exp1.qos = 0;
        exp1.destinationName = 'topic';

        var msg2 = {
          'destinationName': 'topic2', 'payload': Env.encodeToBase64('msg2'),
          'qos': 0
        };
        var exp2 = new Message('msg2');
        exp2.qos = 0;
        exp2.destinationName = 'topic2';

        var msg3 = {
          'destinationName': 'topic3', 'payload': Env.encodeToBase64('msg3'),
          'qos': 1
        };
        var exp3 = new Message('msg3');
        exp3.qos = 1;
        exp3.destinationName = 'topic3';

        var msg4 = {
          'destinationName': 'topic4', 'payload': Env.encodeToBase64('msg4'),
          'qos': 2
        };
        var exp4 = new Message('msg4');
        exp4.qos = 2;
        exp4.destinationName = 'topic4';

        var msg5 = {
          'destinationName': 'topic5', 'payload': Env.encodeToBase64('msg5'),
          'qos': '2'
        };
        var exp5 = new Message('msg5');
        exp5.qos = 2;
        exp5.destinationName = 'topic5';

        var msg6 = {
          'destinationName': 'topic6', 'payload': Env.encodeToBase64('msg6'),
          'qos': '2', 'duplicate': true, 'retained': true
        };
        var exp6 = new Message('msg6');
        exp6.qos = 2;
        exp6.destinationName = 'topic6';
        exp6._setDuplicate(true);
        exp6.retained = true;

        return [
          { event: msg1, exp: exp1 },
          { event: msg2, exp: exp2 },
          { event: msg3, exp: exp3 },
          { event: msg4, exp: exp4 },
          { event: msg5, exp: exp5 },
          { event: msg6, exp: exp6 }
        ];
      });

      test('2. when encoding a Message instance into a JSON string to deliver',
        function(data) {
          var message = Json.encodeMessageToJson(data.message);
          matcher('Should be equal', message).isEqual(data.exp);
        }, function() {
          var msg1 = new Message('msg');
          msg1.destinationName = 'topic';

          var exp1 = {
            'destinationName': 'topic',
            'payload': Env.encodeToBase64(msg1['payloadString']),
            'duplicate': false, 'retained': false, 'qos': 0
          };

          var msg2 = new Message('msg2');
          msg2.qos = 0;
          msg2.destinationName = 'topic2';
          var exp2 = {
            'destinationName': 'topic2',
            'payload': Env.encodeToBase64(msg2['payloadString']),
            'duplicate': false, 'retained': false, 'qos': 0
          };

          var msg3 = new Message('msg3');
          msg3.qos = 1;
          msg3.destinationName = 'topic3';
          msg3._setDuplicate(true);
          msg3.retained = true;

          var exp3 = {
            'destinationName': 'topic3', 'payload': Env.encodeToBase64('msg3'),
            'duplicate': true, 'retained': true, 'qos': 1
          };

          return [
            { message: msg1, exp: exp1 },
            { message: msg2, exp: exp2 },
            { message: msg3, exp: exp3 }
          ];
        });
    });

    return messageSuite;
  });

