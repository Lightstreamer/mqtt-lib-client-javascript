//'use strict';
var define = define || undefined;

var TEST_TIMEOUT = 60000; // ms

function compare(obj1, obj2) {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == obj2) {
    return true;
  }

  if (!(obj1 instanceof Object) || !(obj2 instanceof Object)) {
    return false;
  }

  if (Object.prototype.toString.call(obj1) !==
    Object.prototype.toString.call(obj2)) {
    return false;
  }

  if (obj1.toString() !== obj2.toString()) {
    return false;
  }

  var objKeys1 = Object.keys(obj1);
  var objKeys2 = Object.keys(obj2);
  if (objKeys1.length != objKeys2.length) {
    return false;
  }

  for (var i in obj1) {
    var prop1 = obj1[i];
    var prop2 = obj2[i];
    if (!compare(prop1, prop2)) {
      return false;
    }
  }
  return true;
}


var Matcher = function(suite, actual, hook, thisArg) {
  var matchHook = hook;

  return {

    is: function(arg) {
      return matchHook(actual === arg, 'Expected <' + arg + '> but ' +
        'was <' + actual + '>');
    },

    isUndefined: function() {
      return matchHook(typeof actual == 'undefined', 'Expected ' +
        '<undefined> but was <' + actual + '>');
    },

    isEqual: function(arg) {
      return matchHook(compare(actual, arg), 'Expected <' + arg
        + '> but was <' + actual + '>');
    },

    isGreaterThan: function(arg) {
      return matchHook(actual > arg, 'Expected <' + arg
        + '> to be greater than <' + actual + '>');
    },

    isGreaterThanOrEqual: function(arg) {
      return matchHook(actual >= arg, 'Expected <' + actual
        + '> to be greater or equal to <' + arg + '>');
    },

    isLessThan: function(arg) {
      return matchHook(actual < arg, 'Expected <' + actual
        + '> to be less than <' + arg + '>');
    },

    isLessThanOrEqual: function(arg) {
      return matchHook(actual <= arg, 'Expected <' + actual
        + '> to be less or equal to <' + arg + '>');
    },

    isNumber: function() {
      return matchHook(typeof actual === 'number', 'Expected <' +
        actual + '> to be a number, but was a <' +
        typeof actual + '>');
    },

    isString: function() {
      return matchHook(typeof actual === 'string', 'Expected <' +
        actual + '> to be a string, but was a <' +
        typeof actual + '>');
    },

    isBoolean: function() {
      return matchHook(typeof actual === 'boolean', 'Expected <' +
        actual + '> to be a boolean, but was a <' +
        typeof actual + '>');
    },

    isType: function(type) {
      var actualType = Object.prototype.toString.call(actual);
      return matchHook(actualType === '[object ' +
        type + ']', 'Expected <' + type + ', but was a <' + actualType + '>');
    },

    isFunction: function() {
      return matchHook(typeof actual === 'function', 'Expected <' +
        actual + '> to be a function, but was a <' +
        typeof actual + '>');
    },

    isArray: function() {
      return matchHook(Array.isArray(actual), 'Expected <' +
        actual + '> to be an array like object type, but was a <' +
        typeof actual + '>');
    },

    isOfLength: function(arg) {
      var actualSize = Object.keys(actual).length;
      return matchHook(compare(actualSize, arg), 'Expected <' + arg + '> but ' +
        'was <' + actualSize + '>');
    },

    throws: function(exception) {
      try {
        actual.apply(thisArg, []);
      } catch (e) {
        if (exception) {
          return matchHook(compare(e, exception), 'Expected to throw <' +
            exception + '>, but thrown <' + e + '>');
        }
        return matchHook(true);
      }
      return matchHook(false, 'Expected to throw an exception');
    },

    throwsString: function(exception) {
      try {
        actual.apply(thisArg, []);
      } catch (e) {
        return matchHook(compare(e.toString(), exception), 'Expected to throw' +
          ' < ' + exception + '>, but thrown <' + e.toString() + '>');
      }
      return matchHook(false, 'Expected to throw an exception of type <' +
        exception + '>');
    },

    throwsOfType: function(exception) {
      try {
        actual.apply(thisArg, []);
      } catch (e) {
        return matchHook(e instanceof exception, 'Expected to throw <' +
          exception + '>, but thrown <' + e + '>');
      }
      return matchHook(false, 'Expected to throw an exception of type <' +
        exception + '>');
    },

    /**
     * @param func
     */
    isInvoked: function() {
      var name = actual.__name__ || '{}';
      matchHook(actual.__invoked__, 'Expected <' + name + '> to be invoked');
      // Reset the invoked flag.
      actual.__invoked__ = false;

      return {
        times: function(n) {
          var times = actual.__counter__;
          actual.__counter__ = 0;
          return matchHook(compare(n, times), 'Expected to be invoked < ' + n +
            '> times, but it was invoked <' + times + '> times');
        },

        with: function() {
          var invokedWith = Array.from(actual.__args__);
          var actualParams = Array.from(arguments);
          return matchHook(compare(actualParams, invokedWith), 'Expected <' +
            name + '> to be invoked with <' + JSON.stringify(actualParams) +
            '> but it was invoked with <' + JSON.stringify(invokedWith) + '>');
        },

        withNargs: function(numOfArgs) {
          var invokedWith = Array.from(actual.__args__);
          return matchHook(compare(invokedWith.length, numOfArgs),
            'Expected to be invoked with <' + numOfArgs + '> arguments, but ' +
            'it was invoked with <' + invokedWith.length + '> arguments');
        }
      };
    }
  };
};

function hook(suite, comment, async) {
  var listener = suite.listener;
  listener.onMatches(comment);

  var decorate = function(arg, failureComment) {
    if (!arg) {
      if (async) {
        async.fail(failureComment);
        return;
      } else {
        if (failureComment) {
          listener.onError(failureComment);
        }
        throw 'TestFailureException';
      }
    }
    return arg;
  };

  return {
    directMatch: function(arg, failureComment) {
      return decorate(arg, failureComment);
    },

    inverseMatch: function(arg, failureComment) {
      return decorate(!arg, failureComment);
    }
  };
}

var testCounter = 0;
var suiteCounter = 0;
function Test(suite, testId, comment, body, asyncFlag, data) {
  this.parent = suite;
  this.comment = comment;
  this.body = body;
  this.asyncFlag = asyncFlag;
  this.data = data;
  this.asyncExecuted = false;
  this.testCount = testCounter++;
  this.testId = testId;
}

Test.TestResult = {
  SUCCEEDED: 1,
  FAILED: 2,
  ERROR: 3,
  TIMEOUT: 4
};

Test.prototype = {

  getParent: function() {
    return this.parent;
  },

  run: function() {
    this.parent.listener.onTestStarted(this);
    try {
      if (this.asyncFlag) {
        var self = this;
        var timeout = setTimeout(function() {
          if (!self.asyncExecuted) {
            self.parent.listener.onTestCompleted(self, Test.TestResult.TIMEOUT);
            self.parent.handleNext(self, Test.TestResult.TIMEOUT);
          }
        }, TEST_TIMEOUT);
        var done = function(result) {
          var testResult = result || Test.TestResult.SUCCEEDED;
          clearTimeout(timeout);
          self.asyncExecuted = true;
          self.parent.listener.onTestCompleted(self, testResult);
          self.parent.handleNext(self, testResult);
        };
        var async = function(asyncBody, delay) {
          var asyncFunc = function() {
            try {
              asyncBody();
            } catch (e) {
              if (e == 'TestFailureException') {
                result = Test.TestResult.FAILED;
              } else {
                self.parent.listener.onError(e);
                result = Test.TestResult.ERROR;
              }
            } finally {
              done(result);
            }
          };
          if (delay) {
            setTimeout(asyncFunc, delay);
          } else {
            asyncFunc();
          }
        };
        async.done = function() {
          done();
        };
        async.fail = function(comment) {
          if (comment) {
            self.parent.listener.onError(comment);
          }
          try {
            // Throwing an exception stops the current execution flow.
            throw 'TestFailureException';
          } finally {
            done(Test.TestResult.FAILED);
          }
        };

        this.body(async, this.data);
      } else {
        this.body(this.data);
        var result = Test.TestResult.SUCCEEDED;
      }
    } catch (e) {
      if (e == 'TestFailureException') {
        result = Test.TestResult.FAILED;
      } else {
        this.parent.listener.onError(e);
        result = Test.TestResult.ERROR;
      }
    } finally {
      if (result) {
        if (this.asyncFlag) {
          clearTimeout(timeout);
        }
        this.parent.listener.onTestCompleted(this, result);
        this.parent.handleNext(this, result);
      }
    }
  }
};

function Suite() {
  this.errors = 0;
  this.successes = 0;
  this.failures = 0;
  this.executed = 0;
  this.timeouts = 0;
  this.tests = [];
  this.current = 0;
  this.collectTestsFunction = null;
  this.description = '';
  this.beforeFunction = null;
  this.afterFunction = null;
  this.beforeSuiteFunction = null;
  this.afterSuiteFunction = null;
  this.listener = null;
  this.suiteId = suiteCounter++;
  this.parent = null;
}

Suite.prototype = {

  getParent: function() {
    return this.parent;
  },

  _replaceFunc: function(func, functionName, object) {
    var replacingFunction = function() {
      var _ex = null;
      var thisFunction = arguments.callee;
      try {
        return func.apply(object, arguments);
      } catch (e) {
        _ex = e;
        throw e;
      } finally {
        object.__invoked__ = true;
        replacingFunction.__counter__++;
        //object.__name___ = object.
        thisFunction.__args__ = arguments;
        thisFunction.__invoked__ = true;
        thisFunction.__throws__ = _ex;
      }
    };
    replacingFunction.__name__ = functionName;
    replacingFunction.__invoked__ = false;
    replacingFunction.__counter__ = 0;
    return replacingFunction;
  },

  track: function(object) {
    object.__tracked__ = true;
    for (var property in object) {
      var func = object[property];
      if (typeof func === 'function') {
        object[property] = this._replaceFunc(func, property, object);
      }
    }
  },

  before: function(body, isAsync) {
    this.beforeFunction = body;
    this.beforeFunction.isAsync = isAsync || false;
  },

  after: function(body, isAsync) {
    this.afterFunction = body;
    this.afterFunction.isAsync = isAsync || false;
  },

  beforeSuite: function(body, isAsync) {
    this.beforeSuiteFunction = body;
    this.beforeSuiteFunction.isAsync = isAsync || false;
  },

  afterSuite: function(body) {
    this.afterSuiteFunction = body;
  },

  /**
   * @param {string} comment
   * @param {function} body
   * @param {function} provider
   */
  test: function(id, comment, body, provider) {
    this.pushTest(id, comment, body, provider, false);
  },

  asyncTest: function(id, comment, body, provider) {
    this.pushTest(id, comment, body, provider, true);
  },

  notest: function() {

  },

  noasyncTest: function() {
  },

  pushTest: function(id, comment, body, provider, asyncFlag) {
    var testId = id || 0;
    var description = testId > 0 ? testId + '. ' + comment : comment;
    if (provider) {
      var data = provider();
      if (Object.prototype.toString.call(data) == '[object Array]') {
        data.forEach(function(value) {
          var finalComment = description;
          if (value) {
            finalComment = description + (value.comment || '');
          }
          this.tests.push(
            new Test(this, testId, finalComment, body, asyncFlag, value));
        }, this);
      } else {
        var finalComment = description;
        if (data) {
          finalComment = description + (data.comment || '');
        }
        this.tests.push(new Test(this, testId, finalComment, body,
          asyncFlag, data));
      }
    } else {
      this.tests.push(new Test(this, testId, description, body, asyncFlag));
    }
  },

  next: function() {
    if (this.current >= this.tests.length) {
      this.end();
      return;
    }

    var nextUnitTest = this.tests[this.current++];
    if (this.beforeFunction) {
      if (this.beforeFunction.isAsync) {
        var self = this;
        var asyncHandler = {
          done: function() {
            setTimeout(function() {
              nextUnitTest.run(self.listener);
            }, 500);

          },
          fail: function(description) {
            throw description;
          }
        };
        this.beforeFunction(asyncHandler, nextUnitTest.testId,
          nextUnitTest.data);
        return;
      } else {
        this.beforeFunction(nextUnitTest.testId, nextUnitTest.data);
      }
    }

    nextUnitTest.run(this.listener);
  },

  handleNext: function(unit_test, result) {
    if (result) {
      this.executed++;
      if (result == Test.TestResult.SUCCEEDED) {
        this.successes++;
      } else if (result == Test.TestResult.FAILED) {
        this.failures++;
      } else if (result == Test.TestResult.ERROR) {
        this.errors++;
      } else if (result == Test.TestResult.TIMEOUT) {
        this.timeouts++;
      }
    }

    if (this.afterFunction) {
      if (this.afterFunction.isAsync) {
        var self = this;
        var asyncHandler = {
          done: function() {
            setTimeout(function() {
              self.next();
            }, 500);
          }
        };
        this.afterFunction(asyncHandler);
        return;
      } else {
        try {
          this.afterFunction();
          this.next();
        } catch (e) {
          this.listener.onError(e);
          this.end();
        }
      }
    } else {
      this.next();
    }
  },

  run: function(listener) {
    this.listener = listener || {};

    if (this.listener.onSuiteStarted) {
      this.listener.onSuiteStarted(this);
    }

    if (this.beforeSuiteFunction) {
      if (this.beforeSuiteFunction.isAsync) {
        var self = this;
        var asyncHandler = {
          done: function() {
            setTimeout(function() {
              self.next();
            }, 500);

          },
          fail: function(description) {
            throw description;
          }
        };
        this.beforeSuiteFunction(asyncHandler);
        return;
      } else {
        this.beforeSuiteFunction();
      }
    }

    this.next();
  },

  end: function() {
    if (this.listener.onSuiteCompleted) {
      this.listener.onSuiteCompleted(this);
    }
    if (this.afterSuiteFunction) {
      this.afterSuiteFunction();
    }
    if (this.parent) {
      this.parent.handleNext();
    }
  },

  addSuite: function(suite) {
    suite.parent = this;
    this.tests.push(suite);
  },

  onError: function(error) {
    this.errors++;
  },

  init: function(comment, collectTestFunction, autostart) {
    this.collectTestsFunction = collectTestFunction;
    this.description = comment;

    // Collect all unit tests.
    this.collectTestsFunction();
    if (autostart) {
      this.run({
        onTestStarted: function(unit_test) {
          console.log('[TEST ' + unit_test.comment + '] started');
        },

        onTestCompleted: function(unit_test, result) {
          console.log('[TEST ' + unit_test.comment + '] completed --> [' +
            result + ']');
        },

        onMatches: function(comment) {
          console.log(comment);
        },

        onError: function(error) {
          console.log(error);
        }
      });
    }
  }
};

function ListenerProxy(listeners) {
  this.listeners = listeners || [];
}

ListenerProxy.prototype = {

  delegate: function(methodName) {
    var parameters = Array.from(arguments).slice(1);
    this.listeners.forEach(function(listener) {
      if (listener[methodName]) {
        listener[methodName].apply(listener, parameters);
      }
    });
  },

  onSuiteStarted: function(suite) {
    this.delegate('onSuiteStarted', suite);
  },

  onSuiteCompleted: function(suite) {
    this.delegate('onSuiteCompleted', suite);
  },

  onTestStarted: function(test) {
    this.delegate('onTestStarted', test);
  },

  onTestCompleted: function(test, result) {
    this.delegate('onTestCompleted', test, result);
  },

  onMatches(comment) {
    this.delegate('onMatches', comment);
  },

  onError(e) {
    this.delegate('onError', e);
  }
};

function newSuite() {
  var suite = null;

  return {
    suite: function(comment, collectTestFunction) {
      if (suite == null) {
        suite = new Suite();
      } else {
        var newSuite = new Suite();
        suite.addSuite(newSuite);
        suite = newSuite;
      }
      var autostart = define == null;
      suite.init(comment, collectTestFunction, false);
      if (suite.parent) {
        suite = suite.parent;
      }
    },

    xsuite: function() {

    },

    afterSuite: function(body) {
      return suite.afterSuite(body);
    },

    beforeSuite: function(body, isAsync) {
      return suite.beforeSuite(body, isAsync);
    },

    before: function(body, isAsync) {
      return suite.before(body, isAsync);
    },

    after: function(body, isAsync) {
      return suite.after(body, isAsync);
    },

    test: function(id, comment, body, provider) {
      var _id = id;
      var _comment = comment;
      var _body = body;
      var _provider = provider;
      if (typeof id == 'string') {
        _id = undefined;
        _comment = id;
        _body = comment;
        _provider = body;
      }
      return suite.test(_id, _comment, _body, _provider);
    },

    asyncTest: function(id, comment, body, provider) {
      var _id = id;
      var _comment = comment;
      var _body = body;
      var _provider = provider;
      if (typeof id == 'string') {
        _id = undefined;
        _comment = id;
        _body = comment;
        _provider = body;
      }
      return suite.asyncTest(_id, _comment, _body, _provider);
    },

    noasyncTest: function() {
      return suite.noasyncTest();
    },

    run: function() {
      var listeners = Array.from(arguments);
      suite.run(new ListenerProxy(listeners));
    },

    notest: function() {
      return suite.notest();
    },

    track: function(obj) {
      return suite.track(obj);
    },

    matcher: function(comment, actual, thisArg) {
      return matcher(suite, comment, actual, thisArg);
      /*var hookObj = hook(suite, comment, async);
      var matchObject = new Matcher(suite, actual, hookObj.directMatch,
        thisArg);
      matchObject['not'] = new Matcher(suite, actual, hookObj.inverseMatch,
        thisArg);
      matchObject['and'] = new Matcher(suite, actual, hookObj.andMatch,
        thisArg);
      return matchObject;*/
    },

    asyncMatcher: function(async, comment, actual, thisArg) {
      return matcher(suite, comment, actual, thisArg, async);
      /*var hookObj = hook(suite, comment, async);
      var matchObject = new Matcher(suite, actual, hookObj.directMatch,
        thisArg);
      matchObject['not'] = new Matcher(suite, actual, hookObj.inverseMatch,
        thisArg);
      matchObject['and'] = new Matcher(suite, actual, hookObj.andMatch,
        thisArg);
      return matchObject;*/
    }
  };
}

function matcher(suite, comment, actual, thisArg, async) {
  var hookObj = hook(suite, comment, async);
  var matchObject = new Matcher(suite, actual, hookObj.directMatch,
    thisArg);
  matchObject['not'] = new Matcher(suite, actual, hookObj.inverseMatch,
    thisArg);
  matchObject['and'] = new Matcher(suite, actual, hookObj.andMatch,
    thisArg);
  return matchObject;
}

if (define) {
  define('Suites', [], function() {
    // Exports 'newSuite function', to be called from test modules.
    return {
      newSuite: newSuite
    };
  });
} else {
  module.exports = {
    newSuite: newSuite
  };
}
/*} else {
  var suiteObj = newSuite();
  var suite = suiteObj.suite;
  var test = suiteObj.test;
  var notest = suiteObj.notest;
  var asyncTest = suiteObj.asyncTest;
  var noasyncTest = suiteObj.noasyncTest;
  var after = suiteObj.after;
  var matcher = suiteObj.matcher;
  var track = suiteObj.track;
}*/

/*if (suiteObj) {

  suite('Auto testing...', function() {
    test('Test 1', function() {
      matcher('Comparing equals strings', 'hello').isEqual('hello');
      matcher('Comparing not equal strings', 'hello').not.isEqual('world');
      matcher('Comparing equal numbers', 1).isEqual(1);
      matcher('Comparing not equal numbers', 1).not.isEqual(2);
      matcher('Comparing equal booleans', true).isEqual(true);
      matcher('Comparing not equal booleans', true).not.isEqual(false);
      matcher('Comparing undefineds', undefined).isEqual(undefined);
      matcher('Comparing undefined with non undefined', undefined)
        .not.isEqual(3);
      matcher('Comparing nulls', null).isEqual(null);
      matcher('Comparing nulls with not null', null).not.isEqual(3);

      //    matcher('Comparing equal exceptions', new Error('An error')).not.isEqual(
      //    new Error('An error'));

      //matcher('Comparing not equal exceptions', new Error('An error')).isEqual(
      //        new Error('Another error'));

      matcher('Comparing empty objects', {}).isEqual({});
      matcher('Comparing simple objects', { key1: 1, key2: true }).
        isEqual({ key1: 1, key2: true });
      matcher('Comparing simple objects with different key order',
        { key1: 1, key2: true }).isEqual({ key2: true, key1: 1 });
      matcher('Comparing simple objects with differnt key order',
        { key1: 1, key2: true }).isEqual({ key2: true, key1: 1 });

      matcher('Comparing comples objects',
        { key1: 1, key2: true, key3: { a: true, b: 4 } }).
        isEqual({ key3: { a: true, b: 4 }, key2: true, key1: 1 });

      matcher('Comparing empty arrays', []).isEqual([]);
      matcher('Comparing arrays of ints', [1, 2]).isEqual([1, 2]);
      matcher('Comparing arrays of objects', [{ a: 1, b: 2 }, { a: 3, b: 4 }]).
        isEqual([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
      //matcher('Comparing null with undefined', undefined).not.isEqual(null);
    });

  });

}*/


