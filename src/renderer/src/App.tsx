import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowRight,
  Baby,
  Bath,
  BedDouble,
  BellRing,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Home,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Moon,
  PawPrint,
  PencilLine,
  Plus,
  ShoppingCart,
  Shirt,
  Sparkles,
  Sun,
  Trash2,
  UtensilsCrossed,
  Wrench
} from "lucide-react";

const STORAGE_KEY = "casa-flow.planner.v1";
const MINUTES_PER_HOUR = 60;
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 22;
const HOURS = Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 }, (_, index) => TIMELINE_START_HOUR + index);

type ViewMode = "resumo" | "agenda" | "quadro";
type ChoreStatus = "capturar" | "planejado" | "fazendo" | "feito";
type Priority = "leve" | "media" | "alta";
type CategoryId =
  | "limpeza"
  | "cozinha"
  | "roupa"
  | "banho"
  | "quarto"
  | "compras"
  | "jardim"
  | "pets"
  | "carro"
  | "manutencao"
  | "familia";

interface ChoreItem {
  id: string;
  title: string;
  category: CategoryId;
  status: ChoreStatus;
  priority: Priority;
  assignee: string;
  day: number;
  startTime: string;
  endTime: string;
  room: string;
  notes: string;
  whatsappReminder: boolean;
  reminderLeadMinutes: number;
  createdAt: number;
}

interface PlannerState {
  householdName: string;
  spouseName: string;
  spousePhone: string;
  theme: "light" | "dark";
  chores: ChoreItem[];
}

interface ChoreFormState {
  title: string;
  category: CategoryId;
  status: ChoreStatus;
  priority: Priority;
  assignee: string;
  day: number;
  startTime: string;
  endTime: string;
  room: string;
  notes: string;
  whatsappReminder: boolean;
  reminderLeadMinutes: number;
}

const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const fullDayNames = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
const statusOrder: ChoreStatus[] = ["capturar", "planejado", "fazendo", "feito"];
const statusLabels: Record<ChoreStatus, string> = {
  capturar: "Para combinar",
  planejado: "Planejado",
  fazendo: "Em andamento",
  feito: "Concluido"
};
const priorityLabels: Record<Priority, string> = {
  leve: "Leve",
  media: "Media",
  alta: "Alta"
};

const categoryCatalog: Record<CategoryId, { label: string; accent: string; icon: typeof Home }> = {
  limpeza: { label: "Limpeza", accent: "#7c5cff", icon: Sparkles },
  cozinha: { label: "Cozinha", accent: "#ff8f3f", icon: UtensilsCrossed },
  roupa: { label: "Roupa", accent: "#4c8dff", icon: Shirt },
  banho: { label: "Banho", accent: "#36c6c0", icon: Bath },
  quarto: { label: "Quarto", accent: "#ff6ba2", icon: BedDouble },
  compras: { label: "Compras", accent: "#00b894", icon: ShoppingCart },
  jardim: { label: "Jardim", accent: "#34c759", icon: Flower2 },
  pets: { label: "Pets", accent: "#8c6cff", icon: PawPrint },
  carro: { label: "Carro", accent: "#56657a", icon: Car },
  manutencao: { label: "Manutencao", accent: "#f4b400", icon: Wrench },
  familia: { label: "Familia", accent: "#ff5f57", icon: Baby }
};

const viewConfig: Array<{ id: ViewMode; label: string; icon: typeof LayoutDashboard }> = [
  { id: "resumo", label: "Resumo", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "quadro", label: "Quadro", icon: KanbanSquare }
];

function uid(): string {
  return crypto.randomUUID();
}

function getTodayWeekIndex(): number {
  const nativeDay = new Date().getDay();
  return nativeDay === 0 ? 6 : nativeDay - 1;
}

function createDefaultForm(): ChoreFormState {
  const todayIndex = getTodayWeekIndex();

  return {
    title: "",
    category: "limpeza",
    status: "capturar",
    priority: "media",
    assignee: "Eu",
    day: todayIndex,
    startTime: "18:00",
    endTime: "18:45",
    room: "Casa",
    notes: "",
    whatsappReminder: true,
    reminderLeadMinutes: 45
  };
}

function defaultPlannerState(): PlannerState {
  const baseCreatedAt = Date.now();

  return {
    householdName: "Casa Flow",
    spouseName: "Amor",
    spousePhone: "",
    theme: "light",
    chores: [
      {
        id: uid(),
        title: "Separar roupas claras e escuras",
        category: "roupa",
        status: "planejado",
        priority: "media",
        assignee: "Eu",
        day: 0,
        startTime: "19:00",
        endTime: "19:40",
        room: "Lavanderia",
        notes: "Deixar sabao e amaciante prontos.",
        whatsappReminder: true,
        reminderLeadMinutes: 60,
        createdAt: baseCreatedAt
      },
      {
        id: uid(),
        title: "Comprar frutas e itens do cafe",
        category: "compras",
        status: "capturar",
        priority: "alta",
        assignee: "Eu",
        day: 1,
        startTime: "08:00",
        endTime: "08:45",
        room: "Mercado",
        notes: "Banana, morango, iogurte, pao e ovos.",
        whatsappReminder: true,
        reminderLeadMinutes: 30,
        createdAt: baseCreatedAt + 1
      },
      {
        id: uid(),
        title: "Faxina rapida na cozinha",
        category: "cozinha",
        status: "fazendo",
        priority: "media",
        assignee: "Eu + Esposa",
        day: 2,
        startTime: "20:00",
        endTime: "21:00",
        room: "Cozinha",
        notes: "Limpar bancada, fogao e recolher reciclaveis.",
        whatsappReminder: false,
        reminderLeadMinutes: 15,
        createdAt: baseCreatedAt + 2
      },
      {
        id: uid(),
        title: "Regar plantas da varanda",
        category: "jardim",
        status: "feito",
        priority: "leve",
        assignee: "Eu",
        day: 4,
        startTime: "07:00",
        endTime: "07:20",
        room: "Varanda",
        notes: "Conferir a suculenta perto da janela.",
        whatsappReminder: false,
        reminderLeadMinutes: 20,
        createdAt: baseCreatedAt + 3
      }
    ]
  };
}

function normalizeChore(raw: Partial<ChoreItem>): ChoreItem {
  const fallback = defaultPlannerState().chores[0]!;
  const category = raw.category && raw.category in categoryCatalog ? raw.category : fallback.category;
  const status = raw.status && raw.status in statusLabels ? raw.status : fallback.status;
  const priority = raw.priority && raw.priority in priorityLabels ? raw.priority : fallback.priority;
  const day = typeof raw.day === "number" && raw.day >= 0 && raw.day <= 6 ? raw.day : fallback.day;
  const startTime = typeof raw.startTime === "string" && /^\d{2}:\d{2}$/.test(raw.startTime) ? raw.startTime : fallback.startTime;
  const endTime = typeof raw.endTime === "string" && /^\d{2}:\d{2}$/.test(raw.endTime) ? raw.endTime : fallback.endTime;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : fallback.title,
    category,
    status,
    priority,
    assignee: typeof raw.assignee === "string" && raw.assignee.trim() ? raw.assignee : fallback.assignee,
    day,
    startTime,
    endTime,
    room: typeof raw.room === "string" && raw.room.trim() ? raw.room : fallback.room,
    notes: typeof raw.notes === "string" ? raw.notes : "",
    whatsappReminder: Boolean(raw.whatsappReminder),
    reminderLeadMinutes: typeof raw.reminderLeadMinutes === "number" ? raw.reminderLeadMinutes : fallback.reminderLeadMinutes,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now()
  };
}

function parseStoredState(): PlannerState {
  if (typeof window === "undefined") {
    return defaultPlannerState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPlannerState();
    }

    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    const fallback = defaultPlannerState();

    return {
      householdName: typeof parsed.householdName === "string" && parsed.householdName.trim() ? parsed.householdName : fallback.householdName,
      spouseName: typeof parsed.spouseName === "string" && parsed.spouseName.trim() ? parsed.spouseName : fallback.spouseName,
      spousePhone: typeof parsed.spousePhone === "string" ? parsed.spousePhone : "",
      theme: parsed.theme === "dark" ? "dark" : "light",
      chores: Array.isArray(parsed.chores) && parsed.chores.length ? parsed.chores.map(normalizeChore) : fallback.chores
    };
  } catch {
    return defaultPlannerState();
  }
}

function timeToMinutes(value: string): number {
  const [hourText = "0", minuteText = "0"] = value.split(":");
  return Number(hourText) * MINUTES_PER_HOUR + Number(minuteText);
}

function ensureEndAfterStart(startTime: string, endTime: string): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes > startMinutes) {
    return endTime;
  }

  const adjusted = startMinutes + 30;
  const nextHour = Math.floor(adjusted / MINUTES_PER_HOUR).toString().padStart(2, "0");
  const nextMinute = String(adjusted % MINUTES_PER_HOUR).padStart(2, "0");
  return `${nextHour}:${nextMinute}`;
}

function startOfWeek(reference: Date): Date {
  const result = new Date(reference);
  const todayIndex = getTodayWeekIndex();
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - todayIndex);
  return result;
}

function addDays(base: Date, amount: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + amount);
  return next;
}

function formatWeekRange(baseDate: Date): string {
  const start = baseDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const end = addDays(baseDate, 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${start} - ${end}`;
}

function formatDateLabel(baseDate: Date, dayIndex: number): string {
  return addDays(baseDate, dayIndex).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function priorityTone(priority: Priority): string {
  if (priority === "alta") {
    return "var(--priority-high)";
  }
  if (priority === "media") {
    return "var(--priority-medium)";
  }
  return "var(--priority-low)";
}

function buildWhatsAppUrl(chore: ChoreItem, spouseName: string, spousePhone: string, weekStartDate: Date): string {
  const eventDate = formatDateLabel(weekStartDate, chore.day);
  const dayLabel = fullDayNames[chore.day] ?? fullDayNames[0];
  const reminderText = [
    `Oi ${spouseName || "amor"}, consegue cadastrar esse afazer para eu fazer?`,
    "",
    `Tarefa: ${chore.title}`,
    `Quando: ${dayLabel}, ${eventDate}, ${chore.startTime} as ${chore.endTime}`,
    `Local: ${chore.room}`,
    `Prioridade: ${priorityLabels[chore.priority]}`,
    chore.notes ? `Anotacoes: ${chore.notes}` : "Anotacoes: sem observacoes extras por enquanto.",
    "",
    "Me avisa no WhatsApp quando estiver certinho."
  ].join("\n");

  const digits = spousePhone.replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(reminderText)}`;
}

function buildShareMessage(chore: ChoreItem, spouseName: string, weekStartDate: Date): string {
  return [
    `Lembrete para ${spouseName || "esposa"}`,
    `${chore.title}`,
    `${fullDayNames[chore.day]} ${formatDateLabel(weekStartDate, chore.day)} - ${chore.startTime} as ${chore.endTime}`,
    `Local: ${chore.room}`,
    chore.notes ? `Anotacoes: ${chore.notes}` : ""
  ].filter(Boolean).join("\n");
}

function sortChores(choreList: ChoreItem[]): ChoreItem[] {
  return [...choreList].sort((left, right) => {
    const dayDelta = left.day - right.day;
    if (dayDelta !== 0) {
      return dayDelta;
    }

    const timeDelta = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.createdAt - right.createdAt;
  });
}

function toFormState(chore: ChoreItem): ChoreFormState {
  return {
    title: chore.title,
    category: chore.category,
    status: chore.status,
    priority: chore.priority,
    assignee: chore.assignee,
    day: chore.day,
    startTime: chore.startTime,
    endTime: chore.endTime,
    room: chore.room,
    notes: chore.notes,
    whatsappReminder: chore.whatsappReminder,
    reminderLeadMinutes: chore.reminderLeadMinutes
  };
}

export function App() {
  const [planner, setPlanner] = useState<PlannerState>(() => parseStoredState());
  const [activeView, setActiveView] = useState<ViewMode>("resumo");
  const [weekOffset, setWeekOffset] = useState(0);
  const [composerOpen, setComposerOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ChoreFormState>(() => createDefaultForm());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", planner.theme);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
  }, [planner]);

  const weekStartDate = useMemo(() => {
    const base = startOfWeek(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const chores = useMemo(() => sortChores(planner.chores), [planner.chores]);
  const choresByStatus = useMemo(() => {
    return statusOrder.reduce<Record<ChoreStatus, ChoreItem[]>>((accumulator, status) => {
      accumulator[status] = chores.filter((chore) => chore.status === status);
      return accumulator;
    }, {
      capturar: [],
      planejado: [],
      fazendo: [],
      feito: []
    });
  }, [chores]);

  const upcomingChores = useMemo(() => {
    const todayIndex = getTodayWeekIndex();
    return [...chores].sort((left, right) => {
      const leftDelta = (left.day - todayIndex + 7) % 7;
      const rightDelta = (right.day - todayIndex + 7) % 7;
      if (leftDelta !== rightDelta) {
        return leftDelta - rightDelta;
      }
      return timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
    }).slice(0, 5);
  }, [chores]);

  const completionRate = useMemo(() => {
    if (!chores.length) {
      return 0;
    }
    return Math.round((choresByStatus.feito.length / chores.length) * 100);
  }, [chores.length, choresByStatus.feito.length]);

  const todaysChores = useMemo(() => chores.filter((chore) => chore.day === getTodayWeekIndex()), [chores]);
  const reminderCount = useMemo(() => chores.filter((chore) => chore.whatsappReminder).length, [chores]);

  function patchPlanner(update: Partial<PlannerState>): void {
    setPlanner((current) => ({ ...current, ...update }));
  }

  function resetComposer(): void {
    setEditingId(null);
    setFormState(createDefaultForm());
  }

  function openComposerForNew(): void {
    resetComposer();
    setComposerOpen(true);
  }

  function openComposerForEdit(chore: ChoreItem): void {
    setEditingId(chore.id);
    setFormState(toFormState(chore));
    setComposerOpen(true);
  }

  function saveChore(): void {
    const title = formState.title.trim();
    if (!title) {
      return;
    }

    const normalized: ChoreItem = {
      id: editingId ?? uid(),
      title,
      category: formState.category,
      status: formState.status,
      priority: formState.priority,
      assignee: formState.assignee.trim() || "Eu",
      day: formState.day,
      startTime: formState.startTime,
      endTime: ensureEndAfterStart(formState.startTime, formState.endTime),
      room: formState.room.trim() || "Casa",
      notes: formState.notes.trim(),
      whatsappReminder: formState.whatsappReminder,
      reminderLeadMinutes: formState.reminderLeadMinutes,
      createdAt: editingId
        ? planner.chores.find((entry) => entry.id === editingId)?.createdAt ?? Date.now()
        : Date.now()
    };

    if (editingId) {
      patchPlanner({
        chores: planner.chores.map((item) => item.id === editingId ? normalized : item)
      });
    } else {
      patchPlanner({
        chores: [...planner.chores, normalized]
      });
    }

    resetComposer();
  }

  function deleteChore(choreId: string): void {
    patchPlanner({
      chores: planner.chores.filter((item) => item.id !== choreId)
    });
    if (editingId === choreId) {
      resetComposer();
    }
  }

  function updateChoreStatus(choreId: string, status: ChoreStatus): void {
    patchPlanner({
      chores: planner.chores.map((item) => item.id === choreId ? { ...item, status } : item)
    });
  }

  async function shareReminder(chore: ChoreItem): Promise<void> {
    const shareText = buildShareMessage(chore, planner.spouseName, weekStartDate);
    const url = buildWhatsAppUrl(chore, planner.spouseName, planner.spousePhone, weekStartDate);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lembrete: ${chore.title}`,
          text: shareText,
          url
        });
        return;
      } catch {
        // Fall back to WhatsApp URL.
      }
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="planner-app">
      <header className="planner-header">
        <div className="brand-block">
          <div className="brand-mark">
            <Home size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="eyebrow">planner mobile-first para casa</p>
            <h1>{planner.householdName}</h1>
          </div>
        </div>

        <div className="header-actions">
          <button className="ghost-button" onClick={() => setComposerOpen((current) => !current)}>
            {composerOpen ? <PencilLine size={16} /> : <Plus size={16} />}
            {composerOpen ? "Esconder painel" : "Nova tarefa"}
          </button>
          <button
            className="icon-toggle"
            onClick={() => patchPlanner({ theme: planner.theme === "light" ? "dark" : "light" })}
            aria-label="Alternar tema"
          >
            {planner.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">
            <BellRing size={14} />
            lembretes prontos para WhatsApp
          </span>
          <h2>Calendario semanal, quadro tipo Trello e rotina domestica em uma so tela.</h2>
          <p>
            Cadastre afazeres com icones bonitinhos, horario, anotacoes, responsavel e um aviso pronto para mandar no WhatsApp para a sua esposa.
          </p>
        </div>

        <div className="hero-metrics">
          <MetricCard label="tarefas ativas" value={String(chores.length)} detail={`${choresByStatus.fazendo.length} em andamento`} />
          <MetricCard label="lembretes" value={String(reminderCount)} detail="com atalho para WhatsApp" />
          <MetricCard label="conclusao" value={`${completionRate}%`} detail={`${choresByStatus.feito.length} tarefas concluidas`} />
        </div>
      </section>

      <nav className="view-switcher" aria-label="Navegacao principal">
        {viewConfig.map((view) => {
          const Icon = view.icon;
          const active = activeView === view.id;
          return (
            <button
              key={view.id}
              className={active ? "view-pill active" : "view-pill"}
              onClick={() => setActiveView(view.id)}
            >
              <Icon size={16} />
              {view.label}
            </button>
          );
        })}
      </nav>

      <div className="planner-layout">
        <main className="planner-main">
          {activeView === "resumo" && (
            <section className="summary-grid">
              <article className="panel-card spotlight-card">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">proxima semana util</p>
                    <h3>Cronograma em destaque</h3>
                  </div>
                  <span className="range-pill">{formatWeekRange(weekStartDate)}</span>
                </div>

                <div className="spotlight-list">
                  {upcomingChores.map((chore) => (
                    <ReminderRow
                      key={chore.id}
                      chore={chore}
                      weekStartDate={weekStartDate}
                      spouseName={planner.spouseName}
                      spousePhone={planner.spousePhone}
                      onEdit={() => openComposerForEdit(chore)}
                      onShare={() => void shareReminder(chore)}
                    />
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">hoje</p>
                    <h3>Tarefas do dia</h3>
                  </div>
                  <ListTodo size={18} />
                </div>
                <div className="list-stack compact-stack">
                  {todaysChores.length ? todaysChores.map((chore) => (
                    <CompactChoreItem key={chore.id} chore={chore} onEdit={() => openComposerForEdit(chore)} />
                  )) : (
                    <EmptyState text="Nada programado para hoje ainda. Adicione uma tarefa para preencher sua rotina." />
                  )}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">distribuicao</p>
                    <h3>Board rapido</h3>
                  </div>
                  <KanbanSquare size={18} />
                </div>
                <div className="status-summary-grid">
                  {statusOrder.map((status) => (
                    <div key={status} className="status-summary-card">
                      <strong>{statusLabels[status]}</strong>
                      <span>{choresByStatus[status].length} itens</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card wide-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">icones por afazer</p>
                    <h3>Categorias domesticas</h3>
                  </div>
                  <Sparkles size={18} />
                </div>
                <div className="category-grid">
                  {Object.entries(categoryCatalog).map(([id, config]) => {
                    const Icon = config.icon;
                    const total = chores.filter((chore) => chore.category === id).length;
                    return (
                      <div key={id} className="category-card" style={{ borderColor: `${config.accent}33` }}>
                        <span className="category-icon" style={{ backgroundColor: `${config.accent}1a`, color: config.accent }}>
                          <Icon size={18} />
                        </span>
                        <div>
                          <strong>{config.label}</strong>
                          <small>{total} tarefa(s)</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          )}

          {activeView === "agenda" && (
            <section className="panel-card agenda-card">
              <div className="panel-head agenda-head">
                <div>
                  <p className="eyebrow">agenda com dias e horario</p>
                  <h3>Semana planejada</h3>
                </div>
                <div className="week-controls">
                  <button className="icon-toggle" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semana anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="range-pill">{formatWeekRange(weekStartDate)}</span>
                  <button className="icon-toggle" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Proxima semana">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="week-strip">
                {dayNames.map((dayName, index) => (
                  <div key={dayName} className="day-pill">
                    <strong>{dayName}</strong>
                    <span>{formatDateLabel(weekStartDate, index)}</span>
                  </div>
                ))}
              </div>

              <div className="timeline-shell">
                <div className="timeline-grid">
                  <div className="time-column">
                    {HOURS.map((hour) => (
                      <div key={hour} className="hour-label">{String(hour).padStart(2, "0")}:00</div>
                    ))}
                  </div>

                  {dayNames.map((dayName, dayIndex) => (
                    <div key={dayName} className="day-column">
                      <div className="day-column-header">{dayName}</div>
                      <div className="day-track">
                        {HOURS.map((hour) => (
                          <div key={hour} className="hour-slot" />
                        ))}
                        {chores
                          .filter((chore) => chore.day === dayIndex)
                          .map((chore) => {
                            const category = categoryCatalog[chore.category];
                            const Icon = category.icon;
                            const totalWindow = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * MINUTES_PER_HOUR;
                            const startOffset = timeToMinutes(chore.startTime) - TIMELINE_START_HOUR * MINUTES_PER_HOUR;
                            const duration = Math.max(30, timeToMinutes(chore.endTime) - timeToMinutes(chore.startTime));
                            const top = (startOffset / totalWindow) * 100;
                            const height = (duration / totalWindow) * 100;

                            return (
                              <button
                                key={chore.id}
                                className="timeline-event"
                                style={{
                                  top: `${Math.max(0, top)}%`,
                                  height: `${Math.max(8, height)}%`,
                                  borderColor: `${category.accent}66`,
                                  background: `${category.accent}1a`
                                }}
                                onClick={() => openComposerForEdit(chore)}
                              >
                                <span className="timeline-event-icon" style={{ color: category.accent }}>
                                  <Icon size={14} />
                                </span>
                                <span className="timeline-event-content">
                                  <strong>{chore.title}</strong>
                                  <small>{chore.startTime} - {chore.endTime}</small>
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeView === "quadro" && (
            <section className="board-grid">
              {statusOrder.map((status) => (
                <div
                  key={status}
                  className="board-column"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingId) {
                      updateChoreStatus(draggingId, status);
                      setDraggingId(null);
                    }
                  }}
                >
                  <div className="board-column-head">
                    <div>
                      <p className="eyebrow">board</p>
                      <h3>{statusLabels[status]}</h3>
                    </div>
                    <span className="count-pill">{choresByStatus[status].length}</span>
                  </div>

                  <div className="board-column-body">
                    {choresByStatus[status].length ? choresByStatus[status].map((chore) => (
                      <article
                        key={chore.id}
                        className="chore-card"
                        draggable
                        onDragStart={() => setDraggingId(chore.id)}
                        onDragEnd={() => setDraggingId(null)}
                      >
                        <ChoreCardHeader chore={chore} />
                        <p className="card-note">{chore.notes || "Sem anotacoes extras."}</p>
                        <div className="card-meta-grid">
                          <span><AlarmClock size={14} /> {dayNames[chore.day]}, {chore.startTime}</span>
                          <span><CheckCircle2 size={14} /> {chore.assignee}</span>
                          <span><Home size={14} /> {chore.room}</span>
                          <span><BellRing size={14} /> {chore.whatsappReminder ? `WhatsApp ${chore.reminderLeadMinutes} min antes` : "Sem WhatsApp"}</span>
                        </div>
                        <div className="card-actions">
                          <button className="ghost-button small" onClick={() => openComposerForEdit(chore)}>
                            <PencilLine size={14} />
                            Editar
                          </button>
                          <button className="ghost-button small" onClick={() => void shareReminder(chore)}>
                            <MessageCircle size={14} />
                            WhatsApp
                          </button>
                          {status !== "feito" && (
                            <button className="ghost-button small" onClick={() => updateChoreStatus(chore.id, statusOrder[statusOrder.indexOf(status) + 1] ?? status)}>
                              <ArrowRight size={14} />
                              Avancar
                            </button>
                          )}
                        </div>
                      </article>
                    )) : (
                      <EmptyState text="Solte tarefas aqui ou crie uma nova no painel lateral." compact />
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>

        <aside className={composerOpen ? "planner-sidebar open" : "planner-sidebar"}>
          <section className="panel-card settings-card">
            <div className="panel-head">
              <div>
                <p className="eyebrow">contato para avisos</p>
                <h3>WhatsApp da esposa</h3>
              </div>
              <MessageCircle size={18} />
            </div>

            <div className="form-grid compact-form">
              <label>
                Nome carinhoso
                <input
                  value={planner.spouseName}
                  onChange={(event) => patchPlanner({ spouseName: event.target.value })}
                  placeholder="Ex.: Amor"
                />
              </label>
              <label>
                Numero de WhatsApp
                <input
                  value={planner.spousePhone}
                  onChange={(event) => patchPlanner({ spousePhone: event.target.value })}
                  placeholder="55 11 99999-9999"
                  inputMode="tel"
                />
              </label>
              <label>
                Nome da casa
                <input
                  value={planner.householdName}
                  onChange={(event) => patchPlanner({ householdName: event.target.value || "Casa Flow" })}
                  placeholder="Casa Flow"
                />
              </label>
            </div>
            <p className="helper-copy">
              O app abre um lembrete pronto no WhatsApp. Para envio automatico de verdade no futuro, o caminho natural e integrar com WhatsApp Business API ou Twilio.
            </p>
          </section>

          <section className="panel-card composer-card">
            <div className="panel-head">
              <div>
                <p className="eyebrow">cadastro flexivel</p>
                <h3>{editingId ? "Editar afazer" : "Novo afazer"}</h3>
              </div>
              <button className="icon-toggle" onClick={openComposerForNew} aria-label="Limpar formulario">
                <Plus size={16} />
              </button>
            </div>

            <div className="form-grid">
              <label className="span-2">
                Titulo
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ex.: Passar pano na sala"
                />
              </label>

              <label>
                Categoria
                <select
                  value={formState.category}
                  onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value as CategoryId }))}
                >
                  {Object.entries(categoryCatalog).map(([id, config]) => (
                    <option key={id} value={id}>{config.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as ChoreStatus }))}
                >
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </select>
              </label>

              <label>
                Prioridade
                <select
                  value={formState.priority}
                  onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value as Priority }))}
                >
                  {Object.keys(priorityLabels).map((priority) => (
                    <option key={priority} value={priority}>{priorityLabels[priority as Priority]}</option>
                  ))}
                </select>
              </label>

              <label>
                Responsavel
                <input
                  value={formState.assignee}
                  onChange={(event) => setFormState((current) => ({ ...current, assignee: event.target.value }))}
                  placeholder="Eu, esposa, ambos..."
                />
              </label>

              <label>
                Dia da semana
                <select
                  value={formState.day}
                  onChange={(event) => setFormState((current) => ({ ...current, day: Number(event.target.value) }))}
                >
                  {dayNames.map((dayName, index) => (
                    <option key={dayName} value={index}>{fullDayNames[index]}</option>
                  ))}
                </select>
              </label>

              <label>
                Inicio
                <input
                  type="time"
                  value={formState.startTime}
                  onChange={(event) => setFormState((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>

              <label>
                Fim
                <input
                  type="time"
                  value={formState.endTime}
                  onChange={(event) => setFormState((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>

              <label className="span-2">
                Comodo ou local
                <input
                  value={formState.room}
                  onChange={(event) => setFormState((current) => ({ ...current, room: event.target.value }))}
                  placeholder="Sala, cozinha, mercado..."
                />
              </label>

              <label className="span-2">
                Anotacoes
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Detalhes, lista de itens, passos ou preferencias."
                />
              </label>

              <label className="toggle-row span-2">
                <span>
                  <strong>Lembrete no WhatsApp</strong>
                  <small>Gera um aviso pronto para enviar para sua esposa.</small>
                </span>
                <input
                  type="checkbox"
                  checked={formState.whatsappReminder}
                  onChange={(event) => setFormState((current) => ({ ...current, whatsappReminder: event.target.checked }))}
                />
              </label>

              <label>
                Avisar com antecedencia
                <select
                  value={formState.reminderLeadMinutes}
                  onChange={(event) => setFormState((current) => ({ ...current, reminderLeadMinutes: Number(event.target.value) }))}
                >
                  {[15, 30, 45, 60, 90, 120].map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} minutos</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="composer-actions">
              <button className="primary-button" onClick={saveChore}>
                <Plus size={16} />
                {editingId ? "Salvar afazer" : "Criar afazer"}
              </button>
              {editingId && (
                <button className="danger-button" onClick={() => deleteChore(editingId)}>
                  <Trash2 size={16} />
                  Excluir
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-card">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ReminderRow({
  chore,
  weekStartDate,
  spouseName,
  spousePhone,
  onEdit,
  onShare
}: {
  chore: ChoreItem;
  weekStartDate: Date;
  spouseName: string;
  spousePhone: string;
  onEdit: () => void;
  onShare: () => void;
}) {
  const category = categoryCatalog[chore.category];
  const Icon = category.icon;
  const whatsAppUrl = buildWhatsAppUrl(chore, spouseName, spousePhone, weekStartDate);

  return (
    <div className="reminder-row">
      <div className="reminder-icon" style={{ backgroundColor: `${category.accent}20`, color: category.accent }}>
        <Icon size={18} />
      </div>
      <div className="reminder-body">
        <div className="reminder-topline">
          <strong>{chore.title}</strong>
          <span className="priority-dot" style={{ backgroundColor: priorityTone(chore.priority) }} />
        </div>
        <p>
          {fullDayNames[chore.day]} · {formatDateLabel(weekStartDate, chore.day)} · {chore.startTime} - {chore.endTime}
        </p>
        <div className="reminder-tags">
          <span>{chore.room}</span>
          <span>{chore.assignee}</span>
          <span>{statusLabels[chore.status]}</span>
        </div>
      </div>
      <div className="reminder-actions">
        <button className="ghost-button small" onClick={onEdit}>
          <PencilLine size={14} />
          Editar
        </button>
        <button className="ghost-button small" onClick={onShare}>
          <MessageCircle size={14} />
          Abrir WhatsApp
        </button>
        <a className="inline-link" href={whatsAppUrl} target="_blank" rel="noreferrer">Link direto</a>
      </div>
    </div>
  );
}

function CompactChoreItem({ chore, onEdit }: { chore: ChoreItem; onEdit: () => void }) {
  const category = categoryCatalog[chore.category];
  const Icon = category.icon;

  return (
    <button className="compact-item" onClick={onEdit}>
      <span className="compact-icon" style={{ backgroundColor: `${category.accent}20`, color: category.accent }}>
        <Icon size={16} />
      </span>
      <span className="compact-text">
        <strong>{chore.title}</strong>
        <small>{chore.startTime} - {chore.endTime} · {chore.room}</small>
      </span>
      <span className="compact-status">{statusLabels[chore.status]}</span>
    </button>
  );
}

function ChoreCardHeader({ chore }: { chore: ChoreItem }) {
  const category = categoryCatalog[chore.category];
  const Icon = category.icon;

  return (
    <div className="card-header">
      <div className="card-title-group">
        <span className="card-icon" style={{ backgroundColor: `${category.accent}18`, color: category.accent }}>
          <Icon size={16} />
        </span>
        <div>
          <strong>{chore.title}</strong>
          <small>{category.label}</small>
        </div>
      </div>
      <span className="status-chip">{priorityLabels[chore.priority]}</span>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={compact ? "empty-state compact" : "empty-state"}>{text}</div>;
}
