{
    dir: "built_placeholder",
    baseUrl: "source_placeholder",
    keepBuildDir: false,
    generateSourceMaps: true,
    optimize: "closure",
    closure: {
        CompilationLevel: 'ADVANCED_OPTIMIZATIONS',
        CompilerOptions: {
            "languageIn": Packages.com.google.javascript.jscomp.CompilerOptions.LanguageMode.ECMASCRIPT5,
            "checkTypes": true,
            "parseJsDocDocumentation": true
        },
        loggingLevel: 'SEVERE',
        externs: [
          // These are place holders, which will be replaced at build time.
          "input_node_externs_value",
          "input_externs_value",
          "input_logging_externs_value"
        ],
        ignoreDefaultExterns: false,
        avoidGlobals: false
    },
    preserveLicenseComments: false,

    //this will prevent the initial module search from searching the
    //required imported modules*
    paths: {
      "Lightstreamer": "empty:",
      "LightstreamerClient": "empty:",
      "Subscription": "empty:",
      "IllegalArgumentException": "empty:",
      "IllegalStateException": "empty:",
      "Inheritance": "empty:",
      "Environment": "empty:",
      "LoggerManager": "empty:",
    },

    //we could remove the ASSERT calls
    /*pragmas: {
      debugExclude: true
    },*/

    modules: [
      {
        name: "LightstreamerMQTT",
        // All other dependencies will be resolved by r.js, so there is no
        // need to specify all modules to include.
        include: [
              "openSession",
              "store/DefaultStorage_node",
              "req_alt"
        ]
      }
    ],

    // Put here all sub-folders of the source directory.
    rFolders: [
      "impl",
      "utils",
      "store"
    ],

    logLevel: 0,

    onBuildWrite: function (moduleName, path, contents) {
      var libName = "library_placeholder_value";
      var libTag = libName + "_client";

      contents = contents.replace("library_name_placeholder", libName);
      contents = contents.replace("library_tag_placeholder", libTag);

      var versionNumber = "version_placeholder_value";
      if (!/[.0-9]+/.test(versionNumber)) {
        versionNumber = "1000.0";
      }

      contents = contents.replace("version_placeholder", versionNumber);
      var buildNumber = "build_placeholder_value";
      if (isNaN(buildNumber)) {
        buildNumber = 1;
      }
      contents = contents.replace("build_placeholder", buildNumber);

      contents = contents.replace("../", "", "gm");
      contents = contents.replace("./", "", "gm");

      for (var i = 0; i < this.rFolders.length; i++) {
        contents = contents.replace(this.rFolders[i] + "/", "", "gm");
      }

      return contents;
    }

}