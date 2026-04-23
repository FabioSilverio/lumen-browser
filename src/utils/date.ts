import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function getWeekDays(referenceDate: Date, startOn: 0 | 1 = 0): Date[] {
  const start = startOfWeek(referenceDate, { weekStartsOn: startOn })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatDate(date: Date, fmt = 'yyyy-MM-dd'): string {
  return format(date, fmt)
}

export function formatDisplay(date: Date, fmt: string): string {
  return format(date, fmt, { locale: ptBR })
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromISODate(str: string): Date {
  return parseISO(str)
}

export function isSameDayStr(dateStr: string, date: Date): boolean {
  return isSameDay(parseISO(dateStr), date)
}

export function isTodayStr(dateStr: string): boolean {
  return isToday(parseISO(dateStr))
}

export function nextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function prevWeek(date: Date): Date {
  return subWeeks(date, 1)
}

export function todayDate(): Date {
  return startOfDay(new Date())
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function buildReminderMessage(
  taskTitle: string,
  taskDate: string,
  taskTime: string | undefined,
  assignee: string,
  notes: string,
): string {
  const dateFormatted = formatDisplay(parseISO(taskDate), "EEEE, dd 'de' MMMM")
  const timeStr = taskTime ? ` às ${taskTime}` : ''
  let msg = `📌 *Lembrete de Tarefa Doméstica*\n\n`
  msg += `👤 Para: *${assignee}*\n`
  msg += `📋 Tarefa: *${taskTitle}*\n`
  msg += `📅 Data: ${dateFormatted}${timeStr}\n`
  if (notes) msg += `📝 Notas: ${notes}\n`
  msg += `\n_Enviado via Casa Agenda_ 🏠`
  return msg
}
