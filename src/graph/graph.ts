import { z } from "zod/v3";
import { StateGraph, START, END, MessagesZodMeta } from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import type { BaseMessage } from "@langchain/core/messages";

import { createIdentifyIntentNode } from "./nodes/identifyIntentNode.ts";
// import { createSchedulerNode } from "./nodes/schedulerNode.ts";
// import { createMessageGeneratorNode } from "./nodes/messageGeneratorNode.ts";

const BookGraphSchema = z.object({
  messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
  author: z.number(),
  intent: z
    .enum(["schedule", "cancel", "consult", "unknown", "notify", "complaint"])
    .optional(),
  datetime: z.string().optional(),
  bookDate: z.string().optional(),
  error: z.string().optional(),
  data: z.custom<any>().optional(),
});

export type GraphState = z.infer<typeof BookGraphSchema>;

export function buildBookGraph() {
  const workflow = new StateGraph({
    stateSchema: BookGraphSchema,
  })
    .addNode("identifyIntent", createIdentifyIntentNode())
    // .addNode('schedule', createSchedulerNode())
    // .addNode('message', createMessageGeneratorNode())
    .addEdge(START, "identifyIntent")
    // .addConditionalEdges(
    //   'identifyIntent',
    //   (state: GraphState): string => {
    //     if (state.error || !state.intent || state.intent === 'unknown') {
    //       return 'message';
    //     }

    //     console.log(`➡️  Routing based on intent: ${state.intent}`);
    //     return state.intent
    //   },
    //   {
    //     schedule: 'schedule',
    //     // cancel: 'cancel',
    //     // message: 'message',
    //   }
    // )
    // .addEdge('schedule', 'message')
    
    // .addEdge("message", END);
    .addEdge("identifyIntent", END);
  return workflow.compile();
}
