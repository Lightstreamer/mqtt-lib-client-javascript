define(['Suites', 'Objects', 'LoggerManager'],
  function(Suites, Objects, LoggerManager) {

    var ObjectsSuite = Suites.newSuite();
    var suite = ObjectsSuite.suite;
    var track = ObjectsSuite.track;
    var test = ObjectsSuite.test;
    var matcher = ObjectsSuite.matcher;

    // Uncomment the following to enable the skipping features.
    var xtest = ObjectsSuite.notest;

    suite('Objects class Tests', function() {

      test(1, 'Testing invocation of method on an object without arguments',
        function() {

          var obj = { method: function() { } };
          track(obj);

          matcher('Should have been invoked with no exceptions', function() {
            Objects.invoke(obj, 'method');
          }).not.throws();

          matcher('Should have been invoked', obj.method).
            isInvoked();
        });


      test(2, 'Testing invocation of a method on an object with one argument',
        function() {

          var obj = { method: function(par1) { } };
          track(obj);

          matcher('Should have been invoked with no exceptions', function() {
            Objects.invoke(obj, 'method', ['parameter1']);
          }).not.throws();

          matcher('Should have been invoked with parameter', obj.method)
            .isInvoked().with('parameter1');
        });

      test(3, 'Testing invocation of a method on an object with more arguments',
        function() {
          var obj = {
            method: function(a1, a2, a3) { }
          };
          track(obj);

          matcher('Should have been invoked', function() {
            Objects.invoke(obj, 'method', ['parameter1', true, [1, 2, 3]]);
          }).not.throws();

          matcher('Should have been invoked', obj.method).
            isInvoked().with('parameter1', true, [1, 2, 3]);
        });

      test(4, 'Testing invocation of a method which throws an exception',
        function() {

          matcher('Should have been invoked with exceptions', function() {
            Objects.invoke({
              method: function() {
                throw 'Exception thrown from method';
              }
            }, 'method');
          }).throws();
        });

      test(5, 'Testing invocation of a method which returns a value',
        function() {
          var value = Objects.invoke({
            method: function() {
              return 'value';
            }
          }, 'method');
          matcher('Should return a value', value).is('value');
        });

      test(6, 'when invoking a method on a', function(data) {
        matcher('Should not throw any exception',
          function() {
            Objects.invoke('method', data.obj);
          }).not.throws();
      }, function() {
        return [
          { comment: ' null object', object: null },
          { comment: ' undefined object', object: undefined }
        ];
      });

      test(7, 'when invoking a non-existing method on a', function() {
        matcher('Should not throw any exception',
          function() {
            Objects.invoke('method', {});
          }).not.throws();
      });

      test(8, 'Testing invocation of makeEvent()', function(data) {
        var event = Objects.makeEvent(data.input.code, data.input.message);
        matcher('Checking event', event).isEqual(data.expected);
      }, function() {
        return [
          {
            input: { code: 1, message: 'message' },
            expected: { code: 1, message: 'message' }
          },
          {
            input: { code: 1 },
            expected: { code: 1, message: '' }
          },
          {
            input: { code: 1, message: null },
            expected: { code: 1, message: '' }
          }
        ];
      });

      test(9, 'Testing invocation of makeErrorEvent()', function(data) {
        var event = Objects.makeErrorEvent(data.input.code, data.input.message);
        matcher('Checking event', event).isEqual(data.expected);
      }, function() {
        return [
          {
            input: { code: 1, message: 'message' },
            expected: { errorCode: 1, errorMessage: 'message' }
          },
          { input: { code: 1 }, expected: { errorCode: 1 } },
          {
            input: { code: 1, message: undefined },
            expected: { errorCode: 1 }
          },
          { input: { code: 1, message: null }, expected: { errorCode: 1 } },
          {
            input: { code: 1, message: '' },
            expected: { errorCode: 1, errorMessage: '' }
          }
        ];
      });

      test(10, 'Testing checkType() with NO exceptions', function(data) {
        matcher('Should not throw any exception with value <' + data.object +
          '> of expected type <' + data.type + '>',
        function() {
          Objects.checkType(data.object, data.type, data.name, true);
        }).not.throws();
      }, function() {
        return [
          { object: 1, type: 'number', name: 'my_number' },
          { object: 'hello', type: 'string', name: 'my_string' },
          { object: true, type: 'boolean', name: 'my_bool' },
          { object: false, type: 'boolean', name: 'my_bool2' },
          { object: undefined, type: 'undefined', name: 'my_undef' },
          { object: null, type: 'object', name: 'my_null' },
          { object: function() { }, type: 'function', name: 'my_function' },
          { object: { prop: 1 }, type: 'object', name: 'my_object' }
        ];
      });

      test(11, 'Testing checkType() with exceptions', function(data) {
        matcher('Should throw any exception with value <' + data.object + '> ' +
          ' of expected type < ' + data.type + ' > ',
        function() {
          Objects.checkType(data.object, data.type, data.name);
        }).throws();
      }, function() {
        return [
          { object: 1, type: 'string', name: 'my_number' },
          { object: 'hello', type: 'boolean', name: 'my_string' },
          { object: true, type: 'number', name: 'my_bool' },
          { object: false, type: 'object', name: 'my_bool2' },
          { object: undefined, type: 'object', name: 'my_undef' },
          { object: null, type: 'string', name: 'my_null' },
          { object: function() { }, type: 'number', name: 'my_function' },
          { object: new Date(), type: 'number', name: 'my_object' }
        ];
      });

      test(12, 'Testing checkTypeAndSet()', function(data) {
        var target = {};
        if (data.obj.object === null || data.obj.object === undefined) {
          Objects.checkTypeAndSet(data.obj.object, data.obj.type,
            data.obj.name, target, true);
        } else {
          Objects.checkTypeAndSet(data.obj.object, data.obj.type,
            data.obj.name, target);
        }

        matcher('Should be equal to <' + data.exp[data.obj.name] + '>',
          target).isEqual(data.exp);
      }, function() {
        return [
          {
            obj: { object: 1, type: 'number', name: 'my_number' },
            exp: { 'my_number': 1 }
          },
          {
            obj: { object: 'hello', type: 'string', name: 'my_string' },
            exp: { 'my_string': 'hello' }
          },
          {
            obj: { object: true, type: 'boolean', name: 'my_bool' },
            exp: { 'my_bool': true }
          },
          {
            obj: { object: false, type: 'boolean', name: 'my_bool2' },
            exp: { 'my_bool2': false }
          },
          {
            obj: { object: undefined, type: 'undefined', name: 'my_undef' },
            exp: { 'my_undef': undefined }
          },
          {
            obj: { object: undefined, type: 'undefined', name: 'my_undef2' },
            exp: { 'my_undef2': undefined }
          },
          {
            obj: { object: undefined, type: 'undefined', name: 'my_undef3' },
            exp: { 'my_undef3': undefined }
          },
          {
            obj: { object: null, type: 'object', name: 'my_null' },
            exp: { 'my_null': null }
          },
          {
            obj: { object: null, type: 'object', name: 'my_null2' },
            exp: { 'my_null2': null }
          },
          {
            obj: { object: null, type: 'object', name: 'my_null3' },
            exp: { 'my_null3': null }
          },
          {
            obj:
            { object: function() { }, type: 'function', name: 'my_function' },
            exp: { 'my_function': function() { } }
          },
          {
            obj: { object: { prop: 1 }, type: 'object', name: 'my_object' },
            exp: { 'my_object': { prop: 1 } }
          }
        ];
      });

      test(13, 'Testing checkUTF8() with exception', function(data) {
        matcher('Should throw any exception due to exceeded max length',
          function() {
            Objects.checkUTF8(data.value, data.name, data.length);
          }).throws();
      }, function() {
        return [
          { value: 'abcd', name: 'my_string', length: 3 },
          { value: 'a', name: 'my_string', length: 0 }
        ];
      });

      test(13, 'Testing checkUTF8() with NO exception', function(data) {
        matcher('Should not throw any exception',
          function() {
            Objects.checkUTF8(data.value, data.name, data.length);
          }).not.throws();
      }, function() {
        return [
          { value: 'abcd', name: 'my_string', length: 4 },
          { value: '', name: 'my_string', length: 0 },
          { value: '', name: 'my_string', length: 1 }
        ];
      });
    });

    return ObjectsSuite;
  });

