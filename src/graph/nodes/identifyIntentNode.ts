import type { GraphState } from "../graph.ts";
import Services from "../../services/index.ts";



export function createIdentifyIntentNode() {
 
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    console.log(`🔍 Identifying intent...`);
    
    const input = state.messages.at(-1)!.text;
    const intent = "unknown"; 
    
    

    try {
      return {
        ...state,
        intent
      };
    } catch (error) {
      console.error("❌ Error in identifyIntent node:", error);
      return {
        ...state,
        intent: "unknown",
        error:
          error instanceof Error
            ? error.message
            : "Intent identification failed",
      };
    }
  };
}
