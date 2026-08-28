import { OpenRouterService } from './openRouter/index.ts'

import { AppointmentGraphService } from './appointmentGraph/index.ts'

class Service {

  #OpenRouter?: OpenRouterService 
  #Appointment?: AppointmentGraphService


  get OpenRouter(): OpenRouterService  {
    return this.#OpenRouter ??= new OpenRouterService ()
  }

  get AppointmentGraph(): AppointmentGraphService {
    return this.#Appointment ??= new AppointmentGraphService ()
  }
}

export default Service
