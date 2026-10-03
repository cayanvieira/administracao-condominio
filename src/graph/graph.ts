import { StateGraph, START, END} from "@langchain/langgraph";
import { ScheduleGraphSchema, type GraphState } from "./state.ts";

import { createIdentifyIntentNode } from "./nodes/identifyIntentNode.ts";
import { createSchedulerNode } from "./nodes/schedulerNode.ts";
import { createScheduleMutationNode } from "./nodes/scheduleMutationNode.ts";
import { createMessageGeneratorNode } from "./nodes/messageGeneratorNode.ts";


export function buildScheduleGraph() {
  const workflow = new StateGraph({
    stateSchema: ScheduleGraphSchema,
  })
    .addNode("identifyIntent", createIdentifyIntentNode())
    .addNode('schedule', createSchedulerNode())
    .addNode('scheduleMutation', createScheduleMutationNode())
    .addNode('message', createMessageGeneratorNode())


    .addEdge(START, "identifyIntent")
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
