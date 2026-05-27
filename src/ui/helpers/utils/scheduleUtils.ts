import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { PrefixType } from '~/enums/Prefix.Type.enum';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface ScheduledDayItems {
  todos: TodoFlow[];
  tasks: Task[];
}

export interface ScheduledRangeItem<T> {
  item: T;
  dateKeys: string[];
  slots: ScheduleSlot[];
}

export interface ScheduledRangeItems {
  todos: ScheduledRangeItem<TodoFlow>[];
  tasks: ScheduledRangeItem<Task>[];
}

export type ScheduledGroups = Record<string, ScheduledDayItems> & {
  unscheduled: ScheduledDayItems;
};

export type DueNotificationItem =
  | { type: 'todo'; id: string; title: string; item: TodoFlow }
  | { type: 'task'; id: string; title: string; item: Task };

export type DueSlotNotificationItem = DueNotificationItem & {
  slot: ScheduleSlot;
  notificationKey: string;
};

export type ManageItemFilter = 'all' | 'todos' | 'tasks' | 'scheduled' | 'unscheduled' | 'in-progress' | 'completed';

export interface TodoFlowAnalytics {
  totalTodoFlows: number;
  scheduledDays: number;
  todayTodoFlows: number;
  completedTasks: number;
  totalTasks: number;
  inProgressTodoFlows: number;
  plannedSeconds: number;
  actualSeconds: number;
}

export type AiAnalysisMode = 'today_plan' | 'workload_review' | 'estimate_review';
export type AiOutputLanguage = 'vi' | 'en' | 'ja';
export type AiHistoryKind = 'analysis' | 'draft';
export type AiAnalysisSituation =
  | 'today_schedule'
  | 'empty_today_with_candidates'
  | 'standalone_tasks_only'
  | 'history_only'
  | 'no_data';

export interface AiTodoFlowAnalysis {
  summary: string;
  metrics: {
    plannedSeconds: number;
    actualSeconds: number;
    completionRate: number;
    overloadSeconds: number;
    riskyItemCount: number;
  };
  risks: Array<{
    severity: 'low' | 'medium' | 'high';
    title: string;
    reason: string;
    itemIds: string[];
  }>;
  priorities: Array<{
    title: string;
    reason: string;
    estimatedSeconds?: number;
    itemIds: string[];
  }>;
  scheduleSuggestions: Array<{
    action: 'move' | 'split' | 'shorten' | 'add_break' | 'clarify' | 'create_todoflow';
    title: string;
    reason: string;
    itemIds: string[];
  }>;
  estimationInsights: string[];
  actionPlan: string[];
}

export interface AiTodoFlowDraftTask {
  title: string;
  estimatedMinutes: number;
  subtasks: Array<{
    title: string;
    completed: boolean;
  }>;
}

export interface AiTodoFlowDraft {
  title: string;
  suggestedDurationMinutes: number;
  tasks: AiTodoFlowDraftTask[];
}

export interface AiAnalysisHistoryEntry {
  id: string;
  kind?: AiHistoryKind;
  createdAt: string;
  provider: string;
  model: string;
  mode?: AiAnalysisMode;
  outputLanguage: AiOutputLanguage;
  userRequest: string;
  summary: string;
  rawResponse: string;
  result: AiTodoFlowAnalysis | AiTodoFlowDraft;
}

export interface AiAnalysisContextOptions {
  todayKey?: string;
  mode?: AiAnalysisMode;
  activeLimit?: number;
  overdueLimit?: number;
  upcomingLimit?: number;
  unscheduledLimit?: number;
  archiveLimit?: number;
  standaloneTaskLimit?: number;
  taskLimit?: number;
}

export interface AiCompactTask {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedSeconds: number;
  actualSeconds: number;
  isBreak: boolean;
}

export interface AiCompactTodoFlow {
  id: string;
  note: string;
  status: TodoStatus;
  dateKeys: string[];
  scheduleSlots: ScheduleSlot[];
  estimatedSeconds: number;
  actualSeconds: number;
  completedTasks: number;
  totalTasks: number;
  tasks: AiCompactTask[];
  omittedTaskCount: number;
}

export interface AiTodoFlowAnalysisContext {
  todayKey: string;
  mode: AiAnalysisMode;
  situation: AiAnalysisSituation;
  aggregateMetrics: TodoFlowAnalytics & {
    completionRate: number;
    zeroEstimateTaskCount: number;
    emptyTitleTaskCount: number;
  };
  todayTodoFlows: AiCompactTodoFlow[];
  activeTodoFlows: AiCompactTodoFlow[];
  overdueTodoFlows: AiCompactTodoFlow[];
  upcomingTodoFlows: AiCompactTodoFlow[];
  unscheduledTodoFlows: AiCompactTodoFlow[];
  standaloneTasks: AiCompactTask[];
  recentArchivedTodoFlows: ArchivedTodoSummary[];
  omittedCounts: {
    activeTodoFlows: number;
    overdueTodoFlows: number;
    upcomingTodoFlows: number;
    unscheduledTodoFlows: number;
    standaloneTasks: number;
    recentArchivedTodoFlows: number;
  };
}

export function createAiAnalysisHistoryEntry(input: {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  mode: AiAnalysisMode;
  outputLanguage: AiOutputLanguage;
  userRequest: string;
  rawResponse: string;
  result: AiTodoFlowAnalysis;
}): AiAnalysisHistoryEntry {
  return {
    id: input.id,
    kind: 'analysis',
    createdAt: input.createdAt,
    provider: input.provider,
    model: input.model,
    mode: input.mode,
    outputLanguage: input.outputLanguage,
    userRequest: input.userRequest.trim(),
    summary: input.result.summary,
    rawResponse: input.rawResponse,
    result: input.result,
  };
}

export function createAiTodoFlowDraftHistoryEntry(input: {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  outputLanguage: AiOutputLanguage;
  userRequest: string;
  rawResponse: string;
  result: AiTodoFlowDraft;
}): AiAnalysisHistoryEntry {
  return {
    id: input.id,
    kind: 'draft',
    createdAt: input.createdAt,
    provider: input.provider,
    model: input.model,
    outputLanguage: input.outputLanguage,
    userRequest: input.userRequest.trim(),
    summary: input.result.title,
    rawResponse: input.rawResponse,
    result: input.result,
  };
}

function formatSecondsForPrompt(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function countRiskyTasks(todos: TodoFlow[], tasks: Task[]): { zeroEstimateTaskCount: number; emptyTitleTaskCount: number } {
  const todoTasks = todos.flatMap((todo) => todo.taskIds.map((taskId) => todo.tasks[taskId]).filter(Boolean));
  const allTasks = [...todoTasks, ...tasks].filter((task) => !task.isTaskBreak);

  return allTasks.reduce(
    (counts, task) => {
      counts.zeroEstimateTaskCount += (task.estimatedTime || 0) <= 0 ? 1 : 0;
      counts.emptyTitleTaskCount += task.title.trim() ? 0 : 1;
      return counts;
    },
    { zeroEstimateTaskCount: 0, emptyTitleTaskCount: 0 }
  );
}

function compactTask(task: Task): AiCompactTask {
  return {
    id: task.id,
    title: task.title || '',
    status: task.status,
    estimatedSeconds: Math.max(0, Math.floor(task.estimatedTime || 0)),
    actualSeconds: Math.max(0, Math.floor(task.actualTime || 0)),
    isBreak: Boolean(task.isTaskBreak),
  };
}

export function getTodoEstimatedSeconds(todo: TodoFlow): number {
  return Math.max(0, Math.floor(todo.estimatedTimeTodo || 0), getTodoTaskEstimatedSeconds(todo));
}

function compactTodoFlow(todo: TodoFlow, taskLimit: number): AiCompactTodoFlow {
  const taskItems = todo.taskIds.map((taskId) => todo.tasks[taskId]).filter(Boolean);
  const compactedTasks = taskItems.slice(0, taskLimit).map(compactTask);

  return {
    id: todo.id,
    note: todo.note || '',
    status: todo.status,
    dateKeys: getTodoScheduleDateKeys(todo),
    scheduleSlots: todo.scheduleSlots || [],
    estimatedSeconds: getTodoEstimatedSeconds(todo),
    actualSeconds: Math.max(0, Math.floor(todo.actualTimeTodo || 0)),
    completedTasks: Math.max(0, Math.floor(todo.taskCompleted || 0)),
    totalTasks: Math.max(0, Math.floor(todo.taskTotal || taskItems.filter((task) => !task.isTaskBreak).length)),
    tasks: compactedTasks,
    omittedTaskCount: Math.max(0, taskItems.length - compactedTasks.length),
  };
}

function takeWithOmitted<T>(items: T[], limit: number): { items: T[]; omitted: number } {
  const safeLimit = Math.max(0, Math.floor(limit));
  return {
    items: items.slice(0, safeLimit),
    omitted: Math.max(0, items.length - safeLimit),
  };
}

function determineAiAnalysisSituation(
  todayTodoFlows: TodoFlow[],
  activeTodoFlows: TodoFlow[],
  overdueTodoFlows: TodoFlow[],
  upcomingTodoFlows: TodoFlow[],
  unscheduledTodoFlows: TodoFlow[],
  standaloneTasks: Task[],
  archivedTodos: ArchivedTodoSummary[]
): AiAnalysisSituation {
  if (todayTodoFlows.length > 0) return 'today_schedule';
  if (activeTodoFlows.length > 0 || overdueTodoFlows.length > 0 || upcomingTodoFlows.length > 0 || unscheduledTodoFlows.length > 0) {
    return 'empty_today_with_candidates';
  }
  if (standaloneTasks.length > 0) return 'standalone_tasks_only';
  if (archivedTodos.length > 0) return 'history_only';
  return 'no_data';
}

export function hasAiTodoFlowContextData(
  todos: TodoFlow[],
  tasks: Task[],
  archivedTodos: ArchivedTodoSummary[] = []
): boolean {
  return todos.length > 0 || tasks.length > 0 || archivedTodos.length > 0;
}

export function buildAiTodoFlowAnalysisContext(
  todos: TodoFlow[],
  tasks: Task[],
  archivedTodos: ArchivedTodoSummary[] = [],
  options: AiAnalysisContextOptions = {}
): AiTodoFlowAnalysisContext {
  const todayKey = options.todayKey || toDateKey(new Date());
  const mode = options.mode || 'today_plan';
  const taskLimit = options.taskLimit ?? 8;
  const next7DayKey = addDaysToDateKey(todayKey, 7);
  const stats = getTodoFlowAnalytics(todos, tasks, todayKey);
  const riskyTaskCounts = countRiskyTasks(todos, tasks);
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const todayTodoFlows = todos.filter((todo) => getTodoScheduleDateKeys(todo).includes(todayKey));
  const activeTodoFlows = todos.filter((todo) => hasTodoFlowStarted(todo) && !isTodoCompleted(todo));
  const overdueTodoFlows = todos.filter((todo) => {
    const dateKeys = getTodoScheduleDateKeys(todo);
    return !isTodoCompleted(todo) && dateKeys.some((dateKey) => dateKey < todayKey);
  });
  const futureTodoFlows = todos.filter((todo) => getTodoScheduleDateKeys(todo).some((dateKey) => dateKey > todayKey));
  const upcomingTodoFlows = todos.filter((todo) => {
    const dateKeys = getTodoScheduleDateKeys(todo);
    return dateKeys.some((dateKey) => dateKey > todayKey && dateKey <= next7DayKey);
  });
  const unscheduledTodoFlows = todos.filter((todo) => getTodoScheduleDateKeys(todo).length === 0);
  const limitedActive = takeWithOmitted(activeTodoFlows, options.activeLimit ?? 5);
  const limitedOverdue = takeWithOmitted(overdueTodoFlows, options.overdueLimit ?? 5);
  const limitedUpcoming = takeWithOmitted(upcomingTodoFlows, options.upcomingLimit ?? 10);
  const limitedUnscheduled = takeWithOmitted(unscheduledTodoFlows, options.unscheduledLimit ?? 10);
  const limitedStandaloneTasks = takeWithOmitted(tasks.filter((task) => !task.isTaskBreak), options.standaloneTaskLimit ?? 10);
  const recentArchives = [...archivedTodos].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
  const limitedArchives = takeWithOmitted(recentArchives, options.archiveLimit ?? 8);
  const situation = determineAiAnalysisSituation(
    todayTodoFlows,
    activeTodoFlows,
    overdueTodoFlows,
    upcomingTodoFlows,
    unscheduledTodoFlows,
    tasks,
    archivedTodos
  );

  return {
    todayKey,
    mode,
    situation,
    aggregateMetrics: {
      ...stats,
      completionRate,
      ...riskyTaskCounts,
    },
    todayTodoFlows: todayTodoFlows.map((todo) => compactTodoFlow(todo, taskLimit)),
    activeTodoFlows: limitedActive.items.map((todo) => compactTodoFlow(todo, taskLimit)),
    overdueTodoFlows: limitedOverdue.items.map((todo) => compactTodoFlow(todo, taskLimit)),
    upcomingTodoFlows: limitedUpcoming.items.map((todo) => compactTodoFlow(todo, taskLimit)),
    unscheduledTodoFlows: limitedUnscheduled.items.map((todo) => compactTodoFlow(todo, taskLimit)),
    standaloneTasks: limitedStandaloneTasks.items.map(compactTask),
    recentArchivedTodoFlows: limitedArchives.items,
    omittedCounts: {
      activeTodoFlows: limitedActive.omitted,
      overdueTodoFlows: limitedOverdue.omitted,
      upcomingTodoFlows: Math.max(0, futureTodoFlows.length - limitedUpcoming.items.length),
      unscheduledTodoFlows: limitedUnscheduled.omitted,
      standaloneTasks: limitedStandaloneTasks.omitted,
      recentArchivedTodoFlows: limitedArchives.omitted,
    },
  };
}

function buildTodoFlowContext(todos: TodoFlow[], tasks: Task[], todayKey: string): string {
  const stats = getTodoFlowAnalytics(todos, tasks, todayKey);
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const todoLines = todos.slice(0, 12).map((todo) => {
    const dateText = formatDateKeyList(getTodoScheduleDateKeys(todo), 'unscheduled');
    return `- TodoFlow: ${todo.note || 'Untitled'} | dates: ${dateText} | tasks: ${todo.taskCompleted}/${todo.taskTotal} | planned: ${formatSecondsForPrompt(getTodoEstimatedSeconds(todo))} | actual: ${formatSecondsForPrompt(todo.actualTimeTodo || 0)}`;
  });
  const taskLines = tasks.slice(0, 12).map((task) => {
    const dateText = formatDateKeyList(getTaskScheduleDateKeys(task), 'unscheduled');
    return `- Task: ${task.title || 'Untitled'} | date: ${dateText} | status: ${task.status} | planned: ${formatSecondsForPrompt(task.estimatedTime || 0)} | actual: ${formatSecondsForPrompt(task.actualTime || 0)}`;
  });

  return [
    `Today: ${todayKey}`,
    `Total TodoFlows: ${stats.totalTodoFlows}`,
    `Scheduled days: ${stats.scheduledDays}`,
    `Today TodoFlows: ${stats.todayTodoFlows}`,
    `Completed tasks: ${stats.completedTasks}/${stats.totalTasks}`,
    `Completion rate: ${completionRate}%`,
    `In-progress TodoFlows: ${stats.inProgressTodoFlows}`,
    `Planned time: ${formatSecondsForPrompt(stats.plannedSeconds)}`,
    `Actual time: ${formatSecondsForPrompt(stats.actualSeconds)}`,
    '',
    'TodoFlows:',
    todoLines.length > 0 ? todoLines.join('\n') : '- None',
    '',
    'Standalone tasks:',
    taskLines.length > 0 ? taskLines.join('\n') : '- None',
  ].join('\n');
}

function buildArchivedTodoFlowContext(archivedTodos: ArchivedTodoSummary[] = []): string {
  const archiveLines = archivedTodos.slice(0, 12).map((todo) => {
    const taskLines = todo.tasks.slice(0, 8).map((task) => {
      const ratio = Math.round((task.timeRatio || 0) * 100);
      return `  - Task: ${task.title || 'Untitled'} | status: ${task.status} | completed: ${task.completed ? 'yes' : 'no'} | planned: ${formatSecondsForPrompt(task.estimatedTime || 0)} | actual: ${formatSecondsForPrompt(task.actualTime || 0)} | ratio: ${ratio}%`;
    });
    const slotText = todo.scheduleSlots.length > 0 ? formatScheduleSlotChipLabels(todo.scheduleSlots).join(' | ') : 'No slots';
    return [
      `- Archived TodoFlow: ${todo.note || 'Untitled'} | removed dates: ${formatDateKeyList(todo.removedDateKeys, 'unknown')} | slots: ${slotText} | tasks: ${todo.taskCompleted}/${todo.taskTotal} | planned: ${formatSecondsForPrompt(todo.totalEstimatedTime || 0)} | actual: ${formatSecondsForPrompt(todo.totalActualTime || 0)}`,
      taskLines.length > 0 ? taskLines.join('\n') : '  - No tasks',
    ].join('\n');
  });

  return [
    '',
    'Archived TodoFlows:',
    archiveLines.length > 0 ? archiveLines.join('\n') : '- None',
  ].join('\n');
}

function describeAiAnalysisSituation(situation: AiAnalysisSituation): string {
  if (situation === 'today_schedule') {
    return 'The user has TodoFlows scheduled for today. Analyze today first, then use other groups only as supporting context.';
  }
  if (situation === 'empty_today_with_candidates') {
    return 'The user has no TodoFlow scheduled for today. Do not pretend there is a schedule today. Recommend what to pull into today from active, overdue, upcoming, or unscheduled work.';
  }
  if (situation === 'standalone_tasks_only') {
    return 'The user has no TodoFlow candidates, but has standalone tasks. Recommend whether to work from these tasks or create a TodoFlow.';
  }
  if (situation === 'history_only') {
    return 'The user has no current work data. Use recent archived TodoFlows only for planning patterns, not as work scheduled for today.';
  }
  return 'The user has no TodoFlow, standalone task, or archive data. Return no-data guidance and suggest creating a first TodoFlow.';
}

function getAiOutputLanguageName(language: AiOutputLanguage): string {
  if (language === 'vi') return 'Vietnamese';
  if (language === 'ja') return 'Japanese';
  return 'English';
}

function createStructuredAiTodoFlowAnalysisPrompt(
  context: AiTodoFlowAnalysisContext,
  userRequest: string,
  outputLanguage: AiOutputLanguage = 'en'
): string {
  const languageName = getAiOutputLanguageName(outputLanguage);
  return [
    'SYSTEM ROLE:',
    'You are an AI productivity analyst for a TodoFlow desktop app.',
    '',
    'OUTPUT RULES:',
    'Return ONLY valid JSON. Do not return markdown. Do not wrap the JSON in code fences. Do not explain outside JSON.',
    'Use only the provided context. If data is missing or omitted, mention uncertainty instead of inventing details.',
    'Do not modify data. Only suggest actions.',
    '',
    'Return this JSON shape:',
    '{',
    '  "summary": "string",',
    '  "metrics": {',
    '    "plannedSeconds": number,',
    '    "actualSeconds": number,',
    '    "completionRate": number,',
    '    "overloadSeconds": number,',
    '    "riskyItemCount": number',
    '  },',
    '  "risks": [{ "severity": "low | medium | high", "title": "string", "reason": "string", "itemIds": ["string"] }],',
    '  "priorities": [{ "title": "string", "reason": "string", "estimatedSeconds": number, "itemIds": ["string"] }],',
    '  "scheduleSuggestions": [{ "action": "move | split | shorten | add_break | clarify | create_todoflow", "title": "string", "reason": "string", "itemIds": ["string"] }],',
    '  "estimationInsights": ["string"],',
    '  "actionPlan": ["string"]',
    '}',
    '',
    `Current date: ${context.todayKey}`,
    `Analysis mode: ${context.mode}`,
    `Output language: ${languageName}`,
    `Write all user-facing string values in ${languageName}. Keep JSON keys exactly as specified.`,
    `Situation: ${context.situation}`,
    describeAiAnalysisSituation(context.situation),
    '',
    `User request: ${userRequest.trim() || 'Analyze my TodoFlow data and recommend what to do next.'}`,
    '',
    'DATA SUMMARY:',
    JSON.stringify(context, null, 2),
  ].join('\n');
}

export function createAiTodoFlowAnalysisPrompt(
  context: AiTodoFlowAnalysisContext,
  userRequest: string,
  outputLanguage?: AiOutputLanguage
): string;
export function createAiTodoFlowAnalysisPrompt(
  todos: TodoFlow[],
  tasks: Task[],
  userRequest: string,
  todayKey?: string,
  archivedTodos?: ArchivedTodoSummary[]
): string;
export function createAiTodoFlowAnalysisPrompt(
  contextOrTodos: AiTodoFlowAnalysisContext | TodoFlow[],
  tasksOrUserRequest: Task[] | string,
  userRequestOrTodayKey: string | AiOutputLanguage = '',
  todayKey = toDateKey(new Date()),
  archivedTodos: ArchivedTodoSummary[] = []
): string {
  if (!Array.isArray(contextOrTodos)) {
    return createStructuredAiTodoFlowAnalysisPrompt(
      contextOrTodos,
      String(tasksOrUserRequest || ''),
      (userRequestOrTodayKey || 'en') as AiOutputLanguage
    );
  }

  const todos = contextOrTodos;
  const tasks = Array.isArray(tasksOrUserRequest) ? tasksOrUserRequest : [];
  const userRequest = userRequestOrTodayKey;
  return [
    'You are an AI productivity analyst for a TodoFlow app.',
    'Analyze the user data below and answer with practical scheduling, workload, and focus-time insights.',
    'Be specific. Mention risks, overloaded days, unfinished work, and next actions.',
    '',
    `User request: ${userRequest.trim() || 'Analyze my TodoFlow data.'}`,
    '',
    'TodoFlow data:',
    buildTodoFlowContext(todos, tasks, todayKey),
    buildArchivedTodoFlowContext(archivedTodos),
  ].join('\n');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseAiJsonResponse(rawResponse: string, label: string): unknown {
  const trimmed = rawResponse.trim();
  if (trimmed.startsWith('```')) {
    throw new Error(`${label} response must be raw JSON, not markdown.`);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} response must be valid JSON.`);
  }
}

export function parseAiTodoFlowAnalysisResult(rawResponse: string): AiTodoFlowAnalysis {
  const parsed = parseAiJsonResponse(rawResponse, 'AI');

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response JSON must be an object.');
  }

  const value = parsed as Partial<AiTodoFlowAnalysis>;
  if (typeof value.summary !== 'string') {
    throw new Error('AI response is missing summary.');
  }
  if (!value.metrics || typeof value.metrics !== 'object') {
    throw new Error('AI response is missing metrics.');
  }
  if (
    !Array.isArray(value.risks) ||
    !Array.isArray(value.priorities) ||
    !Array.isArray(value.scheduleSuggestions) ||
    !isStringArray(value.estimationInsights) ||
    !isStringArray(value.actionPlan)
  ) {
    throw new Error('AI response does not match the TodoFlow analysis schema.');
  }

  return value as AiTodoFlowAnalysis;
}

function parseDraftSubtasks(value: unknown): AiTodoFlowDraftTask['subtasks'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item.trim(), completed: false };
      }
      if (item && typeof item === 'object') {
        const subtask = item as Partial<SubTask>;
        return {
          title: typeof subtask.title === 'string' ? subtask.title.trim() : '',
          completed: Boolean(subtask.completed),
        };
      }
      return { title: '', completed: false };
    })
    .filter((item) => item.title);
}

export function parseAiTodoFlowDraftResult(rawResponse: string): AiTodoFlowDraft {
  const parsed = parseAiJsonResponse(rawResponse, 'AI draft');

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI draft response JSON must be an object.');
  }

  const value = parsed as Partial<{
    title: unknown;
    suggestedDurationMinutes: unknown;
    tasks: unknown;
  }>;
  if (typeof value.title !== 'string' || !value.title.trim()) {
    throw new Error('AI draft response is missing title.');
  }
  if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    throw new Error('AI draft response must include at least one task.');
  }

  const tasks = value.tasks
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const task = item as Partial<{ title: unknown; estimatedMinutes: unknown; subtasks: unknown }>;
      const title = typeof task.title === 'string' ? task.title.trim() : '';
      if (!title) {
        return null;
      }

      return {
        title,
        estimatedMinutes: Math.max(0, Math.floor(Number(task.estimatedMinutes) || 0)),
        subtasks: parseDraftSubtasks(task.subtasks),
      };
    })
    .filter((item): item is AiTodoFlowDraftTask => Boolean(item));

  if (tasks.length === 0) {
    throw new Error('AI draft response must include at least one titled task.');
  }

  const taskMinutes = tasks.reduce((total, task) => total + task.estimatedMinutes, 0);
  const suggestedDurationMinutes = Math.max(0, Math.floor(Number(value.suggestedDurationMinutes) || taskMinutes));

  return {
    title: value.title.trim(),
    suggestedDurationMinutes,
    tasks,
  };
}

export function createTodoFlowFromAiDraft(
  draft: AiTodoFlowDraft,
  todoId: string,
  createId: () => string
): TodoFlow {
  const taskIds: string[] = [];
  const tasks: Record<string, Task> = {};

  draft.tasks.forEach((draftTask) => {
    const taskId = createId();
    taskIds.push(taskId);
    tasks[taskId] = {
      id: taskId,
      title: draftTask.title,
      estimatedTime: Math.max(0, Math.floor(draftTask.estimatedMinutes * 60)),
      actualTime: 0,
      status: TaskStatus.NOT_STARTED,
      subTasks: draftTask.subtasks.map((subtask, index) => ({
        id: `${taskId}-subtask-${index + 1}`,
        title: subtask.title,
        completed: subtask.completed,
      })),
    };
  });

  const taskTotalSeconds = taskIds.reduce((total, taskId) => total + tasks[taskId].estimatedTime, 0);
  const estimatedTimeTodo = Math.max(taskTotalSeconds, Math.max(0, Math.floor(draft.suggestedDurationMinutes * 60)));

  return {
    id: todoId,
    note: draft.title,
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: taskIds.length,
    estimatedTimeTodo,
    actualTimeTodo: 0,
    taskIds,
    tasks,
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
  };
}

export function createAiTodoFlowPrompt(
  todos: TodoFlow[],
  tasks: Task[],
  userRequest: string,
  todayKey = toDateKey(new Date()),
  outputLanguage: AiOutputLanguage = 'en'
): string {
  const languageName = getAiOutputLanguageName(outputLanguage);
  return [
    'You are an AI TodoFlow planner.',
    'Return ONLY valid JSON. Do not wrap it in markdown.',
    'Use this exact schema:',
    '{',
    '  "title": "string",',
    '  "suggestedDurationMinutes": 90,',
    '  "tasks": [{ "title": "string", "estimatedMinutes": 30, "subtasks": [{ "title": "string", "completed": false }] }]',
    '}',
    'Include a TodoFlow title, suggested schedule duration, and task list with estimated minutes.',
    'Use the existing data as context to avoid conflicts and unrealistic planning.',
    `Write all user-facing string values in ${languageName}. Keep JSON keys exactly as specified.`,
    '',
    `User request: ${userRequest.trim() || 'Create a TodoFlow for my next useful work block.'}`,
    '',
    'Current TodoFlow data:',
    buildTodoFlowContext(todos, tasks, todayKey),
  ].join('\n');
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateKeyList(dateKeys: string[], emptyText = 'No time selected'): string {
  const uniqueDateKeys = uniqueSortedDateKeys(dateKeys);
  if (uniqueDateKeys.length === 0) {
    return emptyText;
  }

  return uniqueDateKeys.join(' | ');
}

export function formatDateChipLabels(dateKeys: string[]): string[] {
  return uniqueSortedDateKeys(dateKeys);
}

export function formatDateChipItems(
  dateKeys: string[],
  todayKey = toDateKey(new Date())
): Array<{ label: string; isToday: boolean }> {
  return formatDateChipLabels(dateKeys).map((label) => ({
    label,
    isToday: label === todayKey,
  }));
}

export function formatScheduleSlotChipLabels(slots: ScheduleSlot[] = []): string[] {
  return [...slots]
    .sort((a, b) => `${a.dateKey}T${a.startTime}`.localeCompare(`${b.dateKey}T${b.startTime}`))
    .map((slot) => `${slot.dateKey} ${slot.startTime}-${slot.endTime}`);
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isPastDateKey(dateKey: string, todayKey = toDateKey(new Date())): boolean {
  return dateKey < todayKey;
}

export function listDateKeysBetween(startDateKey: string, endDateKey: string): string[] {
  const start = parseDateKey(startDateKey <= endDateKey ? startDateKey : endDateKey);
  const end = parseDateKey(startDateKey <= endDateKey ? endDateKey : startDateKey);
  const keys: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function toggleDateKeySelection(selectedDateKeys: string[], dateKey: string): string[] {
  if (selectedDateKeys.includes(dateKey)) {
    const nextKeys = selectedDateKeys.filter((selectedDateKey) => selectedDateKey !== dateKey);
    return nextKeys.length > 0 ? uniqueSortedDateKeys(nextKeys) : [dateKey];
  }

  return uniqueSortedDateKeys([...selectedDateKeys, dateKey]);
}

export function buildMonthDays(monthDate: Date, today = new Date()): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = getMonthCalendarGridStart(monthDate);

  const lastOfMonth = new Date(year, month + 1, 0);
  const end = new Date(lastOfMonth);
  end.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const days: CalendarDay[] = [];
  const cursor = new Date(start);
  const todayKey = toDateKey(today);

  while (cursor <= end) {
    const date = new Date(cursor);
    const dateKey = toDateKey(date);
    days.push({
      date,
      dateKey,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateKey === todayKey,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function getMonthCalendarGridStart(monthDate: Date): Date {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  return start;
}

export function buildCalendarWindowDays(startDate: Date, today = new Date()): CalendarDay[] {
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay());
  const todayKey = toDateKey(today);
  const days: CalendarDay[] = [];
  const cursor = new Date(start);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(cursor);
    const dateKey = toDateKey(date);
    days.push({
      date,
      dateKey,
      dayOfMonth: date.getDate(),
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function emptyGroup(): ScheduledDayItems {
  return { todos: [], tasks: [] };
}

function uniqueSortedDateKeys(dateKeys: string[]): string[] {
  return Array.from(new Set(dateKeys)).sort();
}

function getScheduleSlotDateKeys(slots?: ScheduleSlot[]): string[] {
  return uniqueSortedDateKeys((slots || []).map((slot) => slot.dateKey));
}

function getScheduleSlotsDurationSeconds(slots?: ScheduleSlot[]): number | undefined {
  if (!slots || slots.length === 0) {
    return undefined;
  }

  return slots.reduce((total, slot) => total + secondsBetweenTimeStrings(slot.startTime, slot.endTime), 0);
}

function getScheduleSlotsMaxDurationSeconds(slots?: ScheduleSlot[]): number | undefined {
  if (!slots || slots.length === 0) {
    return undefined;
  }

  return Math.max(...slots.map((slot) => secondsBetweenTimeStrings(slot.startTime, slot.endTime)));
}

function getTodoNonBreakTaskIds(todo: TodoFlow): string[] {
  return todo.taskIds.filter((taskId) => {
    const task = todo.tasks[taskId];
    return task && !task.isTaskBreak;
  });
}

function buildTodoDayTaskAllocations(todo: TodoFlow): Record<string, TodoFlowDayTaskState> {
  return todo.taskIds.reduce<Record<string, TodoFlowDayTaskState>>((allocations, taskId) => {
    const task = todo.tasks[taskId];
    if (task) {
      allocations[taskId] = {
        estimatedTime: Math.max(0, Math.floor(task.estimatedTime || 0)),
        actualTime: Math.max(0, Math.floor(task.actualTime || 0)),
        status: task.status || TaskStatus.NOT_STARTED,
      };
    }
    return allocations;
  }, {});
}

function createTodoDayPlan(todo: TodoFlow, dateKey: string): TodoFlowDayPlan {
  const scheduleSlot = getScheduleSlotForDate(todo.scheduleSlots, dateKey);
  const taskAllocations = buildTodoDayTaskAllocations(todo);
  const taskTotal = Math.max(0, Math.floor(todo.taskTotal || getTodoNonBreakTaskIds(todo).length));

  return {
    dateKey,
    scheduleSlot: scheduleSlot ? { ...scheduleSlot } : undefined,
    status: todo.status,
    estimatedTimeTodo: getTodoEstimatedSeconds(todo),
    actualTimeTodo: Math.max(0, Math.floor(todo.actualTimeTodo || 0)),
    taskCompleted: Math.max(0, Math.floor(todo.taskCompleted || 0)),
    taskTotal,
    taskAllocations,
    currentTaskId: todo.currentTaskId,
    timeLeft: todo.timeLeft,
    lastNotifiedDate: todo.lastNotifiedDate,
  };
}

function normalizeTodoDayPlan(todo: TodoFlow, dateKey: string, plan?: TodoFlowDayPlan): TodoFlowDayPlan {
  const fallback = createTodoDayPlan(todo, dateKey);
  const taskAllocations = { ...fallback.taskAllocations, ...(plan?.taskAllocations || {}) };
  const scheduleSlot = plan?.scheduleSlot || fallback.scheduleSlot;
  const taskAllocationTotal = Object.entries(taskAllocations).reduce((total, [taskId, allocation]) => {
    const task = todo.tasks[taskId];
    if (task?.isTaskBreak) {
      return total;
    }
    return total + Math.max(0, Math.floor(allocation.estimatedTime || 0));
  }, 0);

  return {
    ...fallback,
    ...plan,
    dateKey,
    scheduleSlot: scheduleSlot ? { ...scheduleSlot } : undefined,
    estimatedTimeTodo: Math.max(0, Math.floor(plan?.estimatedTimeTodo ?? fallback.estimatedTimeTodo), taskAllocationTotal),
    actualTimeTodo: Math.max(0, Math.floor(plan?.actualTimeTodo ?? fallback.actualTimeTodo)),
    taskCompleted: Math.max(0, Math.floor(plan?.taskCompleted ?? fallback.taskCompleted)),
    taskTotal: Math.max(0, Math.floor(plan?.taskTotal ?? fallback.taskTotal)),
    taskAllocations,
  };
}

export function ensureTodoDayPlans(todo: TodoFlow): TodoFlow {
  const dateKeys = getTodoScheduleDateKeys(todo);
  if (dateKeys.length === 0) {
    return todo;
  }

  const dayPlans = { ...(todo.dayPlans || {}) };
  for (const dateKey of dateKeys) {
    dayPlans[dateKey] = normalizeTodoDayPlan(todo, dateKey, dayPlans[dateKey]);
  }

  return {
    ...todo,
    dayPlans,
  };
}

export function getTodoDayPlan(todo: TodoFlow, dateKey?: string): TodoFlowDayPlan | undefined {
  if (!dateKey) {
    return undefined;
  }

  return ensureTodoDayPlans(todo).dayPlans?.[dateKey];
}

export function getTodoForDate(todo: TodoFlow, dateKey?: string): TodoFlow {
  const plan = getTodoDayPlan(todo, dateKey);
  if (!plan) {
    return todo;
  }

  const tasks = Object.fromEntries(
    Object.entries(todo.tasks).map(([taskId, task]) => {
      const allocation = plan.taskAllocations[taskId];
      if (!allocation) {
        return [taskId, task];
      }

      return [
        taskId,
        {
          ...task,
          estimatedTime: allocation.estimatedTime,
          actualTime: allocation.actualTime,
          status: allocation.status,
        },
      ];
    })
  ) as Record<string, Task>;

  return {
    ...ensureTodoDayPlans(todo),
    status: plan.status,
    estimatedTimeTodo: plan.estimatedTimeTodo,
    actualTimeTodo: plan.actualTimeTodo,
    taskCompleted: plan.taskCompleted,
    taskTotal: plan.taskTotal,
    currentTaskId: plan.currentTaskId,
    timeLeft: plan.timeLeft,
    lastNotifiedDate: plan.lastNotifiedDate,
    activeDateKey: dateKey,
    tasks,
  };
}

export function applyTodoDateState(todo: TodoFlow, dateKey: string | undefined, scopedTodo: TodoFlow): TodoFlow {
  if (!dateKey) {
    return scopedTodo;
  }

  const baseTodo = ensureTodoDayPlans(todo);
  const existingPlan = baseTodo.dayPlans?.[dateKey];
  const taskAllocations = scopedTodo.taskIds.reduce<Record<string, TodoFlowDayTaskState>>((allocations, taskId) => {
    const task = scopedTodo.tasks[taskId];
    if (task) {
      allocations[taskId] = {
        estimatedTime: Math.max(0, Math.floor(task.estimatedTime || 0)),
        actualTime: Math.max(0, Math.floor(task.actualTime || 0)),
        status: task.status || TaskStatus.NOT_STARTED,
      };
    }
    return allocations;
  }, {});
  const scopedSlot = getScheduleSlotForDate(scopedTodo.scheduleSlots, dateKey) || existingPlan?.scheduleSlot;
  const dayPlans = {
    ...(baseTodo.dayPlans || {}),
    [dateKey]: normalizeTodoDayPlan(baseTodo, dateKey, {
      dateKey,
      scheduleSlot: scopedSlot ? { ...scopedSlot } : undefined,
      status: scopedTodo.status,
      estimatedTimeTodo: Math.max(0, Math.floor(scopedTodo.estimatedTimeTodo || 0)),
      actualTimeTodo: Math.max(0, Math.floor(scopedTodo.actualTimeTodo || 0)),
      taskCompleted: Math.max(0, Math.floor(scopedTodo.taskCompleted || 0)),
      taskTotal: Math.max(0, Math.floor(scopedTodo.taskTotal || getTodoNonBreakTaskIds(scopedTodo).length)),
      taskAllocations,
      currentTaskId: scopedTodo.currentTaskId,
      timeLeft: scopedTodo.timeLeft,
      lastNotifiedDate: scopedTodo.lastNotifiedDate,
    }),
  };
  const scheduleSlots = scopedSlot
    ? applyScheduleSlot(baseTodo.scheduleSlots, scopedSlot)
    : baseTodo.scheduleSlots;
  const sharedTasks = Object.fromEntries(
    Object.entries(scopedTodo.tasks).map(([taskId, task]) => {
      const baseTask = baseTodo.tasks[taskId] || task;
      return [
        taskId,
        {
          ...baseTask,
          title: task.title,
          description: task.description,
          isTaskBreak: task.isTaskBreak,
          subTasks: task.subTasks,
        },
      ];
    })
  ) as Record<string, Task>;

  return {
    ...baseTodo,
    note: scopedTodo.note,
    taskIds: scopedTodo.taskIds,
    tasks: sharedTasks,
    scheduleSlots,
    scheduledDate: getTodoScheduleDateKeys({ ...baseTodo, scheduleSlots })[0],
    scheduledDates: getTodoScheduleDateKeys({ ...baseTodo, scheduleSlots }).length > 1
      ? getTodoScheduleDateKeys({ ...baseTodo, scheduleSlots })
      : undefined,
    dayPlans,
    activeDateKey: dateKey,
    lastNotifiedDate: undefined,
  };
}

export function getPersistableTodoDateState(todo: TodoFlow, dateKey: string | undefined = todo.activeDateKey): TodoFlow {
  const persistableTodo = {
    ...todo,
    timer: null,
  };

  return dateKey ? applyTodoDateState(persistableTodo, dateKey, persistableTodo) : persistableTodo;
}

export function getTodoScheduleTargetDurationSeconds(todo: TodoFlow, slots: ScheduleSlot[] = todo.scheduleSlots || []): number {
  const slotDuration = getScheduleSlotsDurationSeconds(slots);
  return Math.max(0, Math.floor(slotDuration ?? getTodoEstimatedSeconds(todo)));
}

export function getTodoScheduleSlotTargetDurationSeconds(todo: TodoFlow, slots: ScheduleSlot[] = todo.scheduleSlots || []): number {
  const slotDuration = getScheduleSlotsMaxDurationSeconds(slots);
  return Math.max(0, Math.floor(slotDuration ?? getTodoEstimatedSeconds(todo)));
}

export function getTodoScheduleSelectionDurationSeconds({
  isCreateMode,
  existingSlotDurationSeconds,
  selectedDurationSeconds,
  targetScheduleDurationSeconds,
  unslottedSelectionCount: _unslottedSelectionCount,
}: {
  isCreateMode: boolean;
  existingSlotDurationSeconds?: number;
  selectedDurationSeconds: number;
  targetScheduleDurationSeconds: number;
  unslottedSelectionCount?: number;
}): number {
  if (existingSlotDurationSeconds !== undefined) {
    return existingSlotDurationSeconds;
  }
  if (!isCreateMode && targetScheduleDurationSeconds > 0) {
    return targetScheduleDurationSeconds;
  }
  return selectedDurationSeconds;
}

export function getTodoScheduleSelectionRangeMinutes({
  isCreateMode,
  existingSlotDurationSeconds,
  startMinutes,
  selectedEndMinutes,
  selectedDurationSeconds,
  targetScheduleDurationSeconds,
  unslottedSelectionCount,
}: {
  isCreateMode: boolean;
  existingSlotDurationSeconds?: number;
  startMinutes: number;
  selectedEndMinutes: number;
  selectedDurationSeconds: number;
  targetScheduleDurationSeconds: number;
  unslottedSelectionCount?: number;
}): { start: number; end: number } {
  const durationSeconds = getTodoScheduleSelectionDurationSeconds({
    isCreateMode,
    existingSlotDurationSeconds,
    selectedDurationSeconds,
    targetScheduleDurationSeconds,
    unslottedSelectionCount,
  });
  const durationMinutes = durationSeconds / 60;
  const start = Math.max(0, Math.min(startMinutes, 24 * 60 - durationMinutes));
  const end = isCreateMode ? selectedEndMinutes : start + durationMinutes;

  return {
    start,
    end: Math.min(24 * 60, end),
  };
}

export function getTodoScheduleSaveEstimateDurationSeconds({
  todo,
  isCreateMode,
  totalSelectedDurationSeconds,
}: {
  todo: TodoFlow;
  isCreateMode: boolean;
  totalSelectedDurationSeconds: number;
}): number {
  const selectedDuration = Math.max(0, Math.floor(totalSelectedDurationSeconds));
  const taskTotal = getTodoTaskEstimatedSeconds(todo);
  if (isCreateMode) {
    return Math.max(selectedDuration, taskTotal);
  }

  return Math.max(
    Math.max(0, Math.floor(todo.estimatedTimeTodo || 0)),
    getTodoScheduleSlotTargetDurationSeconds(todo, todo.scheduleSlots || []),
    taskTotal
  );
}

export function getTodoScheduleMinimumTotalDurationSeconds({
  todo,
  isCreateMode,
  initialScheduleSlots,
}: {
  todo: TodoFlow;
  isCreateMode: boolean;
  initialScheduleSlots: ScheduleSlot[];
}): number {
  if (isCreateMode) {
    return 0;
  }

  return Math.max(
    getTodoScheduleTargetDurationSeconds(todo, initialScheduleSlots),
    Math.max(0, Math.floor(todo.estimatedTimeTodo || 0)),
    getTodoTaskEstimatedSeconds(todo)
  );
}

export function getTodoScheduleMinimumSlotDurationSeconds({
  todo,
  isCreateMode,
  dateKey,
  minimumStepSeconds,
}: {
  todo: TodoFlow;
  isCreateMode: boolean;
  dateKey: string;
  minimumStepSeconds: number;
}): number {
  const minimumStep = Math.max(0, Math.floor(minimumStepSeconds));
  if (isCreateMode) {
    return minimumStep;
  }

  return Math.max(minimumStep, Math.max(0, Math.floor(todo.estimatedTimeTodo || 0)), getTodoTaskEstimatedSeconds(todo));
}

export function getTodoScheduleDateKeys(todo: TodoFlow): string[] {
  const slotDateKeys = getScheduleSlotDateKeys(todo.scheduleSlots);
  if (slotDateKeys.length > 0) {
    return slotDateKeys;
  }
  if (todo.scheduledDates && todo.scheduledDates.length > 0) {
    return uniqueSortedDateKeys(todo.scheduledDates);
  }
  return todo.scheduledDate ? [todo.scheduledDate] : [];
}

export function getTaskScheduleDateKeys(task: Task): string[] {
  const slotDateKeys = getScheduleSlotDateKeys(task.scheduleSlots);
  if (slotDateKeys.length > 0) {
    return slotDateKeys;
  }
  return task.scheduledDate ? [task.scheduledDate] : [];
}

function applyTodoScheduleDateKeys(todo: TodoFlow, dateKeys: string[]): TodoFlow {
  const uniqueDateKeys = uniqueSortedDateKeys(dateKeys);
  const scheduleSlots = (todo.scheduleSlots || []).filter((slot) => uniqueDateKeys.includes(slot.dateKey));
  const dayPlans = Object.fromEntries(
    Object.entries(todo.dayPlans || {}).filter(([dateKey]) => uniqueDateKeys.includes(dateKey))
  ) as Record<string, TodoFlowDayPlan>;

  return {
    ...todo,
    scheduledDate: uniqueDateKeys[0],
    scheduledDates: uniqueDateKeys.length > 1 ? uniqueDateKeys : undefined,
    scheduleSlots: scheduleSlots.length > 0 ? scheduleSlots : undefined,
    dayPlans: Object.keys(dayPlans).length > 0 ? dayPlans : undefined,
    lastNotifiedDate: undefined,
  };
}

export function setTodoAssignedDate(todo: TodoFlow, dateKey: string): TodoFlow {
  return applyTodoScheduleDateKeys(todo, [...getTodoScheduleDateKeys(todo), dateKey]);
}

export function setTodoAssignedDates(todo: TodoFlow, dateKeys: string[]): TodoFlow {
  return applyTodoScheduleDateKeys(todo, dateKeys);
}

export function unsetTodoAssignedDate(todo: TodoFlow, dateKey: string): TodoFlow {
  return applyTodoScheduleDateKeys(
    todo,
    getTodoScheduleDateKeys(todo).filter((assignedDateKey) => assignedDateKey !== dateKey)
  );
}

function cloneTodoTasksWithIds(
  todo: TodoFlow,
  createTaskId: (taskId: string) => string
): { taskIds: string[]; tasks: Record<string, Task>; currentTaskId?: string } {
  const idMap = Object.fromEntries(todo.taskIds.map((taskId) => [taskId, createTaskId(taskId)]));
  const taskIds = todo.taskIds.map((taskId) => idMap[taskId]);
  const tasks = todo.taskIds.reduce<Record<string, Task>>((nextTasks, taskId) => {
    const task = todo.tasks[taskId];
    const nextTaskId = idMap[taskId];
    if (task) {
      nextTasks[nextTaskId] = {
        ...task,
        id: nextTaskId,
        subTasks: task.subTasks.map((subTask) => ({ ...subTask })),
      };
    }
    return nextTasks;
  }, {});

  return {
    taskIds,
    tasks,
    currentTaskId: todo.currentTaskId ? idMap[todo.currentTaskId] : undefined,
  };
}

export function splitTodoFlowForDate(
  todo: TodoFlow,
  newTodoId: string,
  dateKey: string,
  createTaskId: (taskId: string) => string = (taskId) => taskId
): { originalTodo: TodoFlow; detachedTodo: TodoFlow } | null {
  const assignedDateKeys = getTodoScheduleDateKeys(todo);
  if (assignedDateKeys.length <= 1 || !assignedDateKeys.includes(dateKey)) {
    return null;
  }

  const remainingDateKeys = assignedDateKeys.filter((assignedDateKey) => assignedDateKey !== dateKey);
  const detachedSlots = (todo.scheduleSlots || []).filter((slot) => slot.dateKey === dateKey);
  const remainingSlots = (todo.scheduleSlots || []).filter((slot) => slot.dateKey !== dateKey);
  const originalDuration = getScheduleSlotsDurationSeconds(remainingSlots);
  const detachedDuration = getScheduleSlotsDurationSeconds(detachedSlots);
  const detachedTasks = cloneTodoTasksWithIds(todo, createTaskId);
  const originalTaskTotal = getTodoTaskEstimatedSeconds(todo);
  const detachedTaskTotal = detachedTasks.taskIds.reduce((total, taskId) => {
    const task = detachedTasks.tasks[taskId];
    return task && !task.isTaskBreak ? total + Math.max(0, Math.floor(task.estimatedTime || 0)) : total;
  }, 0);

  const originalTodo = {
    ...applyTodoScheduleDateKeys(todo, remainingDateKeys),
    scheduleSlots: remainingSlots.length > 0 ? remainingSlots.map((slot) => ({ ...slot })) : undefined,
    estimatedTimeTodo: Math.max(originalDuration ?? todo.estimatedTimeTodo, originalTaskTotal),
    timer: null,
    lastNotifiedDate: undefined,
  };

  const detachedTodo = {
    ...todo,
    id: newTodoId,
    scheduledDate: dateKey,
    scheduledDates: undefined,
    scheduleSlots: detachedSlots.length > 0 ? detachedSlots.map((slot) => ({ ...slot })) : undefined,
    estimatedTimeTodo: Math.max(detachedDuration ?? todo.estimatedTimeTodo, detachedTaskTotal),
    tasks: detachedTasks.tasks,
    taskIds: detachedTasks.taskIds,
    currentTaskId: detachedTasks.currentTaskId,
    dayPlans: undefined,
    timer: null,
    lastNotifiedDate: undefined,
  };

  return { originalTodo, detachedTodo };
}

function todoMatchesSearch(todo: TodoFlow, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchable = [
    todo.note,
    ...todo.taskIds.map((taskId) => todo.tasks[taskId]?.title || ''),
  ].join(' ').toLowerCase();

  return searchable.includes(query);
}

function taskMatchesSearch(task: Task, query: string): boolean {
  if (!query) {
    return true;
  }

  return `${task.title} ${task.description || ''}`.toLowerCase().includes(query);
}

function isTodoCompleted(todo: TodoFlow): boolean {
  return todo.taskTotal > 0 && todo.taskCompleted >= todo.taskTotal;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seenIds.has(item.id)) {
      return false;
    }
    seenIds.add(item.id);
    return true;
  });
}

export function filterManageItems(
  todos: TodoFlow[],
  tasks: Task[],
  searchText: string,
  filter: ManageItemFilter
): ScheduledDayItems {
  const query = searchText.trim().toLowerCase();
  const searchedTodos = dedupeById(todos).filter((todo) => todoMatchesSearch(todo, query));
  const searchedTasks = dedupeById(tasks).filter((task) => taskMatchesSearch(task, query));

  if (filter === 'todos') {
    return { todos: searchedTodos, tasks: [] };
  }
  if (filter === 'tasks') {
    return { todos: [], tasks: searchedTasks };
  }
  if (filter === 'scheduled') {
    return {
      todos: searchedTodos.filter((todo) => getTodoScheduleDateKeys(todo).length > 0),
      tasks: searchedTasks.filter((task) => getTaskScheduleDateKeys(task).length > 0),
    };
  }
  if (filter === 'unscheduled') {
    return {
      todos: searchedTodos.filter((todo) => getTodoScheduleDateKeys(todo).length === 0),
      tasks: searchedTasks.filter((task) => getTaskScheduleDateKeys(task).length === 0),
    };
  }
  if (filter === 'in-progress') {
    return {
      todos: searchedTodos.filter((todo) => hasTodoFlowStarted(todo) && !isTodoCompleted(todo)),
      tasks: searchedTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.PAUSED),
    };
  }
  if (filter === 'completed') {
    return {
      todos: searchedTodos.filter(isTodoCompleted),
      tasks: searchedTasks.filter((task) => task.status === TaskStatus.COMPLETED),
    };
  }

  return { todos: searchedTodos, tasks: searchedTasks };
}

export function getTodoFlowAnalytics(
  todos: TodoFlow[],
  tasks: Task[],
  todayKey = toDateKey(new Date())
): TodoFlowAnalytics {
  const todoStats = todos.reduce(
    (stats, todo) => {
      const dateKeys = getTodoScheduleDateKeys(todo);
      const hasDayPlans = Boolean(todo.dayPlans && dateKeys.some((dateKey) => todo.dayPlans?.[dateKey]));
      const dayPlans = hasDayPlans ? ensureTodoDayPlans(todo).dayPlans || {} : {};
      stats.scheduledDays += dateKeys.length;
      stats.todayTodoFlows += dateKeys.includes(todayKey) ? 1 : 0;
      if (hasDayPlans) {
        let hasActiveDay = false;
        for (const dateKey of dateKeys) {
          const plan = dayPlans[dateKey];
          if (!plan) continue;
          const scopedTodo = getTodoForDate(todo, dateKey);
          stats.completedTasks += plan.taskCompleted || 0;
          stats.totalTasks += plan.taskTotal || todo.taskIds.filter((taskId) => !todo.tasks[taskId]?.isTaskBreak).length;
          stats.plannedSeconds += plan.estimatedTimeTodo || 0;
          stats.actualSeconds += plan.actualTimeTodo || 0;
          hasActiveDay ||= hasTodoFlowStarted(scopedTodo) && !isTodoCompleted(scopedTodo);
        }
        stats.inProgressTodoFlows += hasActiveDay ? 1 : 0;
      } else {
        stats.completedTasks += todo.taskCompleted || 0;
        stats.totalTasks += todo.taskTotal || todo.taskIds.filter((taskId) => !todo.tasks[taskId]?.isTaskBreak).length;
        stats.inProgressTodoFlows += hasTodoFlowStarted(todo) && !isTodoCompleted(todo) ? 1 : 0;
        stats.plannedSeconds += getTodoEstimatedSeconds(todo);
        stats.actualSeconds += todo.actualTimeTodo || 0;
      }
      return stats;
    },
    {
      scheduledDays: 0,
      todayTodoFlows: 0,
      completedTasks: 0,
      totalTasks: 0,
      inProgressTodoFlows: 0,
      plannedSeconds: 0,
      actualSeconds: 0,
    }
  );

  const standaloneTaskStats = tasks.reduce(
    (stats, task) => {
      if (!task.isTaskBreak) {
        stats.completedTasks += task.status === TaskStatus.COMPLETED ? 1 : 0;
        stats.totalTasks += 1;
        stats.plannedSeconds += task.estimatedTime || 0;
        stats.actualSeconds += task.actualTime || 0;
      }
      return stats;
    },
    { completedTasks: 0, totalTasks: 0, plannedSeconds: 0, actualSeconds: 0 }
  );

  return {
    totalTodoFlows: todos.length,
    scheduledDays: todoStats.scheduledDays,
    todayTodoFlows: todoStats.todayTodoFlows,
    completedTasks: todoStats.completedTasks + standaloneTaskStats.completedTasks,
    totalTasks: todoStats.totalTasks + standaloneTaskStats.totalTasks,
    inProgressTodoFlows: todoStats.inProgressTodoFlows,
    plannedSeconds: todoStats.plannedSeconds + standaloneTaskStats.plannedSeconds,
    actualSeconds: todoStats.actualSeconds + standaloneTaskStats.actualSeconds,
  };
}

function parseTimeString(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error('Time must use HH:mm format');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes !== 0)) {
    throw new Error('Time must use HH:mm format');
  }

  return hours * 3600 + minutes * 60;
}

export function secondsBetweenTimeStrings(startTime: string, endTime: string): number {
  const startSeconds = parseTimeString(startTime);
  const endSeconds = parseTimeString(endTime);
  const duration = endSeconds - startSeconds;
  if (duration <= 0) {
    throw new Error('End time must be after start time');
  }
  return duration;
}

export function isScheduleSlotSelectable(slot: ScheduleSlot, now = new Date()): boolean {
  secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const todayKey = toDateKey(now);
  if (slot.dateKey < todayKey) {
    return false;
  }
  if (slot.dateKey > todayKey) {
    return true;
  }

  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60;
  return parseTimeString(slot.startTime) >= nowSeconds;
}

export function hasOverlappingScheduleSlot(slot: ScheduleSlot, existingSlots: ScheduleSlot[]): boolean {
  const start = parseTimeString(slot.startTime);
  const end = parseTimeString(slot.endTime);

  return existingSlots.some((existing) => {
    if (existing.dateKey !== slot.dateKey) {
      return false;
    }

    const existingStart = parseTimeString(existing.startTime);
    const existingEnd = parseTimeString(existing.endTime);
    return start < existingEnd && end > existingStart;
  });
}

function timeStringFromSeconds(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.min(24 * 60, Math.floor(totalSeconds / 60)));
  if (totalMinutes === 24 * 60) {
    return '24:00';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function secondsFromMidnightToTimeString(totalSeconds: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 * 60, totalSeconds));
  if (clamped === 24 * 60 * 60) {
    return '24:00';
  }
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function distributeSecondsByCurrentWeights(totalSeconds: number, taskIds: string[], tasks: Record<string, Task>): Record<string, number> {
  const safeTotal = Math.max(0, Math.floor(totalSeconds));
  if (taskIds.length === 0) {
    return {};
  }

  const currentTotal = taskIds.reduce((total, taskId) => total + Math.max(0, tasks[taskId]?.estimatedTime || 0), 0);
  if (currentTotal <= 0) {
    const baseDuration = Math.floor(safeTotal / taskIds.length);
    let remainder = safeTotal - baseDuration * taskIds.length;
    return Object.fromEntries(
      taskIds.map((taskId) => {
        const estimatedTime = baseDuration + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        return [taskId, estimatedTime];
      })
    );
  }

  const weighted = taskIds.map((taskId, index) => {
    const exact = (Math.max(0, tasks[taskId]?.estimatedTime || 0) / currentTotal) * safeTotal;
    return {
      taskId,
      index,
      estimatedTime: Math.floor(exact),
      fraction: exact - Math.floor(exact),
    };
  });
  let remainder = safeTotal - weighted.reduce((total, item) => total + item.estimatedTime, 0);
  weighted
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .forEach((item) => {
      if (remainder <= 0) return;
      item.estimatedTime += 1;
      remainder -= 1;
    });

  return Object.fromEntries(weighted.map((item) => [item.taskId, item.estimatedTime]));
}

export function moveScheduleSlotPreservingDuration(
  slot: ScheduleSlot,
  dateKey: string,
  startTime: string
): ScheduleSlot {
  const durationSeconds = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const dayEndSeconds = 24 * 60 * 60;
  const startSeconds = Math.max(0, Math.min(parseTimeString(startTime), dayEndSeconds - durationSeconds));
  return {
    dateKey,
    startTime: timeStringFromSeconds(startSeconds),
    endTime: timeStringFromSeconds(startSeconds + durationSeconds),
  };
}

export function findAutoFitScheduleSlot(
  slot: ScheduleSlot,
  existingSlots: ScheduleSlot[],
  options: { minStartTime?: string; durationSeconds?: number } = {}
): ScheduleSlot | null {
  const durationSeconds = options.durationSeconds ?? secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const dayEndSeconds = 24 * 60 * 60;
  const minStartSeconds = options.minStartTime ? parseTimeString(options.minStartTime) : 0;
  const sameDaySlots = existingSlots
    .filter((existing) => existing.dateKey === slot.dateKey)
    .sort((a, b) => parseTimeString(a.startTime) - parseTimeString(b.startTime));

  const buildSlot = (startSeconds: number): ScheduleSlot => ({
    dateKey: slot.dateKey,
    startTime: secondsFromMidnightToTimeString(startSeconds),
    endTime: secondsFromMidnightToTimeString(startSeconds + durationSeconds),
  });

  let candidateStart = Math.max(parseTimeString(slot.startTime), minStartSeconds);
  for (const existing of sameDaySlots) {
    const candidate = buildSlot(candidateStart);
    if (!hasOverlappingScheduleSlot(candidate, [existing])) {
      continue;
    }
    candidateStart = parseTimeString(existing.endTime);
  }

  const afterCandidate = buildSlot(candidateStart);
  if (candidateStart + durationSeconds <= dayEndSeconds && !hasOverlappingScheduleSlot(afterCandidate, sameDaySlots)) {
    return afterCandidate;
  }

  const endOfDayCandidate = buildSlot(dayEndSeconds - durationSeconds);
  if (
    dayEndSeconds >= durationSeconds &&
    dayEndSeconds - durationSeconds >= minStartSeconds &&
    !hasOverlappingScheduleSlot(endOfDayCandidate, sameDaySlots)
  ) {
    return endOfDayCandidate;
  }

  for (let index = sameDaySlots.length - 1; index >= 0; index -= 1) {
    const gapEnd = parseTimeString(sameDaySlots[index].startTime);
    const gapStart = Math.max(index === 0 ? 0 : parseTimeString(sameDaySlots[index - 1].endTime), minStartSeconds);
    if (gapEnd - gapStart >= durationSeconds) {
      return buildSlot(gapEnd - durationSeconds);
    }
  }

  if (dayEndSeconds >= durationSeconds && sameDaySlots.length === 0) {
    return afterCandidate;
  }

  return null;
}

export function getTodoTaskEstimatedSeconds(todo: TodoFlow): number {
  return todo.taskIds.reduce((total, taskId) => {
    const task = todo.tasks[taskId];
    if (!task || task.isTaskBreak) {
      return total;
    }
    return total + (task.estimatedTime || 0);
  }, 0);
}

export function getTodoFlowCurrentTask(todo: TodoFlow): Task | undefined {
  return todo.currentTaskId ? todo.tasks[todo.currentTaskId] : undefined;
}

export function getRenderableTodoFlowTaskIds(todo: TodoFlow): string[] {
  const seenTaskIds = new Set<string>();
  return todo.taskIds.filter((taskId) => {
    const task = todo.tasks[taskId];
    if (!task || seenTaskIds.has(taskId)) {
      return false;
    }
    seenTaskIds.add(taskId);
    return taskId !== todo.currentTaskId && task.status !== TaskStatus.COMPLETED;
  });
}

export function redistributeTaskEstimateWithinTodo(
  todo: TodoFlow,
  taskId: string,
  nextEstimatedSeconds: number
): TodoFlow {
  const task = todo.tasks[taskId];
  if (!task || task.isTaskBreak) {
    return todo;
  }

  const nonBreakTaskIds = todo.taskIds.filter((id) => {
    const item = todo.tasks[id];
    return item && !item.isTaskBreak;
  });
  const otherTaskIds = nonBreakTaskIds.filter((id) => id !== taskId);
  const currentTaskTotal = getTodoTaskEstimatedSeconds(todo);
  const todoTotal = Math.max(Math.max(0, Math.floor(todo.estimatedTimeTodo || 0)), currentTaskTotal);
  const hasFixedTotal = todoTotal > 0;
  const safeNext = Math.max(0, Math.floor(nextEstimatedSeconds));
  const nextTotal = hasFixedTotal ? todoTotal : safeNext + currentTaskTotal - Math.max(0, task.estimatedTime || 0);
  const targetEstimate = Math.min(safeNext, nextTotal);
  const remainingEstimate = Math.max(0, nextTotal - targetEstimate);
  const distributedOtherEstimates = distributeSecondsByCurrentWeights(remainingEstimate, otherTaskIds, todo.tasks);
  const tasks = {
    ...todo.tasks,
    [taskId]: {
      ...task,
      estimatedTime: targetEstimate,
    },
  };

  for (const id of otherTaskIds) {
    tasks[id] = {
      ...tasks[id],
      estimatedTime: distributedOtherEstimates[id] || 0,
    };
  }

  return {
    ...todo,
    tasks,
    taskTotal: nonBreakTaskIds.length,
    estimatedTimeTodo: nextTotal,
  };
}

export function addTaskWithProportionalEstimate(todo: TodoFlow, task: Task): TodoFlow {
  if (task.isTaskBreak) {
    return {
      ...todo,
      tasks: { ...todo.tasks, [task.id]: task },
      taskIds: [...todo.taskIds, task.id],
      taskTotal: todo.taskIds.filter((id) => {
        const item = todo.tasks[id];
        return item && !item.isTaskBreak;
      }).length,
    };
  }

  const nonBreakTaskIds = todo.taskIds.filter((id) => {
    const item = todo.tasks[id];
    return item && !item.isTaskBreak;
  });
  const todoTotal = getTodoEstimatedSeconds(todo);
  const currentEstimates = nonBreakTaskIds.map((id) => Math.max(0, Math.floor(todo.tasks[id]?.estimatedTime || 0)));
  const newTaskEstimate = todoTotal > 0 && currentEstimates.length > 0 ? Math.min(...currentEstimates) : Math.max(0, Math.floor(task.estimatedTime || 0));
  const remainingEstimate = Math.max(0, todoTotal - newTaskEstimate);
  const distributedExistingEstimates = distributeSecondsByCurrentWeights(remainingEstimate, nonBreakTaskIds, todo.tasks);
  const tasks: Record<string, Task> = {
    ...todo.tasks,
    [task.id]: {
      ...task,
      estimatedTime: newTaskEstimate,
    },
  };

  for (const id of nonBreakTaskIds) {
    tasks[id] = {
      ...tasks[id],
      estimatedTime: distributedExistingEstimates[id] || 0,
    };
  }

  const taskIds = [...todo.taskIds, task.id];

  return {
    ...todo,
    tasks,
    taskIds,
    taskTotal: nonBreakTaskIds.length + 1,
    estimatedTimeTodo: todoTotal,
  };
}

export function resizeTaskAllocationBoundary(
  todo: TodoFlow,
  previousTaskId: string,
  nextTaskId: string,
  deltaSeconds: number
): TodoFlow {
  const previousTask = todo.tasks[previousTaskId];
  const nextTask = todo.tasks[nextTaskId];
  if (!previousTask || !nextTask || previousTask.isTaskBreak || nextTask.isTaskBreak) {
    return todo;
  }

  const previousEstimate = Math.max(0, Math.floor(previousTask.estimatedTime || 0));
  const nextEstimate = Math.max(0, Math.floor(nextTask.estimatedTime || 0));
  const pairTotal = previousEstimate + nextEstimate;
  const nextPreviousEstimate = Math.max(0, Math.min(pairTotal, previousEstimate + Math.floor(deltaSeconds)));
  const nextNextEstimate = pairTotal - nextPreviousEstimate;

  return {
    ...todo,
    tasks: {
      ...todo.tasks,
      [previousTaskId]: {
        ...previousTask,
        estimatedTime: nextPreviousEstimate,
      },
      [nextTaskId]: {
        ...nextTask,
        estimatedTime: nextNextEstimate,
      },
    },
  };
}

export function resizeTaskAllocationBoundaryFromDrag(
  todo: TodoFlow,
  previousTaskId: string,
  nextTaskId: string,
  drag: { startY: number; currentY: number; totalSeconds: number; laneHeight: number }
): TodoFlow {
  const safeLaneHeight = Math.max(1, drag.laneHeight);
  const safeTotalSeconds = Math.max(1, drag.totalSeconds);
  const deltaSeconds = Math.round(((drag.currentY - drag.startY) / safeLaneHeight) * safeTotalSeconds);
  return resizeTaskAllocationBoundary(todo, previousTaskId, nextTaskId, deltaSeconds);
}

export function reorderTodoTaskIds(todo: TodoFlow, fromIndex: number, toIndex: number): TodoFlow {
  const taskIds = [...todo.taskIds];
  if (fromIndex < 0 || fromIndex >= taskIds.length || toIndex < 0 || toIndex >= taskIds.length) {
    return todo;
  }
  if (fromIndex === toIndex) {
    return todo;
  }

  const [movedTaskId] = taskIds.splice(fromIndex, 1);
  taskIds.splice(toIndex, 0, movedTaskId);

  return {
    ...todo,
    taskIds,
  };
}

export type ResizeTodoFlowScheduleDurationResult =
  | { ok: true; todo: TodoFlow }
  | { ok: false; reason: string };

export function resizeTodoFlowScheduleDuration(
  todo: TodoFlow,
  nextTotalSeconds: number,
  otherTodos: TodoFlow[] = []
): ResizeTodoFlowScheduleDurationResult {
  const safeNextTotal = Math.max(0, Math.floor(nextTotalSeconds));
  const taskTotal = getTodoTaskEstimatedSeconds(todo);
  if (safeNextTotal < taskTotal) {
    return { ok: false, reason: 'TodoFlow total time cannot be shorter than the current tasks total' };
  }

  const slots = todo.scheduleSlots || [];
  if (slots.length === 0) {
    return {
      ok: true,
      todo: {
        ...todo,
        estimatedTimeTodo: safeNextTotal,
      },
    };
  }

  const currentTotal = getScheduleSlotsDurationSeconds(slots) || 0;
  if (safeNextTotal < currentTotal) {
    return { ok: false, reason: 'TodoFlow total time can only be extended' };
  }

  const deltaSeconds = safeNextTotal - currentTotal;
  const sortedSlots = [...slots].sort((a, b) => `${a.dateKey}T${a.startTime}`.localeCompare(`${b.dateKey}T${b.startTime}`));
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const lastSlotStart = parseTimeString(lastSlot.startTime);
  const lastSlotDuration = secondsBetweenTimeStrings(lastSlot.startTime, lastSlot.endTime);
  const nextLastSlot: ScheduleSlot = {
    ...lastSlot,
    endTime: secondsFromMidnightToTimeString(lastSlotStart + lastSlotDuration + deltaSeconds),
  };

  if (parseTimeString(nextLastSlot.endTime) - lastSlotStart !== lastSlotDuration + deltaSeconds) {
    return { ok: false, reason: 'TodoFlow total time cannot pass midnight' };
  }

  const otherSlots = otherTodos
    .filter((item) => item.id !== todo.id)
    .flatMap((item) => item.scheduleSlots || []);
  if (hasOverlappingScheduleSlot(nextLastSlot, otherSlots)) {
    return { ok: false, reason: 'This total time overlaps with another TodoFlow' };
  }

  const scheduleSlots = slots.map((slot) =>
    slot.dateKey === lastSlot.dateKey && slot.startTime === lastSlot.startTime && slot.endTime === lastSlot.endTime
      ? nextLastSlot
      : slot
  );

  return {
    ok: true,
    todo: {
      ...todo,
      scheduleSlots,
      estimatedTimeTodo: safeNextTotal,
      lastNotifiedDate: undefined,
    },
  };
}

export function hasTodoFlowStarted(todo: TodoFlow): boolean {
  const hasTaskProgress = todo.taskIds.some((taskId) => {
    const task = todo.tasks[taskId];
    return Boolean(
      task &&
        (task.status === TaskStatus.PAUSED ||
          task.status === TaskStatus.IN_PROGRESS ||
          task.status === TaskStatus.COMPLETED ||
          (task.actualTime || 0) > 0)
    );
  });

  const hasTodoProgress =
    Boolean(todo.currentTaskId) ||
    (todo.actualTimeTodo || 0) > 0 ||
    (todo.taskCompleted || 0) > 0 ||
    todo.status !== TodoStatus.STOP;

  return hasTodoProgress || hasTaskProgress;
}

export function canResumeTodoFlowEntry(todo: TodoFlow): boolean {
  const currentTask = todo.currentTaskId ? todo.tasks[todo.currentTaskId] : undefined;
  return Boolean(currentTask && currentTask.status !== TaskStatus.COMPLETED);
}

export function getTodoFlowLaunchLabel(todo: TodoFlow): 'Start' | 'Resume' {
  return hasTodoFlowStarted(todo) ? 'Resume' : 'Start';
}

export function resetTodoFlowProgress(todo: TodoFlow): TodoFlow {
  const taskIds = todo.taskIds.filter((id) => !id.includes(PrefixType.BREAK_PREFIX));
  const tasks = taskIds.reduce<Record<string, Task>>((nextTasks, id) => {
    const task = todo.tasks[id];
    if (task) {
      nextTasks[id] = { ...task, status: TaskStatus.NOT_STARTED, actualTime: 0 };
    }
    return nextTasks;
  }, {});

  return {
    ...todo,
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: taskIds.length,
    actualTimeTodo: 0,
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
    taskIds,
    tasks,
  };
}

export function getScheduleSlotForDate(slots: ScheduleSlot[] | undefined, dateKey: string): ScheduleSlot | undefined {
  return slots?.find((slot) => slot.dateKey === dateKey);
}

function applyScheduleSlot(slots: ScheduleSlot[] | undefined, nextSlot: ScheduleSlot): ScheduleSlot[] {
  return [...(slots || []).filter((slot) => slot.dateKey !== nextSlot.dateKey), nextSlot].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );
}

export function setTodoScheduleSlot(todo: TodoFlow, slot: ScheduleSlot): TodoFlow {
  const scheduleSlots = applyScheduleSlot(todo.scheduleSlots, slot);
  const dateKeys = getScheduleSlotDateKeys(scheduleSlots);
  const currentEstimate = Math.max(0, Math.floor(todo.estimatedTimeTodo || 0));
  const slotDuration = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const taskTotal = getTodoTaskEstimatedSeconds(todo);
  const nextEstimate = Math.max(currentEstimate, slotDuration, taskTotal);
  const nextTodo = {
    ...todo,
    scheduleSlots,
    scheduledDate: dateKeys[0],
    scheduledDates: dateKeys.length > 1 ? dateKeys : undefined,
    estimatedTimeTodo: nextEstimate,
    lastNotifiedDate: undefined,
  };
  const ensuredTodo = ensureTodoDayPlans(nextTodo);
  const existingPlan = ensuredTodo.dayPlans?.[slot.dateKey];

  return {
    ...ensuredTodo,
    dayPlans: {
      ...(ensuredTodo.dayPlans || {}),
      [slot.dateKey]: normalizeTodoDayPlan(ensuredTodo, slot.dateKey, {
        ...(existingPlan || createTodoDayPlan(ensuredTodo, slot.dateKey)),
        dateKey: slot.dateKey,
        scheduleSlot: { ...slot },
        estimatedTimeTodo: Math.max(existingPlan?.estimatedTimeTodo ?? nextEstimate, taskTotal),
      }),
    },
    lastNotifiedDate: undefined,
  };
}

export function setTaskScheduleSlot(task: Task, slot: ScheduleSlot): Task {
  const duration = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
  const scheduleSlots = applyScheduleSlot(task.scheduleSlots, slot);
  const dateKeys = getScheduleSlotDateKeys(scheduleSlots);

  return {
    ...task,
    scheduleSlots,
    scheduledDate: dateKeys[0],
    estimatedTime: duration,
    lastNotifiedDate: undefined,
  };
}

export function unsetTaskAssignedDate(task: Task, dateKey: string): Task {
  const scheduleSlots = (task.scheduleSlots || []).filter((slot) => slot.dateKey !== dateKey);
  const remainingDateKeys =
    scheduleSlots.length > 0
      ? getScheduleSlotDateKeys(scheduleSlots)
      : getTaskScheduleDateKeys(task).filter((assignedDateKey) => assignedDateKey !== dateKey);

  return {
    ...task,
    scheduledDate: remainingDateKeys[0],
    scheduleSlots: scheduleSlots.length > 0 ? scheduleSlots : undefined,
    lastNotifiedDate: undefined,
  };
}

export function groupScheduledItemsByDate(todos: TodoFlow[], tasks: Task[]): ScheduledGroups {
  const groups = { unscheduled: emptyGroup() } as ScheduledGroups;

  for (const todo of todos) {
    const dateKeys = getTodoScheduleDateKeys(todo);
    if (dateKeys.length === 0) {
      groups.unscheduled.todos.push(todo);
    } else {
      for (const key of dateKeys) {
        groups[key] ||= emptyGroup();
        groups[key].todos.push(todo);
      }
    }
  }

  for (const task of tasks) {
    const dateKeys = getTaskScheduleDateKeys(task);
    if (dateKeys.length === 0) {
      groups.unscheduled.tasks.push(task);
    } else {
      for (const key of dateKeys) {
        groups[key] ||= emptyGroup();
        groups[key].tasks.push(task);
      }
    }
  }

  return groups;
}

export function groupScheduledItemsForDateRange(
  todos: TodoFlow[],
  tasks: Task[],
  selectedDateKeys: string[]
): ScheduledRangeItems {
  const selected = new Set(selectedDateKeys);

  return {
    todos: todos
      .map((item) => {
        const dateKeys = getTodoScheduleDateKeys(item).filter((dateKey) => selected.has(dateKey));
        return {
          item,
          dateKeys,
          slots: (item.scheduleSlots || []).filter((slot) => selected.has(slot.dateKey)),
        };
      })
      .filter((group) => group.dateKeys.length > 0),
    tasks: tasks
      .map((item) => {
        const dateKeys = getTaskScheduleDateKeys(item).filter((dateKey) => selected.has(dateKey));
        return {
          item,
          dateKeys,
          slots: (item.scheduleSlots || []).filter((slot) => selected.has(slot.dateKey)),
        };
      })
      .filter((group) => group.dateKeys.length > 0),
  };
}

export function createTodoFlowFromTask(task: Task, todoId: string, taskId: string): TodoFlow {
  const copiedTask: Task = {
    ...task,
    id: taskId,
    actualTime: 0,
    status: TaskStatus.NOT_STARTED,
    subTasks: task.subTasks.map((subTask) => ({ ...subTask })),
  };

  return {
    id: todoId,
    note: task.title || 'Scheduled task',
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: 1,
    estimatedTimeTodo: copiedTask.estimatedTime || 0,
    actualTimeTodo: 0,
    taskIds: [taskId],
    tasks: { [taskId]: copiedTask },
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
    scheduledDate: task.scheduledDate,
    scheduleSlots: task.scheduleSlots ? task.scheduleSlots.map((slot) => ({ ...slot })) : undefined,
  };
}

export function createScheduledTodoFlow(todoId: string, scheduledDate: string | string[]): TodoFlow {
  const scheduledDates = Array.isArray(scheduledDate) ? scheduledDate : [scheduledDate];

  return {
    id: todoId,
    note: '',
    status: TodoStatus.STOP,
    taskCompleted: 0,
    taskTotal: 0,
    estimatedTimeTodo: 0,
    actualTimeTodo: 0,
    taskIds: [],
    tasks: {},
    currentTaskId: undefined,
    timeLeft: 0,
    timer: null,
    scheduledDate: scheduledDates[0],
    scheduledDates: scheduledDates.length > 1 ? scheduledDates : undefined,
  };
}

export function createDefaultTasksForSchedule(totalEstimatedSeconds: number, taskIds: string[]): Task[] {
  const safeTotal = Math.max(0, Math.floor(totalEstimatedSeconds));
  const ids = taskIds.slice(0, 3);
  const baseDuration = Math.floor(safeTotal / ids.length);
  let remainder = safeTotal - baseDuration * ids.length;

  return ids.map((id, index) => {
    const estimatedTime = baseDuration + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    return {
      id,
      title: `Task ${index + 1}`,
      estimatedTime,
      actualTime: 0,
      status: TaskStatus.NOT_STARTED,
      subTasks: [],
    };
  });
}

export function syncTodoTaskEstimatesWithDuration(todo: TodoFlow, totalEstimatedSeconds: number): TodoFlow {
  const taskIds = todo.taskIds.filter((id) => {
    const task = todo.tasks[id];
    return task && !task.isTaskBreak;
  });
  const safeTotal = Math.max(0, Math.floor(totalEstimatedSeconds));

  if (taskIds.length === 0) {
    return {
      ...todo,
      estimatedTimeTodo: safeTotal,
      taskTotal: 0,
    };
  }

  return {
    ...todo,
    taskTotal: taskIds.length,
    estimatedTimeTodo: Math.max(safeTotal, getTodoTaskEstimatedSeconds(todo)),
  };
}

export function getDueNotificationItems(
  todos: TodoFlow[],
  tasks: Task[],
  todayKey = toDateKey(new Date())
): DueNotificationItem[] {
  const dueTodos = todos
    .filter((todo) => getTodoScheduleDateKeys(todo).includes(todayKey) && todo.lastNotifiedDate !== todayKey)
    .map((todo) => ({ type: 'todo' as const, id: todo.id, title: todo.note || 'TodoFlow', item: todo }));

  const dueTasks = tasks
    .filter((task) => task.scheduledDate === todayKey && task.lastNotifiedDate !== todayKey)
    .map((task) => ({ type: 'task' as const, id: task.id, title: task.title || 'Task', item: task }));

  return [...dueTodos, ...dueTasks];
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function startMinutesFromSlot(slot: ScheduleSlot): number {
  const [hours, minutes] = slot.startTime.split(':').map(Number);
  return hours * 60 + minutes;
}

function isSlotDueForReminder(slot: ScheduleSlot, now: Date, reminderMinutes: number): boolean {
  if (slot.dateKey !== toDateKey(now)) {
    return false;
  }

  return startMinutesFromSlot(slot) - minutesSinceMidnight(now) === reminderMinutes;
}

function getSlotNotificationKey(slot: ScheduleSlot): string {
  return `${slot.dateKey}T${slot.startTime}`;
}

export function getDueSlotNotificationItems(
  todos: TodoFlow[],
  tasks: Task[],
  now = new Date(),
  reminderMinutes = 15
): DueSlotNotificationItem[] {
  const dueTodos = todos.flatMap((todo) =>
    (todo.scheduleSlots || [])
      .filter((slot) => isSlotDueForReminder(slot, now, reminderMinutes))
      .filter((slot) => todo.lastNotifiedDate !== getSlotNotificationKey(slot))
      .map((slot) => ({
        type: 'todo' as const,
        id: todo.id,
        title: todo.note || 'TodoFlow',
        item: todo,
        slot,
        notificationKey: getSlotNotificationKey(slot),
      }))
  );

  const dueTasks = tasks.flatMap((task) =>
    (task.scheduleSlots || [])
      .filter((slot) => isSlotDueForReminder(slot, now, reminderMinutes))
      .filter((slot) => task.lastNotifiedDate !== getSlotNotificationKey(slot))
      .map((slot) => ({
        type: 'task' as const,
        id: task.id,
        title: task.title || 'Task',
        item: task,
        slot,
        notificationKey: getSlotNotificationKey(slot),
      }))
  );

  return [...dueTodos, ...dueTasks];
}
