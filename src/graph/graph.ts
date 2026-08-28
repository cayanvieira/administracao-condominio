import { z } from "zod/v3";
import { StateGraph, START, END, MessagesZodMeta } from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import type { BaseMessage } from "@langchain/core/messages";

import { createIdentifyIntentNode } from "./nodes/identifyIntentNode.ts";

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
    .addEdge(START, "identifyIntent")
    .addEdge("identifyIntent", END);
  return workflow.compile();
}
