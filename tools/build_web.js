/*
 * Copyright (C) 2017 Lightstreamer Srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const build = require('./rollup_build');
const virtual = require('@rollup/plugin-virtual');
const compiler = require('@ampproject/rollup-plugin-closure-compiler');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;
const replace = require('@rollup/plugin-replace');
const alias = require('@rollup/plugin-alias');
const path = require('path');

// Syntax: <source dir> <output file name> <version number> <build number>
const args = process.argv.slice(2)
let srcDir, outFile, versionNum, buildNum;
if (args.length != 4) {
    srcDir = '../source'
    outFile = 'dist-web/lightstreamer-jms.js'
    versionNum = '2.0.0-custom'
    buildNum = 1
} else {
    [srcDir, outFile, versionNum, buildNum] = args
}

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
    define("${defaultNs}", ["module"], function(module) {
        var ns = module.config()['ns'];
        var namespace = (ns ? ns + '/' : (typeof ns === "undefined" ? '${defaultNs}/' : ''));
        ${allModules.map(m => `define(namespace + '${m}', function() { return ${exportVar}['${m}'] });`).join('\n')}
    });
    require(["${defaultNs}"]);
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
                    'version_placeholder': versionNum,
                    'build_placeholder': buildNum,
                    'library_name_placeholder': 'javascript',
                    'library_tag_placeholder': 'javascript_client'
                },
                preventAssignment: true
            }),
            virtual({ 
                'virtual-entrypoint': virtual_entrypoint
            }),
            alias({
                entries: [
                    { find: 'lightstreamer-client-stub', replacement: 'lightstreamer-client-web/lightstreamer-core.esm.js' },
                    { find: 'DefaultStorage_stub', replacement: './DefaultStorage' },
                ]
            }),
            nodeResolve(),
            compiler({
                compilation_level: 'ADVANCED',
                language_in: 'ECMASCRIPT5',
                language_out: 'ECMASCRIPT5',
                externs: 'externs.js',
                warning_level: 'DEFAULT',
                // warning_level: 'VERBOSE',
                // debug: true,
                // formatting: 'PRETTY_PRINT',
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

console.log('Source folder', srcDir)
console.log('Output file', outFile)
console.log('Version', versionNum, 'build', buildNum)

build(options);
