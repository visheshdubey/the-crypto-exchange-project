import { RedisClientType, createClient } from "redis";

import { UserManager } from "./UserManager";

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private userSubscriptions: Map<string, Set<string>> = new Map();
    private channelSubscribers: Map<string, Set<string>> = new Map();
    private redisClient: RedisClientType | undefined;

    private constructor() {
        this.initializeRedisClient();
    }

    private async initializeRedisClient() {
        try {
            this.redisClient = createClient({});

            await this.redisClient.connect();

            this.redisClient.on('error', (err) => {
                console.error('Redis Client Error:', err);
            });
        } catch (error) {
            console.error('Failed to initialize Redis client:', error);
            throw error;
        }
    }

    public static getInstance(): SubscriptionManager {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public async subscribeToChannel(userId: string, channelName: string): Promise<void> {
        try {
            if (!this.userSubscriptions.has(userId)) {
                this.userSubscriptions.set(userId, new Set());
            }

            if (!this.channelSubscribers.has(channelName)) {
                this.channelSubscribers.set(channelName, new Set());
            }

            const userSubs = this.userSubscriptions.get(userId)!;
            const channelSubs = this.channelSubscribers.get(channelName)!;

            if (userSubs.has(channelName)) {
                return;
            }

            userSubs.add(channelName);
            channelSubs.add(userId);

            if (channelSubs.size === 1 && this.redisClient) {
                await this.redisClient.subscribe(channelName, this.handleRedisMessage);
            }
        } catch (error) {
            console.error(`Failed to subscribe user ${userId} to channel ${channelName}:`, error);
            throw error;
        }
    }

    private handleRedisMessage = (message: string, channel: string): void => {
        try {
            const parsedMessage = JSON.parse(message);
            const subscribers = this.channelSubscribers.get(channel);

            if (subscribers) {
                subscribers.forEach(userId => {
                    const user = UserManager.getInstance().getUserById(userId);
                    user?.sendMessage(parsedMessage);
                });
            }
        } catch (error) {
            console.error(`Error handling Redis message for channel ${channel}:`, error);
        }
    };

    public async unsubscribeFromChannel(userId: string, channelName: string): Promise<void> {
        try {
            const userSubs = this.userSubscriptions.get(userId);
            const channelSubs = this.channelSubscribers.get(channelName);

            if (!userSubs || !channelSubs) {
                return;
            }

            userSubs.delete(channelName);
            channelSubs.delete(userId);

            if (userSubs.size === 0) {
                this.userSubscriptions.delete(userId);
            }

            if (channelSubs.size === 0 && this.redisClient) {
                this.channelSubscribers.delete(channelName);
                await this.redisClient.unsubscribe(channelName);
            }
        } catch (error) {
            console.error(`Failed to unsubscribe user ${userId} from channel ${channelName}:`, error);
            throw error;
        }
    }

    public async handleUserDisconnection(userId: string): Promise<void> {
        console.log(`User disconnected: ${userId}`);
        const userSubs = this.userSubscriptions.get(userId);

        if (userSubs) {
            const unsubscribePromises = Array.from(userSubs).map(channel =>
                this.unsubscribeFromChannel(userId, channel)
            );

            await Promise.all(unsubscribePromises);
        }
    }

    public getUserSubscriptions(userId: string): string[] {
        return Array.from(this.userSubscriptions.get(userId) || []);
    }

    public async dispose(): Promise<void> {
        try {
            if (this.redisClient) {
                await this.redisClient.quit();
            }
        } catch (error) {
            console.error('Error disposing SubscriptionManager:', error);
            throw error;
        }
    }
}