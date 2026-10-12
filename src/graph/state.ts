import { z } from "zod/v3";
import { withLangGraph } from "@langchain/langgraph/zod";
import { MessagesZodMeta } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export const ScheduleGraphSchema = z.object({
  messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
  userId: z.number(),
  condominiumIds: z.array(z.number()),
  condominiumIdIntent: z.number().optional(),
  condominiumName: z.string().optional(),
  amenityId: z.number(),
  amenityName: z.string(),
  userName: z.string(),
  reason: z.string().optional(),
  scheduleDate: z.string().optional(),
  error: z.string().optional(),
  data: z.custom<any>().optional(),
  missingFields: z.array(z.string()),
  invalidFields: z.array(z.string()).optional(),
  isMissingFields: z.boolean().optional(),
  scenario: z.string().optional(),
  details: z.custom<any>().optional(),
  scheduleSuccess: z.boolean().optional(),
  userConfirmationSchedule: z.boolean().optional(),
});

export type GraphState = z.infer<typeof ScheduleGraphSchema>;