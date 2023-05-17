import { Database } from "./mod.ts";

import MetaDbModule, { MetaDbApi } from "./metadb.ts";
import InvoicesDbModule, { InvoicesDbApi } from "./invoicesdb.ts";

export interface WalletDbApi extends InvoicesDbApi {
    db:Database
    meta:MetaDbApi
}

export function initSchema (db:Database) {
    MetaDbModule.initSchema(db);
    InvoicesDbModule.initSchema(db);
}

export function getApi (db:Database) : WalletDbApi {
    const metaApi = MetaDbModule.getApi(db);
    return {
        ...InvoicesDbModule.getApi(db),
        meta: metaApi,
    }
}

export default { initSchema, getApi }

