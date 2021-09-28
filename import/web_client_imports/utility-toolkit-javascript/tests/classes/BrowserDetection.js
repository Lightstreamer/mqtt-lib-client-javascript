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
define([weswitClassPrefix+"BrowserDetection","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT"],
    function(BrowserDetection,AbstractTest,Inheritance,ASSERT) {
  
  var BrowserDetectionTest = function() {
    this._callSuperConstructor(BrowserDetectionTest);
  };
  
  BrowserDetectionTest.getInstances = function() {
    return [new BrowserDetectionTest()];
  };
  
  BrowserDetectionTest.prototype = {
      toString: function() {
        return "[BrowserDetectionTest]";
      },
      
      start:function() { 
        
        //simply check that exceptions are not thrown
        //we may be using one of these
        ASSERT.verifySuccess(BrowserDetection,"isProbablyRekonq",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyChrome",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyAWebkit",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyPlaystation",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyAndroidBrowser",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyOperaMobile",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyAKhtml",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyKonqueror",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyIE",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyEdge",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyFX",ASSERT.VOID,ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyOldOpera",ASSERT.VOID,ASSERT.VOID);
        
        /**
         * true to check versions up to the specified one, false to check for greater versions; the specified version
         * is always included. If missing only the specified version is considered.
         */
        
        //can be certain we're not using version 1 of these browsers
        ASSERT.verifySuccess(BrowserDetection,"isProbablyChrome",[1],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyKonqueror",[1],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyIE",[1],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyFX",[1],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyOldOpera",[1],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyApple",[1],false);
        
        //we may be using one of these
        ASSERT.verifySuccess(BrowserDetection,"isProbablyChrome",[1,false],ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyKonqueror",[1,false],ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyIE",[1,false],ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyFX",[1,false],ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyOldOpera",[1,false],ASSERT.VOID);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyApple",[1,false],ASSERT.VOID);
        
        //can be certain we're not using version 1 or lower of these browsers
        ASSERT.verifySuccess(BrowserDetection,"isProbablyChrome",[1,true],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyKonqueror",[1,true],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyIE",[1,true],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyFX",[1,true],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyOldOpera",[1,true],false);
        ASSERT.verifySuccess(BrowserDetection,"isProbablyApple",[1,true],false);
        
        this.end();
      }
  };
  
  Inheritance(BrowserDetectionTest,AbstractTest);
  return BrowserDetectionTest;
  
});