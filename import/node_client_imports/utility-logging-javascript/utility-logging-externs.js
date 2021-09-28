AlertAppender = function() {};
AlertAppender.prototype.log = function() {};

BufferAppender = function() {};
BufferAppender.prototype.reset = function() {};
BufferAppender.prototype.getLog = function() {};
BufferAppender.prototype.extractLog = function() {};
BufferAppender.prototype.log = function() {};
BufferAppender.prototype.getLength = function() {};

ConsoleAppender = function() {};
ConsoleAppender.prototype.log = function() {};  

DOMAppender = function() {};
DOMAppender.prototype.setUseInnerHtml = function() {};
DOMAppender.prototype.setNextOnTop = function() {};
DOMAppender.prototype.log = function() {};

FunctionAppender = function() {};
FunctionAppender.prototype.log = function() {};  

LoggerManager = {};
LoggerManager.setLoggerProvider = function() {};
LoggerManager.getLoggerProxy = function() {};
LoggerManager.resolve = function() {};

LoggerProxy = function() {};
LoggerProxy.prototype.debug = function() {};
LoggerProxy.prototype.isDebugLogEnabled = function() {};
LoggerProxy.prototype.logDebug = function() {};
LoggerProxy.prototype.info = function() {};
LoggerProxy.prototype.isInfoLogEnabled = function() {};
LoggerProxy.prototype.logInfo = function() {};
LoggerProxy.prototype.warn = function() {};
LoggerProxy.prototype.isWarnEnabled = function() {};
LoggerProxy.prototype.logWarn = function() {};
LoggerProxy.prototype.error = function() {};
LoggerProxy.prototype.isErrorEnabled = function() {};
LoggerProxy.prototype.logError = function() {};
LoggerProxy.prototype.logErrorExc = function() {};
LoggerProxy.prototype.fatal = function() {};
LoggerProxy.prototype.isFatalEnabled = function() {};
LoggerProxy.prototype.logFatal = function() {};

SimpleLogAppender = function() {};
SimpleLogAppender.prototype.log = function() {};
SimpleLogAppender.prototype.setLoggerProvider = function() {};
SimpleLogAppender.prototype.composeLine = function() {};
SimpleLogAppender.prototype.getLevel = function() {};
SimpleLogAppender.prototype.setLevel = function() {};
SimpleLogAppender.prototype.getCategoryFilter = function() {};
SimpleLogAppender.prototype.setCategoryFilter = function() {};

SimpleLogger = function() {};
SimpleLogger.prototype.fatal = function() {};
SimpleLogger.prototype.isFatalEnabled = function() {};
SimpleLogger.prototype.error = function() {};
SimpleLogger.prototype.isErrorEnabled = function() {};
SimpleLogger.prototype.warn = function() {};
SimpleLogger.prototype.isWarnEnabled = function() {};
SimpleLogger.prototype.info = function() {};
SimpleLogger.prototype.isInfoEnabled = function() {};
SimpleLogger.prototype.debug = function() {};
SimpleLogger.prototype.isDebugEnabled = function() {};
SimpleLogger.prototype.setLevel = function() {};

SimpleLoggerProvider = function() {};
SimpleLoggerProvider.prototype.addLoggerAppender = function() {};
SimpleLoggerProvider.prototype.removeLoggerAppender = function() {};
SimpleLoggerProvider.prototype.getLogger = function() {};
SimpleLoggerProvider.prototype.dispatchLog = function() {};

SimpleLogLevels = function() {};
SimpleLogLevels.priority = function() {};