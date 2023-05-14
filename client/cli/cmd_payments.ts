import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { ensureDir } from "/deps/std/fs/ensure_dir.ts";

import { sitePathOption } from "./options.ts"
import { checkJsonResponse, tryGetApiClient } from "./helpers.ts";
import { Invoice } from "/lib/invoice.ts";
import { tryStat } from "/lib/trystat.ts";


export const paymentsCmd = new commander.Command('payments')
.addOption(sitePathOption)
.option('-p --path','Path to invoice storage (defaults to sitePath/_payments)')
.description('Transfer invoice payments from the server')
.action(async (options) => {

    const invoicesPath = path.join(options.sitePath, '_payments');
    await ensureDir(invoicesPath);

    const apiClient = await tryGetApiClient(options.sitePath);

    let paidSum = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let existsCount = 0;

    while (true) {
        
        let response = await apiClient.payments();
        let responseObj = await checkJsonResponse(response, 200);

        if (responseObj.error) {
            console.error(responseObj);
            break;
        }

        const deleteList:string[] = [];
        const invoices = responseObj as Invoice[];

        console.log('received ' + invoices.length + ' invoice payments.');

        if (invoices.length === 0) {
            break;
        }

        for (const invoice of invoices) {

            if (invoice.paidAt) {
                paidSum += invoice.subtotal;
                paidCount += 1;
            } else {
                unpaidCount += 1;
            }

            const invoiceFilePath = path.join(invoicesPath, invoice.id);

            const stat = await tryStat(invoiceFilePath);
            
            if (stat && stat.isFile) {
                existsCount += 1;
            }

            await Deno.writeTextFile(invoiceFilePath, JSON.stringify(invoice, null, 2));

            deleteList.push(invoice.id);
        }

        response = await apiClient.deletePayments(deleteList.join('\n'))
        responseObj = await checkJsonResponse(response, 200);

        if (responseObj.error) {
            console.error(responseObj);
            break;
        }

        if (existsCount > 0) {
            break;
        }
    }
    
    if (paidCount + unpaidCount > 0){
        console.log(paidCount.toString() + ' paid. total = ' + paidSum.toString() + ' satoshi)');
        console.log(unpaidCount.toString() + ' unpaid. ');
        if (existsCount > 0) {
            console.log('Warning: duplicate invoices detected.', existsCount);
        }
    }
});