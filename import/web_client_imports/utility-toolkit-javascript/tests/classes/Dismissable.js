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
define([weswitClassPrefix+"Dismissable","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(Dismissable,AbstractTest,Inheritance,ASSERT) {
   
  var TIME = 1000; //lower it?
  
  var testLogger = AbstractTest.testLogger;
  
  var DismissableTest = function() {
    this._callSuperConstructor(DismissableTest);
    this.initTouches(TIME);
    this.waitTheEnd = false;
    this.cleaned = false;
  };
  
  DismissableTest.getInstances = function() {
    return [new DismissableTest()];
  };
  
  DismissableTest.prototype = {
      toString: function() {
        return "[DismissableTest]";
      },
      
      clean: function() {
        this.cleaned = true;
        if (this.waitTheEnd) {
          this.end();
        } else {
          ASSERT.fail();
        }
      },
      
      start:function() { 
        this.touch();
        this.touch();
        
        this.dismiss();
       
        var that = this;
       
        setTimeout(function() {
          //dismiss the other
          that.dismiss();
        },Math.round(TIME+TIME/4)); 
        
        setTimeout(function() {
          //touch again to prevent to be dismissed
          that.touch();
        },Math.round(TIME+TIME/2)); 
        
        setTimeout(function() {
          //do the final dismiss
          that.dismiss();
          that.waitTheEnd = true;
        },Math.round(TIME+TIME/2)*2);
        
        setTimeout(function() {
          //do the final dismiss
          if(!that.cleaned) {
            ASSERT.fail();
            that.end();
          }
          
        },Math.round(TIME+TIME/2)*3);
        
      }
  };
  
  Inheritance(DismissableTest,AbstractTest);
  Inheritance(DismissableTest,Dismissable,true,true);
  return DismissableTest;
  
});