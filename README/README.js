//NOTE: these conventions relies on Lightstreamer utility toolkit and logging. If you include the Lightstreamer client library you already have these libraries. We also rely on
//an AMD loader. require.js is suggested but is not mandatory.
//ref:
//https://github.com/Lightstreamer/utility-toolkit-javascript
//https://github.com/Lightstreamer/utility-logging-javascript
//http://requirejs.org/

//We currently compile the Lightstreamer library using Google Closure Compiler in advanced mode: this introduce other conventions also traced on this file.
//https://github.com/google/closure-compiler

//BEFORE WE START
//use soft tabs instead of using tabs (size 2)
//always use '{' and '}' even if the block only contains 1 single command and keep the '{' in-line 
//when declaring several variables use the var keyword for each of them. The minification process will take care of them

//LET'S BEGIN:
//First create a .js file named as the class you're going to write, eg MyClass.js
//Then create a define call like this (it is an AMD module). The define will have two params,
//the first one is the list of dependencies, while the second is a callback to be loaded when 
//all the dependencies are solved. The callback will receive as params the required classes.
//Dependencies that live in the same folder as this class are included using ./ 
//Dependencies living in different folders must be traced as shown. Dependencies from the toolit/logging 
//are referenced only by name
//Keep classes meant to be instantiated by the user at level 0 (otherwise a generalized flattening of the library will be required) 

/**WARNING: the "define(" pattern is used by the generator to split the lib in pieces, NEVER put the same pattern in the sources (excluding were stated to do so in this document)**/

define(["./ParentClass","./AnotherClass","../subpackage/AThirdClass","Inheritance"], 
    function(ParentClass,AnotherClass,AThirdClass,Inheritance){
  
  //***PRIVATE - STATIC
  //You can use private static variables and methods
  var staticVar = 2;
  function staticMethod() {
  }
  
  //***CONSTRUCTOR
  //Declare your class constructor
  var MyClass = function(p1,p2,p3) {
    //to call the superconstructor call
    this._callSuperConstructor(MyClass,[p1,p2]);
    
    //property are automatically public but you can use'em as private as long as 
    //external code does not access them directly; declare the scope to specify if a property is public or not 
    //(event thought this will not change the behavior of the variable). 
    //a public property
    /*public*/ this.instanceProperty = p3;
    //another public property
    /*public*/ this.anotherProp = new AThridClass("hi");
    //a "private" property
    /*private*/ this.privateProp = 34;
    
    //actually the above properties are public, putting a comment saying a property is private only helps reading the code: in any case 
    //direct access to properties from other classes is highly discouraged; use getters and setters pls. The closure compiler will
    //optimize them anyway.
   
    //then do whatever you like
    
  };
  
  //***PUBLIC - STATIC
  //You can declare public static methods/properties now
  MyClass.staticProperty = 6;
  MyClass.staticMethod = function(p1) {
    //do something :)
  };
  
  //***PUBLIC - NON-STATIC
  //You can declare then non-static public methods.
  //We use to declare PRIVATE NON-STATIC methods the same way by marking them as private 
  //(this will not prevent the usage of such private methods from outside, but the mark
  //will instruct others not to do that). A pattern to create private non-static methods 
  //exist but, in my humble opinion, makes the code less readable, so this is not discussed here
  MyClass.prototype = {

    //Let's declare a public method (that's not part of the APIs)
    /**
     * @private
     */
    /*public*/ instanceMethod: function(p1, p2, p3){
      //to call the super method call
      this._callSuperMethod(MyClass,'instanceMethod',[p1,p2]);
      
      //NOTE CLOSURE COMPILER: the string instanceMethod will not be changed by the closure compiler
      //this means that if the instanceMethod name is obfuscated the above call will not work.
      //There is an easy fix, in the private static section of the class add the following
      //code:
      /*
       var names = {
        instanceMethod: "instanceMethod"
         //other names
       };
       names = Utils.getReverse(names); 
      */
      //then change the super calls like this:
      //this._callSuperMethod(MyClass,names['instanceMethod'],[p1,p2]);
      
      //NOTE: Utils.getRevers is not part of the public toolkit, it's pretty easy though:
      /*
       getReverse: function(map) {
        var res = {};
        for (var i in map) {
          res[map[i]] = i;
        }
        return res;
       } 
      */
      
      
      //do stuff
    },
    
    //Let's declare a public method (that's part of the APIs)
    /**
     * Documentation here (as described by the jsdoc documentation)
     */
    apiMethod: function() {
      //do stuff
    },
    
    //And a private one
    /**
     * @private
     */
    /*private*/ anotherMethod: function(p1,p2) {
      //do more stuff
    },
    
    /**
     * @private
     */
    /*private*/ dispatchEvent: function(p1) {
      //You might need to call a method on an instance that is 
      //generated on the outside. Classic example, you declare an interface
      //and an instance implementing such interface is given to you.
      //When a call to such method is performed you have two possibilities:
      
      //1 use a string to call the method
      this.listener["methodToCall"](p1);
      
      //2 use the Dispacther from the Lightstreamer toolkit (see the Dispatcher doc for further details)
      this.dispatchEvent("methodToCall",[p1]);
      
    }
    
    //more methods...
    
  };
  
  
  //***EXTENSION
  //this class extends a class ParentClass, think to this as an extension as java does
  Inheritance(MyClass,ParentClass);
  
  //this class copies methods from another class AnotherClass (this technique is known as mixin)
  //NOTE that the constructor will not be copied (and thus will not be available at all) and that 
  //colliding methods will not be copied.
  Inheritance(MyClass, AnotherClass, true);
  
  //when mixing in or extending classes from the another library that was obfuscated using the closure 
  //compiler add the checkAlias flag to the Inheritance call
  Inheritance(MyClass, Dismissable, true, true);
  Inheritance(MyClass, BufferAppender, false, true);
  
  //To prevent closure compiler from obfuscating the methods that will be part of the api we have
  //to add "exports" to our class declaration (this is official google closure stuff)
  MyClass.prototype["apiMethod"] = MyClass.prototype.apiMethod;
    //seems useless, but you have to consider that "apiMethod" will not be changed while apiMethod will be obfuscated
  
  
  //**DONE!
  //finally return the class
  return MyClass;


});


//In case the class you wrote is going to be part of the API you also have to make the class JSDoc friendly. Us the jsdoc
//guides: 
// http://usejsdoc.org/
//NOTE: JSDoc will easily identify static methods (documenting only the public ones) but, for obvious reasons will be unable
//to distinguish our non-static private methods: use the @private tag in their jsdoc to help it.

//***USE THE LOGGER
//If needed you can include LoggerManager in the define requirements and then get a logger.
//Most of the logger instances are declared as private static instances and have standard names. 
//This is not mandatory but may result useful when searching for log lines
var actionsLogger = LoggerManager.getLoggerProxy("lightstreamer.actions");
var sharingLogger = LoggerManager.getLoggerProxy("lightstreamer.sharing");
//NOTE: If working on the Lightstreamer JS client library you can (and should) get the categories from the Constants module 
var sharingLogger = LoggerManager.getLoggerProxy(Constants.SHARING);

//you will log like this:
actionsLogger.logDebug("my message for the log",p1,p2,p3); //put as many parameters as you want
//if in need to send an exception to the logger use the appropriate methods.
sharingLogger.logErrorExc(exc,"my error message whatever",p1,p2,p3); //currently this is only implemented on the error level 

//during build the above log lines might be transformed in something like this:
/*actionsLogger.logDebug(LoggerManager.resolve(666),p1,p2,p3);
sharingLogger.logErrorExc(exc,LoggerManager.resolve(667),p1,p2,p3);*/
  
/**WARNING: the regexp used for the transformation expect to extract the message using " (double-quotes) as hooks, so use 'em  
            to wrap your messages AND never use them IN the message.
   WARNING: the following names are reserved to let the build work as expected, do not declare vars or functions with such names:
            logFatal logError logWarn logInfo logDebug logErrorExc
**/


//**Other notes
//TOOLKIT
//the Lightstreamer toolkit is fully documented and you should take a look at it

//SETTING TIMEOUTS/INTERVALS
//Do not use setTimeout or setInterval; include the Executor class and use that:
//-this is like a setTimeout
Executor.addTimedTask(this.instanceMethod,1000,this,[p1,p2,p3]);
//-this is like a setInterval
var taskRef = Executor.addRepetitiveTask(this.instanceMethod,1000,this,[p1,p2,p3]);
//-and this is the clearInterval 
Executor.stopRepetitiveTask(taskRef);
//-you can also use the executor to pack a task and then execute it whenever you need
var anotherTask = Executor.packTask(this.instanceMethod,this,[p1,p2,p3]);
Executor.executeTask(anotherTask);

//BROWSER EVENTS
//Do not attach events directly, use the EnvironmentStatus for load-unload events and EventHelper for other events
//-attach onload (if onload is already passed it will be executed "as soon as possible"
EnvironmentStatus.addOnloadHandler(function(){/*do something*/})
//-attach onclick
Helpers.addEvent(myDiv,"click",function(){/*do something*/})

//BROWSER DETECTION
//If you need browser detection use the BrowserDetection class, try to avoid it by using feature-detection if possible

//BROWSER API
//Do not to access browser pieces without checking if you're actually in a browser
if(Environment.isBrowser()) {
  document.getElementById();
}

//JSDOCS
//Documentation need can and will be different from project to project. Craft the jsdoc build to suit the current needs as 
//the Lightstrteamer JavaScript client library does in its build_jsdoc.xml file.

//JSDOC_IGNORE
//you might encounter //JSDOC_IGNORE_START //JSDOC_IGNORE_END comments: these comments are currently handled by the 
// /Internal_Tools/JSClient6BuildHelpers/Filterjs4JSDoc/ project: I plan to remove them so do not add new instances of those
//follow the above rules and you'll be fine.

//PRIVATE CLASSES
//After the closure compiler has been executed, the /Internal_Tools/JSClient6BuildHelpers/class_aliases/node_auto_alias.js
//can be used to obfuscate the name of private classes that would otherwise remain untouched in the various define calls.
//The Lightstreamer JS Client lib includes this step in its build process, it is called like this:
//node node_auto_alias.js fileContainedCompiledCode.js conf.js prefix targetFile.js
//the conf.js file contains a list of names to be converted (i.e.: the list of the private classes):
/*
exports.classes = [
  "Constants",
  "Copyright"
]
*/

//LIBRARY VERSIONS
//We distribute the Lightstreamer JavaScript Client Library in 4 flavours. Given the full file as generated by the closure compiler 
//the Generator.js module can be used to generate a library that contains the requested classes (and their dependencies) in one of such 4 
//flavours. The module can be used through the  included node_generate_lib.js node process or by including it in a generator template as
//the Lightstreamer JavaScript Client does. The node process can be easily integrated in an ant script to automatically generate different
//versions of the same library.

//CLOSURE COMPILER (r.js)
//we use the closure compiler through r.js: a proper r.js configuration file has to be prepared. The r.js configuration file can
//be configured following r.js documentation. The Lightstreamer JavaScript Client library one contains a few particular/extra features:
//  1 it is made to reference some externals libraries, thus it includes their externs.js files (moreabout this below) and paths (see paths in that conf file)
//  2 it also made to make such external libraries part of the final js file (see modules.include property, and rLibs)
//  3 it isolates all the log messages in an external module (LogMessages.js) replacing the original strings with numbers
//  4 it replaces version_placeholder build_placeholder and LS_cid values. 
//  5 it removes the sub-folders names from the define calls (see rFolders)

//CLOSURE COMPILER (avoiding obfuscation of external calls)
//There are two thing you don't want the closure compiler to obfuscate: call others will make to your compiled library and 
//calls you make to other libraries.
//To prevent the compiler to obfuscate external names you use externs files. The Lightstreamer libraries include an externs file
//that can be include in the closure compilation as is. Others library might require an appropriate externs file.

//NEW CLASSES
//the READMEnewClass.txt file in the Javascript client library contains a quick checklist of things to do when introducing a new class