import type { GraphState } from "../graph.ts";
import Services from "../../services/index.ts";
import { getSystemPrompt, getUserPromptTemplate, IntentSchema } from "../../prompts/v1/identifyIntent.ts";

function normalizeIntentResponse(
  payload: Record<string, unknown>,
  state: GraphState,
  services: Array<{ id: number; name: string }>,
  missingFields:Array<string>,
  invalidFields:Array<string>
) {
  const rawServiceName =
    typeof payload.serviceName === "string" ? payload.serviceName.trim() : "";

  const matchedService =
    rawServiceName.length > 0
      ? services.find((service) =>
          service.name.toLowerCase() === rawServiceName.toLowerCase(),
        )
      : undefined;

  const normalized = {
    intent: typeof payload.intent === "string" ? payload.intent : "unknown",
    serviceId:
      typeof payload.serviceId === "number"
        ? payload.serviceId
        : matchedService?.id ?? null,
    serviceName:
      typeof payload.serviceName === "string" && payload.serviceName.trim().length > 0
        ? payload.serviceName.trim()
        : matchedService?.name ?? null,
    userId: typeof payload.userId === "number" ? payload.userId : state.userId ?? null,
    userName:
      typeof payload.userName === "string" && payload.userName.trim().length > 0
        ? payload.userName.trim()
        : state.userName ?? null,
    datetime:
      typeof payload.datetime === "string" && payload.datetime.trim().length > 0
        ? payload.datetime
        : typeof payload.datetimeToSchedule === "string" && payload.datetimeToSchedule.trim().length > 0
          ? payload.datetimeToSchedule
          : null,
    reason:
      typeof payload.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason
        : null,
    document:
      typeof payload.document === "string" && payload.document.trim().length > 0
        ? payload.document
        : null,
    missingFields,
    invalidFields,
    isMissingFields : missingFields.length > 0 
  };

  return normalized;
}

function validateIntentData(data: any) {
  data = data.content
  const intent = data.intent
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  if (!intent || intent === "unknown") {
    missingFields.push("intent");
    return { missingFields, invalidFields };
  }

  switch (intent) {
    case "schedule":
    case "cancel":
    case "consult": {
      if (!data.serviceId) {
        missingFields.push("serviceId");
        invalidFields.push("serviceName","serviceId");
      }
      if (!data.serviceName) {
        missingFields.push("serviceName");
      }
      if (!data.userId) {
        missingFields.push("userId");
        invalidFields.push("userId");
      }

      if (!data.datetime) {
        missingFields.push("datetime");
        invalidFields.push("datetime");
      }
      break;
    }

    // case "notify": {
    //   // campos do futuro fluxo de notificação
    //   break;
    // }

    // case "complaint": {
    //   // campos do futuro fluxo de reclamação
    //   break;
    // }

    default:
      break;
  }

  return { missingFields, invalidFields };
}

export function createIdentifyIntentNode() {
  return async (state: GraphState): Promise<GraphState> => {

    const Service = new Services();
    const oldData = state.data.oldData ?? null
    
    const input = state.messages.at(-1)!.text;
    const services = await Service.CondominiumServices.findAllServices();
    const userId = await Service.User.findUserById(state.userId)
    const systemPrompt = getSystemPrompt(services, userId, oldData);
    const userPrompt = getUserPromptTemplate(input, state.data ?? null);
  
    const data = await Service.OpenRouter.generate(
      systemPrompt,
      userPrompt,
      IntentSchema as any,
      "identifyIntentNode"
    );

    const { missingFields, invalidFields } = validateIntentData(data);

    try {
      const normalized = normalizeIntentResponse(
        (data.content ?? {}) as Record<string, unknown>,
        state,
        services,
        missingFields,
        invalidFields
      );

      return {
        ...state,
        data: normalized,
      };
    } catch (error) {
      console.error("❌ Error in identifyIntent node:", error);
      return {
        ...state,
        data: {
          intent: "unknown",
        },
        error:
          error instanceof Error
            ? error.message
            : "Intent identification failed",
      };
    }
  };
}
