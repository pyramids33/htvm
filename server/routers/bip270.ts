import { default as id128 } from "npm:id128";
import bsv from "npm:bsv";
import { Context, Router } from "/deps/oak/mod.ts";

import mstime from "/lib/mstime.ts";

import { 
    checkSession, 
    readWriteSessionHeaders,
    lockSessionMiddleware
} from "/server/middleware/session.ts";

import { Next } from "/server/oaknext.ts";
import { RequestState } from "/server/appstate.ts";
import { Invoice, InvoiceOutput } from "/lib/invoice.ts";
import { jsonErrorResponse as jsonError } from "../middleware/jsonerror.ts";


// https://github.com/moneybutton/bips/blob/master/bip-0270.mediawiki#PaymentRequest

async function allowCORS (ctx:Context, next:Next) {
    ctx.response.headers.set('Access-Control-Allow-Origin', '*')
    ctx.response.headers.set('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    if (ctx.request.method === 'OPTIONS') {
        ctx.response.status = 200;
        return;
    }

    await next();
}

export function validatePayment (invOutputs:InvoiceOutput[], tx:bsv.Transaction) : { error?: string } {
    const txOuts:bsv.TxOut[] = [...tx.txOuts];
    let missingOutput = false;

    for (const specItem of invOutputs) {
        const n = tx.txOuts.findIndex((txOut:bsv.TxOut) => 
            specItem.amount === txOut.valueBn.toNumber() && specItem.script === txOut.script.toHex());

        if (n === -1) {
            missingOutput = true;
            break;
        }

        txOuts.splice(n, 1);
    }

    if (missingOutput) {
        return { error: 'missing output' };
    }

    return {};
}

async function getCurrentInvoiceFile (currentJsonPath:string) : Promise<Record<string,string>> {
    try {
        return JSON.parse(await Deno.readTextFile(currentJsonPath)) as Record<string,string>;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) {
            return {};
        } else {
            throw error;
        }
    }
}

async function tryReadInvoice (invoicePath:string) : Promise<Invoice|undefined> {
    try {
        return JSON.parse(await Deno.readTextFile(invoicePath)) as Invoice;
    } catch {
        return undefined;
    }
}

export const lockSession = lockSessionMiddleware(true, 'sessionId');

export function getBip270Router () : Router<RequestState> {

    let endpointNum = 0;

    const router = new Router<RequestState>();
    
    router.use(readWriteSessionHeaders);
    
    router.get('/.bip270/invoice-sse', checkSession, async function (ctx:Context<RequestState>) {
        const session = ctx.state.session;
        const app = ctx.state.app;
        const query = Object.fromEntries(ctx.request.url.searchParams);
        const invoicePath = app.sitePath.sessionInvoicePath(session.sessionId, query.invoiceId);
        const invoice = JSON.parse(await Deno.readTextFile(invoicePath)) as Invoice;

        if (invoice.paidAt || (invoice.created < mstime.minsAgo(15))) {
            ctx.throw(404);
        }

        const key = session.sessionId + ' ' + invoice.id;
        const target = ctx.sendEvents();

        app.sse.addTarget(key, target);

        if (invoice.paidAt !== undefined && invoice.paidAt !== null) {
            // on iPhone, after switching to app and paying, the connection is closed and reopened.
            // send update if already paid.
            await app.sse.onPayment(key);
        }
    });

    router.post('/.bip270/new-invoice', jsonError, checkSession, lockSession, async function (ctx:Context<RequestState>) {
        const session = ctx.state.session;
        const app = ctx.state.app;
        const body = Object.fromEntries(await ctx.request.body({ type: 'form' }).value);
        const sessionId = session.sessionId;

        const priceList = await app.getPriceList();
        
        if (priceList === undefined) {
            ctx.response.status = 400;
            ctx.response.type = 'json';
            ctx.response.body = { error: 'ACCESSIBLE' };
            return;
        }

        const matchResult = priceList.matchUrl(body.urlPath);
        
        if (matchResult === undefined || await app.checkAccess(sessionId, body.urlPath)) {
            ctx.response.status = 400;
            ctx.response.type = 'json';
            ctx.response.body = { error: 'ACCESSIBLE' };
            return;
        }

        const priceInfo = matchResult.priceInfo;

        // current invoices maps invoice.urlPath to recent invoiceId for the urlPath
        const currentInvoicesFilePath = app.sitePath.sessionInvoicePath(sessionId, 'current.json');
        const currentInvoices = await getCurrentInvoiceFile(currentInvoicesFilePath);
        const currentInvoiceId = currentInvoices[matchResult.urlMatch];

        let invoice:Invoice|undefined;

        if (currentInvoiceId) {
            const invoicePath = app.sitePath.sessionInvoicePath(sessionId, currentInvoiceId);
            invoice = await tryReadInvoice (invoicePath);

            if (invoice === undefined || invoice.paidAt || invoice.created < mstime.minsAgo(5)) {
                invoice = undefined;
                delete currentInvoices[currentInvoiceId];
            }
        }

        if (invoice === undefined) {

            invoice = { 
                id: id128.Ulid.generate().toCanonical(),
                created: Date.now(), 
                domain: app.config.domain, 
                urlPath: matchResult.urlMatch,
                priceInfo: priceInfo,
                outputs: [],
                subtotal: 0
            };

            const xPub = await app.getXPub();
            const xPubString = xPub.toString()

            const counter = app.nextXPubCounter();
            const derivationPath = `m/${app.workerId}/${app.startId}/${counter}`;
            const pubKey = xPub.derive(derivationPath).pubKey;
            const script = bsv.Address.fromPubKey(pubKey).toTxOutScript().toHex();

            invoice.subtotal += priceInfo.amount;
            invoice.outputs.push({ amount: priceInfo.amount, xPub: xPubString, derivationPath, script });
            
            const invoicePath = app.sitePath.sessionInvoicePath(sessionId, invoice.id);
            
            await Deno.writeTextFile(invoicePath, JSON.stringify(invoice, null, 2));
        }

        currentInvoices[invoice.urlPath] = invoice.id;
        await Deno.writeTextFile(currentInvoicesFilePath, JSON.stringify(currentInvoices));

        const dataURL = 'bitcoin:?sv&r=' + encodeURIComponent(`https://${invoice.domain}/.bip270/payment-request?id=${invoice.id}&sessionId=${sessionId}`);
        
        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = {
            id: invoice.id,
            urlPath: invoice.urlPath,
            subtotal: invoice.subtotal,
            dataURL,
            expiry: invoice.created + mstime.mins(5)
        }
    });

    router.options('/.bip270/payment-request', allowCORS);
    router.get('/.bip270/payment-request', allowCORS, jsonError, async function (ctx:Context<RequestState>) {
        const app = ctx.state.app;
        const query = Object.fromEntries(ctx.request.url.searchParams)
        
        if (!id128.Ulid.isCanonical(query.sessionId||'')
         || !id128.Ulid.isCanonical(query.invoiceId||'')) {
            ctx.throw(400);
        }

        const invoicePath = app.sitePath.sessionInvoicePath(query.sessionId, query.invoiceId);
        const invoice = JSON.parse(await Deno.readTextFile(invoicePath)) as Invoice;

        if (invoice === undefined || invoice.paidAt || (invoice.created < mstime.minsAgo(15))) {
            ctx.throw(404);
        }

        const paymentRequest = {
            network: 'bitcoin',
            outputs: invoice.outputs.map(item => { return { script: item.script, amount: item.amount }}),
            creationTimestamp: Math.floor(Date.now()/1000),
            expirationTimestamp: Math.floor((Date.now()+mstime.mins(6))/1000),
            memo: `https://${app.config.domain}${invoice.urlPath}`,
            paymentUrl: `https://${app.config.domain}/.bip270/pay-invoice?id=${invoice.id}&sessionId=${query.sessionId}`,
            merchantData: invoice.id
        };

        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = paymentRequest;
    });

    router.options('/.bip270/pay-invoice', allowCORS);
    router.post('/.bip270/pay-invoice', allowCORS, jsonError, lockSession, async function (ctx:Context<RequestState>) {
        const app = ctx.state.app;
        const config = app.config;
        const body = await ctx.request.body({ type: "json" }).value;
        const query = Object.fromEntries(ctx.request.url.searchParams);

        if (!id128.Ulid.isCanonical(query.sessionId||'')
         || !id128.Ulid.isCanonical(query.invoiceId||'')) {
            ctx.throw(400);
        }
        
        const invoicePath = app.sitePath.sessionInvoicePath(query.sessionId, query.invoiceId);
        const invoice = JSON.parse(await Deno.readTextFile(invoicePath)) as Invoice;

        if (invoice === undefined || invoice.paidAt || (invoice.created < mstime.minsAgo(15))) {
            ctx.throw(404);
        }

        if (typeof(body.transaction) !== 'string') {
            console.log('invalid transaction');
            ctx.throw(400);
        }

        const tx:bsv.Tx = bsv.Tx.fromHex(body.transaction);

        const validationResult = validatePayment(invoice.outputs, tx);

        if (validationResult.error) {
            console.log(validationResult);
            ctx.response.status = 200;
            ctx.response.type = "json";
            ctx.response.body = { payment: body, memo: validationResult.error, error: 1 }
            return;
        } 
        
        const mAPIEndpoint = config.mAPIEndpoints[endpointNum];
        let mapiRes;

        try {
            mapiRes = await fetch(mAPIEndpoint.url, { 
                method: 'POST', 
                body: JSON.stringify({ rawtx: body.transaction }),
                headers: mAPIEndpoint.extraHeaders 
            });
        } catch {
            console.log('broadcast failed');
            endpointNum = (endpointNum + 1) % config.mAPIEndpoints.length;
            ctx.response.status = 200;
            ctx.response.type = "json";
            ctx.response.body = { payment: body, memo: 'broadcast failed', error: 2 };
            return;
        }
            
        let mapiResBody;
        let payload;
        
        try {
            mapiResBody = await mapiRes.json();
            payload = JSON.parse(mapiResBody.payload);
        } catch {
            console.log('error parsing mapi response', mapiResBody,payload);
            ctx.response.status = 200;
            ctx.response.type = "json";
            ctx.response.body = { payment: body, memo: 'error parsing mapi response', error: 3 };
            return;
        }

        if (payload.returnResult === 'success'
            || payload.resultDescription === 'Transaction already in the mempool'
            || payload.resultDescription === 'Transaction already known'
            || payload.resultDescription === '257 txn-already-known'
        ) {

            invoice.paidAt = Date.now(); 
            invoice.paymentMethod = 'bip270 ' + mAPIEndpoint.name;
            invoice.txid = tx.id();
            invoice.txHex = body.transaction;

            const accessFilePath = app.sitePath.sessionAccessPath(query.sessionId, invoice.urlPath);
            
            await Deno.writeTextFile(accessFilePath, (Date.now() + mstime.hours(6)).toString());
            await Deno.writeTextFile(invoicePath, JSON.stringify(invoice,null,2));
            await Deno.rename(invoicePath, app.sitePath.paymentPath(invoice.id));

            await app.sse.onPayment(query.sessionId + ' ' + query.invoiceId);
            
            if (self.postMessage) {
                self.postMessage({ message: 'payment', target: query.sessionId + ' ' + query.invoiceId });
            } 

        } else {
            console.log('error payload',payload);
            ctx.response.status = 200;
            ctx.response.type = "json";
            ctx.response.body = { payment: body, memo: payload.resultDescription, error: 4 };
            return;
        }
            
        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = { payment: body, memo: 'Access Granted', error: 0 };
        return;
    });

    router.get('/.bip270/devpay-invoice', checkSession, lockSession, async function (ctx:Context<RequestState>) {
        const session = ctx.state.session;
        const app = ctx.state.app;

        if (app.config.env !== 'dev') {
            ctx.throw(404);
        }

        const query = Object.fromEntries(ctx.request.url.searchParams);

        if (!id128.Ulid.isCanonical(query.invoiceId||'')) {
            ctx.throw(400);
        }

        const invoicePath = app.sitePath.sessionInvoicePath(session.sessionId, query.invoiceId);
        const invoice = JSON.parse(await Deno.readTextFile(invoicePath)) as Invoice;

        if (invoice === undefined) {
            ctx.throw(404);
        }

        const tx = new bsv.Tx();
        
        for (const item of invoice.outputs) {
            tx.addTxOut(new bsv.Bn(item.amount), bsv.Script.fromHex(item.script));
        }

        invoice.paidAt = Date.now(); 
        invoice.paymentMethod = 'dev';
        invoice.txid = tx.id();
        invoice.txHex = tx.toHex();

        const accessFilePath = app.sitePath.sessionAccessPath(session.sessionId, invoice.urlPath);
        
        await Deno.writeTextFile(accessFilePath, (Date.now() + mstime.hours(6)).toString());
        await Deno.writeTextFile(invoicePath, JSON.stringify(invoice, null, 2));
        await Deno.rename(invoicePath, app.sitePath.paymentPath(invoice.id));

        await app.sse.onPayment(session.sessionId + ' ' + query.invoiceId);
        
        if (self.postMessage) {
            self.postMessage({ message: 'payment', target: session.sessionId + ' ' + query.invoiceId });
        } 

        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = {};
    });

    return router;
}