export type TaskCategory =
  | 'limpeza'
  | 'cozinha'
  | 'compras'
  | 'manutencao'
  | 'criancas'
  | 'pets'
  | 'jardim'
  | 'roupa'
  | 'financas'
  | 'saude'
  | 'outros'

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluido'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  date: string        // ISO date string "YYYY-MM-DD"
  startTime?: string  // "HH:MM"
  endTime?: string    // "HH:MM"
  reminder?: number   // minutes before event
  recurrence: RecurrenceType
  notes: string
  assignee?: string   // name of person responsible
  whatsappPhone?: string // phone to notify via WhatsApp link
  createdAt: string
  updatedAt: string
  completedAt?: string
  color?: string
}

export interface AppSettings {
  myName: string
  spouseName: string
  spousePhone: string   // WhatsApp phone with country code
  defaultView: 'calendar' | 'kanban'
  weekStartsOn: 0 | 1  // 0 = Sunday, 1 = Monday
  theme: 'light' | 'dark'
  reminderDefault: number
}

export type ViewType = 'calendar' | 'kanban'
export type CalendarMode = 'week' | 'day'

export interface KanbanColumn {
  id: TaskStatus
  title: string
  emoji: string
  color: string
}
