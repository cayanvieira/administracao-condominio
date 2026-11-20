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

const normalizeConfirmation = (message: string): string =>
  message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function isExpectedScheduleConfirmation(state: GraphState, message: string): boolean {
  const normalizedMessage = normalizeConfirmation(message);
  const confirmed = normalizedMessage === "sim pode confirmar a reserva";
  const declined = normalizedMessage === "nao quero outra data";
  if ((!confirmed && !declined) || state.data?.userConfirmedSchedule !== confirmed) {
    return false;
  }

  const previousData = state.data?.previousData;
  return previousData?.intent === "schedule"
    && Number.isInteger(previousData.amenityId)
    && typeof previousData.amenityName === "string"
    && previousData.amenityName.trim().length > 0
    && Number.isInteger(previousData.userId)
    && typeof previousData.scheduleDate === "string"
    && previousData.scheduleDate.trim().length > 0
    && Number.isInteger(previousData.condominiumIdIntent);
}

export function createGuardrailsCheckNode() {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const userMessage = state.messages.at(-1)?.text ?? "";

    if (isExpectedScheduleConfirmation(state, userMessage)) {
      return {
        ...state,
        guardrailsCheck: { safe: true },
        scenario: "guardrails_check",
      };
    }

    try {
      const Service = new Services();
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
