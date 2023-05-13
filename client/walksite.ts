import { walk as _walk, WalkOptions } from "/deps/std/fs/mod.ts"
import * as path from "/deps/std/path/mod.ts";

/**
 * Any file or directory starting with dot, underscore is ignored by site mapper
 * Dot on its own is site root so not ignored
 * Dot Dot is also ignored
 */
const ignorePathRegExpString = path.SEP === '\\' ? 
    /(^|\\)((\.[^\\\.][^\\]*)|(_[^\\]*))($|\\)/ : 
    /(^|\/)((\.[^\/\.][^\/]*)|(_[^\/]*))($|\/)/;

const ignorePathRegExp = new RegExp(ignorePathRegExpString, 'gi');

export interface WalkFilesEntry {
    relativePath: string,
    size: number,
    date: number
}

export async function* walkFiles (sitePath:string, relativePath='', walkOptions?:WalkOptions) : AsyncGenerator<WalkFilesEntry> {
    const walkPath = path.join(sitePath, relativePath);
    
    walkOptions = walkOptions || {};
    walkOptions.skip = walkOptions.skip || [];
    walkOptions.skip.push(ignorePathRegExp);
    
    for await (const entry of _walk(walkPath, walkOptions)) {
        const relativePath = path.relative(sitePath, entry.path);

        const info = await Deno.stat(entry.path);
        if (info.isFile) {
            yield {
                relativePath,
                size: info.size,
                date: info.mtime?.valueOf()||Date.now()
            }
        }
    }
}


