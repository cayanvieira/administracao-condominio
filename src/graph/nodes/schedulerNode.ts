import type { GraphState } from "../state.ts";
import Services from "../../services/index.ts";
import {
  formatLocalDateTime,
  getLocalDateString,
  parseLocalDateTime,
} from "../../services/schedule/index.ts";

export function createSchedulerNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const data = state.data;

    try {
      const timezoneOffsetMinutes = state.timezoneOffsetMinutes ?? 0;
      const reservationDate = parseLocalDateTime(
        data.scheduleDate,
        timezoneOffsetMinutes,
        true,
      );
      if (!data.condominiumIdIntent || !data.amenityId || !reservationDate) {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: 'schedule_error',
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            amenityName: data.amenityName,
            reason: 'A área ou o horário da reserva não foi identificado corretamente.',
          },
        };
      }

      const amenity = await Service.CondominiumAmenities.findAmenityById(
        data.amenityId,
        data.condominiumIdIntent,
      );
      if (!amenity || !amenity.can_schedule) {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: 'schedule_error',
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            amenityName: data.amenityName,
            reason: 'Esta área não aceita reservas.',
          },
        };
      }

      if (!Number.isInteger(amenity.reservation_hours) || amenity.reservation_hours <= 0) {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: 'schedule_error',
          details: {
            userName: data.userName,
            scheduleDate: data.scheduleDate,
            amenityName: data.amenityName,
            reason: 'A duração da reserva desta área está inválida. Peça ajuda à administração.',
          },
        };
      }

      const reservationEnd = new Date(
        reservationDate.getTime() + amenity.reservation_hours * 60 * 60 * 1000,
      );
      const availableSlots = await Service.Schedule.findAvailableSlots(
        amenity,
        getLocalDateString(reservationDate, timezoneOffsetMinutes),
        timezoneOffsetMinutes,
      );
      const selectedSlot = availableSlots.find((slot) => (
        slot.reservation_date.getTime() === reservationDate.getTime()
      ));
      if (!selectedSlot) {
        return {
          ...state,
          scheduleSuccess: false,
          scenario: 'schedule_error',
          details: {
            userName: data.userName,
            scheduleDate: formatLocalDateTime(reservationDate, timezoneOffsetMinutes),
            scheduleEndDate: formatLocalDateTime(reservationEnd, timezoneOffsetMinutes),
            amenityName: data.amenityName,
            reason: 'O horário escolhido não está disponível ou está fora do horário permitido.',
          },
        };
      }

      const userConfirmedSchedule = data.userConfirmedSchedule;
      if (userConfirmedSchedule === false) {
        return {
          ...state,
          scenario: 'schedule_disagree',
        };
      }

      if (userConfirmedSchedule === true) {
        const result = await Service.Schedule.createScheduleIfAvailable({
          user_id: data.userId,
          createdByUserId: state.userId,
          amenity_id: data.amenityId,
          reservation_date: reservationDate,
          timezoneOffsetMinutes,
        });

        if (result.status !== 'saved') {
          return {
            ...state,
            scheduleSuccess: false,
            scenario: 'schedule_error',
            details: {
              userName: data.userName,
              scheduleDate: formatLocalDateTime(reservationDate, timezoneOffsetMinutes),
              scheduleEndDate: formatLocalDateTime(reservationEnd, timezoneOffsetMinutes),
              amenityName: data.amenityName,
              reason: result.status === 'past'
                ? 'O horário escolhido já passou.'
                : result.status === 'outside-availability'
                ? 'O horário escolhido está fora da disponibilidade desta área.'
                : result.status === 'not-found'
                  ? 'Esta área não foi encontrada no condomínio.'
                  : 'O intervalo escolhido acabou de ser reservado. Escolha outro horário.',
            },
          };
        }

        return {
          ...state,
          scheduleSuccess: true,
          scenario: 'schedule_success',
          details: {
            userName: data.userName,
            scheduleDate: formatLocalDateTime(
              new Date(result.schedule.reservation_date),
              timezoneOffsetMinutes,
            ),
            scheduleEndDate: formatLocalDateTime(
              new Date(result.schedule.reservation_end),
              timezoneOffsetMinutes,
            ),
            reservationHours: amenity.reservation_hours,
            amenityName: data.amenityName,
            newSchedule: result.schedule,
          },
        };
      }

      return {
        ...state,
        scenario: 'schedule_confirm',
        details: {
          userName: data.userName,
          scheduleDate: formatLocalDateTime(reservationDate, timezoneOffsetMinutes),
          scheduleEndDate: formatLocalDateTime(reservationEnd, timezoneOffsetMinutes),
          reservationHours: amenity.reservation_hours,
          amenityName: data.amenityName,
        },
      };
    } catch (error) {
      return {
        ...state,
        error: error instanceof Error ? error.message : "Scheduling failed",
      };
    }
  };
}
