import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { sitePathOption } from "./options.ts"
import { detectChanges } from "../lockfile.ts";
import { FILES } from "./helpers.ts";


export async function updateLockFile (options:{ sitePath: string, update:boolean }) {
    const lockFilePath = path.join(options.sitePath, FILES.htvmLock);

    let lockFile;

    try {
        lockFile = JSON.parse(await Deno.readTextFile(lockFilePath));
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            if (options.update) {
                lockFile = {};
            } else {
                console.error('Not Found: ' + lockFilePath);
                Deno.exit(1);
            }
        } else {
            console.error('Error: ' + error.message);
            Deno.exit(1);
        }
    }

    let changeCount = 0;

    await detectChanges(lockFile, {
        path: options.sitePath,
        update: options.update,
        ignore: ['htvm-lock.json'],
        onError: (errorCode,relativePath,error) => {
            console.error(`error: ${relativePath} ${errorCode} ${error.message}`);
        },
        onChange: (changeType,relativePath) => {
            changeCount += 1;
            console.log(`${changeType}: ${relativePath}`);
        }
    });

    if (changeCount > 0 && options.update) {
        await Deno.writeTextFile(lockFilePath, JSON.stringify(lockFile,null,2))
    }

    if (changeCount === 0) {
        console.log('No Changes Detected.')
    }
}

export const lockCmd = new commander.Command('lock')
.addOption(sitePathOption)
.option('-u --update', 'Update the lock file.')
.description('Write the htvm-lock.json file')
.action(updateLockFile);