import { SubscriptionManager } from "./SubscriptionManager";
import { User } from "./User";
import { WebSocket } from "ws";

interface UserManagerConfig {
    idLength?: number;
    maxUsers?: number;
}

export class UserManager {
    private static instance: UserManager;
    private readonly activeUsers: Map<string, User> = new Map();
    private readonly subscriptionManager: SubscriptionManager;
    private readonly config: UserManagerConfig;

    private constructor(config: UserManagerConfig = {}) {
        this.config = {
            idLength: 24,
            maxUsers: 10000,
            ...config
        };
        this.subscriptionManager = SubscriptionManager.getInstance();
    }

    public static getInstance(config?: UserManagerConfig): UserManager {
        if (!this.instance) {
            this.instance = new UserManager(config);
        }
        return this.instance;
    }

    public createUserConnection(webSocket: WebSocket): User {
        try {
            this.validateNewConnection();

            const userId = this.generateUserId();
            const user = new User(userId, webSocket);

            this.activeUsers.set(userId, user);
            this.setupDisconnectionHandler(webSocket, userId);

            console.log(`New user connected: ${userId}`);
            return user;
        } catch (error) {
            console.error('Failed to create user connection:', error);
            throw error;
        }
    }

    private validateNewConnection(): void {
        if (this.activeUsers.size >= this.config.maxUsers!) {
            throw new Error('Maximum number of concurrent users reached');
        }
    }

    private setupDisconnectionHandler(webSocket: WebSocket, userId: string): void {
        webSocket.on("close", async () => {
            try {
                await this.handleUserDisconnection(userId);
            } catch (error) {
                console.error(`Error handling disconnection for user ${userId}:`, error);
            }
        });

        webSocket.on("error", (error: Error) => {
            console.error(`WebSocket error for user ${userId}:`, error);
        });
    }

    private async handleUserDisconnection(userId: string): Promise<void> {
        const user = this.activeUsers.get(userId);

        if (user) {
            await this.subscriptionManager.handleUserDisconnection(userId);

            this.activeUsers.delete(userId);

            console.log(`User disconnected: ${userId}`);
        }
    }

    public getUserById(userId: string): User | undefined {
        const user = this.activeUsers.get(userId);

        if (!user) {
            console.warn(`User not found: ${userId}`);
        }

        return user;
    }

    private generateUserId(): string {
        // TODO: Pros and cons of using uuid
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${randomStr}`.substring(0, this.config.idLength);
    }

    public getActiveUserCount(): number {
        return this.activeUsers.size;
    }

    public getActiveUserIds(): string[] {
        return Array.from(this.activeUsers.keys());
    }

    public async disconnectAllUsers(): Promise<void> {
        const disconnectionPromises = Array.from(this.activeUsers.keys()).map(
            userId => this.handleUserDisconnection(userId)
        );

        await Promise.all(disconnectionPromises);
    }

    public isUserActive(userId: string): boolean {
        const user = this.activeUsers.get(userId);
        return user ? user.isUserConnected() : false;
    }

    public async dispose(): Promise<void> {
        try {
            await this.disconnectAllUsers();
            this.activeUsers.clear();
        } catch (error) {
            console.error('Error disposing UserManager:', error);
            throw error;
        }
    }
}