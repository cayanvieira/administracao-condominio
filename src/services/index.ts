import { OpenRouterService } from './openRouter/index.ts'

import { ScheduleGraphService } from './scheduleGraph/index.ts'
import { ScheduleService } from './schedule/index.ts'

import database from '../database/knex.ts'
import { CondominiumAmenitysService } from './condominiumAmenitys/index.ts'
import { CondominiumService } from './condominium/index.ts'
import { UserService } from './user/index.ts'
import { AccountService } from './account/index.ts'
import { EmailService } from './email/index.ts'

class Service {

  #OpenRouter?: OpenRouterService
  #ScheduleGraph?: ScheduleGraphService
  #Schedule?: ScheduleService
  #User?: UserService
  #Account?: AccountService
  #Email?: EmailService
  #CondominiumAmenitys?: CondominiumAmenitysService
  #Condominium?: CondominiumService

  get OpenRouter(): OpenRouterService {
    return this.#OpenRouter ??= new OpenRouterService()
  }

  get ScheduleGraph(): ScheduleGraphService {
    return this.#ScheduleGraph ??= new ScheduleGraphService()
  }

  get Schedule(): ScheduleService {
    return this.#Schedule ??= new ScheduleService(database)
  }

  get User(): UserService {
    return this.#User ??= new UserService(database)
  }

  get Account(): AccountService {
    return this.#Account ??= new AccountService(database, this.Email)
  }

  get Email(): EmailService {
    return this.#Email ??= new EmailService()
  }

  get CondominiumAmenitys(): CondominiumAmenitysService {
    return this.#CondominiumAmenitys ??= new CondominiumAmenitysService(database)
  }

  get Condominium(): CondominiumService {
    return this.#Condominium ??= new CondominiumService(database)
  }
}

export default Service
