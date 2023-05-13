import { ListenOptions } from "/deps/oak/mod.ts";

export interface MapiEndPointInfo {
    name:string,
    url:string,
    extraHeaders: Record<string,string>
}

export interface Config {
    listenOptions: ListenOptions
    cookieSecret: string[]
    env: string
    contentPath: string
    dataPath: string
    staticPath?: string
    domain: string 
    logErrors?:boolean
    ensureDirs?: boolean
    adminKey?: string
    maxUploadSize?: number
    mAPIEndpoints: MapiEndPointInfo[]
}

