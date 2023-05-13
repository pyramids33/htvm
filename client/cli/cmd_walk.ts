import * as commander from "npm:commander";
import { sitePathOption } from "./options.ts"
import { walkFiles } from "../walksite.ts";

export const walkCmd = new commander.Command('walk')
.addOption(sitePathOption)
.description('Walk the directory tree')
.action(async (options) => {

    let numFiles = 0;
    let totalSize = 0;
    let maxSize = 0;

    for await (const entry of walkFiles(options.sitePath,'')) {
        console.log(entry.relativePath);
        numFiles += 1;
        totalSize += entry.size;
        maxSize = entry.size > maxSize ? entry.size : maxSize;
    }

    console.log('---');
    console.log('number of files:', numFiles);
    console.log('total size:', totalSize);
    console.log('max file size:', maxSize, 'b');
});