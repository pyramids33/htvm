import { decode as hexDecode, encode as hexEncode } from "/deps/std/encoding/hex.ts";
import { decode as base64Decode, encode as base64Encode } from "/deps/std/encoding/base64.ts";
import { decode as base64UrlDecode, encode as base64UrlEncode } from "/deps/std/encoding/base64url.ts";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function hexToBuf (hexString:string) : Uint8Array {
    return hexDecode(textEncoder.encode(hexString));
}
export function bufToHex (buffer:ArrayBuffer) : string {
    return textDecoder.decode(hexEncode(new Uint8Array(buffer)));
}
export function strToBuf (string:string) : Uint8Array {
    return textEncoder.encode(string);
}
export function b64ToBuf (b64String:string) : Uint8Array {
    return base64Decode(b64String);
}
export function bufToB64 (buffer:ArrayBuffer) : string {
    return base64Encode(buffer);
}
export function b64UrlToBuf (b64String:string) : Uint8Array {
    return base64UrlDecode(b64String);
}
export function bufToB64Url (buffer:ArrayBuffer) : string {
    return base64UrlEncode(buffer);
}