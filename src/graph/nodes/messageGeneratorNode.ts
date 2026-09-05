import type { GraphState } from '../graph.ts';
import { AIMessage } from 'langchain';
import { z } from 'zod';

import Services from '../../services/index.ts';
import {
  getSystemPrompt,
  getUserPromptTemplate,
} from '../../prompts/v1/missingInformation.ts';

const fieldLabels: Record<string, string> = {
  serviceId: 'o serviço',
  serviceName: 'o nome do serviço',
  userName: 'o seu nome',
  datetime: 'a data e o horário',
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
      const data = state.data ?? {};
      const missingFields = Array.isArray(data.missingFields) ? data.missingFields : [];

      if (data.isMissingFields && missingFields.length > 0) {
        const normalizedFields = missingFields.map(
          (field: string) => fieldLabels[field] ?? field,
        );

        const systemPrompt = getSystemPrompt();
        const userPrompt = getUserPromptTemplate(data, normalizedFields);

        const response = await Service.OpenRouter.generate(
          systemPrompt,
          userPrompt,
          followUpSchema,
          "messageGeneratorNode",
        );

        const question =
          typeof response.content === 'object' && response.content && 'question' in response.content
            ? String(response.content.question)
            : `Para continuar, me informe ${normalizedFields.join(', ')}.`;

        return {
          ...state,
          messages: [...state.messages, new AIMessage(question)],
          informationComplete: false,
        };
      }

      return {
        ...state,
        messages: [...state.messages],
      };
    } catch (error) {
      console.error('❌ Error in messageGenerator node:', error);
      return {
        ...state,
        messages: [
          ...state.messages,
          new AIMessage('Ocorreu um erro ao processar sua solicitação. Tente novamente.'),
        ],
      };
    }
  };
}
