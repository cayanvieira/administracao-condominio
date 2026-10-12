import { HumanMessage } from 'langchain'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { openRouterService, resetMocks } from './support/app.ts'

const { createMessageGeneratorNode } = await import('../src/graph/nodes/messageGeneratorNode.ts')

const createState = (question = 'Esse condomínio tem churrasqueira?') => ({
  messages: [new HumanMessage(question)],
  userId: 1,
  condominiumIds: [1],
  amenityId: 1,
  amenityName: 'Churrasqueira',
  userName: 'Ana Silva',
  missingFields: [],
  isMissingFields: false,
  scenario: 'consultation',
  data: { intent: 'consult' },
  details: {
    amenities: [{ name: 'Churrasqueira' }],
    requestedAmenities: [{ name: 'Churrasqueira' }],
    unrecognizedAmenityNames: [],
  },
})

const createUnsupportedState = (intent: string | null) => ({
  ...createState('Pergunta sem suporte'),
  data: { intent },
})

describe('mensagem do fluxo de consulta', () => {
  beforeEach(resetMocks)

  it('extrai content.content da resposta estruturada da LLM', async () => {
    openRouterService.generate.mockResolvedValue({
      content: { content: 'Sim, há churrasqueira cadastrada no condomínio.' },
    })

    const result = await createMessageGeneratorNode()(createState() as never)

    expect(result.messages.at(-1)?.text).toBe('Sim, há churrasqueira cadastrada no condomínio.')
  })

  it('não retorna mensagem vazia se a resposta estruturada da LLM for inválida', async () => {
    openRouterService.generate.mockResolvedValue({ content: {} })

    const result = await createMessageGeneratorNode()(createState() as never)

    expect(result.messages.at(-1)?.text).toBe(
      'Não consegui gerar uma resposta sobre os dados do condomínio agora. Tente novamente em instantes.',
    )
  })

  it('usa o fallback sem lançar exceção quando o estado não tem cenário', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await createMessageGeneratorNode()({
        ...createState(),
        scenario: undefined,
      } as never)

      expect(result.messages.at(-1)?.text).toBe(
        'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
      )
      expect(openRouterService.generate).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(
        'No message generated: state has no scenario or missing fields.',
        expect.objectContaining({ intent: 'consult', scenario: undefined }),
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('responde a duração mínima a partir do dado do condomínio se a LLM falhar', async () => {
    openRouterService.generate.mockRejectedValue(new Error('Invalid structured response'))
    const state = createState('Quanto tempo é a reserva da churrasqueira?')
    state.details.amenity = { name: 'Churrasqueira', minimumHours: 3 }

    const result = await createMessageGeneratorNode()(state as never)

    expect(result.messages.at(-1)?.text).toBe(
      'A reserva da Churrasqueira tem duração mínima de 3 horas.',
    )
  })

  it('pede à LLM uma resposta educada sobre o escopo quando a intenção é desconhecida', async () => {
    openRouterService.generate.mockResolvedValue({
      content: { content: 'Desculpe, só posso ajudar com agendamentos e consultas sobre o condomínio.' },
    })
    const result = await createMessageGeneratorNode()(createUnsupportedState('unknown') as never)

    expect(result.messages.at(-1)?.text).toBe(
      'Desculpe, só posso ajudar com agendamentos e consultas sobre o condomínio.',
    )
    expect(openRouterService.generate).toHaveBeenCalledTimes(1)
    const userPrompt = JSON.parse(openRouterService.generate.mock.calls[0][1])
    expect(userPrompt.scenario).toBe('unsupported_request')
    expect(userPrompt.userInput).toBe('Pergunta sem suporte')
  })

  it('usa a LLM para redirecionar quando a intenção não foi identificada', async () => {
    openRouterService.generate.mockResolvedValue({
      content: { content: 'Posso ajudar com consultas e reservas do condomínio.' },
    })
    const result = await createMessageGeneratorNode()(createUnsupportedState(null) as never)

    expect(result.messages.at(-1)?.text).toBe(
      'Posso ajudar com consultas e reservas do condomínio.',
    )
    expect(openRouterService.generate).toHaveBeenCalledTimes(1)
  })

  it.each(['notify', 'complaint'])(
    'pede à LLM um redirecionamento para intenção não suportada (%s)',
    async (intent) => {
      openRouterService.generate.mockResolvedValue({
        content: { content: 'Posso ajudar apenas com assuntos do condomínio.' },
      })
      const result = await createMessageGeneratorNode()(createUnsupportedState(intent) as never)

      expect(result.messages.at(-1)?.text).toBe(
        'Posso ajudar apenas com assuntos do condomínio.',
      )
      expect(openRouterService.generate).toHaveBeenCalledTimes(1)
    },
  )
})
