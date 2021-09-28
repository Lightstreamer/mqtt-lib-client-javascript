/*
  Copyright (c) Lightstreamer Srl

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
define([weswitClassPrefix+"List","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(List,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  
 
  
  
  function doubleCompare(aList,exp) {
    ASSERT.compareArrays(aList.asArray(),exp,true);
    var i=0;
    aList.forEach(function(a) {
      ASSERT.verifyValue(a,exp[i]);
      i++;
    });

    for (i=0; i<exp.length; i++) {
      ASSERT.verifySuccess(aList,"contains",[exp[i]],true);
    }
  }
  
  
  var ListTest = function() {
    this._callSuperConstructor(ListTest);
  };
  
  ListTest.getInstances = function() {
    return [new ListTest()];
  };
  
  ListTest.prototype = {
    toString: function() {
      return "[ListTest]";
    },
    
    start:function() {
      var aList = new List();
      
      ASSERT.verifySuccess(aList,"add",["a"],ASSERT.VOID);
      ASSERT.verifySuccess(aList,"add",["b"],ASSERT.VOID);
      ASSERT.verifySuccess(aList,"add",["c"],ASSERT.VOID);
      doubleCompare(aList,["a","b","c"]);
      ASSERT.verifySuccess(aList,"contains",["d"],false);
      
      
      ASSERT.verifySuccess(aList,"remove",["b"],ASSERT.VOID);
      doubleCompare(aList,["a","c"]);
      ASSERT.verifySuccess(aList,"contains",["b"],false);
            
      ASSERT.verifySuccess(aList,"clean",ASSERT.VOID,ASSERT.VOID);
      doubleCompare(aList,[]);
      ASSERT.verifySuccess(aList,"contains",["a"],false);
      ASSERT.verifySuccess(aList,"contains",["c"],false);

      
      this.end();
    }
  };
  
  Inheritance(ListTest,AbstractTest);
  return ListTest;
  
});