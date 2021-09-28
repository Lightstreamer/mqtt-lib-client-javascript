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
define([weswitClassPrefix+"Matrix","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(Matrix,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  
 
  var expMatrix = {
      1: {1: "foo11", 2: "foo12"},
      2: {1: "foo21", 2: "foo22"},
      3: {1: "foo31", 2: "foo32"}
  };
  
  function getCompareObj(compareFun) {
    return function(v1,v2) {
      for (var i in v1) {
        if (compareFun) {
          return compareFun(v1[i],v2[i]);
        } else {
          return ASSERT.verifyValue(v1[i],v2[i]);
        }
      }
      for (var i in v2) {
        if (compareFun) {
          return compareFun(v1[i],v2[i]);
        } else {
          return ASSERT.verifyValue(v1[i],v2[i]);
        }
      }
    };
  }
  
  
  var MatrixTest = function() {
    this._callSuperConstructor(MatrixTest);
  };
  
  MatrixTest.getInstances = function() {
    return [new MatrixTest()];
  };
  
  MatrixTest.prototype = {
    toString: function() {
      return "[MatrixTest]";
    },
    
    start:function() {
      var aMatrix = new Matrix();
      
      ASSERT.verifySuccess(aMatrix,"insert",["foo11",1,1],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"insert",["foo12",1,2],ASSERT.VOID);
      
      ASSERT.verifySuccess(aMatrix,"insert",["foo21",2,1],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"insert",["overwriteMe",2,2],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"insert",["foo22",2,2],ASSERT.VOID);
      
      ASSERT.verifySuccess(aMatrix,"insertRow",[{1: "foo31", 2:"foo32"},3],ASSERT.VOID);
      
         
      for (var r=1; r<=3; r++) {
        for (var c=1; c<=2; c++) {
          ASSERT.verifySuccess(aMatrix,"get",[r,c],expMatrix[r][c]);
        }
        
        ASSERT.verifySuccess(aMatrix,"getRow",[r],expMatrix[r],getCompareObj());
        
      }

      ASSERT.verifySuccess(aMatrix,"getEntireMatrix",[r],expMatrix,getCompareObj(getCompareObj()));
      
      
      var wants = {1:false,2:false,3:false};
      ASSERT.verifySuccess(aMatrix,"forEachRow",[function(row) {
        ASSERT.verifyOk(row in wants);
        ASSERT.verifyNotOk(wants[row]);
        wants[row] = true;
        
        var inRow = {};
        ASSERT.verifySuccess(aMatrix,"forEachElementInRow",[row,function(el,row2,col) {
          ASSERT.verifyValue(row,row2);
          inRow[col] = el;
        }],ASSERT.VOID);
        ASSERT.verifyValue(inRow,expMatrix[row],getCompareObj());
        
      }],ASSERT.VOID);
      
      var all = {};
      ASSERT.verifySuccess(aMatrix,"forEachElement",[function(el,row,col) {
        if (!all[row]) {
          all[row] = {};
        }
        all[row][col] = el;
      }],ASSERT.VOID);
      ASSERT.verifyValue(all,expMatrix,getCompareObj(getCompareObj()));
      
      
      ASSERT.verifySuccess(aMatrix,"isEmpty",ASSERT.VOID,false);
      
      
      ASSERT.verifySuccess(aMatrix,"del",[2,1],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"get",[2,1],null,true);
      ASSERT.verifySuccess(aMatrix,"del",[2,2],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"get",[2,2],null,true);
      ASSERT.verifySuccess(aMatrix,"getRow",[2],null,true);
      
      
      ASSERT.verifySuccess(aMatrix,"delRow",[1],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"getRow",[1],null);
      
      wants = {3:false};
      ASSERT.verifySuccess(aMatrix,"forEachRow",[function(row) {
        ASSERT.verifyOk(row in wants);
        ASSERT.verifyNotOk(wants[row]);
        wants[row] = true;
        
        var inRow = {};
        ASSERT.verifySuccess(aMatrix,"forEachElementInRow",[row,function(el,row2,col) {
          ASSERT.verifyValue(row,row2);
          inRow[col] = el;
        }],ASSERT.VOID);
        ASSERT.verifyValue(inRow,expMatrix[row],getCompareObj());
        
      }],ASSERT.VOID);
      
      var all = {};
      ASSERT.verifySuccess(aMatrix,"forEachElement",[function(el,row,col) {
        if (!all[row]) {
          all[row] = {};
        }
        all[row][col] = el;
        
        ASSERT.verifySuccess(aMatrix,"del",[row,col],ASSERT.VOID);
        
      }],ASSERT.VOID);
      ASSERT.verifyValue(all,{3: {1: "foo31", 2: "foo32"}},getCompareObj(getCompareObj()));
      
      
      ASSERT.verifySuccess(aMatrix,"forEachElement",[function(el,row,col) {
        ASSERT.fail();
      }],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"forEachRow",[function(row) {
        ASSERT.fail();
      }],ASSERT.VOID);
      ASSERT.verifySuccess(aMatrix,"forEachElementInRow",[function(el,row,col) {
        ASSERT.fail();
      }],ASSERT.VOID);
      
      ASSERT.verifySuccess(aMatrix,"isEmpty",ASSERT.VOID,true);

      this.end();
    }
  };
  
  Inheritance(MatrixTest,AbstractTest);
  return MatrixTest;
  
});