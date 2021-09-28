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
define([weswitClassPrefix+"EventDispatcher","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(EventDispatcher,AbstractTest,Inheritance,ASSERT) {
  
  var testLogger = AbstractTest.testLogger;
  
  function ListenerClass(expecting) {
    this.received = {
        event1: false, //simple event
        event2: false, //1 param event
        event3: false  //multiple (2) params event 
    };
    this.running = false;
    this.expecting = expecting;
  };
  ListenerClass.prototype = {
      
      event1: function() {
        ASSERT.verifyOk(this.running);
        this.received.event1 = true;
        this.check("event1");
      },
      event2: function(a) {
        ASSERT.verifyOk(this.running);
        this.received.event2 = a;
        this.check("event2");
      },
      event3: function(a,b) {
        ASSERT.verifyOk(this.running);
        this.received.event3 = a+b;
        this.check("event3");
      },
      
      check: function(event,checkForFalse) {
        if (checkForFalse) {
          ASSERT.verifyValue(this.received[event],false);
        } else {
          ASSERT.verifyValue(this.received[event],this.expecting[event]);
        }
        
      },
      
      onListenStart: function() {
        ASSERT.verifyNotOk(this.running);
        this.running = true;
      },
      
      onListenEnd: function() {
        ASSERT.verifyOk(this.running);
        this.running = false;
      }
    };
  
  

  
  var EventDispatcherTest = function(sync) {
    this._callSuperConstructor(EventDispatcherTest);
    this.sync = sync;
    this.dis = new EventDispatcher();
    this.dis.useSynchEvents(this.sync);
  };
  
  EventDispatcherTest.getInstances = function() {
    return [new EventDispatcherTest(true),new EventDispatcherTest(false)];
  };
  
  EventDispatcherTest.prototype = {
      toString: function() {
        return "[EventDispatcherTest|"+this.sync+"]";
      },
      
      check: function(listener,event,expect) {
        ASSERT.verifyValue(listener.received[event],expect);
      },
      
      start:function() { 
        var listener1 = new ListenerClass({"event1":true,"event2":1,"event3":2}); //will receive events 1 2 and 3
        var listener2 = new ListenerClass({"event1":false,"event2":false,"event3":false}); //will receive no events
        var listener3 = new ListenerClass({"event1":this.sync,"event2":false,"event3":false}); //will receive event 1 in the sync case, nothing otherwise
        var listener4 = new ListenerClass({"event1":false,"event2":false,"event3":2}); //will receive event 3 
        var that = this;
       
        var getTester = function(event) {
          return function(checkFolFalse) {
            listener1.check(event,checkFolFalse);
            listener2.check(event,checkFolFalse);
            listener3.check(event,checkFolFalse);
            listener4.check(event,checkFolFalse);
            if (event == "event3" && !checkFolFalse) {
              that.end();
            }
          };
        };
        
        this.dis.addListener(listener1);
        this.dis.addListener(listener2);
        this.dis.addListener(listener3);

        //adding'em twice should not make any difference
        this.dis.addListener(listener1);
        this.dis.addListener(listener2);
        this.dis.addListener(listener3);
        
        this.dis.removeListener(listener2);
        
        //event 1
        this.dispatch("event1",getTester("event1"));
        
        this.dis.removeListener(listener3);
        
        //event 2
        this.dispatch("event2",getTester("event2"),[1]);
        
        this.dis.addListener(listener4);
        
        //event 3
        this.dispatch("event3",getTester("event3"),[1,1]);
        
      },
      
      dispatch: function(event,tester,params) {
        this.dis.dispatchEvent(event,params);
        if (this.sync) {
          tester();
        } else {
          tester(true);
          setTimeout(tester,1000);
        }
      }
  };
  
  Inheritance(EventDispatcherTest,AbstractTest);
  return EventDispatcherTest;
  
});
