import { OpenRouterService } from './openRouter/index.ts'

import { BookGraphService } from './bookGraph/index.ts'
import { ScheduleService } from './schedule/index.ts'

import database from '../database/knex.ts'
import { CondominiumServices } from './condominiumServices/index.ts'
import { CondominiumService } from './condominium/index.ts'
import { UserService } from './user/index.ts'
import { AccountService } from './account/index.ts'
import { EmailService } from './email/index.ts'

class Service {

  #OpenRouter?: OpenRouterService
  #BookGraph?: BookGraphService
  #Schedule?: ScheduleService
  #User?: UserService
  #Account?: AccountService
  #Email?: EmailService
  #CondominiumServices?: CondominiumServices
  #Condominium?: CondominiumService

  get OpenRouter(): OpenRouterService {
    return this.#OpenRouter ??= new OpenRouterService()
  }

  get BookGraph(): BookGraphService {
    return this.#BookGraph ??= new BookGraphService()
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

  get CondominiumServices(): CondominiumServices {
    return this.#CondominiumServices ??= new CondominiumServices(database)
  }

  get Condominium(): CondominiumService {
    return this.#Condominium ??= new CondominiumService(database)
  }
}

export default Service
