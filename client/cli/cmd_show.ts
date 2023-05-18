import * as commander from "npm:commander";
import { sitePathOption } from "./options.ts"
import {  tryOpenDb } from "./helpers.ts";


export const showCmd = new commander.Command('show')

showCmd.command('balance')
.description('show balance')
.addOption(sitePathOption)
.action((options) => {
    const db = tryOpenDb(options.sitePath);
    console.log(db.showBalance());
    db.db.close();
});

showCmd.command('invoices')
.description('show invoices')
.addOption(sitePathOption)
.action((options) => {
    const db = tryOpenDb(options.sitePath);
    for (const inv of db.listInvoices()) {
        console.log(JSON.parse(inv.jsondata));
    }
    db.db.close();
});