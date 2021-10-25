const build = require('./rollup_build');
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

const virtual_entrypoint = `
import {LightstreamerClient} from 'lightstreamer-client-node';
import {Subscription} from 'lightstreamer-client-node';
import {SimpleLoggerProvider} from 'lightstreamer-client-node';
import {ConsoleAppender} from 'lightstreamer-client-node';

import LightstreamerMQTT from "${path.resolve(srcDir, 'LightstreamerMQTT')}.js";
import openSession from "${path.resolve(srcDir, 'openSession')}.js";
import Message from "${path.resolve(srcDir, 'Message')}.js";

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
    'LightstreamerClient': LightstreamerClient,
    'Subscription': Subscription,
    'SimpleLoggerProvider': SimpleLoggerProvider,
    'ConsoleAppender': ConsoleAppender,
    'LightstreamerMQTT': LightstreamerMQTT,
    'openSession': openSession,
    'Message': Message
};`

const copyright = `
/**
 * @preserve
 * https://mqtt.cool
 * MQTT.Cool Node.js Client
 * Version ${versionNum} build ${buildNum}
 * Copyright (c) Lightstreamer Srl. All Rights Reserved.
 * Contains: LightstreamerClient, Subscription, SimpleLoggerProvider, ConsoleAppender,
 * LightstreamerMQTT, openSession, Message
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
