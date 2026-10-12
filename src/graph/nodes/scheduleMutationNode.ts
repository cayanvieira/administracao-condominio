import type { GraphState }  from "../state.ts";
import Services from "../../services/index.ts";

export function createScheduleMutationNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const data = state.data;

    try {
      const authenticatedUser = await Service.User.findUserById(state.userId);
      const userRole = data.condominiumIdIntent
        ? await Service.Condominium.findUserRole(data.condominiumIdIntent, authenticatedUser.id)
        : undefined;
      const isSyndic = userRole?.trim().toLowerCase() === "sindico";
      const targetUserId = isSyndic && data.userId ? data.userId : state.userId;
      const schedule = await Service.Schedule.findScheduleByUserAndDate(
        targetUserId,
        data.amenityId,
        new Date(data.scheduleDate),
      );

      if (!schedule) {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: `${data.intent}_error`,
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            amenityName: data.amenityName,
            reason: "No active reservation was found with the provided information.",
          },
        };
      }

      const updatedSchedule = data.intent === "cancel"
        ? await Service.Schedule.updateSchedule(schedule.id, { active: false })
        : await updateReservation(Service, state, schedule.id);

      return {
        ...state,
        scheduleSuccess: Boolean(updatedSchedule),
        scenario: `${data.intent}_${updatedSchedule ? "success" : "error"}`,
        details: {
          userName: data.userName,
          scheduleDate: data.intent === "modify"
            ? data.newScheduleDate
            : data.scheduleDate,
          amenityName: data.amenityName,
          updatedSchedule,
          reason: updatedSchedule
            ? undefined
            : "The reservation could not be updated.",
        },
      };
    } catch (error) {
      return {
        ...state,
        scheduleSuccess: false,
        scenario: `${data.intent}_error`,
        error: error instanceof Error ? error.message : "Reservation update failed",
      };
    }
  };
}

async function updateReservation(
  Service: Services,
  state: GraphState,
  scheduleId: number,
) {
  const data = state.data;
  const targetDate = new Date(data.newScheduleDate);
  const conflictingSchedules = await Service.Schedule.findScheduleByDate(
    targetDate,
    data.amenityId,
  );

  if (conflictingSchedules.some((schedule) => schedule.id !== scheduleId)) {
    return undefined;
  }

  return Service.Schedule.updateSchedule(scheduleId, {
    reservation_date: targetDate,
  });
}