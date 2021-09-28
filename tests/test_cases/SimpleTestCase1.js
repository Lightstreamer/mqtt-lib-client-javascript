define(['LoggerManager', '../suites'],
  function(LoggerManager, suites) {
    var simpleSuite = suites.newSuite();
    var suite = simpleSuite.suite;
    var before = simpleSuite.before;
    var beforeSuite = simpleSuite.beforeSuite;
    var after = simpleSuite.after;
    var test = simpleSuite.test;
    var xtest = simpleSuite.notest;
    var asyncTest = simpleSuite.asyncTest;
    var noasyncTest = simpleSuite.noasyncTest;
    var matcher = simpleSuite.matcher;

    suite('Suite test 1', function() {

      beforeSuite(function() {
        console.log('Before suite');
      });

      before(function() {
      });

      after(function() {
        //throw new Error('Error in after()!');
      });

      test('Auto test', function() {
        matcher('Comparing equals strings', 'hello').isEqual('hello');
        matcher('Comparing not equal strings', 'hello').not.isEqual('world');
        matcher('Comparing equal numbers', 1).isEqual(1);
        matcher('Comparing not equal numbers', 1).not.isEqual(2);
        matcher('Comparing equal booleans', true).isEqual(true);
        matcher('Comparing not equal booleans', true).not.isEqual(false);
        matcher('Comparing undefined', undefined).isEqual(undefined);
        matcher('Comparing undefined with non undefined', undefined).not.
          isEqual(3);
        matcher('Comparing nulls', null).isEqual(null);
        matcher('Comparing nulls with not null', null).not.isEqual(3);
        matcher('Comparing null with undefined', undefined).not.isEqual(null);

        matcher('Comparing equal exceptions', new Error('An error')).isEqual(
          new Error('An error'));

        matcher('Comparing not equal exceptions', new Error('An error')).not.
          isEqual(new Error('Another error'));

        matcher('Comparing empty objects', {}).isEqual({});
        matcher('Comparing simple objects', { key1: 1, key2: true }).
          isEqual({ key1: 1, key2: true });
        matcher('Comparing simple objects with different key order',
          { key1: 1, key2: true }).isEqual({ key2: true, key1: 1 });
        matcher('Comparing simple objects with different key order',
          { key1: 1, key2: true }).isEqual({ key2: true, key1: 1 });

        matcher('Comparing comples objects',
          { key1: 1, key2: true, key3: { a: true, b: 4 } }).
          isEqual({ key3: { a: true, b: 4 }, key2: true, key1: 1 });

        matcher('Comparing empty arrays', []).isEqual([]);
        matcher('Comparing arrays of ints', [1, 2]).isEqual([1, 2]);
        matcher('Comparing arrays of objects', [
          { a: 1, b: 2 },
          { a: 3, b: 4 }]).isEqual([{ a: 1, b: 2 }, { a: 3, b: 4 }]);

      });

      xtest('Unit test', function() {
        matcher('Trivial match 1', true).is(true);
        matcher('Trivial match 2', true).is(true);
      });

      xtest('Second unit test', function() {
        matcher('Trivial match 3', true).is(true);
      });

      noasyncTest('Asynchronous test', function(async) {
        matcher('Trivial match 4', true).is(true);
        async(function() {
          matcher('Trivial match in async function', true).is(true);
        }, 1000);
      });

      noasyncTest('Asynchronous test with immediate failure',
        function(async) {
          matcher('Trivial match 5', true).is(false);
          async(function() {
          }, 1000);
        });

      noasyncTest('Asynchronous test with delayed failure',
        function(async) {
          async(function() {
            matcher('Trivial match 6', true).not.is(true);
          }, 1000);
        });

      noasyncTest('Asynchronous test with delayed error',
        function(async) {
          async(function() {
            throw 'Fake error';
          }, 1000);
        });

      noasyncTest('Asynchronous test with no delay, goes in timeout',
        function() {
          matcher('Trivial match 7', true).is(true);
        });

      noasyncTest('Asynchronous test with explicit termination',
        function(async) {
          matcher('Trivial match 8', true).is(true);
          async.done();
        });
    });

    return simpleSuite;
  });





