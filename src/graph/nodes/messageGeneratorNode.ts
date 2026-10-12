import type { GraphState }  from "../state.ts";
import { AIMessage } from 'langchain';
import Services from '../../services/index.ts';
import {
  getSystemPrompt as getSystemPromptMissingInformation,
  getUserPromptTemplate as getUserPromptTemplateMissingInformation,
} from '../../prompts/v1/missingInformation.ts';

import {
  MessageSchema,
  getSystemPrompt as getSystemPromptMessageGenerator,
  getUserPromptTemplate as getUserPromptMessageUserGenerate,
} from '../../prompts/v1/messageGenerator.ts';


const fieldLabels: Record<string, string> = {
  amenityId: 'a amenidade',
  amenityName: 'o nome da amenidade',
  condominiumIdIntent: 'o condomínio',
  userName: 'o seu nome',
  scheduleDate: 'a data e o horário',
  newScheduleDate: 'a nova data e o novo horário da reserva',
  reason: 'o motivo',
  userId: 'o seu identificador',
  intent: 'a intenção',
};

const isDurationQuestion = (question: string): boolean => {
  const normalizedQuestion = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
  return /\b(quanto tempo|quantas horas|duracao|tempo minimo|minimo de horas|horas minimas|tempo de reserva|periodo de reserva|tempo para alugar|tempo para reservar|devo alugar por)\b/.test(normalizedQuestion);
};

const getConsultationFallback = (state: GraphState): string | undefined => {
  if (state.scenario !== "consultation" || !isDurationQuestion(state.messages.at(-1)?.text ?? "")) {
    return undefined;
  }

  const amenity = state.details?.amenity;
  if (typeof amenity?.name !== "string" || typeof amenity.minimumHours !== "number") {
    return undefined;
  }

  return `A reserva da ${amenity.name} tem duração mínima de ${amenity.minimumHours} horas.`;
};

export function createMessageGeneratorNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();

    try {
      const { missingFields, isMissingFields,scenario } = state

      if (!state.data?.intent || state.data.intent === "unknown") {
        return await generateUnsupportedRequestMessage(state, Service);
      }

      if (state.data.intent === "notify" || state.data.intent === "complaint") {
        return await generateUnsupportedRequestMessage(state, Service);
      }

      if (isMissingFields) {

        const normalizedFields = missingFields.map(
          (field: string) => fieldLabels[field] ?? field,
        );

        return await askAboutMissingFields(state, normalizedFields, Service)

      }

      if (scenario) {

        const systemPromptMessageGenerator = getSystemPromptMessageGenerator();
        const userPromptMessageUserGenerate = getUserPromptMessageUserGenerate(
          state,
          state.messages.at(-1)?.text,
        );

        const response = await Service.OpenRouter.generate(
          systemPromptMessageGenerator,
          userPromptMessageUserGenerate,
          MessageSchema,
          "messageGeneratorNode",
        );
        const message = MessageSchema.parse(response.content).content;
        
        return {
          ...state,
          userConfirmationSchedule: scenario === 'schedule_confirm'
            ? true
            : scenario === 'schedule_success'
              ? false
              : state.userConfirmationSchedule,
          messages: [...state.messages, new AIMessage(message)],
        };
      }



      throw new Error('No message generated: neither missing fields nor scheduling success/failure scenario matched.');
    } catch (error) {
      console.error('❌ Error in messageGenerator node:', error);
      const consultationFallback = getConsultationFallback(state);
      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(consultationFallback ?? (state.scenario === 'consultation'
            ? 'Não consegui gerar uma resposta sobre os dados do condomínio agora. Tente novamente em instantes.'
            : 'Ocorreu um erro ao processar sua solicitação. Tente novamente.'),
          ),
        ]
      };
    }
  };
}

async function generateUnsupportedRequestMessage(state: GraphState, Service: Services): Promise<GraphState> {
  const response = await Service.OpenRouter.generate(
    getSystemPromptMessageGenerator(),
    getUserPromptMessageUserGenerate(
      {
        scenario: 'unsupported_request',
        details: { requestIsOutsideSupportedScope: true },
      },
      state.messages.at(-1)?.text,
    ),
    MessageSchema,
    "messageGeneratorNode",
  );
  const message = MessageSchema.parse(response.content).content;

  return {
    ...state,
    messages: [...state.messages, new AIMessage(message)],
  };
}

async function askAboutMissingFields(state: GraphState, normalizedFields: Array<string>,Service : Services) {
  const systemPromptMissingInformation = getSystemPromptMissingInformation();
  const userPromptMissingInformation = getUserPromptTemplateMissingInformation(state, normalizedFields);

  const response = await Service.OpenRouter.generate(
    systemPromptMissingInformation,
    userPromptMissingInformation,
    MessageSchema,
    "messageGeneratorNode",
  );
  const message = MessageSchema.parse(response.content).content;

  return {
    ...state,
    messages: [...state.messages, new AIMessage(message)],

  };
}
