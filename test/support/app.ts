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

export const condominiumServices = {
  findAllServices: jest.fn<(...args: any[]) => any>(),
  findServiceById: jest.fn<(...args: any[]) => any>(),
  createService: jest.fn<(...args: any[]) => any>(),
  updateService: jest.fn<(...args: any[]) => any>(),
  deleteService: jest.fn<(...args: any[]) => any>(),
}

export const scheduleGraph = {
  handleQuestion: jest.fn<(...args: any[]) => any>(),
}

jest.unstable_mockModule('../../src/services/index.ts', () => ({
  default: class MockServices {
    get Account() { return accountService }
    get Condominium() { return condominiumService }
    get CondominiumServices() { return condominiumServices }
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
  condominiumService.addUser.mockResolvedValue({ user_id: 1, role: 'morador' })
  condominiumService.removeUser.mockResolvedValue(undefined)
  condominiumServices.findAllServices.mockResolvedValue([{ id: 1, condominium_id: 1, name: 'Piscina' }])
  condominiumServices.findServiceById.mockResolvedValue({ id: 1, condominium_id: 1, name: 'Piscina' })
  condominiumServices.createService.mockResolvedValue({ id: 1, condominium_id: 1, name: 'Piscina' })
  condominiumServices.updateService.mockResolvedValue({ id: 1, condominium_id: 1, name: 'Piscina Nova' })
  condominiumServices.deleteService.mockResolvedValue(true)
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
