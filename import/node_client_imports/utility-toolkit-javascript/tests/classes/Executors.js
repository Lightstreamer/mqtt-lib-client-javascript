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
define([weswitClassPrefix+"Executor",weswitClassPrefix+"ExecutorSimple","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(Executor,ExecutorSimple,AbstractTest,Inheritance,ASSERT) {
   
  var testLogger = AbstractTest.testLogger;
  
  var EASE = 200;

  var ExecutorTest = function(executorModule) {
    this._callSuperConstructor(ExecutorTest);
    this.executorModule = executorModule;
    
    this.order = 0;
    this.next = 0;
    
    this.total = 0; 
  };
  
  ExecutorTest.getInstances = function() {
    return [new ExecutorTest(Executor),new ExecutorTest(ExecutorSimple)];
  };
  
  ExecutorTest.prototype = {
      toString: function() {
        return "[ExecutorsTest" + this.executorModule + "]";
      },
      
      getTimeVerifierSimple: function() {
        var that = this;
        var current = this.order++;
        return function(startup,delay) {
          testLogger.debug("execute " + current);
          ASSERT.verifyValue(current,that.next);
          that.next++;
          ASSERT.verifyValue(startup+delay, new Date().getTime(), function(v1,v2) {
            return Math.abs(v2-v1) < EASE;
          });
        };
      },
      
      getTimeVerifier: function() {
        var that = this;
        var one = this.getTimeVerifierSimple();
        return function(startup,delay) {
          one(startup,delay);
          that.taskDone();
        };
      },
      
      taskDone: function() {
        this.total--;
        if (this.total == 0) {
          this.end();
        }
      },
      
      start:function() { 
       
        var that = this;
        var oneSecParams = [new Date().getTime(),1000];
        
        //executeTask - 0
        var firstTask =  this.executorModule.packTask(this.getTimeVerifier(),null, [new Date().getTime(),0]);
        this.executorModule.executeTask(firstTask); //total goes to -1
        this.total++; //total goes to 0
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        //addTimedTask 0 - 1
        this.executorModule.addTimedTask(this.getTimeVerifier(),0,null,[new Date().getTime(),0]);//needs to be asynchronous
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        
        //addTimedTask - 2
        this.executorModule.addTimedTask(this.getTimeVerifier(),1000,null,oneSecParams);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        //addPackedTimedTask - 3
        var externallyPacked =  this.executorModule.packTask(this.getTimeVerifier(),null,oneSecParams);
        this.executorModule.addPackedTimedTask(externallyPacked,1000);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        //addRepetitiveTask - 4
        var firstRun = this.getTimeVerifierSimple();
        var run = 0;
        var repeatTask = this.executorModule.addRepetitiveTask(function(a,b) {
          if (run == 0) {
            firstRun(a,b);
          } else if (run == 2) {
            //ok, let's stop
            that.executorModule.stopRepetitiveTask(repeatTask);
            that.taskDone();
          } 
          
          ASSERT.verifyValue(run, 2, function(v1,v2) {
            return v1 <= v2;
          });
          
          run++;
        
        },1000,null,oneSecParams);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        //modifyTaskParam - 5
        var modifyOneTask = this.executorModule.addTimedTask(this.getTimeVerifier(),1000,null,[new Date().getTime(),5000]);
        this.executorModule.modifyTaskParam(modifyOneTask,1,1000);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        //modifyAllTaskParams - 6
        var modifyAllTask = this.executorModule.addTimedTask(this.getTimeVerifier(),1000,null,[5000,5000]);
        this.executorModule.modifyAllTaskParams(modifyAllTask,oneSecParams);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
        //with context - 7
        var context = {
            fun: function(a,b) {
              this.coreFun(a,b);
            },
            coreFun: this.getTimeVerifier()
        };
        this.executorModule.addTimedTask(context.fun,1000,context,oneSecParams);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
         
        //delayTask - 8
        var delayTask = this.executorModule.addTimedTask(this.getTimeVerifier(),100,null,oneSecParams);
        this.executorModule.delayTask(delayTask,1000);
        this.total++;
        ASSERT.verifySuccess(this.executorModule, "getQueueLength", ASSERT.VOID, this.total, true);
        
      }
  };
  
  Inheritance(ExecutorTest,AbstractTest);
  return ExecutorTest;
  
});