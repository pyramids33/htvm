import * as commander from "npm:commander";
import { sitePathOption } from "./options.ts"
import { checkJsonResponse, tryGetApiClient, tryGetLock } from "./helpers.ts";
import { diffLocks } from "../lockfile.ts";


export const diffCmd = new commander.Command('diff')
.addOption(sitePathOption)
.description('Diff local and server files')
.action(async (options) => {

    const localLock = await tryGetLock(options.sitePath);
    const apiClient = await tryGetApiClient(options.sitePath);
    const response = await apiClient.download('/htvm-lock.json');

    let serverLock = {};

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

    deletions.forEach(x => console.log('delete:', x));
    renames.forEach(x => console.log('rename:', x.serverPath, 'to', x.localPath));
    uploads.forEach(x => console.log('upload:', x));
});