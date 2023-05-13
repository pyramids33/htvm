import bsv from "npm:bsv";
import * as path from "/deps/std/path/mod.ts";

import { PriceList } from "/lib/pricelist.ts";

import { SitePath } from "/server/sitepath.ts";
import { Config } from "/server/config.ts";
import { SSECache } from "/server/ssecache.ts";
import { Session } from "/server/middleware/session.ts";

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

    async runPriceListReloader (delayMs:number) {
        try {
            await this.getPriceList(true);
        } catch (error) {
            console.error(error);
        }
        Deno.unrefTimer(setTimeout(() => this.runPriceListReloader(delayMs).catch(console.error), delayMs));
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

    async initSessionLock (sessionId:string) {
        await Deno.writeTextFile(
            this.sitePath.sessionLockPath(sessionId),
            new Date().toISOString(), { createNew: true });
    }
}

