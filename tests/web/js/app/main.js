define(['allSuites', 'LoggerManager', 'SimpleLoggerProvider',
  'ConsoleAppender', 'LogMessages'], function(allSuites, LoggerManager,
  SimpleLoggerProvider, ConsoleAppender, LogMessages) {

  // Configuring the Scenario for execution of unit or integration tests,
  // on the basis of the provided query parameter.

  var loggerProvider = new SimpleLoggerProvider();
  loggerProvider.addLoggerAppender(new ConsoleAppender('DEBUG', 'docker'));
  loggerProvider.addLoggerAppender(new ConsoleAppender('DEBUG', 'mqtt.cool'));
  loggerProvider.addLoggerAppender(
    new ConsoleAppender('DEBUG', 'mqtt.cool.test'));
  loggerProvider.addLoggerAppender(
    new ConsoleAppender('DEBUG', 'mqtt.cool.store'));

  //loggerProvider.addLoggerAppender(new ConsoleAppender('DEBUG', '*'));

  LoggerManager.setLoggerProvider(loggerProvider);
  var logger = LoggerManager.getLoggerProxy('mqtt.cool.test');
  logger.debug('Starting suites...');

  var totalExecuted = 0;
  var totalSuccesses = 0;
  var totalFailures = 0;
  var totalErrors = 0;
  var totalTimeouts = 0;
  var testCounter = 0;

  // The CONSOLE Listener
  var consoleListener = {
    onSuiteStarted: function(suite) {
      logger.debug('[SUITE <' + suite.description + '> started');
    },

    onSuiteCompleted: function(suite) {
      logger.info('[SUITE <' + suite.description + '> completed');
      totalExecuted += suite.executed;
      totalSuccesses += suite.successes;
      totalFailures += suite.failures;
      totalErrors += suite.errors;
      totalTimeouts += suite.timeouts;
      testCounter++;
    },

    onTestStarted(test) {
      logger.info('[TEST <' + test.comment + '> started');
    },

    onTestCompleted(test, result) {
      var r = ['', 'OK', 'Failed!', 'Error!', 'Timed out!'];
      var testReport = '[TEST <' + test.comment + '> completed -->['
          + r[result] + ']';

      if (result !== 1) {
        logger.error(testReport);
      } else {
        logger.info(testReport);
      }
    },

    onMatches(comment) {
      logger.info(comment);
    },

    onError(e) {
      logger.error(e);
    }
  };

    // The HTML Listener
  var htmlListener = {

    onSuiteStarted: function(suite) {
      var suitesRoot = document.getElementById('suites');
      if (suite.getParent()) {
        suitesRoot = document.getElementById('suite_' + suite.getParent()
          .suiteId);
      }
      var suiteElement = document.createElement('div');
      suiteElement.setAttribute('id', 'suite_' + suite.suiteId);
      if (suite.getParent()) {
        suiteElement.className = 'test_container';
      }
      suitesRoot.appendChild(suiteElement);

      var suiteHeaderElement = document.createElement('div');

      var suiteHeaderDescriptionElement = document.createElement('div');
      suiteHeaderElement.appendChild(suiteHeaderDescriptionElement);
      suiteHeaderDescriptionElement.className = 'suite_description';
      suiteHeaderDescriptionElement.appendChild(document.createTextNode(
        suite.description));

      var suiteHeaderResultElement = document.createElement('div');
      suiteHeaderElement.appendChild(suiteHeaderResultElement);
      suiteHeaderResultElement.setAttribute('id', 'suite_' + suite.suiteId +
          '_result');
      suiteHeaderResultElement.className = 'suite_result';

      suiteElement.appendChild(suiteHeaderElement);
    },

    onSuiteCompleted: function(suite) {
      if (suite.executed > 0) {
        var suiteHeaderResultElement = document.getElementById('suite_' +
            suite.suiteId + '_result');

        var report = 'Executed (' + suite.executed + '), Successes (' +
            suite.successes + '),' + ' Failures (' + suite.failures + '), ' +
            'Errors (' + suite.errors + '), Timeouts (' + suite.timeouts + ').';

        suiteHeaderResultElement.appendChild(document.createTextNode(report));
      }
    },

    onTestStarted(test) {
      var suite = document.getElementById('suite_' + test.getParent()
        .suiteId);
      var testContainer = document.createElement('div');
      testContainer.setAttribute('id', 'test_' + test.testCount);
      testContainer.setAttribute('class', 'test_container');

      var comment = document.createElement('div');
      comment.setAttribute('class', 'test_comment');
      testContainer.appendChild(comment);
      var textComment = document.createTextNode(test.comment);
      comment.appendChild(textComment);

      var result = document.createElement('div');
      result.setAttribute('class', 'test_result');
      result.setAttribute('id', 'test_' + test.testCount + '_result');
      testContainer.appendChild(result);

      suite.appendChild(testContainer);
    },

    onTestCompleted(test, result) {
      var r = ['', 'OK', 'Failed!', 'Error!', 'Timed out!'];
      var testReport = '[TEST <' + test.comment + '> completed -->['
          + r[result] + ']';

      var currentResult = document.getElementById('test_' + test.testCount +
          '_result');
      if (result !== 1) {
        currentResult.setAttribute('class', 'test_result failure');
      } else {
        currentResult.setAttribute('class', 'test_result ok');
      }
      currentResult.appendChild(document.createTextNode(r[result]));
      window.location.href = '#bottomlink';
    }
  };

  var suiteCounter = 0;

  // The TestRunner
  var testRunner = {

    onSuiteCompleted: function(suite) {
      if (suite.parent != null) {
        return;
      }
      suiteCounter++;
      if (suiteCounter < allSuites.length) {
        var self = this;
        setTimeout(function() {
          allSuites[suiteCounter].run(consoleListener, htmlListener, self);
        }, 100);
      } else {
        logger.logInfo('Executed:', totalExecuted);
        logger.logInfo('Successes:', totalSuccesses);
        logger.logInfo('Failures:', totalFailures);
        logger.logInfo('Errors:', totalErrors);
        logger.logInfo('Timeouts:', totalTimeouts);
        if (totalFailures == 0 && totalErrors == 0) {
          logger.info('All test passed');
        }
        console.log('TESTS OVER');
        //process.exitCode = 0;
        //process.exit();
      }
    }
  };

  if (allSuites.length > 0) {
    allSuites[0].run(consoleListener, htmlListener, testRunner);
  } else {
    logger.warn('No suite to start');
  }
});

