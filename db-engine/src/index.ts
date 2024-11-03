import { DbMessage } from './types';
import { client } from './config/database';
import { createClient } from 'redis';

const REDIS_QUEUE_NAME = "db_processor"
const TATA_PRICES = "tata_prices"

const createRedisClient = async () => {
    const redisClient = createClient();
    await redisClient.connect()

    console.log("Connected to Redis!");

    return redisClient;
}

const getLastMessage = async (redisClient, queueName) => await redisClient.rPop(queueName)

const isTradeAdded = (dataType) => dataType === 'TRADE_ADDED'

const updateLastTradedPriceForSymbolInDB = async ({ symbolName, price, timestamp }) => {
    const query = `INSERT INTO ${symbolName} (time, price) VALUES ($1, $2)`;
    const values = [timestamp, price];

    await client.query(query, values);
}

async function main() {
    const redisClient = await createRedisClient()

    while (true) {
        const response = await getLastMessage(redisClient, REDIS_QUEUE_NAME)

        if (!response) {
            continue;
        }

        const data: DbMessage = JSON.parse(response);

        if (isTradeAdded(data.type)) {
            const timestamp = new Date(data.data.timestamp || '');
            const price = data.data.price;

            await updateLastTradedPriceForSymbolInDB({ price, timestamp, symbolName: TATA_PRICES })
        }
    }
}

main();