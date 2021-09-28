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
define([weswitClassPrefix+"DoubleKeyMap","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(DoubleKeyMap,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  
  var DoubleKeyMapTest = function() {
    this._callSuperConstructor(DoubleKeyMapTest);
  };
  
  DoubleKeyMapTest.getInstances = function() {
    return [new DoubleKeyMapTest()];
  };
  
  DoubleKeyMapTest.prototype = {
      toString: function() {
        return "[DoubleKeyMapTest]";
      },
      
      verify: function(list,listReverse,map) {
        var that = this;
        //verify the list
        for (var i=0; i<list.length; i++) {
          ASSERT.verifySuccess(this.myMap,"get",[list[i]],listReverse[i]);
          ASSERT.verifySuccess(this.myMap,"getReverse",[listReverse[i]],list[i]);
          
          ASSERT.verifySuccess(this.myMap,"exist",[list[i]],true);
          ASSERT.verifySuccess(this.myMap,"existReverse",[listReverse[i]],true);
        }
        
        //verify forEach and forEachReverse working
        this.myMap.forEach(function(v) {
          ASSERT.verifyOk(map[v]);
          ASSERT.verifySuccess(that.myMap,"get",[v],map[v]);
          ASSERT.verifySuccess(that.myMap,"exist",[v],true);
          delete(map[v]);
        });
        this.myMap.forEachReverse(function(v) {
          ASSERT.verifyOk(map[v]);
          ASSERT.verifySuccess(that.myMap,"getReverse",[v],map[v]);
          ASSERT.verifySuccess(that.myMap,"existReverse",[v],true);
          delete(map[v]);
        });
        
        //verify that nothing was missed
        for (var e in map) {
          ASSERT.fail();
        }
      },
      
      start:function() { 
        
        //SIMPLE -->
        
        var list = ["a","b","c","d"];
        var listReverse = ["1","2","3","4"];
        var map = {
            "1": "a",
            "2": "b",
            "3": "c",
            "4": "d",
            "a": "1",
            "b": "2",
            "c": "3",
            "d": "4"
        }
        
        this.myMap = new DoubleKeyMap();
        
        //insert and verify insertion
        for (var i=0; i<list.length; i++) {
          ASSERT.verifySuccess(this.myMap,"set",[list[i],listReverse[i]],ASSERT.VOID);
          
          ASSERT.verifySuccess(this.myMap,"get",[list[i]],listReverse[i]);
          ASSERT.verifySuccess(this.myMap,"getReverse",[listReverse[i]],list[i]);
          
          ASSERT.verifySuccess(this.myMap,"exist",[list[i]],true);
          ASSERT.verifySuccess(this.myMap,"existReverse",[listReverse[i]],true);
        }
        this.verify(list,listReverse,map);
        
        
        //remove and verify
        ASSERT.verifySuccess(this.myMap,"remove",["b"],ASSERT.VOID);
        this.verify(
            ["a","c","d"],
            ["1","3","4"],
            {
              "1": "a",
              "3": "c",
              "4": "d",
              "a": "1",
              "c": "3",
              "d": "4"
          });
        
        //remove reverse and verify
        ASSERT.verifySuccess(this.myMap,"removeReverse",["3"],ASSERT.VOID);
        this.verify(
            ["a","d"],
            ["1","4"],
            {
              "1": "a",
              "4": "d",
              "a": "1",
              "d": "4"
            });
        
        //COLLISIONS -->
        
        //create a new map
        this.myMap = new DoubleKeyMap();
        list = ["a","b","c"];
        listReverse = ["1","2","3"];
        map = {
            "1": "a",
            "2": "b",
            "3": "c",
            "a": "1",
            "b": "2",
            "c": "3"
        };
        for (var i=0; i<list.length; i++) {
          ASSERT.verifySuccess(this.myMap,"set",[list[i],listReverse[i]],ASSERT.VOID);
        }
        this.verify(list,listReverse,map);
        
        //overwrite 1 with 7
        ASSERT.verifySuccess(this.myMap,"set",["a","7"],ASSERT.VOID);
        this.verify(
            ["a","b","c"],
            ["7","2","3"],
            {
              "7": "a",
              "2": "b",
              "3": "c",
              "a": "7",
              "b": "2",
              "c": "3"
          });
        
        //overwrite b with g
        ASSERT.verifySuccess(this.myMap,"set",["g","2"],ASSERT.VOID);
        this.verify(
            ["a","g","c"],
            ["7","2","3"],
            {
              "7": "a",
              "2": "g",
              "3": "c",
              "a": "7",
              "g": "2",
              "c": "3"
          });
        
        //let a and c switch
        ASSERT.verifySuccess(this.myMap,"set",["a","3"],ASSERT.VOID);
        this.verify(
            ["c","g","a"],
            ["7","2","3"],
            {
              "7": "c",
              "2": "g",
              "3": "a",
              "c": "7",
              "g": "2",
              "a": "3"
          });
        
        this.end();
      }
  };
  
  Inheritance(DoubleKeyMapTest,AbstractTest);
  return DoubleKeyMapTest;
  
});