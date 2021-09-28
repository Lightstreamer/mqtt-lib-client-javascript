define(['LoggerManager', '../suites'],
  function(LoggerManager, suites) {

    var simpleSuite = suites.newSuite();
    //var simpleSuite = a.suite;
    var suite = simpleSuite.suite;
    var before = simpleSuite.before;
    var beforeSuite = simpleSuite.beforeSuite;
    var afterSuite = simpleSuite.afterSuite;
    var after = simpleSuite.after;
    var test = simpleSuite.test;
    var matcher = simpleSuite.matcher;

    suite('Suite test 1', function() {
      beforeSuite(function() {
        console.log('Executing beforeSuite for Suite test1...');
      });

      before(function() {
        console.log('Executing before...');
      });

      after(function() {
        console.log('Executing after...');
        //throw new Error('Error in after()!');
      });

      suite('Nested suite 1', function() {
        beforeSuite(function() {
          console.log('Executing beforeSuite for Nested test1...');
        });

        afterSuite(function() {
          console.log('Executing afterSuite for Nested test2...');
        });

        before(function() {
          console.log('Executing before Nested...');
        });

        test('Nested Unit Test 1', function() {
          matcher('Trivial match Nested 1', true).is(true);
        });

        test('Nested Unit Test 2', function() {
          matcher('Trivial match Nested 2', true).is(true);
        });

        after(function() {
          console.log('Executing after Nested...');
          //throw new Error('Error in after()!');
        });
      });

      test('Unit test', function() {
        matcher('Trivial match 4', true).is(true);
        matcher('Trivial match 5', true).is(true);
      });

      test('Second unit test', function() {
        matcher('Trivial match 6', true).is(true);
      });
    });

    return simpleSuite;
  });



