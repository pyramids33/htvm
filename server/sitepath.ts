import * as path from "/deps/std/path/mod.ts";
import { ensureDir } from "/deps/std/fs/ensure_dir.ts";

import { bufToB64Url, strToBuf } from "/lib/buffer.ts";

export class SitePath {

    dataPath:string
    tempPath:string
    contentPath:string
    sessionsPath:string
    paymentsPath:string

    constructor (dataPath:string, contentPath:string) {
        this.dataPath = dataPath;
        this.tempPath = path.join(dataPath, 'temp');
        this.contentPath = contentPath;
        this.sessionsPath = path.join(dataPath, 'sessions');
        this.paymentsPath = path.join(dataPath, 'payments');
    }

    filePath (filePath:string) : string {
        return path.join(this.contentPath, filePath);
    }

    sessionPath (sessionId:string, ...subPaths:string[]) {
        return path.join(this.sessionsPath, sessionId, ...subPaths);
    }

    sessionLockPath (sessionId:string) {
        return path.join(this.sessionPath(sessionId, 'session.lock'));
    }

    sessionAccessPath (sessionId:string, urlPath?:string) {
        const seg = urlPath ? bufToB64Url(strToBuf(urlPath)) : '';
        return this.sessionPath(sessionId, 'access', seg);
    }

    sessionInvoicePath (sessionId:string, invoiceId:string) {
        return path.join(this.sessionInvoicesPath(sessionId), invoiceId);
    }

    sessionInvoicesPath (sessionId:string) {
        return this.sessionPath(sessionId, 'invoices');
    }

    paymentPath (invoiceId:string) {
        return path.join(this.paymentsPath, invoiceId);
    }

    async ensureDirs () {
        await ensureDir(this.dataPath);
        await ensureDir(this.paymentsPath);
        await ensureDir(this.tempPath);
        await ensureDir(this.sessionsPath);
        await ensureDir(this.contentPath);
    }

    async ensureSessionDirs(sessionId:string) {
        await ensureDir(this.sessionAccessPath(sessionId));
        await ensureDir(this.sessionInvoicesPath(sessionId));
    }
}
