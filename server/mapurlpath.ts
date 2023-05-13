
import * as path from "/deps/std/path/mod.ts";
import * as mime from "/deps/std/media_types/mod.ts";

import { tryStat } from "/lib/trystat.ts";

export async function mapUrlPath (urlPath:string, contentRoot:string) {
      
    let relativePath = path.fromFileUrl('file:///' + urlPath);
    let stat = await tryStat(path.join(contentRoot, relativePath));

    if (stat && stat.isDirectory && urlPath.endsWith('/')) {
        relativePath = path.join(relativePath, 'default.html');
        stat = await tryStat(path.join(contentRoot, relativePath));
    }
        
    if (stat && stat?.isFile) {
        return {
            urlPath,
            size: stat.size,
            filePath: relativePath,
            mimeType: mime.contentType(path.extname(relativePath)) || ''
        }
    }
    
    return undefined;
}