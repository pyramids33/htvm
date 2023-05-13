import * as path from "/deps/std/path/mod.ts";

import { AsyncQueue } from "../lib/asyncqueue.ts";
import { sha256FileHex } from "../lib/sha256.ts";
import { WalkFilesEntry, walkFiles } from "./walksite.ts";

export interface LockFileEntry {
    size: number,
    date: number,
    hash: string
}

export type LockFile = Record<string,LockFileEntry>

export interface DetectChangesOptions {
    path:string
    ignore?: string[]
    update?: boolean
    onError?: (errorCode:string, relativePath:string, error:Error) => void
    onChange?: (changeType:string, relativePath:string, lockEntry:LockFileEntry) => void
}

const defaultOptions:DetectChangesOptions = {
    update: true,
    path: './'
}

export async function detectChanges (lockFile:LockFile, options:DetectChangesOptions=defaultOptions) {

    async function detectModified (entry:WalkFilesEntry) {
        const fullPath = path.join(options.path, entry.relativePath);
            
        let stat;
    
        try {
            stat = await Deno.stat(fullPath);
        } catch (error) {
            if (options && options.onError) {
                options.onError('stat', entry.relativePath, error);
            }
            return;
        }
    
        const lockTime = stat?.mtime?.valueOf() || Date.now();
        let lockEntry = lockFile[entry.relativePath];
    
        if (lockEntry === undefined ||
            lockEntry.size != stat.size ||
            lockEntry.date != lockTime) {
    
            const changeType = lockEntry === undefined ? 'new' : 'modified';
            const hash = await sha256FileHex(fullPath);
    
            lockEntry = {
                hash: 'sha256-'+hash,
                size: stat.size,
                date: lockTime
            };
            
            if (options.update) {
                lockFile[entry.relativePath] = lockEntry;
            }

            if (options && options.onChange) {
                options.onChange(changeType, entry.relativePath, lockFile[entry.relativePath])
            }
        }
    }

    async function detectDeleted (relativePath:string, lockEntry:LockFileEntry) {
        const fullPath = path.join(options.path, relativePath);
        
        try {
            if (options.ignore?.includes(relativePath)) {
                throw new Deno.errors.NotFound();
            }
            await Deno.stat(fullPath);
            
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                if (options.update) {
                    delete lockFile[relativePath];
                }
                if (options && options.onChange) {
                    options.onChange('deleted', relativePath, lockEntry);
                }
            } else {
                if (options && options.onError) {
                    options.onError('stat', relativePath, error);
                }
            }
        }
    }

    const aq = new AsyncQueue(3);

    for await (const entry of walkFiles(options.path,'')) {
        if (options.ignore?.includes(entry.relativePath)){
            continue;
        }
        await aq.queue(detectModified(entry));
    }

    await aq.done();

    for (const [relativePath, lockEntry] of Object.entries(lockFile)) {
        await aq.queue(detectDeleted(relativePath, lockEntry));      
    }

    await aq.done();

    return lockFile;
}


interface LockDiffResult {
    matches: { localPath:string, serverPath:string }[]
    renames: { localPath:string, serverPath:string }[]
    uploads: string[],
    deletions: string[]
}

export function diffLocks (localLock:LockFile, serverLock:LockFile):LockDiffResult {
    
    const matches = [];
    const renames = [];
    const uploads = [];

    const localPaths = Object.entries(localLock);
    const serverPaths = Object.entries(serverLock);

    let jStart = 0;

    for (let i = 0; i < localPaths.length; i++) {
        
        const [localPath, localEntry] = localPaths[i];

        let matched = false;

        for (let j = jStart; j < serverPaths.length; j++) {

            const [serverPath,serverEntry] = serverPaths[j];

            if (localPath === serverPath && localEntry.hash === serverEntry.hash) {
                
                matches.push({ localPath, serverPath });
                matched = true;

            } else if (localPath !== serverPath && localEntry.hash === serverEntry.hash) {
                
                renames.push({ localPath, serverPath });
                matched = true;
            
            } else if (localPath === serverPath && localEntry.hash !== serverEntry.hash) {

                uploads.push(localPath);
                matched = true;

            }

            if (matched) {
                // Replace this matched item with an unmatched item from the start of the array.
                // Therefore, all the unmatched items are between jStart and serverPaths.length
                serverPaths[j] = serverPaths[jStart];
                jStart += 1;
                break;
            }
        }

        if (!matched) {
            uploads.push(localPath);
        }

    }

    const deletions = serverPaths.slice(jStart).map(x => x[0]);

    return { matches, renames, uploads, deletions };
}
