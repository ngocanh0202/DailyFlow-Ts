interface ScheduleSlot {
  dateKey: string;
  startTime: string;
  endTime: string;
}

interface TodoFlowDayTaskState {
  estimatedTime: number;
  actualTime: number;
  status: TaskStatus;
}

interface TodoFlowDayPlan {
  dateKey: string;
  scheduleSlot?: ScheduleSlot;
  status: TodoStatus;
  estimatedTimeTodo: number;
  actualTimeTodo: number;
  taskCompleted: number;
  taskTotal: number;
  taskAllocations: Record<string, TodoFlowDayTaskState>;
  currentTaskId?: string;
  timeLeft?: number;
  lastNotifiedDate?: string;
}

interface TodoFlow {
  id: string;
  note: string;
  status: TodoStatus;
  taskCompleted: number;
  taskTotal: number;
  estimatedTimeTodo: number;
  actualTimeTodo: number;
  taskIds: string[];
  tasks: { [key: string]: Task };
  currentTaskId?: string;
  timeLeft?: number;
  timer?: NodeJS.Timeout | null;
  scheduledDate?: string;
  scheduledDates?: string[];
  scheduleSlots?: ScheduleSlot[];
  dayPlans?: Record<string, TodoFlowDayPlan>;
  activeDateKey?: string;
  lastNotifiedDate?: string;
}
