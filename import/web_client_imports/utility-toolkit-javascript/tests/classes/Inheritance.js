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
define([weswitClassPrefix+"Inheritance","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(Inheritance,AbstractTest,wInheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  
  function class1() {
    this.foo = 1;
    this.bar = 1;
  }
  
  class1.prototype = {
    method1: function() {
      return [1,1,this.foo,this.bar];
    },
    
    method2: function() {
     return [1,2,this.foo,this.bar];
    },
    
    method3: function() {
     return [1,3,this.foo,this.bar];
    },
    
    method4: function() {
     return [1,4,this.foo,this.bar];
    }
  };
  
  ////////
  
  function class2() {
    this._callSuperConstructor(class2);
    this.bar = 2;
  }
  
  class2.prototype = {
    method1: function() {
     return [2,1,this.foo,this.bar].concat(this._callSuperMethod(class2,"method1"));
    },
    
    method3: function() {
     return [2,3,this.foo,this.bar].concat(this._callSuperMethod(class2,"method3"));
    }
  };
  
  Inheritance(class2,class1);
  
  ////////
  
  function class3() {
    this._callSuperConstructor(class3);
    this.foo = 3;
  }
  
  class3.prototype = {
    method1: function() {
     return [3,1,this.foo,this.bar].concat(this._callSuperMethod(class3,"method1"));
    },
    
    method2: function() {
     return [3,2,this.foo,this.bar].concat(this._callSuperMethod(class3,"method2"));
    },
    
    method3: function() {
     return [3,3,this.foo,this.bar].concat(this._callSuperMethod(class3,"method3"));
    }
  };
  
  Inheritance(class3,class2);
  
  var InheritanceTest = function(obj,expect,name) {
    this._callSuperConstructor(InheritanceTest);
    this.obj = obj;
    this.expect = expect;
    this.name = name;
  };
  
  
  var expect1 = [1,1,1,1,1,2,1,1,1,3,1,1,1,4,1,1]; // 1,1,1,1 | 1,2,1,1 | 1,3,1,1 | 1,4,1,1
  var expect2 = [2,1,1,2,1,1,1,2,1,2,1,2,2,3,1,2,1,3,1,2,1,4,1,2]; // 2,1,1,2, 1,1,1,2 | 1,2,1,2 | 2,3,1,2, 1,3,1,2 | 1,4,1,2
  var expect3 = [3,1,3,2,2,1,3,2,1,1,3,2,3,2,3,2,1,2,3,2,3,3,3,2,2,3,3,2,1,3,3,2,1,4,3,2]; // 3,1,3,2, 2,1,3,2, 1,1,3,2 | 3,2,3,2, 1,2,3,2 | 3,3,3,2, 2,3,3,2, 1,3,3,2 | 1,4,3,2
  
  InheritanceTest.getInstances = function() {
    return [new InheritanceTest(new class1(),expect1,"class1"),
            new InheritanceTest(new class2(),expect2,"class2"),
            new InheritanceTest(new class3(),expect3,"class3")];
  };
  
  InheritanceTest.prototype = {
      toString: function() {
        return "[InheritanceTest|" + this.name + "]";
      },
      
      start:function() { 
        var res = this.obj.method1();
        res = res.concat(this.obj.method2());
        res = res.concat(this.obj.method3());
        res = res.concat(this.obj.method4());
     
        testLogger.info("Check values",this.name);
        ASSERT.compareArrays(res,this.expect,true);

        this.end();
      }
  };
  
  wInheritance(InheritanceTest,AbstractTest);
  return InheritanceTest;
  
});