import { Context, ContextHandler, DisplayMetadata, Listener, Channel } from "@finos/fdc3"
import { Messaging } from "../Messaging"
import { DefaultContextListener } from "../listeners/DefaultContextListener"
import { BroadcastRequest, BroadcastResponse, GetCurrentContextResponse, GetCurrentContextRequest } from '@kite9/fdc3-common'

export class DefaultChannel implements Channel {

    readonly messaging: Messaging
    readonly id: string
    readonly type: "user" | "app" | "private"
    readonly displayMetadata?: DisplayMetadata | undefined;

    constructor(messaging: Messaging, id: string, type: "user" | "app" | "private", displayMetadata?: DisplayMetadata) {
        this.messaging = messaging
        this.id = id
        this.type = type
        this.displayMetadata = displayMetadata
    }

    async broadcast(context: Context): Promise<void> {
        await this.messaging.exchange<BroadcastResponse>({
            meta: this.messaging.createMeta(),
            payload: {
                channelId: this.id,
                context
            },
            type: "broadcastRequest"
        } as BroadcastRequest, 'broadcastResponse')
    }

    async getCurrentContext(contextType?: string | undefined): Promise<Context | null> {
        // first, ensure channel state is up-to-date
        const response = await this.messaging.exchange<GetCurrentContextResponse>({
            meta: this.messaging.createMeta(),
            payload: {
                channelId: this.id,
                contextType
            },
            type: "getCurrentContextRequest"
        } as GetCurrentContextRequest, 'getCurrentContextResponse')

        return response.payload.context ?? null
    }

    async addContextListener(contextType: any, handler?: ContextHandler): Promise<Listener> {
        let theContextType: string | null
        let theHandler: ContextHandler

        if (contextType == null) {
            theContextType = null;
            theHandler = handler as ContextHandler;
        } else if (typeof contextType === 'string') {
            theContextType = contextType
            theHandler = handler as ContextHandler;
        } else {
            // deprecated one-arg version
            theContextType = null;
            theHandler = contextType as ContextHandler;
        }

        return await this.addContextListenerInner(theContextType, theHandler);
    }

    async addContextListenerInner(contextType: string | null, theHandler: ContextHandler): Promise<Listener> {
        const listener = new DefaultContextListener(this.messaging, this.id, contextType, theHandler);
        await listener.register()
        return listener
    }
}

