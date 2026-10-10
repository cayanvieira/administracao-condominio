export const ROLES = ['morador', 'sindico', 'funcionario', 'admin'] as const

export type Role = (typeof ROLES)[number]

export type CondominiumMembership = {
    userId: number
	condominiumId: number
	role: Role
}

export const ALL_ROLES: readonly Role[] = ROLES
