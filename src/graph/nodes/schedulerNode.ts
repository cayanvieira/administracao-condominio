import type { GraphState } from "../graph.ts";
import Services from "../../services/index.ts";

export function createSchedulerNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const data = state.data;
    let newSchedule
    try {
      const canSchedule = (await Service.Schedule.findScheduleByDate(new Date(data.scheduleDate), data.serviceId)).length === 0;
      if (canSchedule) {
        newSchedule = await Service.Schedule.createSchedule({
          user_id: data.userId,
          service_id: data.serviceId,
          reservation_date: new Date(data.scheduleDate)
        });

        return {
          ...state,
          scheduleSuccess: true,
          scenario: 'schedule_success',
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            serviceName: data.serviceName,
            newSchedule
          }
        };
      }
      else {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: 'schedule_error',
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            serviceName: data.serviceName,
            reason: "The selected date and time is already booked or is unavailable. Please choose a different slot."
          },
        }
      }
    } catch (error) {
      return {
        ...state,
        error: error instanceof Error ? error.message : "Scheduling failed",
      };
    }
  };
}
