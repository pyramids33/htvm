export type TrimStringOptions = {
    prefix?:string
    suffix?:string
};

export function trimStart (theString:string, prefix:string) : string {
    return trim(theString, { prefix });
}

export function trimEnd (theString:string, suffix:string) : string {
    return trim(theString, { suffix });
}

/*
* Trim start and end, provide options
*/
export function trim (theString:string, arg:TrimStringOptions | string) {
    let prefix, suffix;
    
    if (typeof(arg) === 'string') {
        prefix = suffix = arg;
    } else {
        prefix = arg.prefix;
        suffix = arg.suffix;
    }

    let startPos = 0;
    let endPos = theString.length;

    if (prefix) {
        while (theString.startsWith(prefix, startPos)) { startPos += prefix.length; }
    }

    if (suffix) {
        while (theString.endsWith(suffix, endPos)) { endPos -= suffix.length; }
    }

    return theString.slice(startPos, endPos);
}