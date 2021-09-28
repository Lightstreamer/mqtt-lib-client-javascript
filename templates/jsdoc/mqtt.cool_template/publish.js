'use strict';

var doop = require('jsdoc/util/doop');
var env = require('jsdoc/env');
var fs = require('jsdoc/fs');
var helper = require('jsdoc/util/templateHelper');
var logger = require('jsdoc/util/logger');
var path = require('jsdoc/path');
var taffy = require('taffydb').taffy;
var template = require('jsdoc/template');
var util = require('util');

var htmlsafe = helper.htmlsafe;

var linkto = function(longname, linkText, cssClass, fragmentId) {
    // intercepted, to add a check and a report of the failed links
    var theLink = helper.linkto(longname, linkText, cssClass, fragmentId);
    heuristicallyCheckFailure(longname, theLink);
    return theLink;
};
var resolveAndCheckLinks = function(html) {
    // intercepted, to add a check and a report of the failed links;
    var result = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
    // this second call only performs the check, by internally redirecting to our version of linkto
    resolveLinksCopiedFromHelperToEnforceChecks(html);
    return result;
};
var writeFileSync = function(path, html, enc) {
    // intercepted, to add logging of some context
    logger.info("Writing file: " + path);
    fs.writeFileSync(path, html, enc);
}
logger.setLevel(logger.LEVELS.INFO);

var resolveAuthorLinks = helper.resolveAuthorLinks;
var scopeToPunc = helper.scopeToPunc;
var hasOwnProp = Object.prototype.hasOwnProperty;

var data;
var view;

var outdir = path.normalize(env.opts.destination);

function find(spec) {
    return helper.find(data, spec);
}

function tutoriallink(tutorial) {
    return helper.toTutorial(tutorial, null, { tag: 'em', classname: 'disabled', prefix: 'Tutorial: ' });
}

function getAncestorLinks(doclet) {
    return helper.getAncestorLinks(data, doclet);
}

function hashToLink(doclet, hash) {
    if ( !/^(#.+)/.test(hash) ) { return hash; }

    var url = helper.createLink(doclet);

    url = url.replace(/(#.+|$)/, hash);
    return '<a href="' + url + '">' + hash + '</a>';
}

function needsSignature(doclet) {
    var needsSig = false;

    // function and class definitions always get a signature
    if (doclet.kind === 'function' || doclet.kind === 'class') {
        needsSig = true;
    }
    // typedefs that contain functions get a signature, too
    else if (doclet.kind === 'typedef' && doclet.type && doclet.type.names &&
        doclet.type.names.length) {
        for (var i = 0, l = doclet.type.names.length; i < l; i++) {
            if (doclet.type.names[i].toLowerCase() === 'function') {
                needsSig = true;
                break;
            }
        }
    }

    return needsSig;
}

function getSignatureAttributes(item) {
    var attributes = [];

    if (item.optional) {
        attributes.push('opt');
    }

    if (item.nullable === true) {
        attributes.push('nullable');
    }
    else if (item.nullable === false) {
        attributes.push('non-null');
    }

    return attributes;
}

function updateItemName(item) {
    var attributes = getSignatureAttributes(item);
    var itemName = item.name || '';

    if (item.variable) {
        itemName = '&hellip;' + itemName;
    }

    if (attributes && attributes.length) {
        itemName = util.format( '%s<span class="signature-attributes">%s</span>', itemName,
            attributes.join(', ') );
    }

    return itemName;
}

function addParamAttributes(params) {
    return params.filter(function(param) {
        return param.name && param.name.indexOf('.') === -1;
    }).map(updateItemName);
}

function buildItemTypeStrings(item) {
    var types = [];

    if (item && item.type && item.type.names) {
        item.type.names.forEach(function(name) {
            types.push( linkto(name, htmlsafe(name)) );
        });
    }

    return types;
}

function buildAttribsString(attribs) {
    var attribsString = '';

    if (attribs && attribs.length) {
        attribsString = htmlsafe( util.format('(%s) ', attribs.join(', ')) );
    }

    return attribsString;
}

function addNonParamAttributes(items) {
    var types = [];

    items.forEach(function(item) {
        types = types.concat( buildItemTypeStrings(item) );
    });

    return types;
}

function addSignatureParams(f) {
    var params = f.params ? addParamAttributes(f.params) : [];

    f.signature = util.format( '%s(%s)', (f.signature || ''), params.join(', ') );
}

function addSignatureReturns(f) {
    var attribs = [];
    var attribsString = '';
    var returnTypes = [];
    var returnTypesString = '';

    // jam all the return-type attributes into an array. this could create odd results (for example,
    // if there are both nullable and non-nullable return types), but let's assume that most people
    // who use multiple @return tags aren't using Closure Compiler type annotations, and vice-versa.
    if (f.returns) {
        f.returns.forEach(function(item) {
            helper.getAttribs(item).forEach(function(attrib) {
                if (attribs.indexOf(attrib) === -1) {
                    attribs.push(attrib);
                }
            });
        });

        attribsString = buildAttribsString(attribs);
    }

    if (f.returns) {
        returnTypes = addNonParamAttributes(f.returns);
    }
    if (returnTypes.length) {
        returnTypesString = util.format( ' &rarr; %s{%s}', attribsString, returnTypes.join('|') );
    }

    f.signature = '<span class="signature">' + (f.signature || '') + '</span>' +
        '<span class="type-signature">' + returnTypesString + '</span>';
}

function addSignatureTypes(f) {
    var types = f.type ? buildItemTypeStrings(f) : [];

    f.signature = (f.signature || '') + '<span class="type-signature">' +
        (types.length ? ' :' + types.join('|') : '') + '</span>';
}

function addAttribs(f) {
    var attribs = helper.getAttribs(f);
    var attribsString = buildAttribsString(attribs);

    f.attribs = util.format('<span class="type-signature">%s</span>', attribsString);
}

function shortenPaths(files, commonPrefix) {
    Object.keys(files).forEach(function(file) {
        files[file].shortened = files[file].resolved.replace(commonPrefix, '')
            // always use forward slashes
            .replace(/\\/g, '/');
    });

    return files;
}

function getPathFromDoclet(doclet) {
    if (!doclet.meta) {
        return null;
    }

    return doclet.meta.path && doclet.meta.path !== 'null' ?
        path.join(doclet.meta.path, doclet.meta.filename) :
        doclet.meta.filename;
}

function generate(title, docs, filename, conf, resolveLinks) {
    resolveLinks = resolveLinks === false ? false : true;
    conf = conf || {};

    var docData = {
        env: env,
        footerText: conf.footerText || "",
        title: title,
        docs: docs
    };

    var outpath = path.join(outdir, filename),
        html = view.render('container.tmpl', docData);

    if (resolveLinks) {
        html = resolveAndCheckLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
    }

    writeFileSync(outpath, html, 'utf8');
}

function generateIndex(title, docs, filename, conf, names) {
  var docData = {
      title: title,
      footerText: conf.footerText || "",
      docs: docs,
      names: names
  };

  var outpath = path.join(outdir, filename),
      html = view.render('index.tmpl', docData);

  html = resolveAndCheckLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>

  writeFileSync(outpath, html, 'utf8');
}

function generateExterns(data) {
    var outputText = "";
    data.forEach(function(el) {
        el.forEach(function(member) {
          if (member.name == "undefined" || member.memberof == "undefined") {
            //skip
          } else {
            //instance methods
            outputText+=member.extern+"\n";
          }
        });
    });

    var outpath = path.join(outdir, "externs.js");
    writeFileSync(outpath, outputText, 'utf8');
}

function generateSourceFiles(sourceFiles, encoding, conf) {
    encoding = encoding || 'utf8';
    Object.keys(sourceFiles).forEach(function(file) {
        var source;
        // links are keyed to the shortened path in each doclet's `meta.shortpath` property
        var sourceOutfile = helper.getUniqueFilename(sourceFiles[file].shortened);
        helper.registerLink(sourceFiles[file].shortened, sourceOutfile);

        try {
            source = {
                kind: 'source',
                code: helper.htmlsafe( fs.readFileSync(sourceFiles[file].resolved, encoding) )
            };
        }
        catch(e) {
            logger.error('Error while generating source file %s: %s', file, e.message);
        }

        generate('Source: ' + sourceFiles[file].shortened, [source], sourceOutfile,
            conf, false);
    });
}

/**
 * Look for classes or functions with the same name as modules (which indicates that the module
 * exports only that class or function), then attach the classes or functions to the `module`
 * property of the appropriate module doclets. The name of each class or function is also updated
 * for display purposes. This function mutates the original arrays.
 *
 * @private
 * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
 * check.
 * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
 */
function attachModuleSymbols(doclets, modules) {
    var symbols = {};

    // build a lookup table
    doclets.forEach(function(symbol) {
        symbols[symbol.longname] = symbols[symbol.longname] || [];
        symbols[symbol.longname].push(symbol);
    });

    return modules.map(function(module) {
        if (symbols[module.longname]) {
            module.modules = symbols[module.longname]
                // Only show symbols that have a description. Make an exception for classes, because
                // we want to show the constructor-signature heading no matter what.
                .filter(function(symbol) {
                    return symbol.description || symbol.kind === 'class';
                })
                .map(function(symbol) {
                    symbol = doop(symbol);

                    if (symbol.kind === 'class' || symbol.kind === 'function') {
                        symbol.name = symbol.name.replace('module:', '(require("') + '"))';
                    }

                    return symbol;
                });
        }
    });
}

function buildMemberNav(items, itemHeading, itemsSeen, linktoFn) {
    var nav = '';

    if (items.length) {
        var itemsNav = '';

        items.forEach(function(item) {
            if ( !hasOwnProp.call(item, 'longname') ) {
                itemsNav += '<li>' + linktoFn('', item.name) + '</li>';
            }
            else if ( !hasOwnProp.call(itemsSeen, item.longname) ) {
                var displayName;
                if (env.conf.templates.default.useLongnameInNav) {
                    displayName = item.longname;
                } else {
                    displayName = item.name;
                }
                itemsNav += '<li class="signature">' + linktoFn(item.longname, displayName.replace(/\b(module|event):/g, '')) + '</li>';

                itemsSeen[item.longname] = true;
            }
        });

        if (itemsNav !== '') {
            nav += '<h3>' + itemHeading + '</h3><ul>' + itemsNav + '</ul>';
        }
    }

    return nav;
}

function linktoTutorial(longName, name) {
    return tutoriallink(name);
}

function linktoExternal(longName, name) {
    return linkto(longName, name.replace(/(^"|"$)/g, ''));
}

/**
 * Create the navigation sidebar.
 * @param {object} members The members that will be used to create the sidebar.
 * @param {array<object>} members.classes
 * @param {array<object>} members.externals
 * @param {array<object>} members.globals
 * @param {array<object>} members.mixins
 * @param {array<object>} members.modules
 * @param {array<object>} members.namespaces
 * @param {array<object>} members.tutorials
 * @param {array<object>} members.events
 * @param {array<object>} members.interfaces
 * @return {string} The HTML for the navigation sidebar.
 */
function buildNav(members, logo) {
  var logoStr = "";
    if (logo && logo.img) {
      if(logo.link) {
        logoStr += '<a href="'+logo.link+'">';
      }
      logoStr += '<img src="' + logo.img + '"/>';
      if(logo.link) {
        logoStr += '</a>';
      }

      //TODO copy logo on deploy folder


      //var outpath = path.join(outdir, "logo.png");

    }

    var nav = logoStr + '<h2><a href="index.html">Home</a> | <a href="index-all.html">Index</a></h2>';
    var seen = {};
    var seenTutorials = {};

    nav += buildMemberNav(members.modules, 'Modules', {}, linkto);
    nav += buildMemberNav(members.externals, 'Externals', seen, linktoExternal);
    nav += buildMemberNav(members.classes, 'Classes', seen, linkto);
    nav += buildMemberNav(members.events, 'Events', seen, linkto);
    nav += buildMemberNav(members.namespaces, 'Namespaces', seen, linkto);
    nav += buildMemberNav(members.mixins, 'Mixins', seen, linkto);
    nav += buildMemberNav(members.tutorials, 'Tutorials', seenTutorials, linktoTutorial);
    nav += buildMemberNav(members.interfaces, 'Interfaces', seen, linkto);

    if (members.globals.length) {
        var globalNav = '';

        members.globals.forEach(function(g) {
            if ( g.kind !== 'typedef' && !hasOwnProp.call(seen, g.longname) ) {
                globalNav += '<li>' + linkto(g.longname, g.name) + '</li>';
            }
            seen[g.longname] = true;
        });

        if (!globalNav) {
            // turn the heading into a link so you can actually get to the global page
            nav += '<h3>' + linkto('global', 'Global') + '</h3>';
        }
        else {
            nav += '<h3>Global</h3><ul>' + globalNav + '</ul>';
        }
    }

    return nav;
}

/**
    @param {TAFFY} taffyData See <http://taffydb.com/>.
    @param {object} opts
    @param {Tutorial} tutorials
 */
exports.publish = function(taffyData, opts, tutorials) {
    data = taffyData;

    var conf = env.conf.templates || {};
    conf['default'] = conf['default'] || {};
    conf['weswit'] = conf['weswit'] || {};


    var templatePath = path.normalize(opts.template);
    view = new template.Template( path.join(templatePath, 'tmpl') );

    // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
    // doesn't try to hand them out later
    var indexUrl = helper.getUniqueFilename('index');
    var indexAllUrl = helper.getUniqueFilename('index-all');

    // don't call registerLink() on this one! 'index' is also a valid longname

    var globalUrl = helper.getUniqueFilename('global');
    helper.registerLink('global', globalUrl);

    // set up templating
    view.layout = conf.default.layoutFile ?
        path.getResourcePath(path.dirname(conf.default.layoutFile),
            path.basename(conf.default.layoutFile) ) :
        'layout.tmpl';

    // set up tutorials for helper
    helper.setTutorials(tutorials);

    var externs = {};


         function searchDescription(className,methodName) {

            var _class = find({longname:className});
            for (var c=0; c<_class.length; c++) {
                if (_class[c].augments) {
                    for (var a = 0; a < _class[c].augments.length; a++) {

                        var _superMethod = find({longname: _class[c].augments[a] + "#" + methodName});
                        for (var s = 0; s < _superMethod.length; s++) {
                            if (_superMethod[s].inherits) {
                                return _superMethod[s].inherits;
                            } else if (_superMethod[s].description) {
                                return _superMethod[s].longname;
                            }
                        }


                        var inherits = searchDescription(_class[c].augments[a], methodName);
                        if (inherits) {
                            return inherits;
                        }

                    }
                }
            }

            return null;
        }



    //create summary if missing
    var methods = find({kind: 'function'});

    methods.forEach(function(m) {
      if (!m.summary && m.description) {
        var d = m.description;
        m.summary = d.indexOf(".") > -1 ? d.substring(0,d.indexOf(".")+1) : d;
      }

      if (!m.inherited) {
        m.inherited = false;
      }

      if (m.reimplemented !== true && m.reimplemented !== false) {
        var others = find({kind: 'function', longname: m.longname, inherited: true, memberof: m.memberof});
        var f = 0;
        others.forEach(function(o) {
          f++;
          if (!m.inherited) {
            m.inherits = o.inherits;
            o.reimplemented = true;
          } else if (f>1) {
            o.reimplemented = true;
          } else {
            o.reimplemented = false;
          }
        });

        if (!m.description && !m.inherits) {
            m.inherits = searchDescription(m.memberof, m.name);
            if (m.inherits) {
                m.inherited = true;
            }
        }
      }

    });

    var stuffWithSource = find({kind:  ['class', 'module', 'global']});
    stuffWithSource.forEach(function(m) {
      m.printSourceLink = conf['default'] && conf['default'].outputSourceFiles === true;
    });


    data = helper.prune(data);
    data.sort('longname, version, since');
    helper.addEventListeners(data);

    var sourceFiles = {};
    var sourceFilePaths = [];
    data().each(function(doclet) {
         doclet.attribs = '';

        if (doclet.examples) {
            doclet.examples = doclet.examples.map(function(example) {
                var caption, code;

                if (example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i)) {
                    caption = RegExp.$1;
                    code = RegExp.$3;
                }

                return {
                    caption: caption || '',
                    code: code || example
                };
            });
        }
        if (doclet.see) {
            doclet.see.forEach(function(seeItem, i) {
                doclet.see[i] = hashToLink(doclet, seeItem);
            });
        }

        // build a list of source files
        var sourcePath;
        if (doclet.meta) {
            sourcePath = getPathFromDoclet(doclet);
            sourceFiles[sourcePath] = {
                resolved: sourcePath,
                shortened: null
            };
            if (sourceFilePaths.indexOf(sourcePath) === -1) {
                sourceFilePaths.push(sourcePath);
            }
        }
    });

    // update outdir if necessary, then create outdir
    var packageInfo = ( find({kind: 'package'}) || [] ) [0];
    if (packageInfo && packageInfo.name) {
        outdir = path.join( outdir, packageInfo.name, (packageInfo.version || '') );
    }
    fs.mkPath(outdir);

    // copy the template's static files to outdir
    var fromDir = path.join(templatePath, 'static');
    var staticFiles = fs.ls(fromDir, 3);

    staticFiles.forEach(function(fileName) {
        var toDir = fs.toDir( fileName.replace(fromDir, outdir) );
        fs.mkPath(toDir);
        fs.copyFileSync(fileName, toDir);
    });

    // copy user-specified static files to outdir
    var staticFilePaths;
    var staticFileFilter;
    var staticFileScanner;
    if (conf.default.staticFiles) {
        // The canonical property name is `include`. We accept `paths` for backwards compatibility
        // with a bug in JSDoc 3.2.x.
        staticFilePaths = conf.default.staticFiles.include ||
            conf.default.staticFiles.paths ||
            [];
        staticFileFilter = new (require('jsdoc/src/filter')).Filter(conf.default.staticFiles);
        staticFileScanner = new (require('jsdoc/src/scanner')).Scanner();

        staticFilePaths.forEach(function(filePath) {
            var extraStaticFiles;

            filePath = path.resolve(env.pwd, filePath);
            extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

            extraStaticFiles.forEach(function(fileName) {
                var sourcePath = fs.toDir(filePath);
                var toDir = fs.toDir( fileName.replace(sourcePath, outdir) );
                fs.mkPath(toDir);
                fs.copyFileSync(fileName, toDir);
            });
        });
    }

    if (sourceFilePaths.length) {
        sourceFiles = shortenPaths( sourceFiles, path.commonPrefix(sourceFilePaths) );
    }
    data().each(function(doclet) {
        var url = helper.createLink(doclet);
        helper.registerLink(doclet.longname, url);

        // add a shortened version of the full path
        var docletPath;
        if (doclet.meta) {
            docletPath = getPathFromDoclet(doclet);
            docletPath = sourceFiles[docletPath].shortened;
            if (docletPath) {
                doclet.meta.shortpath = docletPath;
            }
        }
    });

    var namesForIndex = [];

    data().each(function(doclet) {

        //prepare alphabetic index (currently handles methods classes and modules TODO complete)
        //TODO might we use doclet.kind?
        var longname = doclet.longname
        if (longname.indexOf("~") > -1) {
          //hide private stuff
        } else if (longname.indexOf("#") > -1) {
          //instance methods
          var shortName = longname.substring(longname.indexOf("#")+1);
          shortName = shortName.replace(/"/g,'');

          var cName = longname.substring(0,longname.indexOf("#"));
          cName = cName.substring(cName.indexOf(":")+1);
          if (cName == "undefined") {
            cName = "Globals";
          }

          namesForIndex.push({name: shortName,
            definition: "Instance method in " + cName,
            extern: cName+".prototype."+shortName+" = function() {};",
            longname: longname,
            memberof: cName});

        } else if (longname.indexOf(".") > -1) {
          //static methods
          var shortName = longname.substring(longname.indexOf(".")+1);
          shortName = shortName.replace(/"/g,'');

          var cName = longname.substring(0,longname.indexOf("."));
          cName = cName.substring(cName.indexOf(":")+1);
          if (cName == "undefined") {
            cName = "Globals";
          }


          namesForIndex.push({name: shortName,
            definition: "Static method in " + cName,
            extern: cName+"."+shortName+" = function() {};",

            longname: longname,
            memberof: cName});

        } else if (longname.indexOf(":") > -1) {

          //name undefined means globals

          //modules
          var shortName = longname.substring(longname.indexOf(":")+1);
          shortName = shortName.replace(/"/g,'');
          if (shortName == "undefined") {
            shortName="Globals";
          }

          namesForIndex.push({name: shortName,
            definition: "Module " + shortName,
            extern: shortName+" = {};",
            longname: longname});
        } else {
          //classes
          var shortName = longname.replace(/"/g,'');
          namesForIndex.push({name: shortName,
            extern: shortName+" = function() {};",
            definition: "Class " + longname,
            longname: longname});
        }

        var url = helper.longnameToUrl[doclet.longname];

        if (url.indexOf('#') > -1) {
            doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
        }
        else {
            doclet.id = doclet.name;
        }

        if ( needsSignature(doclet) ) {
            addSignatureParams(doclet);
            addSignatureReturns(doclet);
            addAttribs(doclet);
        }
    });

    var compare = function(a, b) {
        var al = a.name.toLowerCase();
        var bl = b.name.toLowerCase();
        //console.log("Comparing " + al + " and " + bl);
        if (al == bl) {
          return 0;
        }
        return al < bl ? -1 : 1;
      };

    namesForIndex = namesForIndex.sort(compare);

    var byLetterIndex = [];//would be easier with a {}

    var curr = null;
    namesForIndex.forEach(function(el) {
      var l = el.name[0].toUpperCase();
      if (l != curr) {
        byLetterIndex.push([]);
        curr = l;
      }
      byLetterIndex[byLetterIndex.length-1].push(el);
    });

    namesForIndex = namesForIndex.sort(function(a,b) {
      if (a.memberof == b.memberof) {
        return compare(a, b);
      } else if (!a.memberof) {
        if (!b.memberof) {
          return compare(a, b);
        }
        return -1;
      } else if (!b.memberof) {
        return 1;
      }
      return a.memberof < b.memberof ? -1 : 1;
    });

    var externsIndex = [];
    externsIndex.push([]);
    curr = null;
    namesForIndex.forEach(function(el) {
      var l = el.memberof;
      if (l != curr) {
        externsIndex.push([]);
        curr = l;
      }
      externsIndex[externsIndex.length-1].push(el);
    });


    // do this after the urls have all been generated
    data().each(function(doclet) {
        doclet.ancestors = getAncestorLinks(doclet);

        if (doclet.kind === 'member') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
        }

        if (doclet.kind === 'constant') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
            doclet.kind = 'member';
        }
    });

    var members = helper.getMembers(data);
    members.tutorials = tutorials.children;

    // output pretty-printed source files by default
    var outputSourceFiles = conf.default && conf.default.outputSourceFiles !== false ? true :
        false;

    // add template helpers
    view.find = find;
    view.linkto = linkto;
    view.resolveAuthorLinks = resolveAuthorLinks;
    view.tutoriallink = tutoriallink;
    view.htmlsafe = htmlsafe;
    view.outputSourceFiles = outputSourceFiles;

    // once for all
    view.nav = buildNav(members, conf["weswit"].logo);
    attachModuleSymbols( find({ longname: {left: 'module:'} }), members.modules );

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles) {
        generateSourceFiles(sourceFiles, opts.encoding);
    }

    if (members.globals.length) { generate('Global', [{kind: 'globalobj'}], globalUrl, conf["weswit"]); }

    // index page displays information from package.json and lists files
    var files = find({kind: 'file'}),
        packages = find({kind: 'package'});

    /*generate('Home',
        packages.concat(
            [{kind: 'mainpage', readme: opts.readme, longname: (opts.mainpagetitle) ? opts.mainpagetitle : 'Main Page'}]
        ).concat(files),
    indexUrl);*/

    var libName = conf["weswit"] && conf["weswit"].extendedLibraryName ? conf["weswit"].extendedLibraryName : "Index";
    var summaryText = conf["weswit"].summaryFile ? fs.readFileSync( conf["weswit"].summaryFile, 'utf8' ) : (!opts.readme ? "Javascript Documentation" : null);

    generate(libName,
        packages.concat(
            [{
              kind: 'mainpage',
              readme: opts.readme,
              longname: (opts.mainpagetitle) ? opts.mainpagetitle : 'Main Page',
              summary:summaryText
            }]
        ).concat(files),
    indexUrl, conf["weswit"]);

    generateIndex("Index",
      packages.concat(
        [{
          kind: 'index',
          longname: 'Index Page',
        }]).concat(files),
    indexAllUrl, conf["weswit"],  byLetterIndex);

    generateExterns(externsIndex);

    // set up the lists that we'll use to generate pages
    var classes = taffy(members.classes);
    var modules = taffy(members.modules);
    var namespaces = taffy(members.namespaces);
    var mixins = taffy(members.mixins);
    var externals = taffy(members.externals);
    var interfaces = taffy(members.interfaces);

    Object.keys(helper.longnameToUrl).forEach(function(longname) {
        var myModules = helper.find(modules, {longname: longname});
        if (myModules.length) {
            generate('Module: ' + myModules[0].name, myModules, helper.longnameToUrl[longname], conf["weswit"]);
        }

        var myClasses = helper.find(classes, {longname: longname});
        if (myClasses.length) {
            generate('Class: ' + myClasses[0].name, myClasses, helper.longnameToUrl[longname], conf["weswit"]);
        }

        var myNamespaces = helper.find(namespaces, {longname: longname});
        if (myNamespaces.length) {
            generate('Namespace: ' + myNamespaces[0].name, myNamespaces, helper.longnameToUrl[longname], conf["weswit"]);
        }

        var myMixins = helper.find(mixins, {longname: longname});
        if (myMixins.length) {
            generate('Mixin: ' + myMixins[0].name, myMixins, helper.longnameToUrl[longname], conf["weswit"]);
        }

        var myExternals = helper.find(externals, {longname: longname});
        if (myExternals.length) {
            generate('External: ' + myExternals[0].name, myExternals, helper.longnameToUrl[longname], conf["weswit"]);
        }

        var myInterfaces = helper.find(interfaces, {longname: longname});
        if (myInterfaces.length) {
            generate('Interface: ' + myInterfaces[0].name, myInterfaces, helper.longnameToUrl[longname], conf["weswit"]);
        }
    });

    // TODO: move the tutorial functions to templateHelper.js
    function generateTutorial(title, tutorial, filename) {
        var tutorialData = {
            title: title,
            header: tutorial.title,
            content: tutorial.parse(),
            children: tutorial.children
        };

        var tutorialPath = path.join(outdir, filename),
            html = view.render('tutorial.tmpl', tutorialData);

        // yes, you can use {@link} in tutorials too!
        html = resolveAndCheckLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>

        writeFileSync(tutorialPath, html, 'utf8');
    }

    // tutorials can have only one parent so there is no risk for loops
    function saveChildren(node) {
        node.children.forEach(function(child) {
            generateTutorial('Tutorial: ' + child.title, child, helper.tutorialToUrl(child.name));
            saveChildren(child);
        });
    }
    saveChildren(tutorials);
};



/*
 * code copied from resolveLinks in 'jsdoc/util/templateHelper',
 * to workaround the fact that JSDoc code hides information on any failures to expanding links;
 * if JSDoc parsing rules change, this code may become obsolete
 *
 * this code is used only for the integrity check;
 * if any issue arises, this function and any invocations to it can be safely removed
 */
function resolveLinksCopiedFromHelperToEnforceChecks(str) {
    var replaceInlineTags = require('jsdoc/tag/inline').replaceInlineTags;

    function extractLeadingText(string, completeTag) {
        var tagIndex = string.indexOf(completeTag);
        var leadingText = null;
        var leadingTextRegExp = /\[(.+?)\]/g;
        var leadingTextInfo = leadingTextRegExp.exec(string);

        // did we find leading text, and if so, does it immediately precede the tag?
        while (leadingTextInfo && leadingTextInfo.length) {
            if (leadingTextInfo.index + leadingTextInfo[0].length === tagIndex) {
                string = string.replace(leadingTextInfo[0], '');
                leadingText = leadingTextInfo[1];
                break;
            }

            leadingTextInfo = leadingTextRegExp.exec(string);
        }

        return {
            leadingText: leadingText,
            string: string
        };
    }

    function processLink(string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag);
        var linkText = leading.leadingText;
        var monospace;
        var split;
        var target;
        string = leading.string;

        split = splitLinkText(tagInfo.text);
        target = split.target;
        linkText = linkText || split.linkText;

        /*
        monospace = useMonospace(tagInfo.tag, tagInfo.text);

        return string.replace( tagInfo.completeTag, buildLink(target, linkText, {
            linkMap: longnameToUrl,
            monospace: monospace
        }) );
        */
        return string.replace( tagInfo.completeTag, linkto(target, linkText));
    }

    function processTutorial(string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag);
        string = leading.string;

        return string.replace( tagInfo.completeTag, toTutorial(tagInfo.text, leading.leadingText) );
    }

    var replacers = {
        link: processLink,
        linkcode: processLink,
        linkplain: processLink,
        tutorial: processTutorial
    };

    return replaceInlineTags(str, replacers).newString;

    function splitLinkText(text) {
        var linkText;
        var target;
        var splitIndex;

        // if a pipe is not present, we split on the first space
        splitIndex = text.indexOf('|');
        if (splitIndex === -1) {
            splitIndex = text.search(/\s/);
        }

        if (splitIndex !== -1) {
            linkText = text.substr(splitIndex + 1);
            // Normalize subsequent newlines to a single space.
            linkText = linkText.replace(/\n+/, ' ');
            target = text.substr(0, splitIndex);
        }

        return {
            linkText: linkText,
            target: target || text
        };
    }
}

/*
 * this code is used only for the integrity check;
 * if any issue arises, this function and any invocations to it can be safely removed
 *
 * TODO find a better way to do the failure check
 */
function heuristicallyCheckFailure(longname, linkSnippet) {
    var predefined = [
        "String", "Number", "Object", "Boolean",
        "boolean", "int", "*",
        "Exception", "Array", "function",
        "Task", // used by the Executor class as a placeholder for its bean, but not defined
        "DOMElement", "Window" // add if more come up
    ];
    if (! linkSnippet.includes("href")) {
        if (predefined.indexOf(longname) < 0) {
            logger.warn("---> Unresolved: " + longname);
            // logger.warn(helper.longnameToUrl);
        } else if (longname == "function" || longname == "*") {
            // just in case
            logger.info("---> Potentially improved: " + longname);
        } else if (longname == "Task") {
            // only as a reminder
            logger.info("---> Custom placeholder: " + longname);
        }
    }
    return linkSnippet;
}


