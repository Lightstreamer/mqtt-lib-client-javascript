({
    dir: "../builtWeswit/",
    
    mainConfigFile: "main.config.js",
    
    wrap: {
        start: "(function(o) {var l='weswit/';var e=new RegExp('^\\./');var define = function(c,a,d){for(var b=0;b<a.length;b++)a[b]=l+a[b].replace(e,'');o(l+c,a,d)};",
        end: "}(define));"
    }
    
})