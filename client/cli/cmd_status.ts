import * as commander from "npm:commander";
import * as path from "/deps/std/path/mod.ts";
import { sitePathOption } from "./options.ts"
import { ApiClient } from "../apiclient.ts";
import { checkJsonResponse } from "./helpers.ts";


export const statusCmd = new commander.Command('status')
.addOption(sitePathOption)
.description('Check api status')
.action(async (options) => {
    const hostFilePath = path.join(options.sitePath, '.htvm-host');
    const hostFile = JSON.parse(await Deno.readTextFile(hostFilePath));
    const apiClient = new ApiClient(hostFile.url, hostFile.key);
    const response = await apiClient.status();
    const data = await checkJsonResponse(response, 200);

    if (data.status !== 'OK') {
        console.error('Status check failed.', data);
        Deno.exit(1);
    }

});