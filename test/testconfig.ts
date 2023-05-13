import * as path from "/deps/std/path/mod.ts";
import { Config } from "/server/config.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export const testConfig:Config = {
    listenOptions: {
        port: 8098,
        hostname: '127.0.0.1'
    },
    logErrors: true,
    cookieSecret: ['devsecret'],
    contentPath: './test/site2/data',
    dataPath: './test/site2/files',
    env: 'dev',
    staticPath: path.join(__dirname, '../server/', 'static'),
    domain: 'htvm.localdev',
    mAPIEndpoints: [{
        name: 'dev',
        url: 'http://htvm.localdev:3001/dev/tx',
        extraHeaders: { 'Content-Type': 'application/json' } 
    }]
};

export const urlPrefix = 'http://127.0.0.1:8098';
export const authKey = 'aabbccddee';
export const xPrv = 'xprv9s21ZrQH143K2cPPDuqeQ3CNmufwyPWU4uUv12cEDzzhnvfqztGjhk8KyLDNnCpK1rB5jPMR9zFiY94sfvHARxxyXSwFWLdLNLFTtRCTBKt';