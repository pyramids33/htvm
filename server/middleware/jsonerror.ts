import { Context } from "/deps/oak/mod.ts";
import { isHttpError } from "/deps/oak/deps.ts";
import { RequestState } from "/server/appstate.ts";
import { Next } from "/server/oaknext.ts";

export async function jsonErrorResponse (ctx:Context<RequestState>, next:Next) {
    try {
        await next();
    } catch (error) {
        if (ctx.state.app.config.logErrors || ctx.state.app.config.env === 'dev'){
            console.log(error);
        }
        ctx.response.status = isHttpError(error) ? error.status : 500;
        ctx.response.type = "json";
        ctx.response.body = {};
    }
}