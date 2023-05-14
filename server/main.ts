import * as path from '/deps/std/path/mod.ts';

import { serveSite } from "/server/servesite.ts";
import { AppState } from "/server/appstate.ts";
import { Config } from "/server/config.ts";
import mstime from "/lib/mstime.ts";


const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

function onSignal (signal:string, abortController:AbortController, appState:AppState) {
    console.log(signal);
    abortController.abort();
    appState.sse.close();
}

if (import.meta.main) {

    if (Deno.args.length === 0 || Deno.args[0] === '--help') {
        console.error('Usage: htvmserver <config.json> ');
        Deno.exit();
    }

    const abortController = new AbortController();
    
    const configFilePath = Deno.args[0];
    
    console.log('htvm server');
    console.log('config: ', configFilePath);

    const config:Config = JSON.parse(Deno.readTextFileSync(configFilePath));

    if (config.staticPath === undefined) {
        config.staticPath = path.join(__dirname, 'static');
    }

    const appState = new AppState(config);

    Deno.addSignalListener("SIGTERM", () => onSignal('SIGTERM', abortController, appState));
    Deno.addSignalListener("SIGINT", () => onSignal('SIGINT', abortController, appState));
    Deno.addSignalListener("SIGHUP", () => onSignal('SIGHUP', abortController, appState));

    if (config.ensureDirs) {
        await appState.sitePath.ensureDirs();
    }

    appState.runPriceListReloader(mstime.secs(30)).catch(console.error);
    appState.runXPubReloader(mstime.secs(30)).catch(console.error);
    appState.runSessionCleaner(mstime.secs(30)).catch(console.error);

    await serveSite(appState, {
        abortSignal: abortController.signal,
        onListen: () => {
            console.log(`listening ${config.listenOptions.hostname}:${config.listenOptions.port}`)
        }
    });

    console.log('main:server closed');
}