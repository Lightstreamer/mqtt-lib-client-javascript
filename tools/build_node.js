const build = require('./rollup_build');
const virtual = require('@rollup/plugin-virtual');
const compiler = require('@ampproject/rollup-plugin-closure-compiler');
const replace = require('@rollup/plugin-replace');
const alias = require('@rollup/plugin-alias');
const path = require('path');

// Syntax: <source dir> <output file name> <version number> <build number>
const args = process.argv.slice(2)
let srcDir, outFile, versionNum, buildNum;
if (args.length != 4) {
    srcDir = '../source'
    outFile = 'dist-node/lightstreamer-jms.js'
    versionNum = '2.0.0-custom'
    buildNum = 1
} else {
    [srcDir, outFile, versionNum, buildNum] = args
}

const externalModules = ['LightstreamerClient','Subscription','SimpleLoggerProvider','ConsoleAppender']
const modules = ['LightstreamerMQTT', 'openSession', 'Message']

const virtual_entrypoint = `
${externalModules.map(m => `import {${m}} from 'lightstreamer-client-node';`).join('\n')}
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
 * MQTT.Cool Node.js Client
 * Version ${versionNum} build ${buildNum}
 * Copyright (c) Lightstreamer Srl. All Rights Reserved.
 * Contains: ${externalModules.concat(modules).reduce((acc, x, i) => i % 4 == 3 ? (acc + ',\n*  ' + x) : (acc + ', ' + x))}
 * CJS
 */
`

const options = {
    inputOptions: {
        input: 'virtual-entrypoint',
        external: ['lightstreamer-client-node'],
        plugins: [
            replace({
                values: {
                    'version_placeholder': versionNum,
                    'build_placeholder': buildNum,
                    'library_name_placeholder': 'nodejs',
                    'library_tag_placeholder': 'nodejs_client'
                },
                preventAssignment: true
            }),
            virtual({ 
                'virtual-entrypoint': virtual_entrypoint
            }),
            alias({
                entries: [
                    { find: 'lightstreamer-client-stub', replacement: 'lightstreamer-client-node' },
                    { find: 'DefaultStorage_stub', replacement: './DefaultStorage_node' },
                ]
            }),
            compiler({
                compilation_level: 'ADVANCED',
                warning_level: 'DEFAULT',
                language_in: 'ECMASCRIPT5',
                language_out: 'ECMASCRIPT5',
                externs: 'externs.js'
            })
        ]
    },
    outputOptions: {
        file: outFile,
        format: 'cjs',
        exports: 'default',
        banner: copyright,
    }
}

console.log('Source folder', srcDir)
console.log('Output file', outFile)
console.log('Version', versionNum, 'build', buildNum)

build(options);
