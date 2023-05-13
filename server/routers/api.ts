import { Context, Router } from "/deps/oak/mod.ts";
import { errors } from "/deps/oak/deps.ts";
import { resolvePath } from "/deps/oak/util.ts";
import * as path from "/deps/std/path/mod.ts";
import { ensureDir } from "/deps/std/fs/ensure_dir.ts";

import { sha256Hex } from "/lib/sha256.ts";
import { hexToBuf } from "/lib/buffer.ts";
import { AsyncQueue } from "/lib/asyncqueue.ts";
import { RequestState } from "/server/appstate.ts";
import { Next } from "/server/oaknext.ts";
import { jsonErrorResponse as jsonError } from "../middleware/jsonerror.ts";

async function checkAuthKey (ctx:Context<RequestState>, next:Next) {
    const app = ctx.state.app;

    if (app.config.adminKey) {
        const siteAuthKeyHash = await sha256Hex(hexToBuf(app.config.adminKey));
        const userAuthKey = ctx.request.headers.get('x-authkey');

        if (userAuthKey) {
            const userAuthKeyHash = await sha256Hex(hexToBuf(userAuthKey));

            if (userAuthKeyHash === siteAuthKeyHash) {
                await next();
                return;
            }
        }
    }

    ctx.response.status = 403;
    ctx.response.type = "json";
    ctx.response.body = { error: 'FORBIDDEN' };
    return;
}



export function getApiRouter () : Router<RequestState> {

    const router = new Router<RequestState>();

    router.use(jsonError);
    router.use(checkAuthKey);

    router.post('/.api/status', function (ctx:Context) {
        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = { status: 'OK' };
        return; 
    });

    router.post('/.api/download', async function (ctx:Context<RequestState>) {
        const app = ctx.state.app;
        const body = ctx.request.body({ type: 'form-data'});
        const form = await body.value.read();

        try {
            await ctx.send({ root: app.sitePath.contentPath, path: form.fields.urlPath });
        } catch (error) {
            if (error instanceof errors.NotFound) {
                ctx.throw(404);
            }
            throw error;
        }
    });

    router.post('/.api/upload', async function (ctx:Context<RequestState>) {
        const app = ctx.state.app;
        const body = ctx.request.body({ type: 'form-data'});
        const form = await body.value.read({ outPath: app.sitePath.tempPath, maxFileSize: app.config.maxUploadSize });

        const reqFile = form.files?.[0];

        if (reqFile === undefined || reqFile.name === undefined || reqFile.filename === undefined) {
            ctx.response.status = 400;
            ctx.response.type = "json";
            ctx.response.body = { error: 'FILE_MISSING' };  
            return; 
        }

        // hack : https://github.com/oakserver/oak/issues/581
        const size = (await Deno.stat(reqFile.filename)).size-2;
        await Deno.truncate(reqFile.filename, size);
        //
        const destPath = resolvePath(app.sitePath.contentPath, form.fields.filePath);
        await ensureDir(path.dirname(destPath));
        await Deno.rename(reqFile.filename, destPath);

        if (path.basename(destPath) === 'htvm-lock.json') {
            await Deno.writeTextFile(path.join(app.sitePath.dataPath,'cleanupfiles'), Date.now().toString());
        }

        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = {};
    });

    router.post('/.api/delete', async function (ctx:Context<RequestState>) {
        const app = ctx.state.app;
        const body = ctx.request.body({ type: "form-data"});
        const form = await body.value.read();

        const deleteList = (form.fields.delete||'').split('\n');

        const aq = new AsyncQueue(100);
        
        for (const filePath of deleteList) {
            await aq.queue(Deno.remove(resolvePath(app.sitePath.contentPath, filePath)).catch(() => {}));
        }

        await aq.done();

        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = {};
    });

    router.post('/.api/rename', async function (ctx:Context<RequestState>) {
        const app = ctx.state.app;
        const body = ctx.request.body({ type: "form-data"});
        const form = await body.value.read();

        const renameList = (form.fields.rename||'').split('\n');
        const aq = new AsyncQueue(100);

        for (let i = 0; i < renameList.length-1; i += 2) {
            await aq.queue(Deno.rename(
                resolvePath(app.sitePath.contentPath, renameList[i]), 
                resolvePath(app.sitePath.contentPath, renameList[i+1])
            ).catch(() => {}));
        }

        await aq.done();

        ctx.response.status = 200;
        ctx.response.type = "json";
        ctx.response.body = {};
    });

    router.all('/.api/(.*)', function (ctx:Context<RequestState>) {
        ctx.response.status = 404;
        ctx.response.type = "json";
        ctx.response.body = {};
    })

    return router;
}