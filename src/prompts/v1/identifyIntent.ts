import { z } from 'zod';
import { type User } from '../../services/user/index.ts';

export const IntentSchema = z.object({
  intent: z.enum([ "schedule", "cancel", "consult", "unknown", "notify", "complaint"]).describe('The user intent'),
  serviceId: z.number().optional().describe('The ID of the service to book or cancel'),
  serviceName: z.string().optional().describe('The name of the service to book or cancel'),
  userName: z.string().optional().describe('The name of the user making the request'),
  datetimeToSchedule: z.string().optional().describe('Book date and time in ISO format'),
  reason: z.string().optional().describe('Reason for book (for scheduling)'),
});

export type IntentData = z.infer<typeof IntentSchema>;

export const getSystemPrompt = (services: any[],user: User) => {
  return JSON.stringify({
    role: 'Intent Classifier for Condominium Books',
    task: 'Identify user intent and extract all book-related details',
    services: services.map(s => ({ id: s.id, name: s.name, document: s.document, role: s.role })),
    users: user,
    current_date: new Date().toISOString(),
    important:"return only a json object with the fields that are present in the question. Do not include any extra fields or explanations.",
    rules: {
      schedule: {
        description: 'User wants to book/schedule a new service',
        keywords: ['schedule', 'book', 'I want to', 'make an book'],
        required_fields: ['serviceName', 'datetime', 'userName'],
        optional_fields: ['reason',"document"]
      },
      cancel: {
        description: 'User wants to cancel an existing book',
        keywords: ['cancel', 'remove', 'delete', 'cancel my book'],
        required_fields: ['userName', 'datetime', 'serviceName'],
        optional_fields: ['reason',"document"]
      },
      unknown: {
        description: 'Anything not related to scheduling or cancelling books',
        examples: ['weather questions', 'general info', 'unrelated queries']
      }
    },
    extraction_instructions: {
      userName: 'Match the user name mentioned in the question to the ID from the professionals list. Use fuzzy matching.',
      serviceName: 'Extract the service name as mentioned by the user',
      datetime: 'Parse relative dates (today, tomorrow) and times. Convert to ISO format. Use current_date as reference.',
      document: 'Extract the user document number from the question or context.',
      reason: 'Extract the reason/purpose for the book (only for scheduling)'
    },
    // examples: [
    //   {
    //     input: 'I want to schedule with Dr. Alicio da Silva for tomorrow at 4pm for a check-up',
    //     output: { intent: 'schedule', professionalId: 1, professionalName: 'Dr. Alicio da Silva', datetime: '2026-02-12T16:00:00.000Z', reason: 'check-up' }
    //   },
    //   {
    //     input: 'Cancel my book with Dr. Ana Pereira today at 11am',
    //     output: { intent: 'cancel', professionalId: 2, professionalName: 'Dr. Ana Pereira', datetime: '2026-02-11T11:00:00.000Z' }
    //   },
    //   {
    //     input: 'What is the weather today?',
    //     output: { intent: 'unknown' }
    //   }
    // ]
  });
};

export const getUserPromptTemplate = (question: string) => {
  return JSON.stringify({
    question,
    instructions: [
      'Carefully analyze the question to determine the user intent',
      'Extract all relevant book details',
      'Convert dates and times to ISO format',
      'Match service names to their IDs',
      'Return only the fields that are present in the question'
    ]
  });
};
