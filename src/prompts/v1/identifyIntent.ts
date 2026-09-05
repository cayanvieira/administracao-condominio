import { z } from 'zod';
import { type User } from '../../services/user/index.ts';

export const IntentSchema = z.object({
  intent: z.enum(["schedule", "cancel", "consult", "unknown", "notify", "complaint"]).nullable().describe('The user intent'),
  serviceId: z.number().nullable().describe('The ID of the service or area requested'),
  serviceName: z.string().nullable().describe('The name of the service or area requested'),
  userName: z.string().nullable().describe('The name of the user making the request'),
  userId: z.number().nullable().describe('The ID of the user making the request'),
  scheduleDate: z.string().nullable().describe('Date and time in ISO format when relevant'),
  reason: z.string().nullable().describe('Reason for the request when relevant'),
  document: z.string().nullable().optional().describe('Document number when explicitly informed'),
});

export type IntentData = z.infer<typeof IntentSchema>;

export const getSystemPrompt = (services: any[],user: User) => {
  return JSON.stringify({
    role: 'Intent Classifier for Condominium Books',
    task: 'Identify user intent and extract all book-related details',
    services: services.map(s => ({ id: s.id, name: s.name, document: s.document, role: s.role })),
    users: user,
    current_date: new Date().toISOString(),
    important:"Return only a valid JSON object. Include every field from the schema in the response. Use the exact key names: intent, serviceId, serviceName, userId, userName, scheduleDate, reason, document. If the information is not present in the question, set the value to null instead of omitting the key. Do not include extra fields or explanations.",
    rules: {
      schedule: {
        description: 'User wants to book/schedule a new service',
        keywords: ['schedule', 'book', 'I want to', 'make an book'],
        required_fields: ['serviceName', 'scheduleDate', 'userName'],
        optional_fields: ['reason',"document"]
      },
      cancel: {
        description: 'User wants to cancel an existing book',
        keywords: ['cancel', 'remove', 'delete', 'cancel my book'],
        required_fields: ['userName', 'scheduleDate', 'serviceName'],
        optional_fields: ['reason',"document"]
      },
      unknown: {
        description: 'Anything not related to scheduling or cancelling books',
        examples: ['weather questions', 'general info', 'unrelated queries']
      }
    },
    extraction_instructions: {
      userId: 'Use the current authenticated user ID when available. If the message does not explicitly provide an ID, keep the value as the current user id from the session context.',
      userName: 'Extract the user name if mentioned; otherwise keep the same as the current user name when available.',
      serviceId: 'If the user mentions a service or area name, match it to the nearest service in the services list and return its id. If not found, set null.',
      serviceName: 'Extract the service or area name as mentioned by the user. If not present, set null.',
      scheduleDate: 'Parse relative dates (today, tomorrow) and times. Convert to ISO format. Use current_date as reference.',
      document: 'Extract the user document number from the question or context. If not present, set null.',
      reason: 'Extract the reason/purpose for the action when relevant; otherwise set null.'
    },
    examples: [
      {
        input: 'I want to book the party room for tomorrow at 7 PM to celebrate my birthday.',
        output: {
          intent: 'schedule',
          serviceId: 1,
          serviceName: 'Salão de festas',
          userName: 'João da Silva',
          userId: 10,
          scheduleDate: '2026-09-05T19:00:00.000Z',
          reason: 'comemorar meu aniversário',
          document: null,
        },
      },
      {
        input: 'I would like to cancel my barbecue area reservation today at noon.',
        output: {
          intent: 'cancel',
          serviceId: 2,
          serviceName: 'Churrasqueira',
          userName: 'Maria Oliveira',
          userId: 11,
          scheduleDate: '2026-09-04T12:00:00.000Z',
          reason: null,
          document: null,
        },
      },
      {
        input: 'Can I book the swimming pool for Saturday at 10 AM?',
        output: {
          intent: 'schedule',
          serviceId: 3,
          serviceName: 'Piscina',
          userName: 'Carlos Souza',
          userId: 12,
          scheduleDate: '2026-09-05T10:00:00.000Z',
          reason: null,
          document: null,
        },
      },
      {
        input: 'I want to book the pool table for tomorrow at 3 PM.',
        output: {
          intent: 'schedule',
          serviceId: null,
          serviceName: 'mesa de sinuca',
          userName: 'Ana Costa',
          userId: 13,
          scheduleDate: '2026-09-05T15:00:00.000Z',
          reason: null,
          document: null,
        },
      },
      {
        input: 'What are the opening hours of the condominium gym?',
        output: {
          intent: 'consult',
          serviceId: 4,
          serviceName: 'Academia',
          userName: 'Pedro Santos',
          userId: 14,
          scheduleDate: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'What is the weather like today?',
        output: {
          intent: 'unknown',
          serviceId: null,
          serviceName: null,
          userName: null,
          userId: null,
          scheduleDate: null,
          reason: null,
          document: null,
        },
      },
    ]
  });
};

export const getUserPromptTemplate = (
  question: string,
  previousData?: any | null,
) => {
  return JSON.stringify({
    question,
    previousData: previousData,
    instructions: [
      'Carefully analyze the question to determine the user intent',
      'Use the exact response keys: intent, serviceId, serviceName, userId, userName, scheduleDate, reason, document',
      'Convert dates and times to ISO format',
      'Match service names to their IDs',
      'Preserve any valid data already captured in previousData',
      'Only fill missing fields from the latest user answer',
      'Return a valid JSON object with all schema fields present',
      'If a value is not available, use null instead of omitting the key',
      "If has previousData, preserve any valid data already captured in it. Only fill missing fields from the latest user answer.",
    ]
  });
};
