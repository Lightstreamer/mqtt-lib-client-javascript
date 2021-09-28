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
define([weswitClassPrefix+"DoubleKeyMatrix","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(DoubleKeyMatrix,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  var MISSINGS = true;
  
  var DoubleKeyMatrixTest = function() {
    this._callSuperConstructor(DoubleKeyMatrixTest);
  };
  
  DoubleKeyMatrixTest.getInstances = function() {
    return [new DoubleKeyMatrixTest()];
  };
  
  DoubleKeyMatrixTest.prototype = {
      toString: function() {
        return "[DoubleKeyMatrixTest]";
      },
      
      verify: function(map,missingMap) {
        for (var i in map) {
          for (var j = 0; j < map[i].length; j++) {
            ASSERT.verifySuccess(this.myMatrix,"get",[i,map[i][j]],missingMap ? null : map[i][j]);
          }
        }
      },
      
      
      start:function() { 
        this.myMatrix = new DoubleKeyMatrix();
        var map = {
            1: [1,2,3],
            2: [4,5,6],
            3: [7,8,9]
        };
        
        for (var i in map) {
          for (var j = 0; j < map[i].length; j++) {
            ASSERT.verifySuccess(this.myMatrix,"insert",[map[i][j],i,map[i][j]],ASSERT.VOID);
            
            ASSERT.verifySuccess(this.myMatrix,"get",[i,map[i][j]],map[i][j]);
          }
        }
        this.verify(map);
        
        //del something
        ASSERT.verifySuccess(this.myMatrix,"del",[2,5],ASSERT.VOID);
        this.verify({
            1: [1,2,3],
            2: [4,6],
            3: [7,8,9]
        });
        this.verify({
          2: [5]
        },MISSINGS);
        
        //del reverse
        ASSERT.verifySuccess(this.myMatrix,"delReverse",[8],ASSERT.VOID);
        this.verify({
            1: [1,2,3],
            2: [4,6],
            3: [7,9]
        });
        this.verify({
          2: [5],
          3: [8]
        },MISSINGS);
        
        //del row
        ASSERT.verifySuccess(this.myMatrix,"delRow",[2],ASSERT.VOID);
        this.verify({
            1: [1,2,3],
            3: [7,9]
        });
        this.verify({
          2: [4,5,6],
          3: [8]
        },MISSINGS);
        
        this.end();
      }
  };
  
  Inheritance(DoubleKeyMatrixTest,AbstractTest);
  return DoubleKeyMatrixTest;
  
});


