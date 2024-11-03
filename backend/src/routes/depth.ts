import { GET_DEPTH } from "../types";
import { RedisManager } from "../redis/RedisManager";
import { Router } from "express";

export const depthRouter = Router();

depthRouter.get("/", async (req, res) => {
    const { symbol } = req.query;

    if (!symbol) {
        throw new Error('Symbol is missing.');
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_DEPTH,
        data: {
            market: symbol.toString()
        }
    });

    res.json(response.payload);
});
