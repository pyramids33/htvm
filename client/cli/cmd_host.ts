import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { sitePathOption, validateAuthKey, validateUrl } from "./options.ts"
import { bufToHex } from "../../lib/buffer.ts";

export const hostCmd = new commander.Command('host')
.addOption(sitePathOption)
.requiredOption('--url <url>', 'Url of your site. e.g, https://mysite.com/ ', validateUrl)
.option('--key <key>', 'API Authentication key (10-64 character hex string). Generated randomly by default.', validateAuthKey)
.description('Write the .htvm-host file')
.action(async (options) => {

    if (options.key === undefined) {
        options.key = bufToHex(crypto.getRandomValues(new Uint8Array(32)))
    }

    const hostFilePath = path.join(options.sitePath, '.htvm-host');
    const hostInfo = { url: options.url, key: options.key };
    await Deno.writeTextFile(hostFilePath, JSON.stringify(hostInfo,null,2));
    console.table(hostInfo);
});