//read params (file conf_file prefix output)
if (process.argv.length < 5) {
  console.error("Missing parameters");
  
  console.log("Usage:");
  console.log("node node_auto_alias.js inputFile configFile namesPrefix outputFile");
  
  process.exit(1);
}

var inputFile;
var configFile;
var namesPrefix;
var outputFile;

process.argv.forEach(function (val, index, array) {
  if (index <= 1) {
    return;
  } else if (index == 2) {
    inputFile = val;
  } else if (index == 3) {
    configFile = val;
  } else if (index == 4) {
    namesPrefix = val;
  } else if (index == 5) {
    outputFile = val;
  } 
});

//read conf_file
var classes = require(configFile).classes;
  
//init regexp
var classesRegexp = [];
initClassesRegexp();
  
//read file
var fs = require('fs');
fs.readFile(inputFile, function(err,data){
  if(err) {
    console.error("Could not open lib file: " + inputFile + "\n" + err);
    process.exit(1);
  }
  
  var libOutput = String(data); //otherwise data has no indexOf method
  
  //apply regexp
  for (var i=0; i<classesRegexp.length; i++) {
    libOutput = libOutput.replace(classesRegexp[i].regexp,classesRegexp[i].alias);
  }
  
  //write file
  fs.writeFile(outputFile, libOutput, function(err) {
    if(err) {
      console.log("Could not write file: " + outputFile + "\n" + err);
      process.exit(1);
    } else {
      console.log("The file was saved!");
      process.exit(0);
    }
  }); 
});

function incLetter(v) {
  if (v == 90) {
    return 97;
  }
  if (v == 122) {
     return 65;
  }
  return v+1;
}

function initClassesRegexp() {
  var letterCount = 65;
  var extra = 64;

  for (var i=0; i<classes.length; i++) {
    var alias = (extra>64?String.fromCharCode(extra):"") + String.fromCharCode(letterCount);
  
    letterCount = incLetter(letterCount);
    if (letterCount == 65) {
       extra = incLetter(extra);
    }
    
    classesRegexp.push({
      regexp:new RegExp('(["\\s])'+classes[i]+'(["\\s])',"gm"),
      alias:"$1"+namesPrefix+alias+"$2"
    });
  }
}