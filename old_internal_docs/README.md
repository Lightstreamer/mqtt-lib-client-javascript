# When creating a new class/module for the library

## IF THE PROJECT USES THE WESWIT TEST TOOLKIT

* It would be good if a new TestCase is created. Place the test case in the tests/classes folder and its name in the tests/classes.js file; the test class must extend the AbstractTes class (a couple of extended classes are available in the Lightstreamer JS Client tests, namely AbstractClientConnectedTest.js and AbstractSlaveClientConnectedTest.js. You might extend these if needed).


## PRIVATE CLASS OR CLASS THAT CAN'T BE INSTANTIATED (e.g. the UpdateInfo class in the Lightstreamer JS Client)

* Add it to the list in build/conf_files/alias_conf.js

## PUBLIC CLASS

* Add it to the publicClasses array in the build_resources/conf_files/globals_check.html file (if such file exists)
* Do not forget the [exports]((https://developers.google.com/closure/compiler/docs/api-tutorial3?hl=it#export)) in the source file

### PUBLIC CLASS THAT CAN BE INSTANTIATED

* Add it to the modules.include  array in the build/full.build.js file
* Add it to the various flavours in the build/build.xml file (search for the generator calls)

### OPTIONAL PUBLIC CLASS

* If a generator is available for the library add the optional classes in the selectableClasses array in the build/conf_files/generator_template.html file

## NEW PACKAGE

* Add it to the rFolders array in the build/full.build.js file (if rFolders array is not available create it and copy its handling code from the full.build.js
  of the Lightstreamer JS Client







# How to live happy with the closure compiler

##  Can I use the arguments property to pass all of the parameters from my function to the super-function when using Inheritance's _callSuperMethod?

Yes of course you can, is also more efficient because you don't have to create a new array to put in parameters for the super-call.
Still sometimes you may not prefer to use arguments: if you use something like google closure to minimize your code you'll notice that the paramters of your functions will be renamed into a,b,c... For obvious reasons, as it is a reserved word, the name arguments must be kept as is and thus, depending on the number of arguments, it may make the code bigger (e.g.: arguments vs [a,b]). On the other hand your library may be sent to the client gzipped reducing the impact of arguments being not renamed and the library can be cached, the strong way, using appcache.
So, should you use arguments or not? Up to you.

## I want to optimize my code with google closure ADVANCED_OPTIMIZATION (or othe aggresive minifier that does not regognize the method names inside the strings). What can I do?

I banged my head against several walls because of this. I had some solutions in mind to avoid the use of strings in the _callSuperMethod method but I didn't like how the Inheritance module turned out (e.g.: chaining each method with its super implementation).
In our internal projects I used to minify the code with Syntropy JCE pro, that is able to rewrite the strings in my _callSuperMethod calls, and after that minify again using the closure compiler SIMPLE_OPTIMIZATION option.
Unfortunately looks like Syntropy is no more (I suppose as their website is down) and in any case you may still want to use the aggressive optimizations.
I am going now to suggest a trick that is currently working for me but I'm not sure it works on any situation and I'm not sure that it will work with future versions of closure or with other minifiers.     Let's say you need to call the super-version of method1 and method2. In your module set up a map containing method1 and method2 entries referring to their names as strings, then cycle through the map and create a reverse map (keys as values and viceversa). Finally use the second map for your _callSuperMethod calls:
        ```JS
        //step1
        var names = {
          mathod1 : "mathod1",
          mathod2 : "mathod2"
        };
        //step 2
        var reverse = {};
        for (var i in names) {
          reverse[names[i]] = i;
        }
        //step 3
        this._callSuperMethod(thisClass,reverse["method1"]);
        this._callSuperMethod(thisClass,reverse["method2"]);
        ```
