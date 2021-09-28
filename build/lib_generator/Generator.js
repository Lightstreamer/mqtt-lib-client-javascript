var log = (typeof console != "undefined") ? function(mex){console.log(mex);} : function(){};

define([],function() {


  function generateArray(list,fun) {
    var res = "[";
    for (var i=0; i<list.length; i++) {
      res+=(i!=0?",":"")+fun(list[i]);
    }
    res+="]"
    return res;
  }

  //static stuff used to compose the lib
  var noRequireHead = "(function(){";
  function getClassesArray(classes) {
    var res = "var classes=" + generateArray(classes,function(name) {
      return "'"+name+"'";
    });
    return res+";";
  }
  function getRequireNamespaceHead(namespace) {
    return "(function(o) {var l='"+namespace+"/';var define = function(c,a,d){for(var b=0;b<a.length;b++)a[b]=l+a[b];o(l+c,a,d)};";
  }
  function getNoRequireNamespaceFoot(namespace) {
    return "window."+namespace+"={};require(classes,function(){for (var i=0;i<classes.length;i++)"+namespace+"[classes[i]]=arguments[i];});})();";
  }
  var noRequireGlobalFoot = "require(classes,function(){for (var i=0;i<classes.length;i++)window[classes[i]]=arguments[i];});})();";
  var requireNamespaceFoot = "})(define);";

  //need to wrap the simple case to wrap google closure's global functions
  var simpleRequireHead = "(function(){";
  var simpleRequireFoot = "}());";

  function getUMD(customNsAttr, defaultNs, libraryNames) {
    return '(function (root, factory) {\n'+
    '  if (typeof define === "function" && define.amd) {\n'+
    '    factory(define, typeof exports === "undefined"?undefined:exports); // Required by webpack\n'+
    '  } else if (typeof module === "object" && module.exports) {\n'+
    '    factory(null, exports);\n'+
    '  } else {\n'+
    '    // Browser globals (root is window)\n'+
    '   for(var a=root.document.getElementsByTagName("script"),b=0;b<a.length;b++){var c=a[b].attributes;if(c.src){var d=c.src.value.split("/");if(0<='+libraryNames+'.indexOf(d[d.length-1])){var e={};factory(null,e);var f=(c['+customNsAttr+']||{value:'+defaultNs+'}).value,g=root;if(f){for(var h=f.split("."),k=0;k<h.length-1;k++)g[h[k]]={},g=g[h[k]];g[h[k]]=e}else{for(var l in e)g[l]=e[l];break}}}};\n'+
    '}}(this, function (def, exports) {\n'+
    'var define;\n'+
    'if (typeof exports !== "undefined") {\n'+
    '  define = function(a,c,e){define.a[a]={e:c,d:e}};define.a={};define.b=function(a,c,e){for(var g=[],f=0;f<a.length;f++){var d=define.a[a[f]];if(!d)throw"All the modules must already be \'defined\' Async load not supported: use a full-featured AMD loader like requirejs";d.c||define.b(d.e,d.d,a[f]);g.push(d.c)}a=c.apply(null,g);if(e)define.a[e].c=a};function oneRequire(a,c){define.b(a,c,null)};\n'+
    '  load(define);\n'+
    '} else {\n'+
    '  def("mqttcool", ["module"], function(module) {\n'+
    '    var ns = module.config().ns;\n'+
    '    if (typeof ns === "undefined") ns='+defaultNs+';\n'+
    '    if (ns) {var l=ns+"/";define = function(c,a,d){for(var b=0;b<a.length;b++)a[b]=l+a[b];def(l+c,a,d)}} else define = def;\n'+
    '    load(define);\n'+
    '  });requirejs(["mqttcool"]);\n'+
    '}\n'+
    'function load(define) {\n';
  }

  function getFakeAMD(customRequireName,inclusions) {

    var requireName = customRequireName || "require";

    if(inclusions && inclusions.length >0) {
      if (!customRequireName) {
        throw "can't use inclusions without a custom name for require: if this happen the error is in the Generator code";
      }

      var inclusionsString = "var b=" + generateArray(inclusions,function(name) {
        return "require('"+name+"')";
      }) + ";";

      return inclusionsString + 'function f(a,c,g){f.a[a]={h:c,f:g}}var define=f;f.a={};f.g=function(a){for(var c=0;c<b.length;c++)if(b[c][a])return f.a[a]={b:b[c][a]},f.a[a]};f.c=function(a,c,g){for(var h=[],e=0;e<a.length;e++){var d=f.a[a[e]];if(!d&&(d=f.g(a[e]),!d))throw"All the modules must already be \'defined\' Async load not supported: use a full-featured AMD loader like requirejs";d.b||f.c(d.h,d.f,a[e]);h.push(d.b)}a=c.apply(null,h);g&&(f.a[g].b=a)};function '+requireName+'(a,c){f.c(a,c)};';

    } else {
      return 'function define(a,c,e){define.a[a]={e:c,d:e}}define.a={};define.b=function(a,c,e){for(var g=[],f=0;f<a.length;f++){var d=define.a[a[f]];if(!d)throw"All the modules must already be \'defined\' Async load not supported: use a full-featured AMD loader like requirejs";d.c||define.b(d.e,d.d,a[f]);g.push(d.c)}a=c.apply(null,g);if(e)define.a[e].c=a};function '+requireName+'(a,c){define.b(a,c,null)};';

    }

  }

  var startExportsFootUMD =
    '\nif (typeof exports !== "undefined") {\n';

  var endExportsFootUMD =
    '\n  oneRequire(classes,function(){for (var i=0;i<classes.length;i++)exports[classes[i]]=arguments[i];});\n'+
    '}}}));\n';

  var exportsFoot = "oneRequire(classes,function(){for (var i=0;i<classes.length;i++)exports[classes[i]]=arguments[i];});";

  function Generator(libAsString, isOriginal) {
    this.libAsString = libAsString;
    this.isMinified = !isOriginal;
      // works also when the argument is omitted (isMinified defaults to true)

    this.classes = {};
    this.copyright = "";
    this.version = null;
    this.build = null;

    this.parseLib();
  };

  Generator.prototype = {

    reset: function() {
      this.classes = {};
      this.copyright = null;
      this.version = null;
    },

    getVersion: function() {
      return this.version + " build " + this.build;
    },

    getCopyright: function() {
      return this.copyright;
    },

    setCopyright: function(copyrightAsString) {
      this.copyright = copyrightAsString;
    },

    addPiece: function(base, start, end, modules, exceptions) {
      var piece = base.substring(start, end);
      // the piece found may be a false positive
      // that is: the separator found in the previous step (now at "start") may not be a real separator;
      // this is typical when working with the source code, which includes comments;
      // we must identify these cases;
      // hence we must have listed here all such cases, by keeping track of the start of each wrong block;
      // for better recognition, we allow the pattern to include also the preceding part of the wrong block,
      // so that, in case of a comment, the start of the comment can be included;
      // as a consequence, we will look for it not from "start", but before;
      // the above is not supported on the first step
      var isException = false;
      if (exceptions != null) {
        for (var n=0; n<exceptions.length; n++) {
          var backtrack = exceptions[n].indexOf("define(");
          // assert(backtrack >= 0)
          // assert(backtrack < start)
          var pos = base.indexOf(exceptions[n], start - backtrack);
          if (pos >= start - backtrack && pos <= start) {
            isException = true;
            log("WARN identified a false positive as: " + exceptions[n]);
            break;
          }
        }
      }
      if (isException) {
        modules[modules.length - 1] += piece;
      } else {
        modules.push(piece);
      }
    },

    parseLib: function() {
      this.reset();
      var libAsString = this.libAsString;
      //regexp used to parse the lib
      if (this.isMinified) {
        var moduleNameRegexp = /define\("([A-Za-z0-9_\-]+)"/;
        var dependenciesRegexp = /define\("[A-Za-z0-9_\-]+",(\[[A-Za-z0-9_\-",]*])/;
        var dependenciesRegexpSplitVersion = /define\("[A-Za-z0-9_\-]+",("[A-Za-z0-9_\s\-]+"\.split\("\s"\))/;
        var versionRegexp = /version[:=]\s?"([^"]*)"[;,]?/g;
        var buildRegexp = /build[:=]\s?"([0-9.]*)"[;,]?/g;
        var exceptions = null;
      } else {
        var moduleNameRegexp = /define\('([A-Za-z0-9_\-]+)'/;
        var dependenciesRegexp = /define\('[A-Za-z0-9_\-]+',(\[[A-Za-z0-9_\-",\s]*])/;
        var dependenciesRegexpSplitVersion = null;
        var versionRegexp = /\["version"\]\s?=\s?"([^"]*)";/g;
        var buildRegexp = /\["build"\]\s?=\s?"([0-9.]*)";/g;
        var exceptions = ["* define(", "define(function"];
      }

      this.globalFunctions = libAsString.substring(0,libAsString.indexOf("define"));
      //log(this.globalFunctions);

      //save version
      var matches;
      // Need to iterate because of flag "g", which is useful when generation starts from
      // two concatenated source librartwo o
      while(matches=versionRegexp.exec(libAsString)) this.version = matches[1];
      while(matches=buildRegexp.exec(libAsString))  this.build = matches[1];
      log(this.version);
      log(this.build);

      //remove source map reference
      //We here use 'lastIndexOf' instead of 'indexOf' because this avoids to truncate part of library when it is generated starting
      //from two concatenated and code sources (for example, LS + MQTT.Cool or LS + JMS Extender).
      var endFile = libAsString.lastIndexOf("//# sourceMappingURL=");
      if (!endFile) {
        throw("expecting a sourceMappingURL at the end of file");
      }
      var libAsString = libAsString.substring(0,endFile);

      //split in pieces
      var end = 0;
      var start = libAsString.indexOf("define(");
      var modules = [];

      while((end = libAsString.indexOf("define(",start+1))>-1) {
        this.addPiece(libAsString, start, end, modules, exceptions);
        start = end;
      }
      this.addPiece(libAsString, start, libAsString.length, modules, exceptions);

      //log(modules.length);

      var count = 0;
      //extract module names from pieces
      for (var i=0; i<modules.length; i++) {
        //log(i);
        //log(modules[i]);
        var name = moduleNameRegexp.exec(modules[i]);
        if (name) {
          //log(name[1]);
          //extract dependencies
          var deps = dependenciesRegexp.exec(modules[i]);
          if (deps) {

            var depArray = eval(deps[1]);

            //log("deps: " + depArray);

            this.classes[name[1]] = {name:name[1],deps:depArray,str:modules[i]};

            continue;
          }

          if (dependenciesRegexpSplitVersion != null) {
            deps = dependenciesRegexpSplitVersion.exec(modules[i]);
            if (deps) {

              var depArray = eval(deps[1]);

              //log("deps: " + depArray);

              this.classes[name[1]] = {name:name[1],deps:depArray,str:modules[i]};

              continue;
            }
          }
        }

        log(modules[i]);
        log("PARSING FAILED on module reported above!");
        throw("PARSING FAILED!");
      }


    },

    putClass: function(name,replacements) {
      var replaceWith = null;
      var indexName = name;
      if (replacements && replacements[name]) {
        replaceWith = replacements[name];
        indexName = replaceWith;
        log("Replaced " + name + " with " + indexName);
      }


      //log("SOLVING DEPENDENCIES FOR " + name);
      if (!this.classes[indexName]) {
        log("WARN ------------------------------>"+ indexName +" is missing from final file");
        this.libOn[name] = true;
        return "";
      }


      var res = "";
      for (var i=0; i<this.classes[indexName].deps.length; i++) {
        //log("SOLVING DEPENDENCIES FOR " + indexName + ": " + this.classes[indexName].deps);
        if(!this.libOn[this.classes[indexName].deps[i]]) {
          res += this.putClass(this.classes[indexName].deps[i],replacements);
        }
      }

      if(!this.libOn[name]) {
        //log("PUTTING " + name);
        this.libOn[name] = true;

        if (replaceWith) {
          var replacer = new RegExp("define\\(['\"]"+replaceWith+"['\"],");
          res += this.classes[replaceWith].str.replace(replacer,"define(\""+name+"\",");

        } else {
          res += this.classes[name].str;
        }
      }

      return res;
    },

    generateCopyright: function(libName,classList,libType,includeFakeAMD,namespace) {
      log('Generating copyright for libtype: ' + libType);

    var type = libType === "CommonJS" || libType === "Globals" || libType === "RAW" || libType === "UMD" ? 	libType : (includeFakeAMD ? "AMD (simple AMD loader included)" : "AMD");

      var classes = "";
      var end = classList.length;
      for(var i=1; i<=end; i++) {
        classes += (namespace ? namespace+"/" : "") +  classList[i-1] + (i==end ? "" : (i%4 == 0 ? "\n *   " : ", "));
      }

      return this.copyright.
        replace("LIBRARY_PLACEHOLDER",libName).
        replace("YEAR_PLACEHOLDER",new Date().getFullYear()).
        replace("VERSION_PLACEHOLDER",this.version).
        replace("BUILD_PLACEHOLDER",this.build).
        replace("TYPE_PLACEHOLDER",type).
        replace("CLASSES_PLACEHOLDER",classes);
    },

    /**
     * @param {String} libFileNames
     * @param {String} customNsAttr
     * @param {String} libName
     * @param {Array} classList
     * @param {boolean} libType
     * @param {boolean} includeFakeAMD
     * @param {String} namespace
     * @param {Array} replacements
     * @param {Array} inclusions
     */
    generateLib: function(libFileNames,libName,customNsAttr,classList,libType,includeFakeAMD,namespace,replacements,inclusions) {
      try {

        log("Generation started");

        var genLib="";

        if (this.copyright) {
          genLib += this.generateCopyright(libName,classList,libType,includeFakeAMD,namespace);
        }

        var composeHeaderFoot = libType !== "RAW";
        var umd = libType === "UMD";
        var amdBase = libType === "AMD" || libType === "CommonJS";
        var includeExport = libType === "CommonJS";

        var requireName = "require";
        if (libType === "CommonJS") {
          namespace = false;
          if (! includeFakeAMD) {
            // it can be set to false if the caller takes care of including oneRequire in some other way
            log("WARN oneRequire not included for CommonJS generation; it must be supplied by the caller");
          }
          requireName = "oneRequire";
        } else {
          inclusions = null;
        }

        //compose head-->
        if (composeHeaderFoot) {
          if (umd) {
            genLib += getUMD(customNsAttr,namespace,libFileNames);
          } else if (!amdBase) {
            log("attach no-AMD header");
            genLib+=noRequireHead+getFakeAMD(requireName);

          } else {
            if(includeFakeAMD) {
              log("attach fake-AMD implementation");
              genLib+=getFakeAMD(requireName,inclusions);
            }

            if (namespace) {
              log("attach namespaced-AMD header");
              genLib+=getRequireNamespaceHead(namespace);
            } else {
              genLib+=simpleRequireHead;
            }
          }
        }
        //<--compose head

        //compose body-->
        genLib+=this.globalFunctions;

        this.libOn={};

        if (classList[0] === "*") {
          if (!amdBase) {
            log("* is only supported when generating an AMD/CommonJS library");
            throw "* is only supported when generating an AMD/CommonJS library";
          }

          for (var className in this.classes) {
            genLib+=this.putClass(className,replacements);
          }
        } else for (var i = 0; i<classList.length; i++) {
          genLib+=this.putClass(classList[i],replacements);
        }
        //<--compose body

        /*
        log("Classes included:");
        for (var className in this.libOn) {
          log("   " + className);
        }
        */

        //compose foot-->
        if (composeHeaderFoot) {
          if (umd) {
            log('attach UMD footer')
            genLib+=startExportsFootUMD;
            genLib+=getClassesArray(classList);
            genLib+=endExportsFootUMD;
          } else if (!amdBase) {
            log("attach no-AMD common footer");
            genLib+=getClassesArray(classList);
            if (namespace) {
              log("attach no-AMD use-namespace footer");
              genLib+=getNoRequireNamespaceFoot(namespace);
            } else {
              log("attach no-AMD use-globals footer");
              genLib+=noRequireGlobalFoot;
            }
          } else if (namespace) {
            log("attach namespaced-AMD footer");
            genLib+=requireNamespaceFoot
          } else {
            genLib+=simpleRequireFoot;
          }

          if (includeExport) {
            log("attach CommonJS exports");
            genLib+=getClassesArray(classList);
            genLib+=exportsFoot;
          }
        }

        //<--compose foot
        log("COMPLETE!");
        return genLib;
      } catch(_e) {
        log(_e);
        return "GENERATION ERROR, SEE CONSOLE";
      }
    }

  };

  return Generator;

});