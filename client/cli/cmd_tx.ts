import * as commander from "npm:commander";
import bsv from "npm:bsv";

import { tryOpenDb } from "./helpers.ts"
import { sitePathOption } from "./options.ts";
import { processTransaction } from "../transactions.ts";


export const txCmd = new commander.Command('tx')
.description('Process a tx, marking outputs as spent. (The tx should have already been broadcast)')
.addOption(sitePathOption)
.option('-t --txid <txid>', 'Id of transaction to download ')
.option('-f --filePath <filePath>', 'File path of the transaction')
.action(async (options) => {
    const sitePath = options.sitePath;

    let tx;
    
    if (options.filePath) {
        const txbuf = Deno.readFileSync(options.filePath);
        tx = bsv.Tx.fromBuffer(bsv.deps.Buffer.from(txbuf));
    } else if (options.txid) {
        const res = await fetch('https://api.whatsonchain.com/v1/bsv/main/tx/'+options.txid+'/hex');
        if (res.ok) {
            const bodyText = await res.text();
            tx = bsv.Tx.fromHex(bodyText);
        } else {
            console.error(res.statusText);
            Deno.exit(1);
        }
    }

    if (tx === undefined) {
        console.error('error: unable to source transaction');
    }

    const db = tryOpenDb(sitePath);
    processTransaction(db, tx);
    db.db.close();
});