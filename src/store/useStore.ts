import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, AppSettings, ViewType, CalendarMode } from '../types'
import { generateId } from '../utils/id'
import { toISODate, todayDate } from '../utils/date'

interface UIState {
  view: ViewType
  calendarMode: CalendarMode
  currentWeekDate: string  // ISO date of any day in the current week
  selectedDate: string     // ISO date
  editingTaskId: string | null
  isTaskModalOpen: boolean
  isSettingsOpen: boolean
  defaultNewTaskDate?: string
  defaultNewTaskTime?: string
}

interface AppState {
  tasks: Task[]
  settings: AppSettings
  ui: UIState

  // Task CRUD
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskStatus: (id: string) => void

  // UI actions
  setView: (view: ViewType) => void
  setCalendarMode: (mode: CalendarMode) => void
  goToNextWeek: () => void
  goToPrevWeek: () => void
  goToToday: () => void
  setSelectedDate: (date: string) => void
  openNewTask: (date?: string, time?: string) => void
  openEditTask: (id: string) => void
  closeTaskModal: () => void
  openSettings: () => void
  closeSettings: () => void
  updateSettings: (s: Partial<AppSettings>) => void
}

const today = toISODate(todayDate())

const DEFAULT_SETTINGS: AppSettings = {
  myName: 'Eu',
  spouseName: 'Esposa',
  spousePhone: '',
  defaultView: 'kanban',
  weekStartsOn: 0,
  theme: 'light',
  reminderDefault: 30,
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      settings: DEFAULT_SETTINGS,
      ui: {
        view: 'kanban',
        calendarMode: 'week',
        currentWeekDate: today,
        selectedDate: today,
        editingTaskId: null,
        isTaskModalOpen: false,
        isSettingsOpen: false,
      },

      addTask: (taskData) => {
        const now = new Date().toISOString()
        const task: Task = {
          ...taskData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
      },

      updateTask: (id, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t,
          ),
        }))
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },

      toggleTaskStatus: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return
        const next =
          task.status === 'pendente'
            ? 'em_andamento'
            : task.status === 'em_andamento'
            ? 'concluido'
            : 'pendente'
        get().updateTask(id, {
          status: next,
          completedAt: next === 'concluido' ? new Date().toISOString() : undefined,
        })
      },

      setView: (view) => set((s) => ({ ui: { ...s.ui, view } })),
      setCalendarMode: (mode) => set((s) => ({ ui: { ...s.ui, calendarMode: mode } })),

      goToNextWeek: () =>
        set((s) => {
          const d = new Date(s.ui.currentWeekDate)
          d.setDate(d.getDate() + 7)
          return { ui: { ...s.ui, currentWeekDate: toISODate(d) } }
        }),

      goToPrevWeek: () =>
        set((s) => {
          const d = new Date(s.ui.currentWeekDate)
          d.setDate(d.getDate() - 7)
          return { ui: { ...s.ui, currentWeekDate: toISODate(d) } }
        }),

      goToToday: () =>
        set((s) => ({
          ui: { ...s.ui, currentWeekDate: today, selectedDate: today },
        })),

      setSelectedDate: (date) =>
        set((s) => ({ ui: { ...s.ui, selectedDate: date, currentWeekDate: date } })),

      openNewTask: (date, time) =>
        set((s) => ({
          ui: {
            ...s.ui,
            isTaskModalOpen: true,
            editingTaskId: null,
            defaultNewTaskDate: date ?? s.ui.selectedDate,
            defaultNewTaskTime: time,
          },
        })),

      openEditTask: (id) =>
        set((s) => ({
          ui: { ...s.ui, isTaskModalOpen: true, editingTaskId: id },
        })),

      closeTaskModal: () =>
        set((s) => ({
          ui: {
            ...s.ui,
            isTaskModalOpen: false,
            editingTaskId: null,
            defaultNewTaskDate: undefined,
            defaultNewTaskTime: undefined,
          },
        })),

      openSettings: () => set((s) => ({ ui: { ...s.ui, isSettingsOpen: true } })),
      closeSettings: () => set((s) => ({ ui: { ...s.ui, isSettingsOpen: false } })),
      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),
    }),
    {
      name: 'casa-agenda-v1',
      partialize: (s) => ({ tasks: s.tasks, settings: s.settings }),
    },
  ),
)
