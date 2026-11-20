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
  consultationDateTime: 'um horário terminado em :00',
  reason: 'o motivo',
  userId: 'o seu identificador',
  intent: 'a intenção',
};

const getGreetingResponse = (message: string): string | undefined => {
  const normalizedMessage = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const responses: Record<string, string> = {
    "bom dia": "Bom dia! Como posso ajudar?",
    "bom dia tudo bem": "Bom dia! Como posso ajudar?",
    "boa tarde": "Boa tarde! Como posso ajudar?",
    "boa tarde tudo bem": "Boa tarde! Como posso ajudar?",
    "boa noite": "Boa noite! Como posso ajudar?",
    "boa noite tudo bem": "Boa noite! Como posso ajudar?",
    "oi": "Olá! Como posso ajudar?",
    "oi tudo bem": "Olá! Como posso ajudar?",
    "ola": "Olá! Como posso ajudar?",
    "ola tudo bem": "Olá! Como posso ajudar?",
  };

  return responses[normalizedMessage];
};

const isDurationQuestion = (question: string): boolean => {
  const normalizedQuestion = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
  return /\b(quanto tempo|quantas horas|quantidade de horas|horas da reserva|duracao|tempo de reserva|periodo de reserva|tempo para alugar|tempo para reservar|devo alugar por)\b/.test(normalizedQuestion);
};

const getConsultationFallback = (state: GraphState): string | undefined => {
  if (state.scenario !== "consultation" || !isDurationQuestion(state.messages.at(-1)?.text ?? "")) {
    return undefined;
  }

  const amenity = state.details?.amenity;
  if (typeof amenity?.name !== "string" || typeof amenity.reservationHours !== "number") {
    return undefined;
  }

  return `A reserva da ${amenity.name} tem duração de ${amenity.reservationHours} horas.`;
};

const getFallbackMessage = (state: GraphState): string =>
  getConsultationFallback(state)
  ?? (state.scenario === 'consultation'
    ? 'Não consegui gerar uma resposta sobre os dados do condomínio agora. Tente novamente em instantes.'
    : 'Ocorreu um erro ao processar sua solicitação. Tente novamente.');

export function createMessageGeneratorNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const greetingResponse = getGreetingResponse(state.messages.at(-1)?.text ?? "");
    if (greetingResponse) {
      return {
        ...state,
        messages: [...state.messages, new AIMessage(greetingResponse)],
      };
    }

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

      console.error('No message generated: state has no scenario or missing fields.', {
        intent: state.data?.intent,
        isMissingFields,
        scenario,
      });
      return {
        ...state,
        messages: [...state.messages, new AIMessage(getFallbackMessage(state))],
      };
    } catch (error) {
      console.error('❌ Error in messageGenerator node:', error);
      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage(getFallbackMessage(state)),
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
