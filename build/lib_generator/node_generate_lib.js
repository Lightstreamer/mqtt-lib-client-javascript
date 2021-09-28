var requirejs = require('requirejs');
const path = require('path');

requirejs.config({
    nodeRequire: require
});

var libFile;
var customNsAttr;
var altLibName;
var outputFile;
var libType;
var includeFakeAMD;
var namespace;
var copyright;
var classList = [];
var replacements = {};
var includes = [];
var isOriginal = false;

if (process.argv.length < 8) {
  console.error("Missing parameters");

  console.log("Usage:");
  console.log("node node_generate_lib.js libName inputFile libType includeFakeAMD namespace copyrightTemplate outputFile classToInclude1 classToInclude2 classToInclude3");
  console.log("(you can use * to specify all of the available classes when generating a library having the libType set to AMD or CommonJS.\n "
	+"Depending on the libType specified some settings might make no sense and will be adjusted accordingly)\n"
	+"If you want to replace a class with a different one, specify it in the form classToBeReplaced@classThatWillReplace: classThatWillReplace \n"
  +"will be included with the name classToBeReplaced everytime classToBeReplaced is required\n"
  +"in case of commonJS generations, you might need at runtime to include another library in the context of yours: "
  +"specify the name of that module preceded by the colon sign, e.g.: :lightstreamer-client"
  );

  process.exit(1);
}

// print process.argv
process.argv.forEach(function (val, index, array) {
  if (index <= 1) {
    return;
  } else if (index == 2) {
    libName = val;
  } else if (index == 3) {
    libFile = val;
  } else if (index == 4) {
	if (val === "true" || val === "AMD") { //true for backward compatibility
		libType = "AMD";
	} else if (val === "CommonJS") {
		libType = "CommonJS";
  } else if (val === "RAW") {
    libType = "RAW";
  } else if (val === "UMD") {
    libType = "UMD"
	} else { //for backward compatibility sake
		libType = "Globals";
	}
  } else if (index == 5) {
    if (libType === 'UMD') {
      customNsAttr = val;
    } else {
      includeFakeAMD = val==="true";
    }
  } else if (index == 6) {
    namespace = val==="false"?false:val;
  } else if (index == 7) {
    copyright = val==="false"?false:val;
  } else if (index == 8) {
    outputFile = val;
  } else if (index == 9 && libType === 'UMD' && val[0]=='\'') {
    altLibName = val;
  } else {
    if (val === "NOT_MINIFIED") {
      // extra argument available to enable generation from the original code
      isOriginal = true;
    } else if (val.indexOf("@") > -1) {
      var values = val.split("@",2);
      replacements[values[0]] = values[1];
    } else if (val.indexOf(":") == 0) {
      includes.push(val.substring(1));
    } else {
      classList.push(val);
    }


  }
});

requirejs(["Generator"],
  function(Generator) {

    var fs = require('fs');

    var copyrightString = null;
    if (copyright) {
      fs.readFile(copyright, function(err,data){
        copyrightString = String(data);
        generate();
      });
    } else {
      generate();
    }

    function encrypt(version) {
      var key = [6,2,42,6,5,11,20,4,22,7];
      var intervals = [
          [32,32,45-32-1,32-122-1],
          [45,46,48-46-1,45-32-1],
          [48,57,65-57-1,48-46-1],
          [65,90,95-90-1,65-57-1],
          [95,95,97-95-1,95-90-1],
          [97,122,32-122-1,97-95-1]
      ];
      if (version == null || version.length < 1) {
        throw "Unexpected empty string";
      }
      var k = 0;
      var result = [];
      var checksum = 0;
      for(var i=0; i<version.length; i++) {
        var character = version.charCodeAt(i);
        checksum += character;
        var simple = character+key[k];
        k++;
        if (k >= key.length) {
          k=0;
        }
        for (var n=0; n<intervals.length; n++) {
          if (character > intervals[n][1]) {
            continue;
          } else if (character < intervals[n][0]) {
            throw "Unexpected character in string";
          }
          while (simple > intervals[n][1]) {
            simple+= intervals[n][2];
            n++;
            if (n >= intervals.length) {
              n=0;
            }
          }
          result.push(simple);
          break;
        }
      }
      checksum = (checksum%25) + 97;
      result.push(checksum);

      this.encrypted = String.fromCharCode.apply(String,result);
      return this.encrypted;

    }

    function generate() {

      //1 read lib from file
      fs.readFile(libFile, function(err,data){
        if(err) {
          console.error("Could not open lib file: " + libFile + "\n" + err);
          process.exit(1);
        }

        data = String(data); //otherwise data has no indexOf method

        //2 create Generator
        var gen = new Generator(data, isOriginal);
        if (copyrightString) {
          gen.setCopyright(copyrightString);
        }

        //3 generate lib
        var primaryOutputFile = outputFile.split('/').pop();
        var libFileNames = altLibName?"['" + primaryOutputFile +"',"+ altLibName+"]":"['" + primaryOutputFile +"']";
        var dataNsAttr = customNsAttr || '';
        var libOutput = gen.generateLib(libFileNames,libName,dataNsAttr,classList,libType,includeFakeAMD,namespace,replacements,includes);

        //4 Replace the CID
        /*var libTag = libName=="Web"?"javascript_client":"nodejs_client"
        var fullVersion = encrypt(libTag + " " + gen.getVersion());
        var start = libOutput.indexOf('LS_cid\\x3d') + 10;
        var end = libOutput.indexOf('\\x26', start);
        var str = libOutput.substring(start, end);
        console.log("Replacing string <" + str +"> with <" + fullVersion + ">");
        libOutput = libOutput.replace(str, fullVersion);*/

        //5 write on output file
        fs.writeFile(outputFile, libOutput, function(err) {
          if(err) {
            console.log("Could not write file: " + outputFile + "\n" + err);
            process.exit(1);
          } else {
            console.log(outputFile + " file was saved!");
            process.exit(0);
          }
        });

      });
   };
});