import axios from "axios";

type Order = {
    orderId?: string;
    market: string;
    price: string | number;
    quantity?: string;
    side: "buy" | "sell";
    userId: string;
};

type OrderResponse = Order & { orderId: string };

const CONFIG = {
    BASE_URL: "http://localhost:3000",
    TOTAL_BIDS: 15,
    TOTAL_ASKS: 15,
    MARKET: "TATA_INR",
    USER_ID: "5",
    CANCEL_PROBABILITY: {
        BID: 0.1,
        ASK: 0.5,
    },
    PRICE_VARIATION: 1,
    QUANTITY: "1",
    DELAY: 1000,
} as const;

const generateBasePrice = () => 1000 + Math.random() * 10;

const generateBidPrice = (basePrice: number) => (basePrice - Math.random() * CONFIG.PRICE_VARIATION).toFixed(1);

const generateAskPrice = (basePrice: number) => (basePrice + Math.random() * CONFIG.PRICE_VARIATION).toFixed(1);

const fetchOpenOrders = async () => {
    const { data } = await axios.get<OrderResponse[]>(
        `${CONFIG.BASE_URL}/api/v1/order/open?userId=${CONFIG.USER_ID}&market=${CONFIG.MARKET}`,
    );

    return data;
};

const createOrder = async (order: Order) => axios.post(`${CONFIG.BASE_URL}/api/v1/order`, order);

const cancelOrder = async (orderId: string) =>
    axios.delete(`${CONFIG.BASE_URL}/api/v1/order`, {
        data: { orderId, market: CONFIG.MARKET },
    });

const filterOrders = (orders: OrderResponse[], side: "buy" | "sell") => orders.filter((order) => order.side === side);

const shouldCancelOrder = (order: OrderResponse, basePrice: number) => {
    const probability = order.side === "buy" ? CONFIG.CANCEL_PROBABILITY.BID : CONFIG.CANCEL_PROBABILITY.ASK;

    return order.side === "buy"
        ? Number(order.price) > basePrice || Math.random() < probability
        : Number(order.price) < basePrice || Math.random() < probability;
};

const generateNewOrder = (side: "buy" | "sell", basePrice: number): Order => ({
    market: CONFIG.MARKET,
    price: side === "buy" ? generateBidPrice(basePrice) : generateAskPrice(basePrice),
    quantity: CONFIG.QUANTITY,
    side,
    userId: CONFIG.USER_ID,
});

const processCancellations = async (orders: OrderResponse[], basePrice: number) => {
    const ordersToCancel = orders.filter((order) => shouldCancelOrder(order, basePrice));

    await Promise.all(ordersToCancel.map((order) => cancelOrder(order.orderId!)));

    return ordersToCancel.length;
};

const createNewOrders = async (count: number, side: "buy" | "sell", basePrice: number) => {
    const orders = Array.from({ length: count }, () => generateNewOrder(side, basePrice));

    await Promise.all(orders.map(createOrder));
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const executeOrderCycle = async () => {
    try {
        const basePrice = generateBasePrice();
        const openOrders = await fetchOpenOrders();

        const bids = filterOrders(openOrders, "buy");
        const asks = filterOrders(openOrders, "sell");

        const cancelledBids = await processCancellations(bids, basePrice);
        const cancelledAsks = await processCancellations(asks, basePrice);

        const requiredBids = CONFIG.TOTAL_BIDS - bids.length + cancelledBids;
        const requiredAsks = CONFIG.TOTAL_ASKS - asks.length + cancelledAsks;

        await Promise.all([createNewOrders(requiredBids, "buy", basePrice), createNewOrders(requiredAsks, "sell", basePrice)]);

        await delay(CONFIG.DELAY);

        executeOrderCycle();
    } catch (error) {
        console.error("Error in order cycle:", error);

        await delay(CONFIG.DELAY);

        executeOrderCycle();
    }
};

executeOrderCycle();
