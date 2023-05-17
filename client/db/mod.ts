import { Database, type DatabaseOpenOptions } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";
export { Database, type DatabaseOpenOptions } from "https://deno.land/x/sqlite3@0.9.1/mod.ts";

export type DbInitSchemaFn = (db:Database) => void;
export type DbGetApiFn<A> = (db:Database) => A;
export type DbModule<A> = {
    initSchema:DbInitSchemaFn, 
    getApi:DbGetApiFn<A>
};

export function sqlite3LikePipeEscape (theString:string) : string {
    return theString.replaceAll('|','||').replaceAll('%', '|%').replaceAll('_', '|_')
}

export interface XDatabaseOpenOptions extends DatabaseOpenOptions {
    mustBeNew?: boolean;
}

export function openDb <A> (    
    dbModule:DbModule<A>,
    filename:string|URL, 
    options:XDatabaseOpenOptions={}
) {    
    options.int64 = options.int64 || true;
    // ! readonly mode produces SQLite API Misuse Error

    const db = new Database(filename, options);
    
    db.exec('pragma journal_mode = WAL');
    
    if (options.create !== false && options.readonly !== true) {
        db.transaction(function () {
            try {
                dbModule.initSchema(db);
            } catch (error) {
                if (/\ already exists/.test(error.message)) {
                    if (options.mustBeNew) {
                        throw new Error('Database already exists.');
                    }
                } else {
                    throw error;
                }
            }
        })(null);
    }

    return dbModule.getApi(db);
}