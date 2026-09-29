import { z } from 'zod';
import { type User } from '../../services/user/index.ts';

export const IntentSchema = z.object({
  intent: z.enum(["schedule", "cancel", "modify", "consult", "unknown", "notify", "complaint"]).nullable().describe('The user intent'),
  serviceId: z.number().nullable().describe('The ID of the service or area requested'),
  serviceName: z.string().nullable().describe('The name of the service or area requested'),
  condominiumIdIntent: z.number().nullable().describe('The condominium selected for the current intent'),
  condominiumName: z.string().nullable().describe('The condominium selected for the current intent'),
  userName: z.string().nullable().describe('The name of the user making the request'),
  userId: z.number().nullable().describe('The ID of the user making the request'),
  scheduleDate: z.string().nullable().describe('Existing reservation date and time for cancel or modify; requested date and time for schedule'),
  newScheduleDate: z.string().nullable().describe('Only the new requested date and time for modify; null for schedule or cancel'),
  reason: z.string().nullable().describe('Reason for the request when relevant'),
  document: z.string().nullable().optional().describe('Document number when explicitly informed'),
});

export type IntentData = z.infer<typeof IntentSchema>;

export const getSystemPrompt = (
  services: any[],
  user: User,
  condominiumIds: number[],
  condominiums: Array<{ id: number; name: string }>,
) => {
  return JSON.stringify({
    role: 'Intent Classifier for Condominium Books',
    task: 'Identify user intent and extract all book-related details',
    services: services.map(s => ({ id: s.id, name: s.name, document: s.document, role: s.role })),
    users: user,
    condominiumIds: condominiumIds,
    condominiums,
    current_date: new Date().toISOString(),
    important:[
      "if condominiumIds is more than one, do not assume a condominium. Ask the user to choose one before checking dates or scheduling. Use condominiumIdIntent only when the user selected one from the provided condominiums list.",
      "Return only a valid JSON object. Include every field from the schema in the response. Use the exact key names: intent, serviceId, serviceName, userId, userName, scheduleDate, newScheduleDate, reason, document, condominiumIdIntent, condominiumName. If the information is not present in the question, set the value to null instead of omitting the key. Do not include extra fields or explanations. NEVER swap scheduleDate and newScheduleDate.",
    ],
    rules: {
      schedule: {
        description: 'User wants to book/schedule a new service',
        keywords: ['schedule', 'book', 'I want to', 'make an book'],
        required_fields: ['serviceName', 'scheduleDate', 'userName', 'condominiumIdIntent'],
        optional_fields: ['reason',"document"]
      },
      cancel: {
        description: 'User wants to cancel an existing book',
        keywords: ['cancel', 'remove', 'delete', 'cancel my book'],
        required_fields: ['userName', 'scheduleDate', 'serviceName', 'condominiumIdIntent'],
        optional_fields: ['reason',"document"]
      },
      modify: {
        description: 'User wants to change the date or time of an existing reservation',
        keywords: ['change', 'modify', 'reschedule', 'move my reservation'],
        required_fields: ['userName', 'scheduleDate', 'newScheduleDate', 'serviceName', 'condominiumIdIntent'],
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
      scheduleDate: 'For schedule, parse the requested date and time. For cancel or modify, parse the date and time of the EXISTING reservation being located. Convert to ISO format.',
      newScheduleDate: 'Only for modify, parse the NEW date and time requested by the user. For schedule and cancel, always return null.',
      date_mapping: 'For modify: scheduleDate = old/current reservation; newScheduleDate = new/target reservation. Never reverse these values.',
      document: 'Extract the user document number from the question or context. If not present, set null.',
      reason: 'Extract the reason/purpose for the action when relevant; otherwise set null.',
      condominiumIdIntent: 'If condominiumIds is more than one, identify the condominium in condominiums ,identify the condominium selected by the user and return its ID from the provided list. If the user did not select one, return null. Never invent an ID.',
      condominiumName: 'Return the name matching condominiumIdIntent. If no condominium was selected, return null.'
    },
    examples: [
      {
        input: 'I want to book the party room for tomorrow at 7 PM to celebrate my birthday.',
        output: {
          intent: 'schedule',
          serviceId: 1,
          condominiumId: 1,
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
          condominiumId: 1,
          serviceName: 'Churrasqueira',
          userName: 'Maria Oliveira',
          userId: 11,
          scheduleDate: '2026-09-04T12:00:00.000Z',
          reason: null,
          document: null,
        },
      },
      {
        input: 'Quero remarcar minha reserva da churrasqueira de 10/09/2026 às 18h para 12/09/2026 às 20h.',
        output: {
          intent: 'modify',
          condominiumId: 1,
          serviceId: 2,
          serviceName: 'Churrasqueira',
          userName: 'Maria Oliveira',
          userId: 11,
          scheduleDate: '2026-09-10T18:00:00.000Z',
          newScheduleDate: '2026-09-12T20:00:00.000Z',
          reason: null,
          document: null,
        },
      },
      {
        input: 'Can I book the swimming pool for Saturday at 10 AM?',
        output: {
          intent: 'schedule',
          condominiumId: 1,
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
          condominiumId: 1,
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
          condominiumId: 1,
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
          condominiumId: 1,
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
      'Use the exact response keys: intent, serviceId, serviceName, userId, userName, scheduleDate, newScheduleDate, reason, document',
      'For modify, scheduleDate is the old reservation and newScheduleDate is the new requested date. Never swap them.',
      'For cancel, scheduleDate is the existing reservation and newScheduleDate must be null.',
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
