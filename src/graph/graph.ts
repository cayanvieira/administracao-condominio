import { StateGraph, START, END } from "@langchain/langgraph";
import { ScheduleGraphSchema, type GraphState } from "./state.ts";

import { createIdentifyIntentNode } from "./nodes/identifyIntentNode.ts";
import { createSchedulerNode } from "./nodes/schedulerNode.ts";
import { createScheduleMutationNode } from "./nodes/scheduleMutationNode.ts";
import { createMessageGeneratorNode } from "./nodes/messageGeneratorNode.ts";
import { createConsultationNode } from "./nodes/consultationNode.ts";
import { createGuardrailsCheckNode } from "./nodes/guardrailsNode.ts";


export function buildScheduleGraph() {
  const workflow = new StateGraph({
    stateSchema: ScheduleGraphSchema,
  })

    .addNode("validateGuardrails", createGuardrailsCheckNode())
    .addNode("identifyIntent", createIdentifyIntentNode())
    .addNode('schedule', createSchedulerNode())
    .addNode('scheduleMutation', createScheduleMutationNode())
    .addNode('consultation', createConsultationNode())
    .addNode('message', createMessageGeneratorNode())


    .addEdge(START, 'validateGuardrails')
    .addConditionalEdges('validateGuardrails',
      (state: GraphState): string => {
        if (state.guardrailsCheck?.safe) {
          return "chat";
        }
        return "blocked";
      },
      {
        blocked: END,
        chat: "identifyIntent",
      }
    )

    .addConditionalEdges(
      'identifyIntent',
      (state: GraphState): string => {

        if (
          state.error
          || !state.data?.intent
          || state.data.intent === 'unknown'
          || state.isMissingFields
        ) {
          return 'message';
        }
        
        return state.data.intent
      },
      {
        schedule: 'schedule',
        consult: 'consultation',
        cancel: 'scheduleMutation',
        modify: 'scheduleMutation',
        notify: 'message',
        complaint: 'message',
        unknown: 'message',
        message: 'message',
      }
    )
    .addEdge('schedule', 'message')
    .addEdge('scheduleMutation', 'message')
    .addEdge('consultation', 'message')

    .addEdge("message", END);

  return workflow.compile();
}
