var baseLogger = 'mqtt.cool';
define(['allSuites', 'LoggerManager', 'SimpleLoggerProvider',
  'ConsoleAppender'],
function(allSuites, LoggerManager, SimpleLoggerProvider, ConsoleAppender) {
  var logLevel = 'DEBUG';
  var loggerProvider = new SimpleLoggerProvider();
  loggerProvider.addLoggerAppender(new ConsoleAppender(logLevel, 'docker'));
  loggerProvider.addLoggerAppender(new ConsoleAppender(logLevel, baseLogger));
  loggerProvider.addLoggerAppender(new ConsoleAppender(logLevel, baseLogger
    + '.test'));
  loggerProvider.addLoggerAppender(new ConsoleAppender('WARN', baseLogger
    + '.store'));

  //loggerProvider.addLoggerAppender(new ConsoleAppender('DEBUG', '*'));
  //loggerProvider.addLoggerAppender(new ConsoleAppender(logLevel, 'weswit.test'));
  //lightstreamer.actions
  //loggerProvider.addLoggerAppender(new ConsoleAppender("DEBUG",
  //"lightstreamer.actions"));

  LoggerManager.setLoggerProvider(loggerProvider);
  var logger = LoggerManager.getLoggerProxy(baseLogger + '.test');
  logger.info('Starting suites...');

  var totalExecuted = 0;
  var totalSuccesses = 0;
  var totalFailures = 0;
  var totalErrors = 0;
  var totalTimeouts = 0;
  var testCounter = 0;

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
      logger.debug('[TEST <' + test.comment + '> started');
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
      logger.debug(comment);
    },

    onError(e) {
      logger.error(e);
    }
  };

  var suiteCounter = 0;
  var testRunner = {

    onSuiteCompleted: function(suite) {
      if (suite.parent != null) {
        return;
      }
      suiteCounter++;
      if (suiteCounter < allSuites.length) {
        var self = this;
        setTimeout(function() {
          allSuites[suiteCounter].run(consoleListener, self);
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
        process.exitCode = 0;
        process.exit();
      }
    }
  };

  if (allSuites.length > 0) {
    allSuites[0].run(consoleListener, testRunner);
  } else {
    logger.warn('No suite to start');
  }
});

