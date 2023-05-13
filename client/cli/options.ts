import * as commander from "npm:commander";
import bsv from "npm:bsv";

export function validateAuthKey (value:string) {
    if (value && !/^(?:[a-f0-9]{2}){5,32}$/.test(value)) {
        throw new commander.InvalidArgumentError('Not a hex string 10-64 chars');
    }
    return value;
}

export function validateUrl (value:string) : string {
    if (value) {
        if (!/[a-z]+\:\/\//.test(value)) {
            value = 'https://'+value;
        }
        if (!value.startsWith('https://') && !value.startsWith('http://')) {
            throw new commander.InvalidArgumentError('Invalid protocol');
        }
        try {
            return new URL(value).origin;
        } catch (error) {
            throw new commander.InvalidArgumentError(error.message);
        }
    }
    return value;
}

export function validateXprv (value:string) : bsv.Bip32 {
    try {
        const key = bsv.Bip32.fromString(value);
        if (key.isPrivate()) {
            return key;
        }
        throw new commander.InvalidArgumentError('The key is not a private key.')
    } catch (error) {
        throw new commander.InvalidArgumentError(error.message);
    }
}

export function validateXpub(value:string) : bsv.Bip32 {
    try {
        const key = bsv.Bip32.fromString(value);
        if (key.isPublic()) {
            return key;
        }
        throw new commander.InvalidArgumentError('The key is not a public key.')
    } catch (error) {
        throw new commander.InvalidArgumentError(error.message);
    }
}

export function validateFormat (value:string) {
    if (['text','json'].includes(value)) {
        return value;
    }
    throw new commander.InvalidOptionArgumentError('valid option is text, json')
}

export function validateAddress (value:string) {
    try {
        return bsv.Address.fromString(value)
    } catch {
        throw new commander.InvalidOptionArgumentError('invalid address');
    }
}
    
export const sitePathOption = new commander.Option('--sitePath <sitePath>', 'Path to site root.').default('./', 'Current Directory');


