import { ERROR_TYPE, IncomingMessage, SUBSCRIBE, SUCCESS_TYPE, UNSUBSCRIBE } from "../types/in";

import { OutgoingMessage } from "../types/out";
import { SubscriptionManager } from "../managers/SubscriptionManager";
import { WebSocket } from "ws";

interface WebSocketMessage {
    method: string;
    params: string[];
}

export class User {
    private readonly userId: string;
    private readonly webSocket: WebSocket;
    private readonly subscriptionManager: SubscriptionManager;
    private activeChannels: Set<string> = new Set();
    private isConnected: boolean = true;

    constructor(userId: string, webSocket: WebSocket) {
        this.userId = userId;
        this.webSocket = webSocket;
        this.subscriptionManager = SubscriptionManager.getInstance();
        this.initializeWebSocketHandlers();
    }

    private initializeWebSocketHandlers(): void {
        // Message handler
        this.webSocket.on("message", this.handleIncomingMessage);

        // Connection handlers
        this.webSocket.on("close", this.handleDisconnection);
        this.webSocket.on("error", this.handleWebSocketError);
    }

    private handleIncomingMessage = async (data: string): Promise<void> => {
        try {
            const message = this.parseMessage(data);

            switch (message.method) {
                case SUBSCRIBE:
                    await this.handleSubscribeRequest(message.params);
                    break;
                case UNSUBSCRIBE:
                    await this.handleUnsubscribeRequest(message.params);
                    break;
                default:
                    console.warn(`Unknown message method received from user ${this.userId}:`, message.method);
            }
        } catch (error) {
            console.error(`Error handling message from user ${this.userId}:`, error);
            this.sendErrorMessage('Failed to process message');
        }
    };

    private parseMessage(data: string): WebSocketMessage {
        try {
            const parsedMessage: IncomingMessage = JSON.parse(data);
            if (!this.isValidMessage(parsedMessage)) {
                throw new Error('Invalid message format');
            }
            return parsedMessage;
        } catch (error) {
            throw new Error(`Failed to parse WebSocket message: ${error}`);
        }
    }

    private isValidMessage(message: any): message is WebSocketMessage {
        return (
            message &&
            typeof message.method === 'string' &&
            Array.isArray(message.params) &&
            message.params.every((param: unknown) => typeof param === 'string')
        );
    }

    private async handleSubscribeRequest(channels: string[]): Promise<void> {
        try {
            const subscribePromises = channels.map(async (channel) => {
                if (!this.activeChannels.has(channel)) {
                    await this.subscriptionManager.subscribeToChannel(this.userId, channel);
                    this.activeChannels.add(channel);
                }
            });

            await Promise.all(subscribePromises);
            this.sendSuccessMessage('Subscribed successfully');
        } catch (error) {
            console.error(`Failed to process subscription request for user ${this.userId}:`, error);
            this.sendErrorMessage('Failed to subscribe to channels');
        }
    }

    private async handleUnsubscribeRequest(channels: string[]): Promise<void> {
        try {
            const unsubscribePromises = channels.map(async (channel) => {
                if (this.activeChannels.has(channel)) {
                    await this.subscriptionManager.unsubscribeFromChannel(this.userId, channel);
                    this.activeChannels.delete(channel);
                }
            });

            await Promise.all(unsubscribePromises);
            this.sendSuccessMessage('Unsubscribed successfully');
        } catch (error) {
            console.error(`Failed to process unsubscription request for user ${this.userId}:`, error);
            this.sendErrorMessage('Failed to unsubscribe from channels');
        }
    }

    private handleDisconnection = async (): Promise<void> => {
        try {
            this.isConnected = false;
            await this.subscriptionManager.handleUserDisconnection(this.userId);
            this.activeChannels.clear();
        } catch (error) {
            console.error(`Error handling disconnection for user ${this.userId}:`, error);
        }
    };

    private handleWebSocketError = (error: Error): void => {
        console.error(`WebSocket error for user ${this.userId}:`, error);
        this.sendErrorMessage('WebSocket error occurred');
    };

    public sendMessage(message: OutgoingMessage): void {
        if (!this.isConnected) {
            console.warn(`Attempted to send message to disconnected user ${this.userId}`);
            return;
        }

        try {
            this.webSocket.send(JSON.stringify(message));
        } catch (error) {
            console.error(`Failed to send message to user ${this.userId}:`, error);
        }
    }

    private sendErrorMessage(errorMessage: string): void {
        this.sendMessage({
            type: ERROR_TYPE,
            message: errorMessage
        } as OutgoingMessage);
    }

    private sendSuccessMessage(successMessage: string): void {
        this.sendMessage({
            type: SUCCESS_TYPE,
            message: successMessage
        } as OutgoingMessage);
    }

    public getActiveChannels(): string[] {
        return Array.from(this.activeChannels);
    }

    public getUserId(): string {
        return this.userId;
    }

    public isUserConnected(): boolean {
        return this.isConnected;
    }
}