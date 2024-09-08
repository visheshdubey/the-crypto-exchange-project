import cors from "cors";
import { depthRouter } from "./routes/depth";
import dotenv from "dotenv";
import express from "express";
import { klineRouter } from "./routes/kline";
import { orderRouter } from "./routes/order";
import { tickersRouter } from "./routes/ticker";
import { tradesRouter } from "./routes/trades";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/order", orderRouter);
app.use("/api/depth", depthRouter);
app.use("/api/trades", tradesRouter);
app.use("/api/klines", klineRouter);
app.use("/api/tickers", tickersRouter);

app.listen(process.env.PORT, () => {
  console.log(`Backend is running on Port : ${process.env.PORT}`);
});
