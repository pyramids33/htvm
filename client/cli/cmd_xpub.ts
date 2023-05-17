import * as commander from "npm:commander";
import bsv from "npm:bsv";
import * as path from "/deps/std/path/mod.ts";

import { sitePathOption, validateXprv, validateXpub } from "./options.ts"
import { tryOpenDb } from "./helpers.ts";

export const xPubCmd = new commander.Command('xpub')
.description('Generate a new xpub (bip32) file')
.addOption(sitePathOption)
.option('--random', 'generate random key (seed will be printed)')
.option('--passphrase <passphrase>', 'passphrase for generated bitcoin seed')
.option('--xprv <xprv>', 'Bip32 Private Key xprv... ', validateXprv)
.option('--xpub <xpub>', 'Bip32 Public Key xpub... ', validateXpub)
.action((options) => {
    let xprv:bsv.Bip32;
    let xpub:bsv.Bip32;
    let bip39:bsv.Bip39;

    if (options.xprv) {
        xprv = options.xprv;
        xpub = xprv.toPublic();
    }else if (options.xpub) {
        xpub = options.xpub;
    } else if (options.random) {
        bip39 = bsv.Bip39.fromRandom();
        xprv = bsv.Bip32.fromSeed(bip39.toSeed(options.passphrase));
        xpub = xprv.toPublic();
    } else {
        console.error('Error: provide one of the --xprv or --random options to create xpub.');
        Deno.exit(1);
    }

    if (xprv) {
        const db = tryOpenDb(options.sitePath);
        db.db.transaction(() => {
            db.meta.setValue('$.hdkeys.' + xprv.toPublic().toString(), xprv.toString());
            Deno.writeTextFileSync(path.join(options.sitePath, 'xpub.txt'), xprv.toPublic().toString());
        })(null);
    } else if (xpub) {
        Deno.writeTextFileSync(path.join(options.sitePath, 'xpub.txt'), xpub.toString());
    }
            
    if (bip39) {
        console.log('**** WRITE DOWN THE MNEMONIC FOR PRIVATE KEY RECOVERY ****');
        console.log('mnemonic: ', bip39.mnemonic);
    }
    if (xprv) {
        console.log('xprv: ', xprv.toString());
    }
    if (xpub) {
        console.log('xpub: ', xpub.toString());
    }
});
