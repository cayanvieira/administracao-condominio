import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import { announcementsService, app, authHeaders, resetMocks } from './support/app.ts'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(resetMocks)

describe('rotas de avisos', () => {
  it('lista avisos somente do condominio autorizado', async () => {
    const announcement = {
      id: 1,
      condominiumId: 1,
      title: 'Manutenção',
      message: 'A área ficará fechada.',
      createDate: '2026-11-20T12:00:00.000Z',
      expirationDate: null,
      theme: null,
      important: false,
      active: true,
      createByUserId: 1,
      role: 'sindico',
      authorName: 'Ana Silva',
    }
    announcementsService.findByCondominiumId.mockResolvedValueOnce([announcement])

    const response = await app.inject({
      method: 'GET',
      url: '/announcements?condominiumId=1',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([announcement])
    expect(announcementsService.findByCondominiumId).toHaveBeenCalledWith(1, false)
  })

  it('permite que responsáveis consultem avisos desativados', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/announcements?condominiumId=1&includeInactive=true',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'sindico' }]),
    })

    expect(response.statusCode).toBe(200)
    expect(announcementsService.findByCondominiumId).toHaveBeenCalledWith(1, true)
  })

  it('impede moradores de consultarem avisos desativados', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/announcements?condominiumId=1&includeInactive=true',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
    })

    expect(response.statusCode).toBe(403)
    expect(announcementsService.findByCondominiumId).not.toHaveBeenCalled()
  })

  it('rejeita consulta de avisos de outro condominio', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/announcements?condominiumId=2',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
    })

    expect(response.statusCode).toBe(403)
    expect(announcementsService.findByCondominiumId).not.toHaveBeenCalled()
  })

  it.each(['sindico', 'funcionario'] as const)('permite que %s publique um aviso com autoria do token', async (role) => {
    const response = await app.inject({
      method: 'POST',
      url: '/announcements',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role }]),
      payload: {
        condominiumId: 1,
        title: 'Manutenção',
        message: 'A área ficará fechada.',
        expirationDate: '2026-11-21T12:00:00.000Z',
        theme: 'warning',
        important: true,
        createByUserId: 999,
        role: 'admin',
        createDate: '2000-01-01T00:00:00.000Z',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(announcementsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        condominiumId: 1,
        title: 'Manutenção',
        message: 'A área ficará fechada.',
        expirationDate: new Date('2026-11-21T12:00:00.000Z'),
        theme: 'warning',
        important: true,
      }),
      1,
      role,
    )
  })

  it.each(['morador', 'admin'] as const)('impede que %s publique avisos', async (role) => {
    const response = await app.inject({
      method: 'POST',
      url: '/announcements',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role }]),
      payload: {
        condominiumId: 1,
        title: 'Manutenção',
        message: 'A área ficará fechada.',
      },
    })

    expect(response.statusCode).toBe(403)
    expect(announcementsService.create).not.toHaveBeenCalled()
  })

  it('rejeita dados inválidos ao criar aviso', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/announcements',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'sindico' }]),
      payload: { condominiumId: 1, title: ' ', message: '' },
    })

    expect(response.statusCode).toBe(400)
    expect(announcementsService.create).not.toHaveBeenCalled()
  })

  it.each(['sindico', 'funcionario'] as const)('permite que %s desative aviso do proprio condominio', async (role) => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/announcements/5/deactivate',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role }]),
      payload: { condominiumId: 1 },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: 5, active: false })
    expect(announcementsService.deactivate).toHaveBeenCalledWith(5, 1)
  })

  it('impede moradores de desativarem avisos', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/announcements/5/deactivate',
      headers: authHeaders([{ condominiumId: 1, userId: 1, role: 'morador' }]),
      payload: { condominiumId: 1 },
    })

    expect(response.statusCode).toBe(403)
    expect(announcementsService.deactivate).not.toHaveBeenCalled()
  })
})
