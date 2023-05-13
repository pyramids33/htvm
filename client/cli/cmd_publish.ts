import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { sitePathOption } from "./options.ts"
import { FILES, checkJsonResponse, tryGetApiClient, tryGetLock } from "./helpers.ts";
import { updateLockFile } from "./cmd_lock.ts";
import { diffLocks } from "../lockfile.ts";


export const publishCmd = new commander.Command('publish')
.addOption(sitePathOption)
.description('Publish the files to the host')
.action(async (options) => {

    const apiClient = await tryGetApiClient(options.sitePath);
    
    console.log('updating lock ... ');
    await updateLockFile({ sitePath: options.sitePath, update: true });
    
    const localLock = await tryGetLock(options.sitePath);
    let serverLock = {};

    console.log('diff server files ... ');
    const response = await apiClient.download('/htvm-lock.json');
    const responseData = await checkJsonResponse(response);
    
    if (response.status === 404) {
        serverLock = {};
    } else if (response.status === 200) {
        serverLock = responseData;
    } else {
        console.error('Error downloading lock: ', response.status, responseData);
        Deno.exit(1);
    }
    
    const { deletions, renames, uploads } = diffLocks(localLock, serverLock);

    {
        console.log('deletions... ' + deletions.length.toString());
        const response = await apiClient.delete(deletions.join('\n'));
        const responseObj = await checkJsonResponse(response, 200);

        if (responseObj.error) {
            console.error(responseObj);
            Deno.exit(1);
        }
    }
    {
        console.log('renames... ' + renames.length.toString());
        const renameList = renames.map(x => [ x.serverPath, x.localPath ] as [string,string]);
        const response = await apiClient.rename(renameList.map(x => x.join('\n')).join('\n'));
        const responseObj = await checkJsonResponse(response, 200);

        if (responseObj.error) {
            console.error(responseObj);
            Deno.exit(1);
        }
    }
    {
        console.log('uploads... ' + uploads.length.toString());
        for (const localPath of uploads) {

            console.log('uploading... ' + localPath)

            const blob = await Deno.readFile(path.join(options.sitePath, localPath));
            const file = new File([blob], path.basename(localPath));

            const response = await apiClient.upload(localPath, file);
            const responseObj = await checkJsonResponse(response, 200);

            if (responseObj.error) {
                console.error(responseObj);
                Deno.exit(1);
            }
        }
    }
    {
        console.log('sending lock... ');
        const blob = await Deno.readFile(path.join(options.sitePath, FILES.htvmLock));
        const file = new File([blob], path.basename(FILES.htvmLock));

        const response = await apiClient.upload(FILES.htvmLock, file);
        const responseObj = await checkJsonResponse(response, 200);

        if (responseObj.error) {
            console.error(responseObj);
            Deno.exit(1);
        }
    }

});