import { z } from 'zod';
import { type User } from '../../services/user/index.ts';

export const IntentSchema = z.object({
  intent: z.enum(["schedule", "cancel", "modify", "consult", "unknown", "notify", "complaint"]).nullable().describe('The user intent'),
  amenityId: z.number().nullable().describe('The ID of the amenity or area requested'),
  amenityName: z.string().nullable().describe('The name of the amenity or area requested'),
  condominiumIdIntent: z.number().nullable().describe('The condominium selected for the current intent'),
  condominiumName: z.string().nullable().describe('The condominium selected for the current intent'),
  userName: z.string().nullable().describe('The name of the user making the request'),
  userId: z.number().nullable().describe('The ID of the user making the request'),
  scheduleDate: z.string().nullable().describe('Existing reservation date and time for cancel or modify; requested date and time for schedule'),
  newScheduleDate: z.string().nullable().describe('Only the new requested date and time for modify; null for schedule or cancel'),
  consultationStartDate: z.string().nullable().describe('Start date in YYYY-MM-DD format for an availability consultation'),
  consultationEndDate: z.string().nullable().describe('Inclusive end date in YYYY-MM-DD format for an availability consultation; same as start date for a single day'),
  consultationDateTime: z.string().nullable().describe('Requested date and time in ISO 8601 format for a specific availability time-slot consultation'),
  reason: z.string().nullable().describe('Reason for the request when relevant'),
  document: z.string().nullable().optional().describe('Document number when explicitly informed'),
});

export type IntentData = z.infer<typeof IntentSchema>;

export const getSystemPrompt = (
  amenities: any[],
  user: User,
  condominiumIds: number[],
  condominiums: Array<{ id: number; name: string }>,
) => {
  return JSON.stringify({
    role: 'Intent Classifier for Condominium Management',
    task: 'Identify whether the user is asking about condominium facts, availability, reservation duration, or performing a reservation action',
    amenities: amenities.map(amenity => ({
      id: amenity.id,
      name: amenity.name,
      can_schedule: amenity.can_schedule,
      minimum_hours: amenity.minimum_hours,
    })),
    users: user,
    condominiumIds: condominiumIds,
    condominiums,
    current_date: new Date().toISOString(),
    important:[
      "if condominiumIds is more than one, do not assume a condominium. Ask the user to choose one before checking dates or scheduling. Use condominiumIdIntent only when the user selected one from the provided condominiums list.",
      "Return only a valid JSON object. Include every field from the schema in the response. Use the exact key names: intent, amenityId, amenityName, userId, userName, scheduleDate, newScheduleDate, consultationStartDate, consultationEndDate, consultationDateTime, reason, document, condominiumIdIntent, condominiumName. If the information is not present in the question, set the value to null instead of omitting the key. Do not include extra fields or explanations. NEVER swap scheduleDate and newScheduleDate.",
    ],
    rules: {
      schedule: {
        description: 'User wants to book/schedule an amenity',
        keywords: ['schedule', 'book', 'I want to', 'make an book'],
        required_fields: ['amenityName', 'scheduleDate', 'userName', 'condominiumIdIntent'],
        optional_fields: ['reason',"document"]
      },
      cancel: {
        description: 'User wants to cancel an existing book',
        keywords: ['cancel', 'remove', 'delete', 'cancel my book'],
        required_fields: ['userName', 'scheduleDate', 'amenityName', 'condominiumIdIntent'],
        optional_fields: ['reason',"document"]
      },
      modify: {
        description: 'User wants to change the date or time of an existing reservation',
        keywords: ['change', 'modify', 'reschedule', 'move my reservation'],
        required_fields: ['userName', 'scheduleDate', 'newScheduleDate', 'amenityName', 'condominiumIdIntent'],
        optional_fields: ['reason',"document"]
      },
      unknown: {
        description: 'Requests outside reservation actions and condominium amenity facts or availability',
        examples: [
          'weather questions',
          'the name or personal details of the condominium manager or residents',
          'unrelated queries',
        ]
      },
      consult: {
        description: 'User asks for facts, minimum reservation duration, or availability of amenities in the selected condominium. A question about how many hours an amenity must be rented is consultation, not a request to schedule.',
        examples: [
          'Does this condominium have a barbecue area?',
          'Is the pool available on May 25?',
          'Which days this week is the party room available?',
          'How many hours is the minimum reservation for the barbecue area?',
          'Quanto tempo é a reserva da churrasqueira?',
          'Por quantas horas preciso alugar o salão de festas?',
        ]
      }
    },
    extraction_instructions: {
      userId: 'Use the current authenticated user ID when available. If the message does not explicitly provide an ID, keep the value as the current user id from the session context.',
      userName: 'Extract the user name if mentioned; otherwise keep the same as the current user name when available.',
      amenityId: 'If the user mentions an amenity or area name, match it to the nearest amenity in the amenities list and return its id. If not found, set null.',
      amenityName: 'Extract the amenity or area name as mentioned by the user. If not present, set null.',
      scheduleDate: 'For schedule, parse the requested date and time. For cancel or modify, parse the date and time of the EXISTING reservation being located. Convert to ISO format.',
      newScheduleDate: 'Only for modify, parse the NEW date and time requested by the user. For schedule and cancel, always return null.',
      consultationStartDate: 'For an availability consultation, extract the first requested calendar date as YYYY-MM-DD. Resolve dates without a year to the next occurrence on or after current_date. For a date range, use its first day. Otherwise return null.',
      consultationEndDate: 'For an availability consultation, extract the inclusive final calendar date as YYYY-MM-DD. For one specific date, use the same date as consultationStartDate. For a week request, use the full requested calendar week. Otherwise return null.',
      consultationDateTime: 'For an availability consultation about a specific time, return the requested date and time as ISO 8601 with timezone information. If only a date or a date range is requested, return null.',
      intent: 'Classify questions asking minimum hours, rental duration, or reservation length as consult. They are informational questions, not schedule requests.',
      unsupported_requests: 'Only classify as consult questions about recorded condominium amenities, their minimum reservation duration, or availability. Questions asking for the name or personal details of the syndic/manager/residents, or other facts absent from the condominium amenity and reservation data, must be classified as unknown.',
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
          amenityId: 1,
          condominiumId: 1,
          amenityName: 'Salão de festas',
          userName: 'João da Silva',
          userId: 10,
          scheduleDate: '2026-09-05T19:00:00.000Z',
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: 'comemorar meu aniversário',
          document: null,
        },
      },
      {
        input: 'I would like to cancel my barbecue area reservation today at noon.',
        output: {
          intent: 'cancel',
          amenityId: 2,
          condominiumId: 1,
          amenityName: 'Churrasqueira',
          userName: 'Maria Oliveira',
          userId: 11,
          scheduleDate: '2026-09-04T12:00:00.000Z',
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'Quero remarcar minha reserva da churrasqueira de 10/09/2026 às 18h para 12/09/2026 às 20h.',
        output: {
          intent: 'modify',
          condominiumId: 1,
          amenityId: 2,
          amenityName: 'Churrasqueira',
          userName: 'Maria Oliveira',
          userId: 11,
          scheduleDate: '2026-09-10T18:00:00.000Z',
          newScheduleDate: '2026-09-12T20:00:00.000Z',
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'Can I book the swimming pool for Saturday at 10 AM?',
        output: {
          intent: 'schedule',
          condominiumId: 1,
          amenityId: 3,
          amenityName: 'Piscina',
          userName: 'Carlos Souza',
          userId: 12,
          scheduleDate: '2026-09-05T10:00:00.000Z',
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'I want to book the pool table for tomorrow at 3 PM.',
        output: {
          intent: 'schedule',
          amenityId: null,
          amenityName: 'mesa de sinuca',
          userName: 'Ana Costa',
          condominiumId: 1,
          userId: 13,
          scheduleDate: '2026-09-05T15:00:00.000Z',
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'What are the opening hours of the condominium gym?',
        output: {
          intent: 'consult',
          condominiumId: 1,
          amenityId: 4,
          amenityName: 'Academia',
          userName: 'Pedro Santos',
          userId: 14,
          scheduleDate: null,
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'A churrasqueira está disponível de 25/05/2027 a 31/05/2027?',
        output: {
          intent: 'consult',
          amenityId: 2,
          amenityName: 'Churrasqueira',
          condominiumIdIntent: 1,
          condominiumName: 'Residencial das Palmeiras',
          userName: 'Maria Oliveira',
          userId: 11,
          scheduleDate: null,
          newScheduleDate: null,
          consultationStartDate: '2027-05-25',
          consultationEndDate: '2027-05-31',
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'Quanto tempo é a reserva da churrasqueira?',
        output: {
          intent: 'consult',
          amenityId: 2,
          amenityName: 'Churrasqueira',
          condominiumIdIntent: 1,
          condominiumName: 'Residencial das Palmeiras',
          userName: 'Ana Silva',
          userId: 10,
          scheduleDate: null,
          newScheduleDate: null,
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
          reason: null,
          document: null,
        },
      },
      {
        input: 'What is the weather like today?',
        output: {
          intent: 'unknown',
          amenityId: null,
          amenityName: null,
          userName: null,
          userId: null,
          condominiumId: 1,
          scheduleDate: null,
          consultationStartDate: null,
          consultationEndDate: null,
          consultationDateTime: null,
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
      'Use the exact response keys: intent, amenityId, amenityName, userId, userName, scheduleDate, newScheduleDate, consultationStartDate, consultationEndDate, consultationDateTime, reason, document, condominiumIdIntent, condominiumName',
      'For modify, scheduleDate is the old reservation and newScheduleDate is the new requested date. Never swap them.',
      'For cancel, scheduleDate is the existing reservation and newScheduleDate must be null.',
      'Convert dates and times to ISO format',
      'Match amenity names to their IDs',
      'Preserve any valid data already captured in previousData',
      'Only fill missing fields from the latest user answer',
      'Return a valid JSON object with all schema fields present',
      'If a value is not available, use null instead of omitting the key',
      'For availability consultations, return consultationStartDate and consultationEndDate as YYYY-MM-DD; use null when no date or date range was requested.',
      'For availability at a specific time, return consultationDateTime as an ISO 8601 date-time with timezone information; otherwise use null.',
      "If has previousData, preserve any valid data already captured in it. Only fill missing fields from the latest user answer.",
    ]
  });
};
