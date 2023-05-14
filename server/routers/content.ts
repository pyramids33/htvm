import * as path from "/deps/std/path/mod.ts";

import { Context, Router } from "/deps/oak/mod.ts";
import { errors } from "/deps/oak/deps.ts";
import { readWriteSessionHeaders, hasSession, checkSession } from "/server/middleware/session.ts";
import { RequestState } from "/server/appstate.ts";
import { mapUrlPath } from "/server/mapurlpath.ts";

export function getContentRouter () : Router<RequestState> {

    const router = new Router<RequestState>();

    router.get('/.status', function (ctx:Context) {
        ctx.response.body = 'OK';
        ctx.response.status = 200;
        return;
    });

    router.use(readWriteSessionHeaders);

    router.get('/.hassession', hasSession);

    router.get('/(.*)', checkSession, async function (ctx:Context<RequestState>) {
        const session = ctx.state.session;
        const app = ctx.state.app;
        const { sitePath, config } = app;

        if (['/pricelist.json','/xpub.txt','/htvm-lock.json'].includes(ctx.request.url.pathname)) {
            ctx.response.status = 404;
            ctx.response.body = '404 - Page Not Found';
            return;
        }

        let fileInfo = await mapUrlPath(ctx.request.url.pathname, config.contentPath);

        if (fileInfo === undefined) {
            fileInfo = await mapUrlPath(ctx.request.url.pathname + '/', config.contentPath);
            if (fileInfo) {
                ctx.response.redirect(ctx.request.url.pathname + '/');
                return;
            } else {
                ctx.response.status = 404;
                ctx.response.body = '404 Page Not Found';
                return;
            }
        }

        const priceList = await app.getPriceList();
        
        if (priceList) {
            const matchResult = priceList.matchUrl(ctx.request.url.pathname);

            if (matchResult) {

                const hasAccess = await app.checkAccess(session.sessionId, matchResult.urlMatch);

                if (!hasAccess) {
                    ctx.response.status = 402;
                    ctx.response.headers.set('content-disposition', 'inline; filename=402.html');
                    await ctx.send({ root: app.staticPath, path: '402.html' });
                    return;
                }
            }
        }

        if (fileInfo.mimeType) {
             ctx.response.headers.set('content-type', fileInfo.mimeType);
        }

        ctx.response.headers.set('content-disposition', 'inline; filename=' + path.basename(fileInfo.urlPath));

        try {
            await ctx.send({ root: sitePath.contentPath, path: fileInfo.filePath });
        } catch (error) {
            if (error instanceof errors.NotFound) {
                ctx.throw(404);
            }
            throw error;
        }
    });

    return router;
}