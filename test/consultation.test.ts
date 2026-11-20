import { HumanMessage } from 'langchain'
import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  condominiumService,
  condominiumServices,
  openRouterService,
  resetMocks,
  scheduleService,
} from './support/app.ts'

const { createConsultationNode } = await import('../src/graph/nodes/consultationNode.ts')
const { createIdentifyIntentNode } = await import('../src/graph/nodes/identifyIntentNode.ts')

const createState = (question: string, data: Record<string, unknown>) => ({
  messages: [new HumanMessage(question)],
  userId: 1,
  condominiumIds: [1],
  timezoneOffsetMinutes: 180,
  amenityId: 1,
  amenityName: 'Churrasqueira',
  userName: 'Ana Silva',
  missingFields: [],
  data: {
    intent: 'consult',
    condominiumIdIntent: 1,
    amenityId: 1,
    amenityName: 'Churrasqueira',
    ...data,
  },
})

describe('consulta de amenidades', () => {
  beforeEach(() => {
    resetMocks()
    condominiumService.findById.mockResolvedValue({ id: 1, name: 'Residencial das Palmeiras' })
    condominiumServices.findAllAmenitiesByCondominiumIds.mockResolvedValue([
      { id: 1, condominium_id: 1, name: 'Churrasqueira', can_schedule: true, reservation_hours: 3 },
      { id: 2, condominium_id: 1, name: 'Salão de Festas', can_schedule: true, reservation_hours: 4 },
    ])
  })

  it('retorna fatos do condomínio para perguntas sobre amenidades', async () => {
    const result = await createConsultationNode()(createState(
      'Aqui possui churrasqueira?',
      {},
    ) as never)

    expect(result.scenario).toBe('consultation')
    expect(result.details.amenity).toMatchObject({
      name: 'Churrasqueira',
      canSchedule: true,
      reservationHours: 3,
    })
    expect(scheduleService.findAvailableSlotsForDateRange).not.toHaveBeenCalled()
  })

  it('classifica pergunta sobre duração da reserva como consulta e retorna as horas cadastradas', async () => {
    openRouterService.generate.mockResolvedValue({
      content: {
        intent: 'unknown',
        amenityId: null,
        amenityName: null,
        condominiumIdIntent: null,
        condominiumName: null,
        userName: null,
        userId: null,
        scheduleDate: null,
        newScheduleDate: null,
        consultationStartDate: null,
        consultationEndDate: null,
        consultationDateTime: null,
        reason: null,
        document: null,
      },
    })

    const identified = await createIdentifyIntentNode()({
      ...createState('Quanto tempo é a reserva da churrasqueira?', {}),
      userId: 1,
    } as never)
    const consultation = await createConsultationNode()(identified)

    expect(identified.data.intent).toBe('consult')
    expect(identified.data.amenityId).toBe(1)
    expect(consultation.details.amenity).toMatchObject({
      name: 'Churrasqueira',
      reservationHours: 3,
    })
  })

  it('pede correção quando o assistente identifica uma reserva com minutos', async () => {
    openRouterService.generate.mockResolvedValue({
      content: {
        intent: 'schedule',
        amenityId: 1,
        amenityName: 'Churrasqueira',
        condominiumIdIntent: 1,
        condominiumName: 'Residencial das Palmeiras',
        userName: 'Ana Silva',
        userId: 1,
        scheduleDate: '2099-08-12T13:30:00Z',
        newScheduleDate: null,
        consultationStartDate: null,
        consultationEndDate: null,
        consultationDateTime: null,
        reason: null,
        document: null,
      },
    })

    const identified = await createIdentifyIntentNode()({
      ...createState('Quero reservar a churrasqueira às 13h30.', {}),
      data: undefined,
    } as never)

    expect(identified.isMissingFields).toBe(true)
    expect(identified.missingFields).toContain('scheduleDate')
    expect(identified.invalidFields).toContain('scheduleDate')
  })

  it('separa amenidades existentes e nomes não cadastrados em perguntas combinadas', async () => {
    const result = await createConsultationNode()(createState(
      'Esse condomínio tem quadra de futebol e churrasqueira?',
      { amenityName: 'quadra de futebol e churrasqueira' },
    ) as never)

    expect(result.details.requestedAmenities).toEqual([
      expect.objectContaining({ name: 'Churrasqueira' }),
    ])
    expect(result.details.unrecognizedAmenityNames).toEqual(['quadra de futebol'])
  })

  it('mantém um dia disponível quando ainda há horários livres apesar de outras reservas', async () => {
    scheduleService.findAvailableSlotsForDateRange.mockResolvedValue([
      {
        date: '2027-05-25',
        availableSlots: [{
          time: '10:00',
          reservation_date: new Date('2027-05-25T13:00:00.000Z'),
          reservation_end: new Date('2027-05-25T16:00:00.000Z'),
        }],
      },
      { date: '2027-05-26', availableSlots: [] },
      {
        date: '2027-05-27',
        availableSlots: [{
          time: '10:00',
          reservation_date: new Date('2027-05-27T13:00:00.000Z'),
          reservation_end: new Date('2027-05-27T16:00:00.000Z'),
        }],
      },
    ])

    const result = await createConsultationNode()(createState(
      'A churrasqueira está disponível de 25/05/2027 a 27/05/2027?',
      {
        consultationStartDate: '2027-05-25',
        consultationEndDate: '2027-05-27',
      },
    ) as never)

    expect(scheduleService.findAvailableSlotsForDateRange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, reservation_hours: 3 }),
      ['2027-05-25', '2027-05-26', '2027-05-27'],
      180,
    )
    expect(result.details.availability).toMatchObject({
      bookedDates: ['2027-05-26'],
      availableDates: ['2027-05-25', '2027-05-27'],
    })
  })

  it('marca o horário disponível quando a consulta ao banco não encontra reserva conflitante', async () => {
    scheduleService.findAvailableSlotsForDateRange.mockResolvedValue([{
      date: '2026-10-13',
      availableSlots: [{
        time: '20:00',
        reservation_date: new Date('2026-10-13T23:00:00.000Z'),
        reservation_end: new Date('2026-10-14T02:00:00.000Z'),
      }],
    }])

    const result = await createConsultationNode()(createState(
      'A churrasqueira está livre amanhã às 20h?',
      {
        consultationDateTime: '2026-10-13T20:00:00.000-03:00',
      },
    ) as never)

    expect(scheduleService.findAvailableSlotsForDateRange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, reservation_hours: 3 }),
      ['2026-10-13'],
      180,
    )
    expect(result.details.availability).toMatchObject({
      requestedDateTime: '2026-10-13T20:00:00-03:00',
      isAvailable: true,
      status: 'available',
    })
  })

  it('pede uma data quando a pergunta de disponibilidade não informa período', async () => {
    const result = await createConsultationNode()(createState(
      'A churrasqueira está disponível?',
      {},
    ) as never)

    expect(result.details.availability.needsDateClarification).toBe(true)
    expect(scheduleService.findAvailableSlotsForDateRange).not.toHaveBeenCalled()
  })
})
