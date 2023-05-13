import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { sitePathOption, validateAuthKey, validateUrl } from "./options.ts"
import { ApiClient } from "../apiclient.ts";
import { checkJsonResponse } from "./helpers.ts";


export const hostCmd = new commander.Command('host')
.addOption(sitePathOption)
.option('--url <url>', 'Url of your site. e.g, https://mysite.com/ ', validateUrl)
.option('--key <key>', 'API Authentication key (10-64 character hex string). Generated randomly by default.', validateAuthKey)
.option('-o --overwrite', 'Overwrite the existing file')
.option('-s --skiptest', 'Skip the request to /.api/get-status before saving.')
.description('Write the .htvm-host file')
.action(async (options) => {

    const hostFilePath = path.join(options.sitePath, '.htvm-host');
    const hostInfo = { url: options.url, key: options.key };

    let doSave = options.skiptest === true;

    if (!options.skiptest) {
        const abortController = new AbortController();
        const apiClient = new ApiClient(options.url, options.key, abortController.signal);
        const response = await apiClient.status();
        const data = await checkJsonResponse(response, 200);

        if (data.status !== 'OK') {
            console.error('Status check failed.', data);
            Deno.exit(1);
        }
        
        doSave = true;
    }

    if (doSave) {
        await Deno.writeTextFile(hostFilePath, JSON.stringify(hostInfo,null,2));
    }
});