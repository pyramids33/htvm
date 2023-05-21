## PriceList

The pricelist.json file configures how to charge to access pages

```
{
    # a JSON object with one key 'pricelist'.
    # it is an array of priceInfo objects
    "pricelist": [
        { 
            # this is the url pattern
            "pattern": "/images", 
            
            # the amount to charge (sat)
            "amount": 1 

            # a description
            "description": "description of this item"
        },

        { 
            # This url pattern contains a wildcard.
            # If the user visits /test1/page/x, they will be invoiced for /test1/page/x, 
            # and will receive access to /test1/page/x. 
            # Access to /test1/page3/x will require another payment.

            "pattern": "/test1/*/x", 
            "amount": 1,
            "description": "description of this item"
        }
    ]
}


```