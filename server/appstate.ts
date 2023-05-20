import bsv from "npm:bsv";
import * as path from "/deps/std/path/mod.ts";
import { default as id128 } from "npm:id128";

import { PriceList } from "/lib/pricelist.ts";
import mstime from "/lib/mstime.ts";

import { SitePath } from "/server/sitepath.ts";
import { Config } from "/server/config.ts";
import { SSECache } from "/server/ssecache.ts";
import { Session, lockSession } from "/server/middleware/session.ts";



const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

export interface RequestState {
    app: AppState
    session: Session
}

export class AppState {

    config: Config
    sitePath: SitePath
    staticPath: string
    workerId = 0
    startId = 0
    #xPubCounter = 0

    sse:SSECache = new SSECache()
    #priceList?: PriceList
    #xpub?: bsv.Bip32
    #access:Record<string,number> = {}

    constructor (config:Config){
        this.config = config;
        this.sitePath = new SitePath(config.dataPath, config.contentPath);
        this.staticPath = config.staticPath || path.join(__dirname, 'static');
    }

    async checkAccess (sessionId:string, urlPath:string) : Promise<boolean> {
        const key = sessionId + '/' + urlPath;
        if (this.#access[key] === undefined || this.#access[key] < Date.now()) {
            try {
                const accessFilePath = this.sitePath.sessionAccessPath(sessionId, urlPath);
                this.#access[key] = parseInt(await Deno.readTextFile(accessFilePath), 10);
            } catch {
                // ignore
                return false;
            }
        }
        return this.#access[key] > Date.now();
    }

    nextXPubCounter () {
        this.#xPubCounter += 1;
        return this.#xPubCounter;
    }

    async getPriceList (forceReload=false) {
        if (this.#priceList === undefined || forceReload) {
            const plPath = this.sitePath.filePath('pricelist.json');
            try {
                const plText = await Deno.readTextFile(plPath);
                this.#priceList = PriceList.fromJSON(plText);
            } catch (error) {
                if (error instanceof Deno.errors.NotFound) {
                    this.#priceList = undefined;
                    return this.#priceList;
                } else {
                    throw error;
                }
            }
        }
        return this.#priceList;
    }

    async getXPub (forceReload=false) {
        if (this.#xpub === undefined || forceReload) {
            try {
                const xPubText = await Deno.readTextFile(this.sitePath.filePath('xpub.txt'));
                this.#xpub = bsv.Bip32.fromString(xPubText);
            } catch (error) {
                if (error instanceof Deno.errors.NotFound) {
                    this.#xpub = undefined;
                    return this.#xpub;
                } else {
                    throw error;
                }
            }
        }
        return this.#xpub;
    }

    async runXPubReloader (delayMs:number) {
        await this.getXPub(true);
        Deno.unrefTimer(setTimeout(() => this.runXPubReloader(delayMs).catch(console.error), delayMs));
    }

    async runPriceListReloader (delayMs:number) {
        try {
            await this.getPriceList(true);
        } catch (error) {
            console.error(error);
        }
        Deno.unrefTimer(setTimeout(() => this.runPriceListReloader(delayMs).catch(console.error), delayMs));
    }

    async runSessionCleaner (delayMs:number) {
        try {
            await this.cleanSessions();
        } catch (error) {
            console.error(error);
        }
        Deno.unrefTimer(setTimeout(() => this.runSessionCleaner(delayMs).catch(console.error), delayMs));
    }

    async cleanSessions () {
        const sessionsPath = this.sitePath.sessionsPath;
        
        for await (const entry of Deno.readDir(sessionsPath)) {
            try {
                await this.cleanSession(entry.name);
            } catch (error) {
                console.error(error);
            }
        }
    }
    
    async cleanSession (sessionId:string) {
        const sessionLockFilePath = this.sitePath.sessionLockPath(sessionId);
        const sessionAccessPath = this.sitePath.sessionAccessPath(sessionId);
        const sessionInvoicesPath = this.sitePath.sessionInvoicesPath(sessionId);
        const paymentsPath = this.sitePath.paymentsPath;

        try {
            const checkTime = parseInt(await Deno.readTextFile(sessionLockFilePath), 10) || Date.now();

            if (checkTime < mstime.hoursAgo(8)) {
                await moveSessionInvoices(sessionInvoicesPath, paymentsPath, Date.now());
                await tryDeleteExisting(path.join(sessionInvoicesPath, 'current.json'));
                await tryDeleteExisting(sessionInvoicesPath);
                await tryDeleteExisting(sessionAccessPath, { recursive: true });
                await tryDeleteExisting(sessionLockFilePath);
                await tryDeleteExisting(this.sitePath.sessionPath(sessionId));
                console.log('removed session ' + sessionId);
            } else {
                await lockSession(sessionLockFilePath, true, async function () {
                    await moveSessionInvoices(sessionInvoicesPath, paymentsPath, mstime.minsAgo(15));
                });
            }
        } catch (error) {
            console.error(error);
            return;
        }
    }
}
async function tryDeleteExisting (filePath:string, options?:Deno.RemoveOptions) {
    try {
        await Deno.remove(filePath, options);
    } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
        }
    }
}
async function moveSessionInvoices (sessionInvoicesPath:string, paymentsPath:string, expiry:number) {
    for await (const entry of Deno.readDir(sessionInvoicesPath)) {
        if (entry.name === 'current.json') {
            continue;
        } else {
            if (id128.Ulid.isCanonical(entry.name)) {
                if (id128.Ulid.fromCanonical(entry.name).time.valueOf() < expiry) {
                    await Deno.rename(
                        path.join(sessionInvoicesPath, entry.name), 
                        path.join(paymentsPath, entry.name)
                    );
                }
            }
        }
    }
}

