/**
 * Utility functions for date and time formatting
 */

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

export function formatDate(
  date: string | Date,
  fmt: string = "dd MMM yyyy",
): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, fmt, { locale: ar });
  } catch (e) {
    return date.toString();
  }
}

export function formatTime(date: string | Date, fmt: string = "HH:mm"): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, fmt);
  } catch (e) {
    return date.toString();
  }
}

export function formatDateTime(
  date: string | Date,
  fmt: string = "dd MMM yyyy HH:mm",
): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, fmt, { locale: ar });
  } catch (e) {
    return date.toString();
  }
}

export function formatDistanceNow(date: string | Date): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: ar });
  } catch (e) {
    return date.toString();
  }
}

export function isToday(date: string | Date): boolean {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch (e) {
    return false;
  }
}
