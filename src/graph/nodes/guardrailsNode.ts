import { AIMessage } from "langchain";
import type { GraphState } from "../state.ts";
import Services from "../../services/index.ts";
import {
  getSystemPrompt,
  getUserPrompt,
  PromptInjectionCheckSchema,
} from "../../prompts/v1/guardrails.ts";

const blockedMessage =
  "Não posso seguir instruções que tentem alterar as regras do assistente. Envie uma solicitação relacionada ao condomínio.";
const verificationErrorMessage =
  "Não consegui verificar sua solicitação com segurança agora. Tente novamente em instantes.";

export function createGuardrailsCheckNode() {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const Service = new Services();
    const userMessage = state.messages.at(-1)?.text ?? "";

    try {
      const response = await Service.OpenRouter.generate(
        getSystemPrompt(),
        getUserPrompt(userMessage),
        PromptInjectionCheckSchema,
        "guardrailsCheckNode",
      );
      const check = PromptInjectionCheckSchema.parse(response.content);

      if (check.isPromptInjection) {
        return {
          ...state,
          guardrailsCheck: { safe: false },
          scenario: "guardrails_blocked",
          messages: [...state.messages, new AIMessage(blockedMessage)],
        };
      }

      return {
        ...state,
        guardrailsCheck: { safe: true },
        scenario: "guardrails_check",
      };
    } catch (error) {
      console.error("Guardrails prompt-injection check failed:", error);

      return {
        ...state,
        guardrailsCheck: { safe: false },
        scenario: "guardrails_error",
        error: "Prompt-injection check failed.",
        messages: [...state.messages, new AIMessage(verificationErrorMessage)],
      };
    }
  };
}
