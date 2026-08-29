import type { GraphState } from "../graph.ts";
import Services from "../../services/index.ts";
import {getSystemPrompt, getUserPromptTemplate, IntentSchema} from "../../prompts/v1/identifyIntent.ts";


export function createIdentifyIntentNode() {
 
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const input = state.messages.at(-1)!.text;
    const systemPrompt = getSystemPrompt(await Service.CondominiumServices.findAllServices(), await Service.User.findUserById(state.author));
    const userPrompt = getUserPromptTemplate(input);
    const data = await Service.OpenRouter.generate(
      systemPrompt,
      userPrompt,
      IntentSchema as any,
    );
   const intent = data.content.intent;

    try {
      return {
        ...state,
        intent,
        data: data.content,
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
