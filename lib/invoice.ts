import { PriceInfo } from "../lib/pricelist.ts";

export interface Invoice extends Record<string, unknown> {
    id:string
    created:number
    domain:string
    urlPath:string
    priceInfo: PriceInfo
    subtotal:number
    xPub: string
    derivationPath: string
    script: string
    paymentMethod?:string
    paidAt?:number
    data?:string
    txHash?:string
    txOutNum?:number
    txHex?:string
    redeemTxHash?:string,
    redeemTxInNum?:number
}
