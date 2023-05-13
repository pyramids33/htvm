import { PriceInfo } from "../lib/pricelist.ts";

export interface Invoice extends Record<string, unknown> {
    id:string, 
    created:number, 
    domain:string, 
    urlPath:string, 
    priceInfo: PriceInfo,
    outputs:InvoiceOutput[],
    subtotal:number,
    paymentMethod?:string, 
    paidAt?:number, 
    data?:string, 
    txid?:string, 
    txHex?:Uint8Array
}

export interface InvoiceOutput {
    amount: number
    xPub: string
    derivationPath: string
    script: string
}
