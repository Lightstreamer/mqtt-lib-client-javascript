define(["weswit/TestRunner","weswit/ASSERT","classes","./TestLogConfiguration"], 
        function(TestRunner,ASSERT,classes,log) {
    
  var mainRunner = new TestRunner();
   
  for (var i = 0; i<classes.length; i++) {
    var instances = classes[i].getInstances();
    for (var x = 0; x < instances.length; x++) {
      mainRunner.pushTest(instances[x]);
    }
  }
   
   
  mainRunner.addListener({
    onAllTestComplete:function(fails) {
      if (fails > 0) {
        log.error("Test completed with "+fails+" errors, check log for details");
      } else {
        log.info("All test passed");
      }
        
    },
    onTestStart: function(index,test) {
      log.info("Starting " + (index+1) + " of " + mainRunner.size() +  " (" +test+ ")");
    },
    onTestEnd:function(index,test) {
      log.info("Completed " + (index+1) + " of " + mainRunner.size() + " (" +test+ ")");
    }
  });
  
  mainRunner.start();
  
  return mainRunner;
 
});