require({

    baseUrl: "../source",
    keepBuildDir: false,
    generateSourceMaps: true,
    optimize: "closure",
    closure: {
        CompilationLevel: 'ADVANCED_OPTIMIZATIONS',
        loggingLevel: 'SEVERE',
        externs: [
          "externs.js"
        ],
        ignoreDefaultExterns: false,
        avoidGlobals: true
    },
        
    removeCombined: true,
    
    modules: [
      {
        name: "utility-toolkit",
        include: [
          "BrowserDetection",
          "CookieManager",
          "Dismissable",
          "DoubleKeyMatrix",
          "DoubleKeyMap",
          "Environment",
          "EnvironmentStatus",
          "EventDispatcher",
          "Executor",
          "ExecutorSimple",
          "Helpers",
          "IFrameHandler",
          "IllegalArgumentException",
          "IllegalStateException",
          "Inheritance",
          "List",
          "Matrix",
          "Setter"
        ]
      }
    ],
    
    preserveLicenseComments: false
})