import { AutomaticResponse, TestMessaging } from "../TestMessaging";
import { IntentResultRequest, IntentResultResponse } from "@kite9/fdc3-core";

export class IntentResult implements AutomaticResponse {

    filter(t: string) {
        return t == 'intentResultRequest'
    }



    createIntentResultResponseMessage(intentRequest: IntentResultRequest, m: TestMessaging): IntentResultResponse {
        const out: IntentResultResponse = {
            meta: {
                ...intentRequest.meta,
                responseUuid: m.createUUID()
            },
            payload: {
            },
            type: "intentResultResponse"
        }

        return out
    }

    action(input: object, m: TestMessaging) {
        const intentRequest = input as IntentResultRequest
        const payload = intentRequest.payload

        m.setIntentResult(payload.intentResult as any)

        // next, send the result response
        const out2 = this.createIntentResultResponseMessage(intentRequest, m)
        setTimeout(() => { m.receive(out2) }, 100)
        return Promise.resolve()
    }
}
