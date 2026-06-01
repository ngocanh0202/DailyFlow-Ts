function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ArchivedTodoTaskSummary {
  taskId: string;
  title: string;
  status: string;
  completed: boolean;
  estimatedTime: number;
  actualTime: number;
  timeRatio: number;
}

export interface ArchivedTodoSummary {
  id: string;
  todoId: string;
  note: string;
  removedDateKeys: string[];
  archivedAt: string;
  scheduleSlots: Array<{ dateKey: string; startTime: string; endTime: string }>;
  totalEstimatedTime: number;
  totalActualTime: number;
  taskCompleted: number;
  taskTotal: number;
  tasks: ArchivedTodoTaskSummary[];
}

type ArchivedTodoTaskSummaryInput = Omit<ArchivedTodoTaskSummary, 'timeRatio'>;

export function getTodoAssignedDateKeys(todo: any): string[] {
  const keys = new Set<string>();

  if (typeof todo?.scheduledDate === 'string' && todo.scheduledDate) {
    keys.add(todo.scheduledDate);
  }

  if (Array.isArray(todo?.scheduledDates)) {
    todo.scheduledDates.forEach((dateKey: unknown) => {
      if (typeof dateKey === 'string' && dateKey) {
        keys.add(dateKey);
      }
    });
  }

  if (Array.isArray(todo?.scheduleSlots)) {
    todo.scheduleSlots.forEach((slot: any) => {
      if (typeof slot?.dateKey === 'string' && slot.dateKey) {
        keys.add(slot.dateKey);
      }
    });
  }

  return Array.from(keys).sort();
}

export function isAssignedTodoOlderThanCutoff(todo: any, cutoffDateKey: string): boolean {
  const assignedDateKeys = getTodoAssignedDateKeys(todo);
  return assignedDateKeys.length > 0 && assignedDateKeys.every((dateKey) => dateKey < cutoffDateKey);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function getTodoScheduleSlots(todo: any): Array<{ dateKey: string; startTime: string; endTime: string }> {
  return Array.isArray(todo?.scheduleSlots)
    ? todo.scheduleSlots.filter((slot: any) => typeof slot?.dateKey === 'string')
    : [];
}

function applyActiveDateKeys<T>(todo: T, activeDateKeys: string[]): T {
  const activeKeySet = new Set(activeDateKeys);
  const scheduleSlots = getTodoScheduleSlots(todo).filter((slot) => activeKeySet.has(slot.dateKey));
  const dayPlans = (todo as any)?.dayPlans && typeof (todo as any).dayPlans === 'object'
    ? Object.fromEntries(
        Object.entries((todo as any).dayPlans).filter(([dateKey]) => activeKeySet.has(dateKey))
      )
    : undefined;
  const nextTodo: any = {
    ...(todo as any),
    scheduledDate: activeDateKeys[0],
    scheduledDates: activeDateKeys.length > 1 ? activeDateKeys : undefined,
    scheduleSlots: scheduleSlots.length > 0 ? scheduleSlots : undefined,
    dayPlans: dayPlans && Object.keys(dayPlans).length > 0 ? dayPlans : undefined,
    lastNotifiedDate: undefined,
  };

  return nextTodo;
}

export function buildArchivedTodoSummary(todo: any, removedDateKeys: string[], now = new Date()): ArchivedTodoSummary {
  const taskItems: ArchivedTodoTaskSummaryInput[] = Array.isArray(todo?.taskIds)
    ? todo.taskIds
        .map((taskId: string) => todo?.tasks?.[taskId])
        .filter(Boolean)
        .filter((task: any) => !task.isTaskBreak)
        .map((task: any) => {
          const estimatedTime = Math.max(0, Math.floor(task.estimatedTime || 0));
          return {
            taskId: task.id,
            title: task.title || 'Untitled',
            status: task.status || 'Not Started',
            completed: task.status === 'Completed',
            estimatedTime,
            actualTime: Math.max(0, Math.floor(task.actualTime || 0)),
          };
        })
    : [];
  const taskEstimatedTotal = taskItems.reduce((total: number, task: ArchivedTodoTaskSummaryInput) => total + task.estimatedTime, 0);
  const totalEstimatedTime = Math.max(0, Math.floor(todo?.estimatedTimeTodo || 0), taskEstimatedTotal);
  const tasks: ArchivedTodoTaskSummary[] = taskItems.map((task: ArchivedTodoTaskSummaryInput) => ({
    ...task,
    timeRatio: totalEstimatedTime > 0 ? task.estimatedTime / totalEstimatedTime : 0,
  }));
  const removedDateKeySet = new Set(removedDateKeys);

  return {
    id: `${todo?.id || 'todo'}-${removedDateKeys.join('-')}-${now.getTime()}`,
    todoId: todo?.id || '',
    note: todo?.note || '',
    removedDateKeys: uniqueSorted(removedDateKeys),
    archivedAt: now.toISOString(),
    scheduleSlots: getTodoScheduleSlots(todo).filter((slot) => removedDateKeySet.has(slot.dateKey)),
    totalEstimatedTime,
    totalActualTime: Math.max(0, Math.floor(todo?.actualTimeTodo || 0)),
    taskCompleted: Math.max(0, Math.floor(todo?.taskCompleted || 0)),
    taskTotal: Math.max(0, Math.floor(todo?.taskTotal || tasks.length)),
    tasks,
  };
}

export function splitExpiredAssignedTodos<T>(
  todos: T[],
  now = new Date()
): { activeTodos: T[]; expiredTodos: T[]; archivedSummaries: ArchivedTodoSummary[] } {
  const todayKey = toDateKey(now);
  const activeTodos: T[] = [];
  const expiredTodos: T[] = [];
  const archivedSummaries: ArchivedTodoSummary[] = [];

  todos.forEach((todo) => {
    const assignedDateKeys = getTodoAssignedDateKeys(todo);
    if (assignedDateKeys.length === 0) {
      activeTodos.push(todo);
      return;
    }

    const expiredDateKeys = assignedDateKeys.filter((dateKey) => dateKey < todayKey);
    const activeDateKeys = assignedDateKeys.filter((dateKey) => dateKey >= todayKey);

    if (expiredDateKeys.length > 0) {
      archivedSummaries.push(buildArchivedTodoSummary(todo, expiredDateKeys, now));
    }

    if (activeDateKeys.length === 0) {
      expiredTodos.push(todo);
      return;
    }

    activeTodos.push(expiredDateKeys.length > 0 ? applyActiveDateKeys(todo, activeDateKeys) : todo);
  });

  return { activeTodos, expiredTodos, archivedSummaries };
}
