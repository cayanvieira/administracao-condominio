import type { GraphState } from '../graph.ts';
import { AIMessage } from 'langchain';
import { z } from 'zod';

import Services from '../../services/index.ts';
import {
  getSystemPrompt as getSystemPromptMissingInformation,
  getUserPromptTemplate as getUserPromptTemplateMissingInformation,
} from '../../prompts/v1/missingInformation.ts';

import { getSystemPrompt as getSystemPromptMessageGenerator, getUserPromptTemplate as getUserPromptMessageUserGenerate } from '../../prompts/v1/messageGenerator.ts';


const fieldLabels: Record<string, string> = {
  serviceId: 'o serviço',
  serviceName: 'o nome do serviço',
  userName: 'o seu nome',
  scheduleDate: 'a data e o horário',
  newScheduleDate: 'a nova data e o novo horário da reserva',
  reason: 'o motivo',
  userId: 'o seu identificador',
  intent: 'a intenção',
};

const followUpSchema = z.object({
  question: z.string(),
});

export function createMessageGeneratorNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();

    try {
      const missingFields = Array.isArray(state.missingFields) ? state.missingFields : [];
      const { scheduleSuccess } = state
      if (scheduleSuccess !== undefined && scheduleSuccess !== null) {

        const systemPromptMessageGenerator = getSystemPromptMessageGenerator();
        const userPromptMessageUserGenerate = getUserPromptMessageUserGenerate(
          state,
          state.messages.at(-1)?.text,
        );

        const response = await Service.OpenRouter.generate(
          systemPromptMessageGenerator,
          userPromptMessageUserGenerate,
          followUpSchema,
          "messageGeneratorNode",
        );

        return {
          ...state,
          messages: [...state.messages, new AIMessage(response.content)],
        };
      }

      if (state.isMissingFields && missingFields.length > 0) {
        const normalizedFields = missingFields.map(
          (field: string) => fieldLabels[field] ?? field,
        );

        const systemPromptMissingInformation = getSystemPromptMissingInformation();
        const userPromptMissingInformation = getUserPromptTemplateMissingInformation(state, normalizedFields);

        const response = await Service.OpenRouter.generate(
          systemPromptMissingInformation,
          userPromptMissingInformation,
          followUpSchema,
          "messageGeneratorNode",
        );

        return {
          ...state,
          messages: [...state.messages, new AIMessage(response.content)],

        };
      }

      throw new Error('No message generated: neither missing fields nor scheduling success/failure scenario matched.');
    } catch (error) {
      console.error('❌ Error in messageGenerator node:', error);
      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage('Ocorreu um erro ao processar sua solicitação. Tente novamente.'),
        ]
      };
    }
  };
}
