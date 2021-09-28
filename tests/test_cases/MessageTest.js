'use strict';
define(['Suites', 'Message'],
  function(Suites, Message) {

    var messageSuite = Suites.newSuite();
    var suite = messageSuite.suite;
    var test = messageSuite.test;
    var matcher = messageSuite.matcher;

    var generateStringOfLength = function(length) {
      var s = '';
      for (var i = 0; i < length; i++) {
        s += 'a';
      }
      return s;
    };

    var TOO_LONG_STRING = generateStringOfLength(65536);

    suite('Message class Tests', function() {

      test(1, 'when invoking the constructor passing an invalid argument as ' +
        'payload', function() {
        matcher('Should throw an invalid argument exception', function() {
          new Message(new Date());
        }).throws(new Error('Invalid [payload] argument'));
      });

      test(2, 'Test constructor with no payload', function() {
        matcher('Throws invalid argument exception', function() {
          new Message();
        }).throws(new Error('Invalid [payload] argument'));
      });

      test(3, 'when creating an instance passing an empty payload', function() {
        var voidMessage = new Message('');
        matcher('QoS should be 0', voidMessage.qos).is(0);
        matcher('destinationName should be undefined',
          voidMessage.destinationName).isUndefined();
        matcher('duplicate should be false', voidMessage.duplicate).is(false);
        matcher('retained should be false', voidMessage.retained).is(false);
        matcher('payloadString should be ""', voidMessage.payloadString).is('');
        matcher('Length of payloadBytes length should be 0',
          voidMessage.payloadBytes.length).is(0);
      });

      test(4, 'when setting an invalid QoS value', function(qos) {
        var textMessage = new Message('message');
        matcher('Should throw an exception', function() {
          textMessage.qos = qos;
        }).throws(new Error('Invalid [qos] argument'));
      }, function() {
        return [undefined, null, true, [], {}, 'qos'];
      });

      test(5, 'when setting an invalid retained flag', function(retained) {
        var textMessage = new Message('message');
        matcher('Should throw an exception', function() {
          textMessage.retained = retained;
        }).throws(new Error('Invalid [retained] value: ' + retained));
      }, function() {
        return [undefined, null, 1, [], {}, 'retained'];
      });

      test(6, 'when setting an invalid duplicate flag', function(duplicate) {
        var textMessage = new Message('message');
        matcher('Should throw an exception', function() {
          textMessage._setDuplicate(duplicate);
        }).throws(new Error('Invalid [duplicate] value: ' + duplicate));
      }, function() {
        return [undefined, null, 1, [], {}, 'duplicate'];
      });

      test(7, 'when setting an invalid destination name',
        function(destination) {
          var textMessage = new Message('message');
          matcher('Should throw an exception', function() {
            textMessage.destinationName = destination.arg;
          }).throws(destination.exception);
        }, function() {
          return [
            {
              arg: undefined, exception: new Error('Invalid [destinationName]' +
                ' argument: <undefined>')
            },
            {
              arg: null, exception: new Error('Invalid [destinationName] ' +
                'argument: <null>')
            },
            {
              arg: 1, exception: new Error('Invalid [destinationName] ' +
                'argument: <1>')
            },
            {
              arg: true, exception: new Error('Invalid [destinationName] ' +
                'argument: <true>')
            },
            {
              arg: [], exception: new Error('Invalid [destinationName] ' +
                'argument: <>')
            },
            {
              arg: {}, exception: new Error('Invalid [destinationName] ' +
                'argument: <[object Object]>')
            },
            {
              arg: 'topic/#', exception: new Error('Argument ' +
                '[destinationName] cannot contain wildcard characters')
            },
            {
              arg: 'topic/+', exception: new Error('Argument ' +
                '[destinationName] cannot contain wildcard characters')
            },
            {
              arg: TOO_LONG_STRING,
              exception: new Error('Argument [destinationName] exceeded max ' +
                'length: <65536>')
            },
            {
              arg: '\ud800',
              exception: new Error('Argument [destinationName] not encodable ' +
                'as UTF-8 string')
            },
            {
              arg: '',
              exception: new Error('Argument [destinationName] must be at ' +
                'least one character long')
            }
          ];
        });

      test(8, 'when creating an instance passing a string as payload',
        function() {
          var s = String('Message Test').toString();
          var txtMsg = new Message(s);
          txtMsg.destinationName = 'test';
          txtMsg.qos = 1;
          txtMsg.retained = true;
          txtMsg._setDuplicate(true);

          matcher('QoS should be 1', txtMsg.qos).is(1);
          matcher('destinationName should be "test"', txtMsg.destinationName)
            .is('test');
          matcher('duplicate should be true', txtMsg.duplicate).is(true);
          matcher('retained should be true', txtMsg.retained).is(true);
          matcher('payloadString should be "Message Test"...',
            txtMsg.payloadString).is('Message Test');
          matcher('payloadBytes should have been verified', txtMsg.payloadBytes)
            .isEqual(Uint8Array.from('Message Test', x => x.charCodeAt(0)));
        });

      test(9, 'when creating an instance passing Uint8Array built from an ' +
        'array of integers as payload', function() {
        var buffer = new Uint8Array([1, 2, 3, 4]);
        var binaryMessage = new Message(buffer);

        matcher('Comparing binary Uint8 payloads...',
          binaryMessage.payloadBytes).isEqual(buffer);

        matcher('Comparing text messages...', binaryMessage.payloadString)
          .is(String.fromCharCode.apply(null, buffer));

        var textMessage = new Message(binaryMessage.payloadString);
        matcher('Comparing text messages...', textMessage.payloadString)
          .is(String.fromCharCode.apply(null, new Uint8Array(buffer.buffer)));
      });

      test(10, 'when creating an instance passing an Int16Array built from an' +
        ' array of integers as payload', function() {
        var buffer = new Int16Array([4512, 12301, 3212, 12314]);
        var binaryMessage = new Message(buffer);

        matcher('Comparing binary Int16 payloads...',
          binaryMessage.payloadBytes).isEqual(buffer);

        matcher('Comparing text messages...', binaryMessage.payloadString)
          .isEqual(String.fromCharCode.apply(null,
            new Uint8Array(buffer.buffer)));
      });

      test(11, 'when creating an instance passing an Uint8Array built from a ' +
        'string as payload', function() {
        var buffer = Uint8Array.from('Hello MQTT Cool', x => x.charCodeAt(0));
        var binaryMessage = new Message(buffer);
        matcher('Checking binary message...', binaryMessage.payloadString)
          .is('Hello MQTT Cool');
        matcher('Comparing text messages...', binaryMessage.payloadString)
          .is(String.fromCharCode.apply(null, new Uint8Array(buffer.buffer)));
      });

      test(12, 'when creating an instance passing an ArrayBuffer populated ' +
        'through an Uint8Array as payload', function() {
        var buffer = new ArrayBuffer(4);
        var uint8Array = new Uint8Array(buffer);
        uint8Array[0] = 1;
        uint8Array[1] = 2;
        uint8Array[2] = 3;
        uint8Array[3] = 4;
        var binaryMessage = new Message(buffer);
        matcher('Test payloads built from an ' +
            'ArrayBuffer populated by Unit8Array...',
        new Uint8Array(binaryMessage.payloadBytes))
          .isEqual(new Uint8Array(binaryMessage.payloadBytes));
      });
    });

    return messageSuite;
  });

