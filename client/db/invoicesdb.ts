import { Invoice } from "/lib/invoice.ts";
import { Database } from "./mod.ts";

export interface InvoicesDbApi {
    db:Database
    addInvoice (f:Invoice) : number
    invoiceById (id:string) : InvoiceRow|undefined
    listInvoices () : InvoiceRow[]
    nextUnspentOutput (afterRowId:number) : InvoiceOutputRow
    markSpent (invTxHash:string, invTxOutNum:number, redeemTxHash:string, redeemTxInNum:number) : void
    listOutputs(): InvoiceOutputRow[]
    showBalance(): { amount:number, num:number }
}

export interface InvoiceRow extends Record<string, unknown> {
    id:string, 
    created:number,
    jsondata:string
}

export interface InvoiceOutputRow extends Record<string, unknown> {
    rowid?:number
    invoiceId:string
    invTxHash:string
    invTxOutNum:number
    redeemTxHash?:string|null
    redeemTxInNum?:number|null
    amount:number
    xPub:string
    derivationPath:string
    script:string
}

export function initSchema (db:Database) {
    db.prepare(`create table invoices (
        id text primary key, 
        created int, 
        jsondata text
    );`).run();

    db.prepare(`
        create table invoiceOutputs (
            invoiceId text,
            invTxHash text,
            invTxOutNum integer,
            redeemTxHash text,
            redeemTxInNum integer
        );
    `).run();
    
    db.prepare('create unique index if not exists invoiceOutputs_invTxHash_invTxOutNum on invoiceOutputs(invTxHash, invTxOutNum) ').run();
    db.prepare('create index if not exists invoiceOutputs_redeemTxHash on invoiceOutputs(redeemTxHash is null) ').run();
}

export function getApi (db:Database) : InvoicesDbApi {

    const psAddInvoice = db.prepare(`insert into invoices (id, created, jsondata) values (:id, :created, :jsondata)`);
    const psInvoiceById = db.prepare(`select * from invoices where id = ?`);
    const psListInvoices = db.prepare('select * from invoices order by id');

    const psAddOutput = db.prepare(`
        insert into invoiceOutputs (invTxHash, invTxOutNum, invoiceId, redeemTxHash, redeemTxInNum)
        values (:invTxHash, :invTxOutNum, :invoiceId, :redeemTxHash, :redeemTxInNum) 
        on conflict do nothing`);

    const psNextUnspentOutput = db.prepare(`
        select invoiceOutputs.rowid,
            invoiceOutputs.*,
            json_extract(jsondata, '$.xPub') as xPub,
            json_extract(jsondata, '$.derivationPath') as derivationPath,
            json_extract(jsondata, '$.subtotal') as amount,
            json_extract(jsondata, '$.script') as script
        from invoiceOutputs
            inner join invoices on invoiceOutputs.invoiceId = invoices.id
        where invoiceOutputs.redeemTxHash is null 
            and invoiceOutputs.invTxHash is not null
            and invoiceOutputs.rowid > ? 
        order by invoiceOutputs.rowid limit 1`);

    const psMarkOutputSpent = db.prepare(`
        update invoiceOutputs set 
            redeemTxHash = :redeemTxHash, 
            redeemTxInNum = :redeemTxInNum
        where invTxHash = :invTxHash and invTxOutNum = :invTxOutNum
        returning invoiceId; `);

    const psMarkInvoiceSpent = db.prepare(`
        update invoices set
            jsondata = json_set(jsondata, 
                '$.redeemTxHash', :redeemTxHash,
                '$.redeemTxInNum', :redeemTxInNum)
        where invoices.id = :invoiceId; `);

    const psListOutputs = db.prepare(`
        select * from invoiceOutputs order by invoiceId, invTxOutNum`);

    const psShowBalance = db.prepare(`
        select 
            sum(json_extract(invoices.jsondata, '$.subtotal')) as total,
            count(invoices.id) as num
        from invoices
        where json_extract(invoices.jsondata, '$.redeemTxHash') is null`);

    return {
        db,
        addInvoice (invoice:Invoice) {
            let added = 0;

            db.transaction(() => {
                added += psAddInvoice.run({ 
                    id: invoice.id, 
                    created: invoice.created, 
                    jsondata: JSON.stringify(invoice) 
                });
                if (invoice.txHash) {
                    psAddOutput.run({ 
                        invoiceId: invoice.id, 
                        invTxHash: invoice.txHash||null, 
                        invTxOutNum: invoice.txOutNum === undefined ? null : invoice.txOutNum,
                        redeemTxHash: invoice.redeemTxHash || null,
                        redeemTxInNum: invoice.redeemTxInNum === undefined ? null : invoice.redeemTxInNum
                    });
                }
            })(null);

            return added;
        },
        invoiceById (id) {
            return psInvoiceById.get(id);
        },
        listInvoices () {
            return psListInvoices.all();
        },
        nextUnspentOutput (afterRowId) {
            return psNextUnspentOutput.all<InvoiceOutputRow>(afterRowId)[0];
        },
        markSpent(invTxHash, invTxOutNum, redeemTxHash, redeemTxInNum) {
            db.transaction(() => {
                const row = psMarkOutputSpent.get<{ invoiceId: string }>({ invTxHash, invTxOutNum, redeemTxHash, redeemTxInNum });
                if (row) {
                    psMarkInvoiceSpent.run({ invoiceId: row.invoiceId, redeemTxHash, redeemTxInNum });
                }
            })(null);
        },
        listOutputs () {
            return psListOutputs.all();
        },
        showBalance () {
            return psShowBalance.get() || { amount:0, num:0 };
        }
    }
}

export default { initSchema, getApi }