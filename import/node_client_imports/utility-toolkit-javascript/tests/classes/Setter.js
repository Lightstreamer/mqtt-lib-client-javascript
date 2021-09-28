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
define([weswitClassPrefix+"Setter","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(Setter,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  
  
  
  var SetterTest = function() {
    this._callSuperConstructor(SetterTest);
  };
  
  SetterTest.getInstances = function() {
    return [new SetterTest()];
  };
  
  SetterTest.prototype = {
      toString: function() {
        return "[SetterTest]";
      },
      
      start:function() { 
        var set = new Setter();
        
       //   function checkPositiveNumber(newVal,canBeZero,canBeDecimal) {
        ASSERT.verifySuccess(set,"checkPositiveNumber",[1],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkPositiveNumber",["1"],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkPositiveNumber",[0,true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkPositiveNumber",["0",true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkPositiveNumber",[1.5,false,true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkPositiveNumber",["1.5",false,true],ASSERT.VOID);
        
        ASSERT.verifyException(set,"checkPositiveNumber",[0]);
        ASSERT.verifyException(set,"checkPositiveNumber",[1.5]);
        ASSERT.verifyException(set,"checkPositiveNumber",[0,false,true]);
        ASSERT.verifyException(set,"checkPositiveNumber",[1.5,true,false]);
        ASSERT.verifyException(set,"checkPositiveNumber",[-1]);
        ASSERT.verifyException(set,"checkPositiveNumber",["a"]);
        ASSERT.verifyException(set,"checkPositiveNumber",[null]);
        ASSERT.verifyException(set,"checkPositiveNumber",[NaN]);
        ASSERT.verifyException(set,"checkPositiveNumber",[undefined]);
        
        
        ASSERT.verifySuccess(set,"checkBool",[true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkBool",[false],ASSERT.VOID);
        
        ASSERT.verifySuccess(set,"checkBool",[null,true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkBool",[0,true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkBool",[NaN,true],ASSERT.VOID);
        ASSERT.verifySuccess(set,"checkBool",[undefined,true],ASSERT.VOID);
        
        
        ASSERT.verifyException(set,"checkBool",[null]);
        ASSERT.verifyException(set,"checkBool",[0]);
        ASSERT.verifyException(set,"checkBool",[NaN]);
        ASSERT.verifyException(set,"checkBool",[undefined]);
        ASSERT.verifyException(set,"checkBool",["a"]);
        ASSERT.verifyException(set,"checkBool",["a",true]); 
        
        
        this.end();
      }
  };
  
  Inheritance(SetterTest,AbstractTest);
  return SetterTest;
  
});