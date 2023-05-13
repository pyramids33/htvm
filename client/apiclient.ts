import { trimEnd } from "/lib/trims.ts";

export interface ApiClientSendOptions {
    onProgressFn?:() => void
    progressInterval?:number
}

class ApiClientBase {

    urlPrefix:string
    authKey:string
    abortSignal?:AbortSignal

    constructor (urlPrefix:string, authKey:string, abortSignal?:AbortSignal) {
        this.urlPrefix = trimEnd(urlPrefix, '/');
        this.authKey = authKey;
        this.abortSignal = abortSignal;
    }

    async postFormData (urlPath:string, args:Record<string, string|Blob|undefined> = {}, _options:ApiClientSendOptions={}) {
        const destUrl = new URL(this.urlPrefix);
        destUrl.pathname = urlPath;
        
        const formData = new FormData();
        
        for (const [key, arg] of Object.entries(args)) {
            if (arg !== undefined && arg !== null) {
                formData.append(key, arg);
            }
        }

        const res = await fetch(destUrl, { 
            signal: this.abortSignal, 
            headers: { 'x-authkey': this.authKey },
            method: 'POST', 
            body: formData
        });

        return res;
    }

}

export class ApiClient {

    client:ApiClientBase
  
    constructor (urlPrefix:string, authKey:string, abortSignal?:AbortSignal) {
        this.client = new ApiClientBase(urlPrefix, authKey, abortSignal);
    }

    delete (deleteList:string) {
        return this.client.postFormData('/.api/delete', { delete: deleteList });
    }

    download (urlPath:string) {
        return this.client.postFormData('/.api/download', { urlPath });
    }

    status () {
        return this.client.postFormData('/.api/status');
    }

    rename (renameList:string) {
        return this.client.postFormData('/.api/rename', { rename: renameList });
    }

    upload (filePath:string, fileData:File, onProgressFn = () => {}) {
        return this.client.postFormData('/.api/upload', { filePath, fileData }, { onProgressFn });
    }

}