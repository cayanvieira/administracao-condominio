import type { GraphState } from "../state.ts";
import Services from "../../services/index.ts";

export function createSchedulerNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const data = state.data;
    let newSchedule
    try {
      const canSchedule = (await Service.Schedule.findScheduleByDate(new Date(data.scheduleDate), data.amenityId)).length === 0;
      if (canSchedule) {
        const userConfirmedSchedule = state.data?.userConfirmedSchedule;

        if (userConfirmedSchedule === true) {
          newSchedule = await Service.Schedule.createSchedule({
            user_id: data.userId,
            amenity_id: data.amenityId,
            reservation_date: new Date(data.scheduleDate)
          });

          return {
            ...state,
            scheduleSuccess: true,
            scenario: 'schedule_success',
            details: {
              userName: data.userName,
              scheduleDate: data.scheduleDate,
              amenityName: data.amenityName,
              newSchedule
            }
          };
        }

        if (userConfirmedSchedule === false) {
          return {
            ...state,
            scenario: 'schedule_disagree',
          };
        }

        return {
          ...state,
          scenario: 'schedule_confirm',
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            amenityName: data.amenityName,
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
            amenityName: data.amenityName,
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
