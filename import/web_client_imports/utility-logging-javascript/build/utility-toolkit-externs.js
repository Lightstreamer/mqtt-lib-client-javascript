BrowserDetection = {};
BrowserDetection.isProbablyRekonq;
BrowserDetection.isProbablyChrome = function() {};
BrowserDetection.isProbablyAWebkit = function() {};
BrowserDetection.isProbablyPlaystation = function() {};
BrowserDetection.isProbablyAndroidBrowser = function() {};
BrowserDetection.isProbablyOperaMobile = function() {};
BrowserDetection.isProbablyApple = function() {};
BrowserDetection.isProbablyAKhtml = function() {};
BrowserDetection.isProbablyKonqueror = function() {};
BrowserDetection.isProbablyIE = function() {};
BrowserDetection.isProbablyFX = function() {};
BrowserDetection.isProbablyOldOpera = function() {};
  
CookieManager = {};
CookieManager.areCookiesEnabled = function() {};
CookieManager.getAllCookiesAsSingleString = function() {};
CookieManager.writeCookie = function() {};
CookieManager.removeCookie = function() {};
CookieManager.readCookie = function() {};

Dismissable = function() {}; 
Dismissable.prototype.touch = function() {};
Dismissable.prototype.dismiss = function() {};
Dismissable.prototype.clean = function() {};
Dismissable.prototype.initTouches = function() {};

DoubleKeyMap = function() {}; 
DoubleKeyMap.prototype.set = function() {};
DoubleKeyMap.prototype.remove = function() {};
DoubleKeyMap.prototype.removeReverse = function() {};
DoubleKeyMap.prototype.get = function() {};
DoubleKeyMap.prototype.getReverse = function() {};
DoubleKeyMap.prototype.exist = function() {};
DoubleKeyMap.prototype.existReverse = function() {};
DoubleKeyMap.prototype.forEach = function() {};
DoubleKeyMap.prototype.forEachReverse = function() {};

DoubleKeyMatrix = function() {}; 
DoubleKeyMatrix.prototype.insert = function() {};
DoubleKeyMatrix.prototype.del = function() {};
DoubleKeyMatrix.prototype.delReverse = function() {};
DoubleKeyMatrix.prototype.delRow = function() {};

Environment = {};
Environment.isBrowserDocument = function() {};
Environment.isBrowser = function() {};
Environment.isNodeJS = function() {};
Environment.isWebWorker = function() {};
Environment.browserDocumentOrDie = function() {};

EnvironmentStatus = {};
EnvironmentStatus.addOnloadHandler = function() {};
EnvironmentStatus.addUnloadHandler = function() {};
EnvironmentStatus.addBeforeUnloadHandler = function() {};
EnvironmentStatus.removeOnloadHandler = function() {};
EnvironmentStatus.removeUnloadHandler = function() {};
EnvironmentStatus.removeBeforeUnloadHandler = function() {};

EventDispatcher = function() {}; 
EventDispatcher.prototype.initDispatcher = function() {};
EventDispatcher.prototype.addListener = function() {};
EventDispatcher.prototype.removeListener = function() {};
EventDispatcher.prototype.getListeners = function() {};
EventDispatcher.prototype.useSynchEvents = function() {};
EventDispatcher.prototype.dispatchEvent = function() {};

Executor = {};
Executor.getQueueLength = function() {};
Executor.packTask = function() {};
Executor.addPackedTimedTask = function() {};
Executor.addRepetitiveTask = function() {};
Executor.stopRepetitiveTask = function() {};
Executor.addTimedTask = function() {};
Executor.modifyTaskParam = function() {};
Executor.modifyAllTaskParams = function() {};
Executor.delayTask = function() {};
Executor.executeTask = function() {};

ExecutorSimple = {};
ExecutorSimple.getQueueLength = function() {};
ExecutorSimple.packTask = function() {};
ExecutorSimple.addPackedTimedTask = function() {};
ExecutorSimple.addRepetitiveTask = function() {};
ExecutorSimple.stopRepetitiveTask = function() {};
ExecutorSimple.addTimedTask = function() {};
ExecutorSimple.modifyTaskParam = function() {};
ExecutorSimple.modifyAllTaskParams = function() {};
ExecutorSimple.delayTask = function() {};
ExecutorSimple.executeTask = function() {};

Helpers = {};
Helpers.getTimeStamp = function() {};
Helpers.randomG = function() {};
Helpers.trim = function() {};
Helpers.getNumber = function() {};
Helpers.isArray = function() {};
Helpers.addEvent = function() {};

IFrameHandler = {};
IFrameHandler.createFrame = function() {};
IFrameHandler.getFrameWindow = function() {};
IFrameHandler.disposeFrame = function() {};
IFrameHandler.removeFrames = function() {};

Inheritance =  function() {};
Inheritance._super_ =  {};
Inheritance._callSuperConstructor =  function() {};
Inheritance._callSuperMethod =  function() {};

List = function() {}; 
List.prototype.add = function() {};
List.prototype.remove = function() {};
List.prototype.forEach = function() {};
List.prototype.asArray = function() {};
List.prototype.clean = function() {};

Matrix = function() {}; 
Matrix.prototype.insert = function() {}; 
Matrix.prototype.get = function() {};
Matrix.prototype.del = function() {};
Matrix.prototype.insertRow = function() {};
Matrix.prototype.getRow = function() {};
Matrix.prototype.delRow = function() {};
Matrix.prototype.getEntireMatrix = function() {};

Setter = {};
Setter.checkPositiveNumber = function() {};
Setter.checkBool = function() {};