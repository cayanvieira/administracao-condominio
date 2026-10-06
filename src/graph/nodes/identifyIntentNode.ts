import type { GraphState }  from "../state.ts";
import Services from "../../services/index.ts";
import { getSystemPrompt, getUserPromptTemplate, IntentSchema } from "../../prompts/v1/identifyIntent.ts";

function normalizeIntentResponse(
  payload: Record<string, unknown>,
  state: GraphState,
  services: Array<{ id: number; name: string }>
  , condominiums: Array<{ id: number; name: string }>
) {
  const rawServiceName =
    typeof payload.serviceName === "string" ? payload.serviceName.trim() : "";

  const matchedService =
    rawServiceName.length > 0
      ? services.find((service) =>
          service.name.toLowerCase() === rawServiceName.toLowerCase(),
        )
      : undefined;
  const rawCondominiumName = typeof payload.condominiumName === "string"
    ? payload.condominiumName.trim()
    : "";
  const rawCondominiumId = typeof payload.condominiumIdIntent === "number"
    ? payload.condominiumIdIntent
    : undefined;
  const matchedCondominium = condominiums.find((condominium) =>
    condominium.id === rawCondominiumId
    || condominium.name.toLowerCase() === rawCondominiumName.toLowerCase(),
  ) ?? (condominiums.length === 1 ? condominiums[0] : undefined);

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
      condominiumIdIntent: matchedCondominium?.id ?? null,
      condominiumName: matchedCondominium?.name ?? null,
    userId: (typeof payload.userId === "number" ? payload.userId : state.userId ?? null) as number | null,
    userName:
      (typeof payload.userName === "string" && payload.userName.trim().length > 0
        ? payload.userName.trim()
        : state.userName ?? null) as string | null,
    scheduleDate:
      typeof payload.scheduleDate === "string" && payload.scheduleDate.trim().length > 0
        ? payload.scheduleDate
        : typeof payload.scheduleDateToSchedule === "string" && payload.scheduleDateToSchedule.trim().length > 0
          ? payload.scheduleDateToSchedule
          : null,
    newScheduleDate:
      typeof payload.newScheduleDate === "string" && payload.newScheduleDate.trim().length > 0
        ? payload.newScheduleDate
        : null,
    reason:
      typeof payload.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason
        : null,
    document:
      typeof payload.document === "string" && payload.document.trim().length > 0
        ? payload.document
        : null,
  };

  return normalized;
}

function validateIntentData(data: any) {

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
    case "modify":
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

      if (!data.scheduleDate) {
        missingFields.push("scheduleDate");
        invalidFields.push("scheduleDate");
      }
      if(
        !data.condominiumIdIntent || !data.condominiumName
      ){
        missingFields.push("condominiumIdIntent");
        invalidFields.push("condominiumIdIntent");
      }

      if (intent === "modify" && !data.newScheduleDate) {
        missingFields.push("newScheduleDate");
        invalidFields.push("newScheduleDate");
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
    const previousData = state.data?.previousData ?? null
    
    const input = state.messages.at(-1)!.text;
    if (state.condominiumIds.length === 0) {
      return {
        ...state,
        error: "Condominium context is required to identify services.",
      };
    }
    const condominiumIds = state.condominiumIds
    const condominiums = await Promise.all(condominiumIds.map(async (id:number) => Service.Condominium.findById(id)))
    const amenitys = await Service.CondominiumAmenitys.findAllAmenitysByCondominiumIds(condominiumIds);
    const userId = await Service.User.findUserById(state.userId)
    const systemPrompt = getSystemPrompt(amenitys, userId, condominiumIds, condominiums);
    const userPrompt = getUserPromptTemplate(input, previousData);
  
    const data = await Service.OpenRouter.generate(
      systemPrompt,
      userPrompt,
      IntentSchema as any,
      "identifyIntentNode"
    );

    try {
      const normalized = normalizeIntentResponse(
        (data.content ?? {}) as Record<string, unknown>,
        state,
        amenitys,
        condominiums,
      );

      if (
        normalized.document
        && ["schedule", "cancel", "modify"].includes(normalized.intent)
        && normalized.condominiumIdIntent
      ) {
        const callerRole = await Service.Condominium.findUserRole(normalized.condominiumIdIntent, state.userId);
        if (callerRole?.trim().toLowerCase() === "sindico") {
          const members = await Service.Condominium.findUsers(normalized.condominiumIdIntent);
          const resident = members.find((member) =>
            member.role === "morador" && member.document === normalized.document,
          );
          if (resident) {
            normalized.userId = resident.user_id;
            normalized.userName = resident.name;
          } else {
            normalized.userId = null;
            normalized.userName = null;
          }
        }
      }

      const userConfirmedSchedule = typeof state.data?.userConfirmedSchedule === "boolean"
        ? state.data.userConfirmedSchedule
        : undefined;

      const { missingFields, invalidFields } = validateIntentData(normalized);

      return {
        ...state,
        data: { ...normalized, userConfirmedSchedule },
        missingFields,
        invalidFields,
        isMissingFields : missingFields.length > 0
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
