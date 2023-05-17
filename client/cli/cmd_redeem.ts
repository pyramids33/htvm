import * as commander from "npm:commander";

import { 
    sitePathOption,
    validateAddress
} from "./options.ts"

import { buildTransaction, processTransaction } from "../transactions.ts";

import { tryOpenDb } from "./helpers.ts";

export const redeemCmd = new commander.Command('redeem')
.description('create tx spending to address (tx hex is printed to stdout)')
.addOption(sitePathOption)
.requiredOption('-a --address <address>', 'destination address to redeem', validateAddress)
.option('-b --broadcast', 'broadcast the transaction (txid printed to stdout)', false)
.option('-p --process', 'process thes transaction (if broadcast succeeds)', false)
.option('-o --outputPath', 'path to save tx as a binary file')
.action(async (options) => {
    const sitePath = options.sitePath;
    const db = tryOpenDb(sitePath);
    const tx = buildTransaction(db, options.address);
    
    console.log(tx.toString());
    
    let broadcastSuccess = false;

    if (options.broadcast) {    
        const res = await fetch('https://api.whatsonchain.com/v1/bsv/main/tx/raw', { 
            method: 'POST',
            body: JSON.stringify({ txhex: tx.toString() }),
            headers: { "content-type": "application/json" }
        });

        const txId = tx.id();
        const bodyText = (await res.text()).trim();

        if (bodyText.trim() === txId || bodyText.trim() === '"'+txId+'"') {
            broadcastSuccess = true;
            console.log('txid: '+txId);
        } else {
            console.error('broadcast failed: '+bodyText);
        }
    }

    if (options.process && broadcastSuccess) {
        processTransaction(db, tx);
    } 

    db.db.close();
});