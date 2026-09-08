import { z } from "zod/v3";
import { StateGraph, START, END, MessagesZodMeta } from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import type { BaseMessage } from "@langchain/core/messages";

import { createIdentifyIntentNode } from "./nodes/identifyIntentNode.ts";
import { createSchedulerNode } from "./nodes/schedulerNode.ts";
import { createScheduleMutationNode } from "./nodes/scheduleMutationNode.ts";
import { createMessageGeneratorNode } from "./nodes/messageGeneratorNode.ts";

const BookGraphSchema = z.object({
  messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
  userId: z.number(),
  condominiumId: z.number().optional(),
  serviceId: z.number(),
  serviceName: z.string(),
  userName: z.string(),
  reason: z.string().optional(),
  scheduleDate: z.string().optional(),
  error: z.string().optional(),
  data: z.custom<any>().optional(),
  missingFields : z.array(z.string()).optional(),
  invalidFields : z.array(z.string()).optional(),
  isMissingFields : z.boolean().optional(),
  scenario: z.string().optional(),
  details: z.custom<any>().optional(),
  scheduleSuccess: z.boolean().optional(),
});

export type GraphState = z.infer<typeof BookGraphSchema>;

export function buildBookGraph() {
  const workflow = new StateGraph({
    stateSchema: BookGraphSchema,
  })
    .addNode("identifyIntent", createIdentifyIntentNode())
    .addNode('schedule', createSchedulerNode())
    .addNode('scheduleMutation', createScheduleMutationNode())
    .addNode('message', createMessageGeneratorNode())


    .addEdge(START, "identifyIntent")
    .addConditionalEdges(
      'identifyIntent',
      (state: GraphState): string => {

        if (state.error || !state.data.intent || state.data.intent === 'unknown' || state.isMissingFields ) {
          return 'message';
        }
        
        return state.data.intent
      },
      {
        schedule: 'schedule',
        cancel: 'scheduleMutation',
        modify: 'scheduleMutation',
        message: 'message',
      }
    )
    .addEdge('schedule', 'message')
    .addEdge('scheduleMutation', 'message')

    .addEdge("message", END);

  return workflow.compile();
}
