import { default as id128 } from "npm:id128";
import { Context } from "/deps/oak/mod.ts";

import mstime from "/lib/mstime.ts";

import { RequestState } from "/server/appstate.ts";
import { Next } from "/server/oaknext.ts";

export interface Session {
    sessionId: string,
    createTime: number
    checkTime: number
}

export function createSession () : Session {
    const session = emptySession();
    session.sessionId = id128.Ulid.generate().toCanonical();
    return session;
}

export function emptySession () : Session {
    return { sessionId: '', createTime: 0, checkTime: 0 };
}

export function sessionFromJSON (jsonString:string) : Session {
    const session = emptySession();
    try {
        const sessionObj = JSON.parse(jsonString);
        session.sessionId = sessionObj.sessionId || '';
        session.createTime = sessionObj.createTime || 0;
        session.checkTime = sessionObj.checkTime || 0;
    } catch (error) {
        throw new Error('error parsing json session', { cause: error });
    }
    return session;
}

export async function readWriteSessionHeaders (ctx:Context<RequestState>, next:Next) {
    const jsonString = await ctx.cookies.get('session');
    ctx.state.session = sessionFromJSON(jsonString || '{}');
    await next();
    await ctx.cookies.set("session", JSON.stringify(ctx.state.session), {
        expires: new Date(Date.now()+mstime.hours(7)),
        sameSite: 'lax',
        httpOnly: true
    });
}

export function hasSession (ctx:Context<RequestState>) {
    // Users with no cookie should be given a cookie and shown nocookie.html, which calls this route
    // to check the users cookie.
    // The user should have a cookie on that page. If not they might have disabled cookies.
    ctx.response.status = 200;

    if (ctx.state.session.sessionId === '') {
        ctx.response.body = '0';
    } else {
        ctx.response.body = '1';
    }
}

export async function checkSession (ctx:Context<RequestState>, next:Next) {
    const session = ctx.state.session;
    const app = ctx.state.app;
    if (session.sessionId === '') {
        ctx.state.session = createSession();
        ctx.response.status = 200;
        await ctx.send({ root: app.staticPath, path: 'nocookie.html' });
        return;
    } else {
        const sessionLockFilePath = app.sitePath.sessionLockPath(session.sessionId);
        if (session.createTime === 0) {
            session.createTime = Date.now();
            session.checkTime = Date.now();
            
            await app.sitePath.ensureSessionDirs(session.sessionId);
            await Deno.writeTextFile(sessionLockFilePath, Date.now().toString(), { createNew: true });
        } else {
            // Check in every so often. If the check time is more than
            // 8 hours ago, we can assume that the cookie will have expired
            // and the session directory can be cleaned.
            if (session.checkTime < mstime.minsAgo(10)) {
                try {
                    await Deno.writeTextFile(sessionLockFilePath, Date.now().toString(), { create: false });
                } catch (error) {
                    console.error(error);
                    ctx.throw(500);
                }
                session.checkTime = Date.now();
            }
        }
    }

    await next();
}

export async function lockSession (sessionLockFilePath:string, exclusive = false, next:Next) {
    let sessionLockFile:Deno.FsFile|undefined;
    try { 
        sessionLockFile = await Deno.open(sessionLockFilePath);
        await Deno.flock(sessionLockFile.rid, exclusive);
        await next();
    } catch (error) {
        throw error;
    } finally {
        if (sessionLockFile) {
            await Deno.funlock(sessionLockFile.rid);
            sessionLockFile.close();
        }
    }
}

export function lockSessionMiddleware (exclusive = true, queryParam = 'sessionId') {
    return async function (ctx:Context<RequestState>, next:Next) {
        const app = ctx.state.app;
        const sessionId = ctx.state.session.sessionId || 
            ctx.request.url.searchParams.get(queryParam) || '';
        
        if (!id128.Ulid.isCanonical(sessionId)) {
            ctx.throw(400);
        }
        
        const sessionLockFilePath = app.sitePath.sessionLockPath(sessionId);

        await lockSession(sessionLockFilePath, exclusive, next);
    }
}