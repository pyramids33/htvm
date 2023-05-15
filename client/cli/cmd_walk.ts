import * as commander from "npm:commander";
import { sitePathOption } from "./options.ts"
import { walkFiles } from "../walksite.ts";
import { checkJsonResponse, tryGetApiClient } from "./helpers.ts";

export const walkCmd = new commander.Command('walk')
.addOption(sitePathOption)
.option('-s --server','Walk on the server')
.description('Walk the directory tree')
.action(async (options) => {

    let numFiles = 0;
    let totalSize = 0;
    let maxSize = 0;

    if (options.server) {
        const apiClient = await tryGetApiClient(options.sitePath);
        const response = await apiClient.walk();
        const files = await checkJsonResponse(response, 200);

        for (const [ filePath, size, _ ] of files){
            console.log(filePath);
            numFiles += 1;
            totalSize += size;
            maxSize = size > maxSize ? size : maxSize;
        }
    } else {        
        for await (const entry of walkFiles(options.sitePath,'')) {
            console.log(entry.relativePath);
            numFiles += 1;
            totalSize += entry.size;
            maxSize = entry.size > maxSize ? entry.size : maxSize;
        }
    }

    console.log('---');
    console.log('number of files:', numFiles);
    console.log('total size:', totalSize);
    console.log('max file size:', maxSize, 'b');
});