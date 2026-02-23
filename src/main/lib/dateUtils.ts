import { startOfDay, subDays } from 'date-fns'

/**
 * Returns the start of the current Business Day.
 * A business day starts at 05:00 AM and ends at 04:59 AM the next day.
 * If the current time is between 00:00 and 04:59, it belongs to the previous business day.
 *
 * @param date The date to calculate the business day for. Defaults to `new Date()`.
 * @returns Date object representing the start of the business day (00:00:00 of the calculated day).
 * Note: Returning 00:00 of the "business day" makes it easier to query,
 * but actual shifts end at 04:59 next day.
 * For exact shift querying, use `getBusinessDayStartExact` below.
 */

export const getBusinessDayStart = (date: Date = new Date()): Date => {
  let reportDate = startOfDay(date)
  // If before 5 AM, it belongs to the previous "business day"
  if (date.getHours() < 5) {
    reportDate = subDays(reportDate, 1)
  }
  return reportDate
}

/**
 * Returns the exact Date/Time for the start of the business shift (05:00 AM of the calculated business day).
 */
export const getBusinessShiftStart = (date: Date = new Date()): Date => {
  const businessDay = getBusinessDayStart(date)
  businessDay.setHours(5, 0, 0, 0)
  return businessDay
}

/**
 * Returns the exact Date/Time for the end of the business shift (04:59:59.999 AM of the next calendar day).
 */
export const getBusinessShiftEnd = (date: Date = new Date()): Date => {
  const businessDayStart = getBusinessShiftStart(date)
  const shiftEnd = new Date(businessDayStart)
  shiftEnd.setDate(shiftEnd.getDate() + 1)
  shiftEnd.setMilliseconds(shiftEnd.getMilliseconds() - 1)
  return shiftEnd
}
