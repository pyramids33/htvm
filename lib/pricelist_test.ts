
import { assertArrayIncludes, assertEquals } from '/deps/std/testing/asserts.ts';
import * as path from '/deps/std/path/mod.ts';

import { PriceList } from '/lib/pricelist.ts';

const testName = path.basename(path.fromFileUrl(import.meta.url));

const pl = new PriceList();
pl.addPriceInfo({ pattern: '/test1/abc/x/', amount: 1 });
pl.addPriceInfo({ pattern: '/test1/*/x/', amount: 1 });
pl.addPriceInfo({ pattern: '/test1/*/x/fx',  amount: 1 });
pl.addPriceInfo({ pattern: '/test1/*/x/special/', amount: 1  });
pl.addPriceInfo({ pattern: '/images', amount: 1 });

{
    const expected = {
        "images": {
            "priceInfo": { "pattern": "/images", "amount": 1 },
        },
        "test1": {
            "/": {
                "abc": {
                    "/": {
                        "x": { "priceInfo": { pattern: '/test1/abc/x', amount: 1 } }
                    }
                },
                "*": {
                    "/": {
                        "x": {
                            "/": {
                                "fx": { "priceInfo": { pattern: '/test1/*/x/fx', amount: 1 } },
                                "special": { "priceInfo": { pattern: '/test1/*/x/special', amount: 1 } }
                            },
                            "priceInfo": { pattern: '/test1/*/x', amount: 1 }
                        }
                    }
                }
            }
        }
    }
    assertEquals(pl.root, expected);
}
{
    const expected = {
        "pricelist": [
            { "pattern": "/images", "amount": 1 },
            { "pattern": "/test1/abc/x", "amount": 1 },
            { "pattern": "/test1/*/x", "amount": 1 },
            { "pattern": "/test1/*/x/fx", "amount": 1 },
            { "pattern": "/test1/*/x/special", "amount": 1 },
        ]
    }

    const actual = pl.toJSON().pricelist;
    assertArrayIncludes(actual, [expected.pricelist[0]]);
    assertArrayIncludes(actual, [expected.pricelist[1]]);
    assertArrayIncludes(actual, [expected.pricelist[2]]);
    assertArrayIncludes(actual, [expected.pricelist[3]]);
    assertArrayIncludes(actual, [expected.pricelist[4]]);
}
{
    const result = pl.matchUrl('/tset/abc/');
    assertEquals(result, undefined);
}
{
    // url matches specific pattern over wildcard
    const result = pl.matchUrl('/test1/abc/x/');
    assertEquals(result, {
        urlMatch: "/test1/abc/x/",
        priceInfo: { "pattern": "/test1/abc/x", "amount": 1 }
    });
}
{
    // url matches wilcard pattern
    const result = pl.matchUrl('/test1/xyz/x/');
    assertEquals(result, {
        urlMatch: "/test1/xyz/x/",
        priceInfo: { "pattern": "/test1/*/x", "amount": 1 }
    });
}
{
    // url matches pattern with most matching segments
    const result = pl.matchUrl('/test1/xyz/x/fx');
    assertEquals(result, {
        urlMatch: "/test1/xyz/x/fx",
        priceInfo: { "pattern": "/test1/*/x/fx", "amount": 1 }
    });
}
{
    // url matches prefix
    const result = pl.matchUrl('/test1/xyz/x/fx2');
    assertEquals(result, {
        urlMatch: "/test1/xyz/x/",
        priceInfo: { "pattern": "/test1/*/x", "amount": 1 }
    });
}
{

    const result1 = pl.matchUrl('/images/');
    const result2 = pl.matchUrl('/images/volcano.jpeg');
    
    assertEquals(result1, {
        urlMatch: "/images/",
        priceInfo: { "pattern": "/images", "amount": 1 },
    });

    assertEquals(result2, {
        urlMatch: "/images/",
        priceInfo: { "pattern": "/images", "amount": 1 },
    });
}
{
    // de/serialization
    const pl2 = PriceList.fromJSON(JSON.stringify(pl));
    assertEquals(JSON.stringify(pl2), JSON.stringify(pl));
}

console.log(testName, 'passed')