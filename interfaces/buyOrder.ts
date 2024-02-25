interface BuyOrderFee {
    cost: number;
    currency: string | null;
}

interface BuyOrderInfoMarketIoc {
    quote_size: string;
}

interface BuyOrderInfo {
    order_id: string;
    product_id: string;
    user_id: string;
    order_configuration: {
        market_market_ioc: BuyOrderInfoMarketIoc;
    };
    side: string;
    client_order_id: string;
    status: string;
    time_in_force: string;
    created_time: string;
    completion_percentage: string;
    filled_size: string;
    average_filled_price: string;
    fee: string;
    number_of_fills: string;
    filled_value: string;
    pending_cancel: boolean;
    size_in_quote: boolean;
    total_fees: string;
    size_inclusive_of_fees: boolean;
    total_value_after_fees: string;
    trigger_status: string;
    order_type: string;
    reject_reason: string;
    settled: boolean;
    product_type: string;
    reject_message: string;
    cancel_message: string;
    order_placement_source: string;
    outstanding_hold_amount: string;
    is_liquidation: boolean;
    last_fill_time: string;
}

export interface BuyOrder {
    _id: {
        $oid: string;
    };
    info: BuyOrder;
    id: string;
    clientOrderId: string;
    timestamp: number;
    datetime: string;
    lastTradeTimestamp: string | null;
    symbol: string;
    type: string;
    timeInForce: string;
    postOnly: boolean;
    side: string;
    price: number;
    stopPrice: number | null;
    triggerPrice: number | null;
    amount: number;
    filled: number;
    remaining: number;
    cost: number;
    average: number;
    status: string;
    fee: BuyOrderFee;
    trades: any[]; // Define more specifically if trades have a consistent structure
    fees: BuyOrderFee[];
    lastUpdateTimestamp: string | null;
    reduceOnly: boolean | null;
    takeProfitPrice: number | null;
    stopLossPrice: number | null;
    profit?: number | null;
}