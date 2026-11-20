import type { GraphState }  from "../state.ts";
import Services from "../../services/index.ts";
import {
  formatLocalDateTime,
  parseLocalDateTime,
} from "../../services/schedule/index.ts";

export function createScheduleMutationNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const data = state.data;

    try {
      const timezoneOffsetMinutes = state.timezoneOffsetMinutes ?? 0;
      const reservationDate = parseLocalDateTime(
        data.scheduleDate,
        timezoneOffsetMinutes,
      );
      if (!reservationDate) {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: `${data.intent}_error`,
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            amenityName: data.amenityName,
            reason: "A data e o horário da reserva não foram identificados corretamente.",
          },
        };
      }

      const authenticatedUser = await Service.User.findUserById(state.userId);
      const userRole = data.condominiumIdIntent
        ? await Service.Condominium.findUserRole(data.condominiumIdIntent, authenticatedUser.id)
        : undefined;
      const isSyndic = userRole?.trim().toLowerCase() === "sindico";
      const targetUserId = isSyndic && data.userId ? data.userId : state.userId;
      const schedule = await Service.Schedule.findScheduleByUserAndDate(
        targetUserId,
        data.amenityId,
        reservationDate,
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

      const updateResult = data.intent === "cancel"
        ? await Service.Schedule.updateScheduleIfAvailable(schedule.id, {
            active: false,
            editByUserId: state.userId,
          })
        : await updateReservation(Service, state, schedule);
      const updatedSchedule = updateResult?.status === "saved"
        ? updateResult.schedule
        : undefined;

      return {
        ...state,
        scheduleSuccess: Boolean(updatedSchedule),
        scenario: `${data.intent}_${updatedSchedule ? "success" : "error"}`,
        details: {
          userName: data.userName,
          scheduleDate: updatedSchedule
            ? formatLocalDateTime(
                new Date(updatedSchedule.reservation_date),
                timezoneOffsetMinutes,
              )
            : data.intent === "modify"
              ? data.newScheduleDate
              : formatLocalDateTime(reservationDate, timezoneOffsetMinutes),
          scheduleEndDate: updatedSchedule
            ? formatLocalDateTime(
                new Date(updatedSchedule.reservation_end),
                timezoneOffsetMinutes,
              )
            : undefined,
          amenityName: data.amenityName,
          updatedSchedule,
          reason: updatedSchedule
            ? undefined
            : updateResult?.status === "past"
              ? "O horário escolhido já passou."
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
  schedule: NonNullable<Awaited<ReturnType<Services["Schedule"]["findScheduleById"]>>>,
) {
  const data = state.data;
  const timezoneOffsetMinutes = state.timezoneOffsetMinutes ?? 0;
  const targetDate = parseLocalDateTime(
    data.newScheduleDate,
    timezoneOffsetMinutes,
    true,
  );
  if (!targetDate) {
    return undefined;
  }

  return Service.Schedule.updateScheduleIfAvailable(schedule.id, {
    reservation_date: targetDate,
    timezoneOffsetMinutes,
    editByUserId: state.userId,
  });
}