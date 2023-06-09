import { ServerSentEventTarget } from "/deps/oak/mod.ts";

/**
 * A collection of SSE Event Targets
 */
export class SSECache {

    targets:Record<string,ServerSentEventTarget[]> = {};

    constructor () {}

    addTarget (key:string, target:ServerSentEventTarget) {
        if (this.targets[key] === undefined) {
            this.targets[key] = [];
        }

        this.targets[key].push(target);

        target.addEventListener('close', () => {
            if (this.targets[key]) {
                this.targets[key] = this.targets[key].filter(x => x !== target);

                if (this.targets[key].length === 0){
                    delete this.targets[key];
                }
            }
        });

        target.dispatchMessage('READY');
    }

    async onPayment (key:string) {
        //console.log('onPayment', key, this.targets[key]?.length);
        if (this.targets[key]) {
            for (const target of this.targets[key]) {
                target.dispatchMessage('PAID');
                try {
                    await target.close();
                } catch (error) {
                    console.error('sse close error', error)
                }
            }
        }
    }

    async close () {
        //console.log('close sse');
        for (const targets of Object.values(this.targets)) {
            for (const target of targets) {
                try {
                    await target.close();
                } catch (error) {
                    console.error('sse close error', error)
                }
            }
        }
    }
}