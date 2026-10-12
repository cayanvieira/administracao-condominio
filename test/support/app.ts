import { jest } from '@jest/globals'

process.env.JWT_SECRET ||= 'test-secret-with-at-least-32-characters'

export const accountService = {
  createAccount: jest.fn<(...args: any[]) => any>(),
  verifyAccount: jest.fn<(...args: any[]) => any>(),
  resendVerification: jest.fn<(...args: any[]) => any>(),
  login: jest.fn<(...args: any[]) => any>(),
}

export const condominiumService = {
  findAll: jest.fn<(...args: any[]) => any>(),
  findById: jest.fn<(...args: any[]) => any>(),
  create: jest.fn<(...args: any[]) => any>(),
  update: jest.fn<(...args: any[]) => any>(),
  delete: jest.fn<(...args: any[]) => any>(),
  findUsers: jest.fn<(...args: any[]) => any>(),
  addUser: jest.fn<(...args: any[]) => any>(),
  removeUser: jest.fn<(...args: any[]) => any>(),
}

export const userService = {
  findUserById: jest.fn<(...args: any[]) => any>(),
}

export const condominiumServices = {
  findAllAmenitiesByCondominiumIds: jest.fn<(...args: any[]) => any>(),
  findAmenityById: jest.fn<(...args: any[]) => any>(),
  createAmenity: jest.fn<(...args: any[]) => any>(),
  updateAmenity: jest.fn<(...args: any[]) => any>(),
  deleteAmenity: jest.fn<(...args: any[]) => any>(),
}

export const scheduleService = {
  findActiveSchedulesByAmenityBetweenDates: jest.fn<(...args: any[]) => any>(),
}

export const openRouterService = {
  generate: jest.fn<(...args: any[]) => any>(),
}

export const scheduleGraph = {
  handleQuestion: jest.fn<(...args: any[]) => any>(),
}

jest.unstable_mockModule('../../src/services/index.ts', () => ({
  default: class MockServices {
    get Account() { return accountService }
    get Condominium() { return condominiumService }
    get CondominiumAmenities() { return condominiumServices }
    get User() { return userService }
    get Schedule() { return scheduleService }
    get OpenRouter() { return openRouterService }
    get ScheduleGraph() { return scheduleGraph }
  },
}))

const { default: Fastify } = await import('fastify')
const { default: Routers } = await import('../../src/routers/index.ts')

export const app = Fastify()
Routers(app)

export function resetMocks() {
  jest.clearAllMocks()
  accountService.createAccount.mockResolvedValue({ id: 1 })
  accountService.verifyAccount.mockResolvedValue({ id: 1, active: true })
  accountService.resendVerification.mockResolvedValue(undefined)
  accountService.login.mockResolvedValue({ token: 'token', account: { id: 1 } })
  condominiumService.findAll.mockResolvedValue([{ id: 1, name: 'Residencial' }])
  condominiumService.findById.mockResolvedValue({ id: 1, name: 'Residencial' })
  condominiumService.create.mockResolvedValue({ id: 1, name: 'Residencial' })
  condominiumService.update.mockResolvedValue({ id: 1, name: 'Residencial Atualizado' })
  condominiumService.delete.mockResolvedValue(undefined)
  condominiumService.findUsers.mockResolvedValue([{ user_id: 1, role: 'morador' }])
  userService.findUserById.mockResolvedValue({ id: 1, name: 'Ana Silva' })
  condominiumService.addUser.mockResolvedValue({ user_id: 1, role: 'morador' })
  condominiumService.removeUser.mockResolvedValue(undefined)
  condominiumServices.findAllAmenitiesByCondominiumIds.mockResolvedValue([{ id: 1, condominium_id: 1, name: 'Piscina' }])
  condominiumServices.findAmenityById.mockResolvedValue({ id: 1, condominium_id: 1, name: 'Piscina' })
  condominiumServices.createAmenity.mockResolvedValue({ id: 1, condominium_id: 1, name: 'Piscina' })
  condominiumServices.updateAmenity.mockResolvedValue({ id: 1, condominium_id: 1, name: 'Piscina Nova' })
  condominiumServices.deleteAmenity.mockResolvedValue(true)
  scheduleService.findActiveSchedulesByAmenityBetweenDates.mockResolvedValue([])
  openRouterService.generate.mockResolvedValue({ content: { content: 'Resposta de teste.' } })
  scheduleGraph.handleQuestion.mockResolvedValue({ scenario: 'ok' })
}

export function authHeaders(condominiums = [
  { condominiumId: 1, userId: 1, role: 'morador' as const },
  { condominiumId: 1, userId: 1, role: 'sindico' as const },
  { condominiumId: 1, userId: 1, role: 'funcionario' as const },
]) {
  return {
    authorization: `Bearer ${app.jwt.sign({
      sub: 1,
      userId: 1,
      name: 'Ana Silva',
      email: 'ana@example.com',
      condominiums,
    })}`,
  }
}
