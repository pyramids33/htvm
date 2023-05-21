import * as commander from "npm:commander";
import { sitePathOption } from "./options.ts"
import {  tryOpenDb } from "./helpers.ts";
import { Invoice } from "../../lib/invoice.ts";
import * as path from "/deps/std/path/mod.ts";

export const showCmd = new commander.Command('show')

showCmd.command('host')
.description('show host')
.addOption(sitePathOption)
.action(async (options) => {
    const hostFilePath = path.join(options.sitePath, '.htvm-host');
    const hostInfo = JSON.parse(await Deno.readTextFile(hostFilePath));
    console.table(hostInfo);
});

showCmd.command('balance')
.description('show balance')
.addOption(sitePathOption)
.action((options) => {
    const db = tryOpenDb(options.sitePath);
    const balance = db.showBalance();
    console.log("Balance:", balance.total||0, " ("+balance.num+" invoices)");
    db.db.close();
});

showCmd.command('invoices')
.description('show invoices')
.addOption(sitePathOption)
.action((options) => {
    const db = tryOpenDb(options.sitePath);

    const rows = db.listInvoices().map((row) => {
        const invObj = JSON.parse(row.jsondata) as Invoice;
        return { 
            id: invObj.id, 
            urlPath:invObj.urlPath,
            amount:invObj.subtotal, 
            created:new Date(invObj.created).toISOString(),
            paidAt:invObj.paidAt ? new Date(invObj.paidAt).toISOString() : '',
            txOut:invObj.txHash ? invObj.txHash+':'+invObj.txOutNum : '',
        };
    });

    rows.forEach(x=>console.table(x))
    
    db.db.close();
});