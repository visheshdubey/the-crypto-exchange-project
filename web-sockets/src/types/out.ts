export type TickerUpdateMessage = {
    type: OutgoingMessagetype,
    data: {
        c?: string,
        h?: string,
        l?: string,
        v?: string,
        V?: string,
        s?: string,
        id: number,
        e: "ticker"
    }
}

export type DepthUpdateMessage = {
    type: OutgoingMessagetype,
    data: {
        b?: [string, string][],
        a?: [string, string][],
        id: number,
        e: "depth"
    }
}

export type ErrorMessage = {
    type: OutgoingMessagetype,
    message: string
}

export type OutgoingMessagetype = 'depth' | 'ticker' | 'error' | 'success'

export type OutgoingMessage = TickerUpdateMessage | DepthUpdateMessage | ErrorMessage;