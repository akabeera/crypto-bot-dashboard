import { OrderFee, OrderInfo, Order } from "./orders"

export interface BuyOrder extends Order {
    profit?: number | null;
    profitBeforeSellFee?: number | null;
}