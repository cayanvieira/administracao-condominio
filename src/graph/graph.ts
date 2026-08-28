import { z } from "zod/v3";
import { StateGraph, START, END, MessagesZodMeta } from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import type { BaseMessage } from "@langchain/core/messages";

import {createIdentifyIntentNode} from './nodes/identifyIntentNode.ts';


const AppointmentGraphSchema = z.object({
  messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
  author: z.string().optional(),
  intent: z.enum(["reserv", "cancel", "consult", "unknown", "notify", "complaint"]).optional(),
  datetime: z.string().optional(),
  appointmentDate: z.string().optional(),
  error: z.string().optional(),
});

export type GraphState = z.infer<typeof AppointmentGraphSchema>;

export function buildAppointmentGraph() {
  const workflow = new StateGraph({
    stateSchema: AppointmentGraphSchema,
  })
  .addNode('identifyIntent', createIdentifyIntentNode())
  .addEdge(START, 'identifyIntent')
  .addEdge('identifyIntent', END);
  return workflow.compile();
}
