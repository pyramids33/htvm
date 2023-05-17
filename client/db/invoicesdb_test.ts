import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";

import InvoicesDbModule from './invoicesdb.ts';
import { openDb } from './mod.ts';

const db = openDb(InvoicesDbModule, ':memory:');

const invoiceJSON = {
    "id": "01H0FXCWKV4AH6B5WD60HJKCYH",
    "created": 1684161327739,
    "domain": "example2.sweb.lol",
    "urlPath": "/images/",
    "priceInfo": {
      "pattern": "/images",
      "amount": 5000,
      "description": "The best images folder ever!"
    },
    "xPub": "xpub661MyMwAqRbcGAMdznt8CvQRVxhD3qXY4vZ1CuSrQRQYQ1YpDPi35ooo36DJ52SKb2nGyjQJ8pgFMAypNeAJo75bz2aNYBk1vPjz5mxExwf",
    "derivationPath": "m/0/0/1",
    "script": "76a914d383cf004cc55700b9283dd41f889daba82889d188ac",
    "subtotal": 5000,
    "paidAt": 1684161336445,
    "paymentMethod": "bip270 gorillapool",
    "txHash": "adbd4166d94c23bca262cc876a85bc2a5b966f7962fcb846bd780220e7695078",
    "txOutNum": 0,
    "txHex": "0100000001dbd696368e16a83122d84cbf75b667cf7fe967221fb6c4e5578631f1e3f486d6000000006a47304402207f900ad22e856b5e2decf115acfa82e4f9c8777ececddeb75b39dec12f489acd022072476a6cb749aaaa07e40710fd080820d628d0c7eb8e7eb27196d47b52bad0ed412103eb3e19d47d477af0ca555f31c9cebf946c1dfbe223442ef9bfb904e89c6e7e4effffffff02273a0000000000001976a914f24189b0a7c7730d823e051f722152ef304fdac888ac88130000000000001976a914d383cf004cc55700b9283dd41f889daba82889d188ac00000000"
}

const n1 = db.addInvoice(invoiceJSON);
assertEquals(n1, 1);

try {
    db.addInvoice(invoiceJSON);
    throw new Error('unreachable');
} catch (error) {
    assertEquals(error.message, "UNIQUE constraint failed: invoices.id")
}

const output = db.nextUnspentOutput(0);

assertEquals(output, {
    rowid: 1,
    invoiceId: "01H0FXCWKV4AH6B5WD60HJKCYH",
    invTxHash: "adbd4166d94c23bca262cc876a85bc2a5b966f7962fcb846bd780220e7695078",
    invTxOutNum: 0,
    redeemTxHash: null,
    redeemTxInNum: null,
    xPub: "xpub661MyMwAqRbcGAMdznt8CvQRVxhD3qXY4vZ1CuSrQRQYQ1YpDPi35ooo36DJ52SKb2nGyjQJ8pgFMAypNeAJo75bz2aNYBk1vPjz5mxExwf",
    derivationPath: "m/0/0/1",
    amount: 5000,
    script: "76a914d383cf004cc55700b9283dd41f889daba82889d188ac"
});

db.markSpent(output.invTxHash, output.invTxOutNum, '00000000', 0);

const invoiceRow = db.invoiceById(invoiceJSON.id);
const invoice2 = JSON.parse(invoiceRow?.jsondata||'{}');

assertEquals(invoice2, {
  "id": "01H0FXCWKV4AH6B5WD60HJKCYH",
  "created": 1684161327739,
  "domain": "example2.sweb.lol",
  "urlPath": "/images/",
  "priceInfo": {
    "pattern": "/images",
    "amount": 5000,
    "description": "The best images folder ever!"
  },
  "xPub": "xpub661MyMwAqRbcGAMdznt8CvQRVxhD3qXY4vZ1CuSrQRQYQ1YpDPi35ooo36DJ52SKb2nGyjQJ8pgFMAypNeAJo75bz2aNYBk1vPjz5mxExwf",
  "derivationPath": "m/0/0/1",
  "script": "76a914d383cf004cc55700b9283dd41f889daba82889d188ac",
  "subtotal": 5000,
  "paidAt": 1684161336445,
  "paymentMethod": "bip270 gorillapool",
  "txHash": "adbd4166d94c23bca262cc876a85bc2a5b966f7962fcb846bd780220e7695078",
  "txOutNum": 0,
  "txHex": "0100000001dbd696368e16a83122d84cbf75b667cf7fe967221fb6c4e5578631f1e3f486d6000000006a47304402207f900ad22e856b5e2decf115acfa82e4f9c8777ececddeb75b39dec12f489acd022072476a6cb749aaaa07e40710fd080820d628d0c7eb8e7eb27196d47b52bad0ed412103eb3e19d47d477af0ca555f31c9cebf946c1dfbe223442ef9bfb904e89c6e7e4effffffff02273a0000000000001976a914f24189b0a7c7730d823e051f722152ef304fdac888ac88130000000000001976a914d383cf004cc55700b9283dd41f889daba82889d188ac00000000",
  "redeemTxHash": "00000000",
  "redeemTxInNum": 0
})

db.db.close();

console.log('passed');
