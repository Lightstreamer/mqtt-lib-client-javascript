define(['Inheritance', 'AbstractTest', '../tests/classes/LoggingAssert'],
  function(Inheritance, AbstractTest, ASSERT) {

    var SingleTest = function(testCaseClass, testMethodName, testArg) {
      this._callSuperConstructor(SingleTest);
      this.testCaseClass = testCaseClass;
      this.testMethodName = testMethodName;
      this.testArg = testArg;
    };

    SingleTest.prototype = {

      toString: function() {
        var name = this.testCaseClass['name'] || '';
        return '[' + name + '.' + this.testMethodName + ']';
      },

      start: function() {
        //this._callSuperMethod(defineTestCase, 'start');
        var _error_in_before = true;
        var _exception = null;
        try {
          var testCaseInstance = new this.testCaseClass();

          if (testCaseInstance.before) {
            testCaseInstance.before();
          } {
            _error_in_before = false;
          }

          var testMethod = this.testCaseClass.prototype[this.testMethodName];
          testMethod.apply(testCaseInstance, [this.testArg]);

        } catch (e) {
          _exception = e;
        } finally {
          try {
            if (testCaseInstance.after && !_error_in_before) {
              testCaseInstance.after();
            }
          } catch (e) {
            _exception = e;
          }
          finally {
            // This force the increment of failure counters.
            if (_exception && _exception != 'AssertionException') {
              ASSERT.fail(_exception);
            }
            this.end();
          }
        }
      }
    };

    Inheritance(SingleTest, AbstractTest);

    var TestCaseAdapter = function() { };

    function checkData(methodName, testCaseClass, dataFound, dataNotFound) {
      var dataMethodName = 'get' + methodName.substr(4) + '_data';
      var getDataForTestMethod = testCaseClass[dataMethodName];
      var data = null;
      if (getDataForTestMethod) {
        data = getDataForTestMethod();
        dataFound(data);
        return;
      }

      dataNotFound();
    }

    TestCaseAdapter.getInstances = function(testCaseClass) {
      var testCases = new Array();
      var prototype = testCaseClass.prototype;
      for (var methodName in prototype) {
        if (typeof prototype[methodName] == 'function' &&
          methodName.startsWith('test')) {
          checkData(methodName, testCaseClass, function(data) {
            if (Object.prototype.toString.call(data) == '[object Array]') {
              data.forEach(function(value) {
                testCases.push(new SingleTest(testCaseClass, methodName,
                  value));
              });
            } else {
              testCases.push(new SingleTest(testCaseClass, methodName, data));
            }
          }, function() {
            testCases.push(new SingleTest(testCaseClass, methodName));
          });
        }
      }

      return testCases;
    };

    return TestCaseAdapter;
  });
