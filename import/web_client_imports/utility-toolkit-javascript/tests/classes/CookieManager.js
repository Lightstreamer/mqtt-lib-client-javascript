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
define([weswitClassPrefix+"CookieManager","weswit/AbstractTest","weswit/Inheritance","weswit/ASSERT","weswit/Environment"],
    function(CookieManager,AbstractTest,Inheritance,ASSERT,Environment) {
  
  var testLogger = AbstractTest.testLogger;
  
  var CookieManagerTest = function() {
    this._callSuperConstructor(CookieManagerTest);
  };
  
  CookieManagerTest.getInstances = function() {
    return [new CookieManagerTest()];
  };
  
  CookieManagerTest.prototype = {
      toString: function() {
        return "[CookieManagerTest]";
      },
      
      start:function() { 
        if (!Environment.isBrowserDocument() || document.location.protocol == "file:") {
          ASSERT.verifySuccess(CookieManager, "areCookiesEnabled", ASSERT.VOID, false);
          this.end();
          return;
        }
        ASSERT.verifySuccess(CookieManager, "areCookiesEnabled", ASSERT.VOID, true);
        
        var originalCookies = document.cookie;
        
        ASSERT.verifySuccess(CookieManager, "getAllCookiesAsSingleString", ASSERT.VOID, originalCookies);
        
        ASSERT.verifySuccess(CookieManager, "writeCookie", ["testKey","testVal"], ASSERT.VOID);
  
        ASSERT.verifySuccess(CookieManager, "getAllCookiesAsSingleString", ASSERT.VOID, originalCookies, function(v1,v2) { return v1 != v2; });
        
        ASSERT.verifySuccess(CookieManager, "readCookie", ["testKey"], "testVal");
        
        ASSERT.verifySuccess(CookieManager, "removeCookie", ["testKey"], ASSERT.VOID);
        
        ASSERT.verifySuccess(CookieManager, "readCookie", ["testKey"], null, true);

        ASSERT.verifySuccess(CookieManager, "getAllCookiesAsSingleString", ASSERT.VOID, originalCookies);
        
        this.end();
      }
  };
  
  Inheritance(CookieManagerTest,AbstractTest);
  return CookieManagerTest;
  
});