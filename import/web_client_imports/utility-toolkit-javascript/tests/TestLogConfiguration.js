define(["weswit/SimpleLoggerProvider","weswit/ConsoleAppender","weswit/LoggerManager"], 
  function(SimpleLoggerProvider,ConsoleAppender,LoggerManager) {
    var log = LoggerManager.getLoggerProxy("weswit.test");
  
    var loggerProvider = new SimpleLoggerProvider();
    LoggerManager.setLoggerProvider(loggerProvider);
   
    try {
      var myAppender = new ConsoleAppender("DEBUG","weswit.test");
      loggerProvider.addLoggerAppender(myAppender);
    } catch(exc) {
      require(["weswit/DOMAppender"],function(DOMAppender) {
        var container = document.createElement("div");
        document.getElementsByTagName("body")[0].appendChild(container);
        var myAppender = new DOMAppender("DEBUG","weswit.test",container);
        loggerProvider.addLoggerAppender(myAppender);
      });
    }
    
    return log;
});
