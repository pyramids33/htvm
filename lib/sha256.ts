import { crypto } from "/deps/std/crypto/mod.ts";
import { iterateReader } from "/deps/std/streams/iterate_reader.ts";

import { hexToBuf, bufToHex } from "/lib/buffer.ts";

type BufferInput = BufferSource|Iterable<BufferSource>|AsyncIterable<BufferSource>

const textEncoder = new TextEncoder();

export async function sha256 (data:BufferInput) : Promise<ArrayBuffer> {
    return await crypto.subtle.digest('SHA-256', data);
}
export async function sha256Txt (data:string) : Promise<ArrayBuffer> {
    return await crypto.subtle.digest('SHA-256', textEncoder.encode(data));
}
export async function sha256Hex (data:string|BufferInput) : Promise<string> {
    if (typeof(data) === 'string') {
        data = hexToBuf(data);
    }
    return bufToHex(await crypto.subtle.digest('SHA-256', data));
}
export async function sha256File (filePath:string) : Promise<ArrayBuffer> {
    let file;
    try {
        file = await Deno.open(filePath);
        return await crypto.subtle.digest('SHA-256', iterateReader(file));
    } finally {
        if (file) { 
            file.close(); 
        }
    }
}
export async function sha256FileHex (filePath:string) : Promise<string> {
    return bufToHex(await sha256File(filePath));
}