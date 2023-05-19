import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { ensureDir } from "/deps/std/fs/ensure_dir.ts";

import { sitePathOption } from "./options.ts"
import { FILES, checkJsonResponse, tryGetApiClient } from "./helpers.ts";
import { Invoice } from "/lib/invoice.ts";
import { openDb } from "../db/mod.ts";
import InvoicesDbModule from '../db/invoicesdb.ts';

export const paymentsCmd = new commander.Command('payments')
.addOption(sitePathOption)
.option('-p --path','Path to invoice storage (defaults to sitePath/_payments)')
.description('Transfer invoice payments from the server')
.action(async (options) => {

    const invoicesPath = path.join(options.sitePath, '_payments');
    await ensureDir(invoicesPath);

    const apiClient = await tryGetApiClient(options.sitePath);

    const walletPath = path.join(options.sitePath, FILES.htvmWallet);
    const walletDb = openDb(InvoicesDbModule, walletPath);

    let paidSum = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let existsCount = 0;

    let response = await apiClient.payments();
    let responseObj = await checkJsonResponse(response, 200);

    if (responseObj.error) {
        console.error(responseObj);
        return;
    }

    const deleteList:string[] = [];
    const invoices = responseObj as Invoice[];

    console.log('received ' + invoices.length + ' invoice payments.');

    if (invoices.length === 0) {
        return;
    }

    walletDb.db.transaction(() => {
        for (const invoice of invoices) {
            try {
                if (invoice.paidAt) {
                    paidSum += invoice.subtotal;
                    paidCount += 1;
                } else {
                    unpaidCount += 1;
                }

                walletDb.addInvoice(invoice);
                deleteList.push(invoice.id);
            } catch (error) {
                if (error.message === 'UNIQUE constraint failed: invoices.id') {
                    existsCount += 1;
                }
                console.error('ERROR', invoice.id, error);
            }
        }
    })(null);
    
    walletDb.db.close();

    if (deleteList.length > 0) {
        response = await apiClient.deletePayments(deleteList.join('\n'))
        responseObj = await checkJsonResponse(response, 200);
    
        if (responseObj.error) {
            console.error(responseObj);
        }
    }

    if (paidCount + unpaidCount > 0){
        console.log(paidCount.toString() + ' paid. total = ' + paidSum.toString() + ' satoshi');
        console.log(unpaidCount.toString() + ' unpaid. ');
        if (existsCount > 0) {
            console.log('Warning: duplicate invoices detected.', existsCount);
        }
    }
});