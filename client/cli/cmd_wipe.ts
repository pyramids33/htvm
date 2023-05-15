import * as commander from "npm:commander";
import { sitePathOption } from "./options.ts"
import { checkJsonResponse, tryGetApiClient } from "./helpers.ts";

export const wipeCmd = new commander.Command('wipe')
.addOption(sitePathOption)
.description('Wipe the server')
.action(async (options) => {

    const apiClient = await tryGetApiClient(options.sitePath);
    const response = await apiClient.wipe();
    const responseObj = await checkJsonResponse(response, 200);
    console.log(responseObj);

});