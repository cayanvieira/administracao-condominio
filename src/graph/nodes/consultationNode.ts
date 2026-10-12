import type { GraphState } from "../state.ts";
import Services from "../../services/index.ts";

const MAX_CONSULTATION_DAYS = 31;

const parseCalendarDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : undefined;
};

const addUtcDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const formatCalendarDate = (date: Date): string => date.toISOString().slice(0, 10);
const normalizeName = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export function createConsultationNode() {
  return async (state: GraphState): Promise<GraphState> => {
    const Service = new Services();
    const data = state.data;
    const question = state.messages.at(-1)?.text ?? "";
    const condominiumId = data?.condominiumIdIntent;

    if (!state.condominiumIds.includes(condominiumId)) {
      return {
        ...state,
        scenario: "consultation",
        details: {
          question,
          consultationError: "No condominium was selected. Ask the resident which condominium they mean.",
        },
      };
    }

    try {
      const [condominium, amenities] = await Promise.all([
        Service.Condominium.findById(condominiumId),
        Service.CondominiumAmenities.findAllAmenitiesByCondominiumIds([condominiumId]),
      ]);
      if (!condominium) {
        return {
          ...state,
          scenario: "consultation",
          details: {
            question,
            consultationError: "The selected condominium was not found.",
          },
        };
      }
      const requestedAmenityName = typeof data.amenityName === "string"
        ? data.amenityName.trim()
        : "";
      const requestedAmenities = amenities.filter((item) => (
        item.id === data.amenityId
        || normalizeName(question).includes(normalizeName(item.name))
        || (requestedAmenityName.length > 0
          && normalizeName(requestedAmenityName).includes(normalizeName(item.name)))
      ));
      const amenity = requestedAmenities[0];
      const unrecognizedAmenityNames = requestedAmenityName
        ? [requestedAmenityName]
            .map((name) => amenities.reduce(
              (remaining, item) => remaining.replace(new RegExp(item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), ""),
              name,
            ))
            .map((name) => name.replace(/\b(e|and|ou|or)\b/gi, "").replace(/[,&]/g, " ").trim())
            .filter(Boolean)
        : [];
      const requestedDateTime = typeof data.consultationDateTime === "string"
        ? new Date(data.consultationDateTime)
        : undefined;
      const validRequestedDateTime = requestedDateTime && !Number.isNaN(requestedDateTime.getTime())
        ? requestedDateTime
        : undefined;
      const consultationStart = parseCalendarDate(data.consultationStartDate)
        ?? (validRequestedDateTime
          ? new Date(`${formatCalendarDate(validRequestedDateTime)}T00:00:00.000Z`)
          : undefined);
      const consultationEnd = parseCalendarDate(data.consultationEndDate)
        ?? consultationStart;
      const hasAvailabilityQuestion = /\b(dispon[ií]vel|vaga|livre|reservad[oa]s?|available|availability|free)\b/i.test(question);
      const availability = {
        requested: hasAvailabilityQuestion,
        requestedDateTime: validRequestedDateTime?.toISOString() ?? null,
        status: "unknown" as "unknown" | "available" | "unavailable" | "partially_available" | "cannot_schedule",
        isAvailable: null as boolean | null,
        requestedStartDate: consultationStart ? formatCalendarDate(consultationStart) : null,
        requestedEndDate: consultationEnd ? formatCalendarDate(consultationEnd) : null,
        bookedDates: [] as string[],
        availableDates: [] as string[],
        needsDateClarification: false,
        rangeTooLarge: false,
      };

      if (hasAvailabilityQuestion) {
        if (!amenity) {
          availability.needsDateClarification = true;
        } else if (!consultationStart || !consultationEnd || consultationEnd < consultationStart) {
          availability.needsDateClarification = true;
        } else if (!amenity.can_schedule) {
          availability.needsDateClarification = false;
          availability.status = "cannot_schedule";
        } else {
          const numberOfDays = Math.floor(
            (consultationEnd.getTime() - consultationStart.getTime()) / 86_400_000,
          ) + 1;

          if (numberOfDays > MAX_CONSULTATION_DAYS) {
            availability.rangeTooLarge = true;
          } else {
            const slotEnd = validRequestedDateTime
              ? new Date(validRequestedDateTime.getTime() + amenity.minimum_hours * 60 * 60 * 1000)
              : undefined;
            const consultationEndExclusive = addUtcDays(consultationEnd, 1);
            const reservations = await Service.Schedule.findActiveSchedulesByAmenityBetweenDates(
              amenity.id,
              validRequestedDateTime
                ? new Date(validRequestedDateTime.getTime() - amenity.minimum_hours * 60 * 60 * 1000)
                : consultationStart,
              slotEnd && slotEnd > consultationEndExclusive ? slotEnd : consultationEndExclusive,
            );
            if (validRequestedDateTime) {
              const requestedSlotEnd = slotEnd;
              const conflictsWithRequestedSlot = reservations.some((reservation) => {
                const reservationStart = new Date(reservation.reservation_date);
                const reservationEnd = new Date(
                  reservationStart.getTime() + amenity.minimum_hours * 60 * 60 * 1000,
                );
                return requestedSlotEnd !== undefined
                  && reservationStart < requestedSlotEnd
                  && reservationEnd > validRequestedDateTime;
              });
              availability.isAvailable = !conflictsWithRequestedSlot;
              availability.status = conflictsWithRequestedSlot ? "unavailable" : "available";
            }
            const bookedDates = new Set(
              reservations
                .map((reservation) => formatCalendarDate(new Date(reservation.reservation_date)))
                .filter((date) => date >= formatCalendarDate(consultationStart)
                  && date <= formatCalendarDate(consultationEnd)),
            );

            availability.bookedDates = [...bookedDates].sort();
            availability.availableDates = Array.from({ length: numberOfDays }, (_, index) =>
              formatCalendarDate(addUtcDays(consultationStart, index)),
            ).filter((date) => !bookedDates.has(date));
            if (!validRequestedDateTime && numberOfDays === 1) {
              availability.isAvailable = !bookedDates.has(formatCalendarDate(consultationStart));
              availability.status = availability.isAvailable ? "available" : "unavailable";
            } else if (!validRequestedDateTime && numberOfDays > 1) {
              availability.status = availability.availableDates.length === numberOfDays
                ? "available"
                : availability.availableDates.length === 0
                  ? "unavailable"
                  : "partially_available";
            }
          }
        }
      }

      return {
        ...state,
        scenario: "consultation",
        details: {
          question,
          condominiumName: condominium?.name ?? null,
          amenities: amenities.map(({ name, can_schedule, minimum_hours }) => ({
            name,
            canSchedule: can_schedule,
            minimumHours: minimum_hours,
          })),
          requestedAmenityName: requestedAmenityName || null,
          requestedAmenities: requestedAmenities.map((item) => ({
            name: item.name,
            canSchedule: item.can_schedule,
            minimumHours: item.minimum_hours,
          })),
          unrecognizedAmenityNames,
          amenity: amenity
            ? {
                name: amenity.name,
                canSchedule: amenity.can_schedule,
                minimumHours: amenity.minimum_hours,
              }
            : null,
          availability,
        },
      };
    } catch (error) {
      console.error("Consultation data lookup failed:", error);
      return {
        ...state,
        scenario: "consultation",
        details: {
          question,
          consultationError: "Unable to retrieve condominium consultation data.",
        },
      };
    }
  };
}
