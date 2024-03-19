import {  Order } from "./orders"

export interface SellOrder {
    sell_order: Order
    closed_positions: Order[]
}