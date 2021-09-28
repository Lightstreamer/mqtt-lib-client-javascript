(function(root, factory, customNsAttr, defaultNs, libraryNames) {
  // Browser globals (root is window)
  var scripts = root.document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var attr = scripts[i].attributes;
    if (attr['src']) {
      var pathElems = attr['src'].value.split('/');
      if (libraryNames.indexOf(pathElems[pathElems.length - 1])>=0) {
        var returnExport = {};
        factory(null, returnExport);
        var ns = (attr[customNsAttr] || { value: defaultNs }).value;
        var head = root;
        if (ns) {
          var tokens = ns.split('.')
          for (var j = 0; j < tokens.length - 1; j++) {
            head[tokens[j]] = {};
            head = head[tokens[j]];
          };
          head[tokens[j]] = returnExport;
        } else {
          for (var cl in returnExport) {
            head[cl] = returnExport[cl];
          }
          break;
        }
      }
    }
  }

})(this, function() {
  return 'myobject';
});