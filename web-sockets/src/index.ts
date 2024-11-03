import { UserManager } from "./managers/UserManager";
import { WebSocketServer } from "ws";

const PORT = 3001

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
    UserManager.getInstance().createUserConnection(ws);
});

