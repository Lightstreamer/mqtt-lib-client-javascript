const rollup = require('rollup');
const virtual = require('@rollup/plugin-virtual');
const compiler = require('@ampproject/rollup-plugin-closure-compiler');
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
                    '__lightstreamer-client-stub__': 'lightstreamer-client-node',
                    "import DefaultStorage from './DefaultStorage';": "import DefaultStorage from './DefaultStorage_node';",
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
                  { find: 'DefaultStorage_stub', replacement: './DefaultStorage_node' },
                ]
            }),
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
        format: 'cjs',
        exports: 'default',
        banner: copyright,
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
