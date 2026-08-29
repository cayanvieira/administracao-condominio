import { OpenRouterService } from './openRouter/index.ts'

import { BookGraphService } from './bookGraph/index.ts'
import { ScheduleService } from './schedule/index.ts'

import database from '../database/knex.ts'
import { CondominiumServices } from './condominiumServices/index.ts'
import { UserService } from './user/index.ts'

class Service {

  #OpenRouter?: OpenRouterService
  #BookGraph?: BookGraphService
  #Schedule?: ScheduleService
  #User?: UserService
  #CondominiumServices?: CondominiumServices

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

  get CondominiumServices(): CondominiumServices {
    return this.#CondominiumServices ??= new CondominiumServices(database)
  }
}

export default Service
