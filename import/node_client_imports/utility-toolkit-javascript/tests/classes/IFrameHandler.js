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
define([weswitClassPrefix+"IFrameHandler","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(IFrameHandler,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;

  var IFrameHandlerTest = function(createMethod,secondParam,name) {
    this._callSuperConstructor(IFrameHandlerTest);
     
    this.createMethod = createMethod;
    this.secondParam = secondParam;
    this.name = name;
  };
  
  IFrameHandlerTest.getInstances = function() {
    return [new IFrameHandlerTest("createFrame",null,"LS__testframe1"),new IFrameHandlerTest("createFrame",null,"LS__testframe1b"),new IFrameHandlerTest("getFrameWindow",true,"LS__testframe2")];
  };
  
  IFrameHandlerTest.prototype = {
      toString: function() {
        return "[IFrameHandlersTest"+this.name+"]";
      },
      
      start:function() { 
        
        var startupHistory = window.history.length;
        
        testLogger.debug("Check that does not exists");
        ASSERT.verifySuccess(IFrameHandler,"getFrameWindow",[this.name],null,true);
        
        var that = this;
        testLogger.debug("Check create");
        ASSERT.verifySuccess(IFrameHandler,this.createMethod,[this.name,this.secondParam],null,function(v1,v2) {
          testLogger.debug("Check iframe");
          ASSERT.verifyOk(v1);
          
          testLogger.debug("Check getFrameWindow");
          return ASSERT.verifySuccess(IFrameHandler,"getFrameWindow",[that.name],v1,true);
          
        });

        var inn = document.getElementsByTagName("BODY")[0].innerHTML;
        inn = inn.toLowerCase();
        
        testLogger.debug("Check BODY 1");
        ASSERT.verifyOk(inn.indexOf("<"+"iframe") > -1);
        
        inn = inn.substring(inn.indexOf("<"+"iframe")+1);
        testLogger.debug("Check BODY 2");
        ASSERT.verifyOk(inn.indexOf("<"+"iframe") <= -1);
        
        testLogger.debug("Delete");
        ASSERT.verifySuccess(IFrameHandler,"disposeFrame",[this.name],ASSERT.VOID);
        testLogger.debug("Check deletion");
        ASSERT.verifySuccess(IFrameHandler,"getFrameWindow",[this.name],null,true);
        
        inn = document.getElementsByTagName("BODY")[0].innerHTML;
        inn = inn.toLowerCase();
        testLogger.debug("Check deletion via BODY");
        ASSERT.verifyOk(inn.indexOf("<"+"iframe") <= -1);
        
        var endHistory = window.history.length;
        ASSERT.verifyValue(startupHistory,endHistory);
       
        this.end();
        
      }
  };
  
  Inheritance(IFrameHandlerTest,AbstractTest);
  return IFrameHandlerTest;
  
});