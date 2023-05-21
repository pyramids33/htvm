import * as path from "/deps/std/path/mod.ts";

import { ApiClient } from "/client/apiclient.ts";
import { LockFile } from "../lockfile.ts";
import { openDb } from "../db/mod.ts";
import WalletDbModule from '../db/walletdb.ts';

export const FILES = {
    htvmHost: '.htvm-host',
    htvmLock: 'htvm-lock.json',
    priceList: 'pricelist.json',
    htvmWallet: '.htvm-wallet',
    xpub: 'xpub.txt'
};

export interface HtvmHostFile {
    url:string,
    key:string
}

export async function tryGetApiClient (sitePath:string, abortSignal?:AbortSignal) {
    const htvmHostFilePath = path.join(sitePath, FILES.htvmHost);
    try {
        const { url, key } = JSON.parse(await Deno.readTextFile(htvmHostFilePath)) as HtvmHostFile;
        return new ApiClient(url, key, abortSignal);
    } catch (error) {
        console.error("Failed opening " + htvmHostFilePath + '. ' + error.message);
        Deno.exit(1);
    }
}

export async function tryGetLock (sitePath:string) {
    const htvmLockFilePath = path.join(sitePath, FILES.htvmLock);
    try {
        return JSON.parse(await Deno.readTextFile(htvmLockFilePath)) as LockFile;
    } catch (error) {
        console.error("Failed opening " + htvmLockFilePath + '. ' + error.message);
        Deno.exit(1);
    }
}

export function tryOpenDb (sitePath:string) {
    const dbPath = path.join(sitePath, FILES.htvmWallet);
    try {
        return openDb(WalletDbModule, dbPath);
    } catch (error) {
        if (error.message === '14: unable to open database file') {
            console.error('Cannot open database: ' + dbPath);
            Deno.exit(1);
        }
        throw error;
    }
}

export async function checkJsonResponse (response:Response, status?:number) {
    // check response is status with valid JSON, return
    // return response data as object
    let responseObj; 

    try {
        responseObj = await response.json();
    } catch {
        console.error('Error: invalid json response', response.status);
        Deno.exit(1);
    }

    if (status && response.status !== status) {
        console.error('Error: ' + response.status.toString() + ' ' + response.statusText, responseObj);
        Deno.exit(1);
    }
    
    return responseObj;
}

// function prettyFiles (obj) {
//     // pretty print for getfiles command
//     let out = Object.keys(obj.files)
//         .sort()
//         .map(x => { return { ...obj.files[x], urlPath: x }});
//     console.table(out, ['urlPath','mimeType','size','hash']);
// }

