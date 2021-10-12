const rollup = require('rollup');
const virtual = require('@rollup/plugin-virtual');
const compiler = require('@ampproject/rollup-plugin-closure-compiler');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;
const replace = require('@rollup/plugin-replace');
const alias = require('@rollup/plugin-alias');
const path = require('path');

const args = process.argv.slice(2)
if (args.length != 4) {
    console.error("Syntax: <source dir> <output file name> <version number> <build number>")
    process.exit(1)
}
const [srcDir, outFile, versionNum, buildNum] = args

const externalModules = ['LightstreamerClient','Subscription','SimpleLoggerProvider','ConsoleAppender']

const modules = ['LightstreamerMQTT', 'openSession', 'Message']

const allModules = externalModules.concat(modules)

const virtual_entrypoint = `
${externalModules.map(m => `import {${m}} from 'lightstreamer-client-web/lightstreamer-core.esm.js';`).join('\n')}
${modules.map(m => `import ${m} from ${JSON.stringify(`${path.resolve(srcDir, m)}.js`)};`).join('\n')}

// WARNING monkey patching LightstreamerClient.setLoggerProvider in order to intercept 
// the call of LoggerManager, a private class of LightstreamerClient which has been cloned 
// in mqtt.cool client with the aim of providing similar features
import LoggerManager from '${path.resolve(srcDir, 'LoggerManager')}.js';
var oldSetter = LightstreamerClient.setLoggerProvider;
LightstreamerClient.setLoggerProvider = function(log) {
    LoggerManager.setLoggerProvider(log);
    oldSetter(log);
}

export default {
    ${externalModules.map(m => `'${m}': ${m}`).join(',\n')},
    ${modules.map(m => `'${m}': ${m}`).join(',\n')}
};`

const copyright = `
/**
 * @preserve
 * https://mqtt.cool
 * MQTT.Cool Web Client
 * Version ${versionNum} build ${buildNum}
 * Copyright (c) Lightstreamer Srl. All Rights Reserved.
 * Contains: ${allModules.reduce((acc, x, i) => i % 4 == 3 ? (acc + ',\n*  ' + x) : (acc + ', ' + x))}
 * UMD
 */
`

const exportVar = 'lightstreamerMqttcoolExports'
const defaultNs = 'mqttcool'
const attributeNs = 'data-mqttcool-ns'

const umdFooter = `
if (typeof define === 'function' && define.amd) {
    define("lightstreamer", ["module"], function(module) {
        var namespace = (module.config()['ns'] ? module.config()['ns'] + '/' : '');
        ${allModules.map(m => `define(namespace + '${m}', function() { return ${exportVar}['${m}'] });`).join('\n')}
    });
    require(["lightstreamer"]);
}
else if (typeof module === 'object' && module.exports) {
    ${allModules.map(m => `exports['${m}'] = ${exportVar}['${m}'];`).join('\n')}
}
else {
    var extractNs = function() {
        var scripts = window.document.getElementsByTagName("script");
        for (var i = 0, len = scripts.length; i < len; i++) {
            if ('${attributeNs}' in scripts[i].attributes) {        
                return scripts[i].attributes['${attributeNs}'].value;
            }
        }
        return '${defaultNs}';
    };
    
    var createNs = function(ns, root) {
        if (! ns) {
            return root;
        }
        var pieces = ns.split('.');
        var parent = root || window;
        for (var j = 0; j < pieces.length; j++) {
            var qualifier = pieces[j];
            var obj = parent[qualifier];
            if (! (obj && typeof obj == 'object')) {
                obj = parent[qualifier] = {};
            }
            parent = obj;
        }
        return parent;
    };

    var namespace = createNs(extractNs(), window);
    ${allModules.map(m => `namespace['${m}'] = ${exportVar}['${m}'];`).join('\n')}
}
`

const options = {
    inputOptions: {
        input: 'virtual-entrypoint',
        plugins: [
            replace({
                values: {
                    '__lightstreamer-client-stub__': 'lightstreamer-client-web/lightstreamer-core.esm.js',
                    'version_placeholder': versionNum,
                    'build_placeholder': buildNum
                },
                preventAssignment: true
            }),
            virtual({ 
                'virtual-entrypoint': virtual_entrypoint
            }),
            alias({
                entries: [
                  { find: 'DefaultStorage_stub', replacement: './DefaultStorage' },
                ]
            }),
            nodeResolve(),
            compiler({
                compilation_level: 'ADVANCED',
                warning_level: 'QUIET',
                language_in: 'ECMASCRIPT5',
                language_out: 'ECMASCRIPT5',
                externs: 'externs.js'
            })
        ]
    },
    outputOptions: {
        file: outFile,
        format: 'iife',
        name: exportVar,
        exports: 'default',
        banner: copyright,
        footer: umdFooter
    }
}

async function build(options) {
    const {inputOptions, outputOptions} = options        
    inputOptions.onwarn = ({ loc, frame, message }) => {
        if (loc) {
            console.warn('WARNING', `${loc.file} (${loc.line}:${loc.column}) ${message}`);
            if (frame) console.warn(frame);
        } else {
            console.warn('WARNING', message);
        }
    };
    const bundle = await rollup.rollup(inputOptions);
    await bundle.generate(outputOptions);
    await bundle.write(outputOptions);
    console.log('Done.')
}

console.log('Building mqtt.cool client')
console.log('Source folder', srcDir)
console.log('Output file', outFile)
console.log('Version', versionNum, 'build', buildNum)
console.log('Exported classes:')
console.log(virtual_entrypoint)

build(options);
