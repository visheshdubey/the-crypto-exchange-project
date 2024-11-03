import { client } from "./config/database";

const MATERIALIZED_VIEWS = {
    MINUTE: "klines_1m",
    HOUR: "klines_1h",
    WEEK: "klines_1w",
} as const;
const TIME_INTERVALS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
} as const;
const REFRESH_INTERVAL = 10 * TIME_INTERVALS.SECOND;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2 * TIME_INTERVALS.SECOND;

interface RefreshStats {
    lastRefreshTime: Date;
    successCount: number;
    failureCount: number;
}

class MaterializedViewRefresher {
    private stats: RefreshStats = {
        lastRefreshTime: new Date(),
        successCount: 0,
        failureCount: 0,
    };

    private async refreshView(viewName: string): Promise<void> {
        const query = `REFRESH MATERIALIZED VIEW ${viewName}`;
        try {
            await client.query(query);
            console.log(`Successfully refreshed view: ${viewName}`);
        } catch (error) {
            console.error(`Failed to refresh view ${viewName}:`, error);
            throw error;
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public async refreshAllViews(retryAttempt = 0): Promise<void> {
        try {
            const refreshStartTime = new Date();

            await Promise.all([
                this.refreshView(MATERIALIZED_VIEWS.MINUTE),
                this.refreshView(MATERIALIZED_VIEWS.HOUR),
                this.refreshView(MATERIALIZED_VIEWS.WEEK),
            ]);

            this.stats.lastRefreshTime = refreshStartTime;
            this.stats.successCount++;

            console.log("All materialized views refreshed successfully", {
                timestamp: refreshStartTime,
                totalSuccesses: this.stats.successCount,
            });
        } catch (error) {
            this.stats.failureCount++;

            if (retryAttempt < MAX_RETRY_ATTEMPTS) {
                console.warn(
                    `Refresh attempt ${retryAttempt + 1
                    } failed, retrying in ${RETRY_DELAY}ms...`
                );
                await this.delay(RETRY_DELAY);
                return this.refreshAllViews(retryAttempt + 1);
            }

            console.error(
                "Failed to refresh materialized views after maximum retry attempts",
                {
                    totalFailures: this.stats.failureCount,
                    error,
                }
            );
            throw error;
        }
    }

    public startPeriodicRefresh(): void {
        this.refreshAllViews().catch((error) => {
            console.error("Initial refresh failed:", error);
        });

        setInterval(() => {
            this.refreshAllViews().catch((error) => {
                console.error("Periodic refresh failed:", error);
            });
        }, REFRESH_INTERVAL);

        console.log(
            `Periodic refresh scheduled every ${REFRESH_INTERVAL / 1000} seconds`
        );
    }

    public getStats(): RefreshStats {
        return { ...this.stats };
    }

    public async stop(): Promise<void> {
        console.log("Stopping materialized view refresher");
    }
}

// Create and start the refresher
const viewRefresher = new MaterializedViewRefresher();
viewRefresher.startPeriodicRefresh();

export { viewRefresher, MaterializedViewRefresher };
