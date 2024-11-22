import { IntentHandler, IntentResult, AppIdentifier } from "@kite9/fdc3-standard";
import { Context } from "@kite9/fdc3-context";
import { Messaging } from "../Messaging";
import { AbstractListener } from "./AbstractListener";
import { IntentEvent, IntentResultRequest, IntentResultResponse, RaiseIntentResponse } from "@kite9/fdc3-schema/generated/api/BrowserTypes";

export class DefaultIntentListener extends AbstractListener<IntentHandler> {

    readonly intent: string

    constructor(messaging: Messaging, intent: string, action: IntentHandler) {
        super(messaging,
            { intent },
            action,
            "addIntentListenerRequest",
            "addIntentListenerResponse",
            "intentListenerUnsubscribeRequest",
            "intentListenerUnsubscribeResponse"
        );
        this.intent = intent;
    }

    filter(m: IntentEvent): boolean {
        return (m.type == 'intentEvent') && (m.payload.intent == this.intent);
    }

    action(m: IntentEvent): void {
        this.handleIntentResponse(m);

        const done = this.handler(m.payload.context, {
            source: m.payload.originatingApp as AppIdentifier
        });

        this.handleIntentResult(done, m);
    }

    private handleIntentResponse(m: IntentEvent) {
        const out: RaiseIntentResponse = {
            type: "raiseIntentResponse",
            meta: {
                responseUuid: this.messaging.createUUID(),
                requestUuid: m.meta.eventUuid,
                timestamp: new Date()
            },
            payload: {
                intentResolution: {
                    intent: m.payload.intent,
                    source: this.messaging.getAppIdentifier()
                }
            }
        };
        this.messaging.post(out);
    }

    private intentResultRequestMessage(ir: IntentResult, m: IntentEvent): IntentResultRequest {
        const out: IntentResultRequest = {
            type: "intentResultRequest",
            meta: {
                requestUuid: m.meta.eventUuid,
                timestamp: new Date()
            },
            payload: {
                intentResult: convertIntentResult(ir),
                intentEventUuid: m.meta.eventUuid,
                raiseIntentRequestUuid: m.payload.raiseIntentRequestUuid
            }
        };

        return out;
    }

    private handleIntentResult(done: Promise<IntentResult> | void, m: IntentEvent) {
        if (done == null) {
            // send an empty intent result response
            return this.messaging.exchange<IntentResultResponse>(this.intentResultRequestMessage(undefined, m), "intentResultResponse");
        } else {
            // respond after promise completes
            return done.then(ir => {
                return this.messaging.exchange<IntentResultResponse>(this.intentResultRequestMessage(ir, m), "intentResultResponse");
            });
        }
    }
}

function convertIntentResult(intentResult: IntentResult): IntentResultRequest["payload"]["intentResult"] {
    if (!intentResult) { //consider any falsey result to be void...
        return {}; // void result
    }
    switch (intentResult.type) {
        case 'user':
        case 'app':
        case 'private':
            // it's a channel
            return {
                channel: {
                    type: intentResult.type,
                    id: intentResult.id as string,
                    displayMetadata: intentResult.displayMetadata
                }
            }
        default:
            // it's a context
            return {
                context: intentResult as Context
            }
    }
}