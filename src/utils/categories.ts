import type { TaskCategory, TaskPriority, TaskStatus, KanbanColumn } from '../types'

export const CATEGORIES: Record<TaskCategory, { label: string; emoji: string; color: string; bg: string }> = {
  limpeza:    { label: 'Limpeza',     emoji: '🧹', color: 'text-blue-600',    bg: 'bg-blue-100' },
  cozinha:    { label: 'Cozinha',     emoji: '🍳', color: 'text-orange-600',  bg: 'bg-orange-100' },
  compras:    { label: 'Compras',     emoji: '🛒', color: 'text-green-600',   bg: 'bg-green-100' },
  manutencao: { label: 'Manutenção',  emoji: '🔧', color: 'text-gray-600',    bg: 'bg-gray-100' },
  criancas:   { label: 'Crianças',    emoji: '👶', color: 'text-yellow-600',  bg: 'bg-yellow-100' },
  pets:       { label: 'Pets',        emoji: '🐾', color: 'text-amber-600',   bg: 'bg-amber-100' },
  jardim:     { label: 'Jardim',      emoji: '🌱', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  roupa:      { label: 'Roupa',       emoji: '👕', color: 'text-purple-600',  bg: 'bg-purple-100' },
  financas:   { label: 'Finanças',    emoji: '💰', color: 'text-teal-600',    bg: 'bg-teal-100' },
  saude:      { label: 'Saúde',       emoji: '❤️', color: 'text-red-600',     bg: 'bg-red-100' },
  outros:     { label: 'Outros',      emoji: '📌', color: 'text-pink-600',    bg: 'bg-pink-100' },
}

export const PRIORITIES: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-gray-500',  dot: 'bg-gray-400' },
  media:   { label: 'Média',   color: 'text-blue-600',  dot: 'bg-blue-400' },
  alta:    { label: 'Alta',    color: 'text-orange-600', dot: 'bg-orange-400' },
  urgente: { label: 'Urgente', color: 'text-red-600',   dot: 'bg-red-500' },
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'pendente',     title: 'A Fazer',      emoji: '📋', color: 'border-t-gray-400' },
  { id: 'em_andamento', title: 'Em Andamento', emoji: '⚡', color: 'border-t-brand-500' },
  { id: 'concluido',    title: 'Concluído',    emoji: '✅', color: 'border-t-green-500' },
]

export const STATUS_META: Record<TaskStatus, { label: string; emoji: string; color: string; bg: string }> = {
  pendente:     { label: 'Pendente',      emoji: '📋', color: 'text-gray-600',  bg: 'bg-gray-100' },
  em_andamento: { label: 'Em andamento',  emoji: '⚡', color: 'text-brand-700', bg: 'bg-brand-100' },
  concluido:    { label: 'Concluído',     emoji: '✅', color: 'text-green-700', bg: 'bg-green-100' },
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  limpeza:    '#3b82f6',
  cozinha:    '#f97316',
  compras:    '#22c55e',
  manutencao: '#6b7280',
  criancas:   '#eab308',
  pets:       '#f59e0b',
  jardim:     '#10b981',
  roupa:      '#a855f7',
  financas:   '#14b8a6',
  saude:      '#ef4444',
  outros:     '#ec4899',
}
