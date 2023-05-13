import * as coalesce from './coalesce.ts'

// {
//     "pattern": "test/test/",
//     "amount": 123,
//     "description": "this",
//   	"split": [
//         { "to": "joe", "amount": "40%" },
//         { "to": "joe2", "amount": "20%" }
//   	]
// }

export interface SplitInfo {
    to: string
    percent?: number
    amount?: number
}

export interface PriceInfo {
    pattern: string
    amount: number
    description?: string
    split?: SplitInfo[]
}

export interface PriceListJSON {
     pricelist: PriceInfo[]
}

interface Node {
    //outputs?:PaywallOutput[]
    priceInfo?:PriceInfo
    "/"?: Record<string,Node>
}
    
interface MatchResult { 
    priceInfo:PriceInfo
    match: string 

}

export class PriceList {

    root:Record<string,Node> = {}

    constructor () {}

    matchUrl (urlPath:string) : MatchResult|undefined {
        const segments = urlPath.slice(1).split('/').filter(s => s);
        let node:Node = { "/": this.root };
        const match = [];
        const pattern = [];

        for (const segment of segments) {

            if (node["/"] === undefined) {
                break;
            } else if (node["/"][segment]) {

                node = node["/"][segment];
                match.push(segment);
                pattern.push(segment);

            } else if (node["/"]['*']) {

                node = node["/"]['*'];
                match.push(segment);
                pattern.push('*');

            } else {
                break;
            }
        }

        if (match.length === 0 || node.priceInfo == undefined) {
            return undefined;
        }

        let tmpMatchStr = '/' + match.join('/');

        if (tmpMatchStr !== urlPath) {
            tmpMatchStr = tmpMatchStr + '/'
        }

        return {
            match: tmpMatchStr,
            priceInfo: node.priceInfo
        }
    }

    addPriceInfo (priceInfo:PriceInfo) {

        const segments = priceInfo.pattern.split('/');
        
        let node:Node = { "/": this.root };
        let pattern = '';

        for (const segment of segments) {
            if (segment === '') {
                continue;
            }
            pattern = pattern+'/'+segment;
            if (node["/"] === undefined) {
                node["/"] = {};
            }
            if (node["/"][segment] === undefined) {
                node["/"][segment] = {}
            }
            node = node["/"][segment];
        }

        priceInfo.pattern = pattern; // normalize patterns
        node.priceInfo = priceInfo;
    }

    getPriceInfo (pattern:string) {
        const segments = pattern.split('/');
        
        let node:Node = { "/": this.root };

        for (const segment of segments) {
            if (segment === '') {
                continue;
            }
            if (node["/"] === undefined) {
                return undefined;
            }
            if (node["/"][segment] === undefined) {
                return undefined;
            }
            node = node["/"][segment];
        }

        return node.priceInfo;
    }

    *#recurse (node:Node, pattern:string) : Generator<PriceInfo> {
        if (node.priceInfo) {
            yield node.priceInfo;
        }

        if (node["/"]) {
            for (const [ seg, cnode ] of Object.entries(node["/"])) {
                yield* this.#recurse(cnode, pattern+'/'+seg);
            }
        }
    }

    *recurse () : Generator<PriceInfo> {
        yield* this.#recurse({ "/": this.root },'');
    }

    toJSON () {
        const obj:PriceListJSON = { pricelist: [] };
        for (const priceInfo of this.recurse()) {
            obj.pricelist.push(priceInfo);
        }
        return obj;
    }

    static fromJSON (obj:unknown|string) : PriceList {
        
        if (typeof(obj) === 'string') {
            return this.fromJSON(JSON.parse(obj));
        }

        const priceList = new this();

        const tmp = (obj as { pricelist: [] }) || {};
        
        for (const itemObj of tmp.pricelist||[]) {
            priceList.addPriceInfo(this.ObjectToPriceInfo(itemObj))
        }
        
        return priceList;
    }

    static ObjectToPriceInfo (obj:unknown) : PriceInfo {

        const tmp = (obj as PriceInfo);

        if (!tmp.pattern) {
            throw new Error('invalid pattern');
        }

        return {
            pattern: tmp.pattern,
            amount: coalesce.safeInt(tmp.amount, 0, 10), 
            description: coalesce.string(tmp?.description, undefined, 64),
            split: Array.isArray(tmp?.split) ? tmp?.split as SplitInfo[]:undefined
        }
    }
}