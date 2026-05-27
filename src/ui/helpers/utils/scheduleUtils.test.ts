import { describe, expect, it } from 'vitest';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import {
  buildMonthDays,
  buildCalendarWindowDays,
  getMonthCalendarGridStart,
  createDefaultTasksForSchedule,
  createScheduledTodoFlow,
  applyTodoDateState,
  createTodoFlowFromTask,
  createAiTodoFlowPrompt,
  createAiTodoFlowAnalysisPrompt,
  createTodoFlowFromAiDraft,
  buildAiTodoFlowAnalysisContext,
  createAiAnalysisHistoryEntry,
  createAiTodoFlowDraftHistoryEntry,
  parseAiTodoFlowAnalysisResult,
  parseAiTodoFlowDraftResult,
  addTaskWithProportionalEstimate,
  filterManageItems,
  formatDateChipLabels,
  formatDateChipItems,
  formatDateKeyList,
  formatScheduleSlotChipLabels,
  findAutoFitScheduleSlot,
  getTodoForDate,
  getPersistableTodoDateState,
  getTodoDayPlan,
  getTodoFlowAnalytics,
  getTodoEstimatedSeconds,
  getRenderableTodoFlowTaskIds,
  getTodoFlowCurrentTask,
  getTodoScheduleMinimumSlotDurationSeconds,
  getTodoScheduleMinimumTotalDurationSeconds,
  getTodoScheduleSelectionDurationSeconds,
  getTodoScheduleSelectionRangeMinutes,
  getTodoScheduleSaveEstimateDurationSeconds,
  getTodoScheduleSlotTargetDurationSeconds,
  getTodoScheduleTargetDurationSeconds,
  getScheduleSlotForDate,
  getDueNotificationItems,
  getDueSlotNotificationItems,
  getTodoFlowLaunchLabel,
  getTodoScheduleDateKeys,
  getTodoTaskEstimatedSeconds,
  hasAiTodoFlowContextData,
  resizeTodoFlowScheduleDuration,
  canResumeTodoFlowEntry,
  groupScheduledItemsByDate,
  groupScheduledItemsForDateRange,
  hasOverlappingScheduleSlot,
  hasTodoFlowStarted,
  isScheduleSlotSelectable,
  isPastDateKey,
  listDateKeysBetween,
  moveScheduleSlotPreservingDuration,
  splitTodoFlowForDate,
  resetTodoFlowProgress,
  redistributeTaskEstimateWithinTodo,
  reorderTodoTaskIds,
  resizeTaskAllocationBoundary,
  resizeTaskAllocationBoundaryFromDrag,
  secondsBetweenTimeStrings,
  setTaskScheduleSlot,
  setTodoAssignedDate,
  setTodoAssignedDates,
  setTodoScheduleSlot,
  ensureTodoDayPlans,
  syncTodoTaskEstimatesWithDuration,
  toggleDateKeySelection,
  unsetTodoAssignedDate,
  toDateKey,
} from './scheduleUtils';

const task = (id: string, title: string, scheduledDate?: string): Task => ({
  id,
  title,
  estimatedTime: 120,
  actualTime: 0,
  status: TaskStatus.NOT_STARTED,
  subTasks: [],
  scheduledDate,
});

const todo = (id: string, note: string, scheduledDate?: string): TodoFlow => ({
  id,
  note,
  status: TodoStatus.STOP,
  taskCompleted: 0,
  taskTotal: 0,
  estimatedTimeTodo: 120,
  actualTimeTodo: 0,
  taskIds: [],
  tasks: {},
  timeLeft: 0,
  timer: null,
  scheduledDate,
});

describe('scheduleUtils', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 4, 12))).toBe('2026-05-12');
  });

  it('builds a month grid including leading and trailing days', () => {
    const days = buildMonthDays(new Date(2026, 4, 12));
    expect(days.length).toBeGreaterThanOrEqual(35);
    expect(days[0].dateKey).toBe('2026-04-26');
    expect(days.some((day) => day.dateKey === '2026-05-12' && day.isCurrentMonth)).toBe(true);
  });

  it('returns the calendar grid start for the requested month', () => {
    const gridStart = getMonthCalendarGridStart(new Date(2026, 4, 19));
    expect(toDateKey(gridStart)).toBe('2026-04-26');
  });

  it('builds a rolling calendar window from the requested week', () => {
    const days = buildCalendarWindowDays(new Date(2026, 4, 13), new Date(2026, 4, 18));

    expect(days).toHaveLength(42);
    expect(days[0].dateKey).toBe('2026-05-10');
    expect(days[41].dateKey).toBe('2026-06-20');
    expect(days.some((day) => day.dateKey === '2026-05-18' && day.isToday)).toBe(true);
  });

  it('groups scheduled todos and standalone tasks by date', () => {
    const grouped = groupScheduledItemsByDate(
      [todo('todo-1', 'Write report', '2026-05-12')],
      [task('task-1', 'Email client', '2026-05-12'), task('task-2', 'Backlog')]
    );

    expect(grouped['2026-05-12'].todos).toHaveLength(1);
    expect(grouped['2026-05-12'].tasks).toHaveLength(1);
    expect(grouped.unscheduled.tasks).toHaveLength(1);
  });

  it('creates a new TodoFlow from a standalone task without mutating the original task', () => {
    const original = task('task-1', 'Email client', '2026-05-12');
    const created = createTodoFlowFromTask(original, 'todo-1', 'new-task-1');

    expect(created.id).toBe('todo-1');
    expect(created.note).toBe('Email client');
    expect(created.taskIds).toEqual(['new-task-1']);
    expect(created.tasks['new-task-1'].title).toBe('Email client');
    expect(created.tasks['new-task-1'].status).toBe(TaskStatus.NOT_STARTED);
    expect(created.tasks['new-task-1'].actualTime).toBe(0);
    expect(original.id).toBe('task-1');
  });

  it('creates an empty TodoFlow for a selected calendar date', () => {
    const created = createScheduledTodoFlow('todo-1', '2026-05-13');

    expect(created.id).toBe('todo-1');
    expect(created.note).toBe('');
    expect(created.taskIds).toEqual([]);
    expect(created.tasks).toEqual({});
    expect(created.scheduledDate).toBe('2026-05-13');
    expect(created.status).toBe(TodoStatus.STOP);
    expect(created.timer).toBeNull();
  });

  it('creates an empty TodoFlow assigned to multiple selected calendar dates', () => {
    const created = createScheduledTodoFlow('todo-1', ['2026-05-13', '2026-05-14']);

    expect(created.scheduledDate).toBe('2026-05-13');
    expect(created.scheduledDates).toEqual(['2026-05-13', '2026-05-14']);
  });

  it('returns only renderable TodoFlow task ids when persisted task data is stale', () => {
    const staleTodo: TodoFlow = {
      ...todo('todo-1', 'Plan'),
      currentTaskId: 'missing-current',
      taskIds: ['task-1', 'missing-task', 'task-1', 'task-2', 'task-3'],
      tasks: {
        'task-1': task('task-1', 'Write'),
        'task-2': { ...task('task-2', 'Done'), status: TaskStatus.COMPLETED },
        'task-3': task('task-3', 'Review'),
      },
    };

    expect(getTodoFlowCurrentTask(staleTodo)).toBeUndefined();
    expect(getRenderableTodoFlowTaskIds(staleTodo)).toEqual(['task-1', 'task-3']);
  });

  it('deduplicates Manage items by id before rendering filter results', () => {
    const duplicatedTodos = [todo('todo-1', 'Plan'), todo('todo-1', 'Plan duplicate')];
    const duplicatedTasks = [task('task-1', 'Write'), task('task-1', 'Write duplicate'), task('task-2', 'Review')];

    const filtered = filterManageItems(duplicatedTodos, duplicatedTasks, '', 'all');

    expect(filtered.todos.map((item) => item.id)).toEqual(['todo-1']);
    expect(filtered.tasks.map((item) => item.id)).toEqual(['task-1', 'task-2']);
  });

  it('groups a multi-date TodoFlow into each assigned calendar date', () => {
    const grouped = groupScheduledItemsByDate(
      [{ ...todo('todo-1', 'Multi-day plan'), scheduledDates: ['2026-05-13', '2026-05-14'] }],
      []
    );

    expect(grouped['2026-05-13'].todos.map((item) => item.id)).toEqual(['todo-1']);
    expect(grouped['2026-05-14'].todos.map((item) => item.id)).toEqual(['todo-1']);
    expect(grouped.unscheduled.todos).toHaveLength(0);
  });

  it('returns assigned dates from scheduledDates before scheduledDate', () => {
    expect(
      getTodoScheduleDateKeys({
        ...todo('todo-1', 'Plan', '2026-05-12'),
        scheduledDates: ['2026-05-13', '2026-05-14'],
      })
    ).toEqual(['2026-05-13', '2026-05-14']);
  });

  it('returns assigned dates from TodoFlow schedule slots', () => {
    expect(
      getTodoScheduleDateKeys({
        ...todo('todo-1', 'Plan', '2026-05-12'),
        scheduleSlots: [
          { dateKey: '2026-05-14', startTime: '09:00', endTime: '10:30' },
          { dateKey: '2026-05-13', startTime: '08:00', endTime: '09:00' },
        ],
      })
    ).toEqual(['2026-05-13', '2026-05-14']);
  });

  it('adds a calendar date to an existing TodoFlow without replacing other assigned dates', () => {
    const updated = setTodoAssignedDate(
      { ...todo('todo-1', 'Plan', '2026-05-13'), scheduledDates: ['2026-05-13', '2026-05-14'] },
      '2026-05-15'
    );

    expect(updated.scheduledDate).toBe('2026-05-13');
    expect(updated.scheduledDates).toEqual(['2026-05-13', '2026-05-14', '2026-05-15']);
    expect(updated.lastNotifiedDate).toBeUndefined();
  });

  it('sets multiple assigned dates without changing TodoFlow estimated time', () => {
    const source = {
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 5400,
      scheduleSlots: [{ dateKey: '2026-05-13', startTime: '09:00', endTime: '10:30' }],
    };

    const updated = setTodoAssignedDates(source, ['2026-05-15', '2026-05-14', '2026-05-14']);

    expect(updated.scheduledDate).toBe('2026-05-14');
    expect(updated.scheduledDates).toEqual(['2026-05-14', '2026-05-15']);
    expect(updated.scheduleSlots).toBeUndefined();
    expect(updated.estimatedTimeTodo).toBe(5400);
  });

  it('uses TodoFlow estimated time as schedule target when no slots exist', () => {
    expect(getTodoScheduleTargetDurationSeconds({ ...todo('todo-1', 'Plan'), estimatedTimeTodo: 7200 })).toBe(7200);
    expect(
      getTodoScheduleTargetDurationSeconds({
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 7200,
        scheduleSlots: [{ dateKey: '2026-05-14', startTime: '09:00', endTime: '10:30' }],
      })
    ).toBe(5400);
  });

  it('uses total slot duration as the TodoFlow schedule target for multi-day TodoFlows', () => {
    expect(
      getTodoScheduleTargetDurationSeconds({
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 18000,
        scheduleSlots: [
          { dateKey: '2026-05-14', startTime: '09:00', endTime: '11:30' },
          { dateKey: '2026-05-15', startTime: '09:00', endTime: '11:30' },
        ],
      })
    ).toBe(18000);
  });

  it('uses per-day slot duration as the slot target for multi-day TodoFlows', () => {
    expect(
      getTodoScheduleSlotTargetDurationSeconds({
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 18000,
        scheduleSlots: [
          { dateKey: '2026-05-14', startTime: '09:00', endTime: '11:30' },
          { dateKey: '2026-05-15', startTime: '09:00', endTime: '11:30' },
        ],
      })
    ).toBe(9000);
  });

  it('sets a TodoFlow schedule slot and updates estimated time from duration', () => {
    const updated = setTodoScheduleSlot({ ...todo('todo-1', 'Plan'), estimatedTimeTodo: 0 }, {
      dateKey: '2026-05-13',
      startTime: '09:15',
      endTime: '11:45',
    });

    expect(updated.scheduleSlots).toEqual([
      { dateKey: '2026-05-13', startTime: '09:15', endTime: '11:45' },
    ]);
    expect(updated.scheduledDate).toBe('2026-05-13');
    expect(updated.estimatedTimeTodo).toBe(9000);
    expect(getTodoDayPlan(updated, '2026-05-13')?.scheduleSlot).toEqual({
      dateKey: '2026-05-13',
      startTime: '09:15',
      endTime: '11:45',
    });
    expect(getTodoDayPlan(updated, '2026-05-13')?.estimatedTimeTodo).toBe(9000);
  });

  it('does not set a TodoFlow schedule estimate below the current tasks total', () => {
    const updated = setTodoScheduleSlot(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 0,
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
        },
      },
      {
        dateKey: '2026-05-13',
        startTime: '09:00',
        endTime: '10:00',
      }
    );

    expect(updated.estimatedTimeTodo).toBe(5400);
    expect(getTodoDayPlan(updated, '2026-05-13')?.estimatedTimeTodo).toBe(5400);
  });

  it('keeps existing TodoFlow estimated time when assigning repeated schedule slots', () => {
    const source = { ...todo('todo-1', 'Plan'), estimatedTimeTodo: 9000 };
    const firstSlot = setTodoScheduleSlot(source, {
      dateKey: '2026-05-13',
      startTime: '09:00',
      endTime: '11:30',
    });
    const updated = setTodoScheduleSlot(firstSlot, {
      dateKey: '2026-05-14',
      startTime: '11:00',
      endTime: '13:30',
    });

    expect(updated.scheduleSlots).toEqual([
      { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:30' },
      { dateKey: '2026-05-14', startTime: '11:00', endTime: '13:30' },
    ]);
    expect(updated.estimatedTimeTodo).toBe(9000);
  });

  it('updates only the edited day plan when replacing one TodoFlow schedule slot', () => {
    const source = ensureTodoDayPlans({
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 7200,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 3600 },
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
        { dateKey: '2026-05-14', startTime: '14:00', endTime: '16:00' },
      ],
    });

    const updated = setTodoScheduleSlot(source, {
      dateKey: '2026-05-14',
      startTime: '15:00',
      endTime: '18:00',
    });

    expect(getTodoDayPlan(updated, '2026-05-14')?.scheduleSlot).toEqual({
      dateKey: '2026-05-14',
      startTime: '15:00',
      endTime: '18:00',
    });
    expect(getTodoDayPlan(updated, '2026-05-14')?.estimatedTimeTodo).toBe(7200);
    expect(getTodoDayPlan(updated, '2026-05-13')?.scheduleSlot).toEqual({
      dateKey: '2026-05-13',
      startTime: '09:00',
      endTime: '11:00',
    });
  });

  it('migrates a multi-day TodoFlow into one cloned day plan per assigned date', () => {
    const source = {
      ...todo('todo-1', 'Shared plan'),
      estimatedTimeTodo: 7200,
      actualTimeTodo: 600,
      taskCompleted: 1,
      taskTotal: 2,
      currentTaskId: 'task-2',
      timeLeft: 300,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 2400, actualTime: 600, status: TaskStatus.COMPLETED },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 4800, actualTime: 0, status: TaskStatus.IN_PROGRESS },
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
        { dateKey: '2026-05-14', startTime: '14:00', endTime: '16:00' },
      ],
    };

    const migrated = ensureTodoDayPlans(source);

    expect(Object.keys(migrated.dayPlans || {})).toEqual(['2026-05-13', '2026-05-14']);
    expect(getTodoDayPlan(migrated, '2026-05-13')).toEqual(expect.objectContaining({
      dateKey: '2026-05-13',
      estimatedTimeTodo: 7200,
      actualTimeTodo: 600,
      taskCompleted: 1,
      taskTotal: 2,
      currentTaskId: 'task-2',
      timeLeft: 300,
      scheduleSlot: { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
    }));
    expect(getTodoDayPlan(migrated, '2026-05-14')?.taskAllocations['task-2']).toEqual({
      estimatedTime: 4800,
      actualTime: 0,
      status: TaskStatus.IN_PROGRESS,
    });
  });

  it('reads a TodoFlow through the selected day plan without changing other assigned days', () => {
    const source = ensureTodoDayPlans({
      ...todo('todo-1', 'Shared plan'),
      estimatedTimeTodo: 7200,
      actualTimeTodo: 0,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 3600 },
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
        { dateKey: '2026-05-14', startTime: '14:00', endTime: '17:00' },
      ],
      dayPlans: {
        '2026-05-14': {
          dateKey: '2026-05-14',
          scheduleSlot: { dateKey: '2026-05-14', startTime: '14:00', endTime: '17:00' },
          status: TodoStatus.STOP,
          estimatedTimeTodo: 10800,
          actualTimeTodo: 120,
          taskCompleted: 0,
          taskTotal: 2,
          taskAllocations: {
            'task-1': { estimatedTime: 7200, actualTime: 120, status: TaskStatus.IN_PROGRESS },
            'task-2': { estimatedTime: 3600, actualTime: 0, status: TaskStatus.NOT_STARTED },
          },
          currentTaskId: 'task-1',
          timeLeft: 120,
        },
      },
    });

    const scoped = getTodoForDate(source, '2026-05-14');

    expect(scoped.estimatedTimeTodo).toBe(10800);
    expect(scoped.actualTimeTodo).toBe(120);
    expect(scoped.currentTaskId).toBe('task-1');
    expect(scoped.tasks['task-1'].estimatedTime).toBe(7200);
    expect(scoped.tasks['task-1'].actualTime).toBe(120);
    expect(scoped.tasks['task-1'].status).toBe(TaskStatus.IN_PROGRESS);
    expect(getTodoForDate(source, '2026-05-13').tasks['task-1'].estimatedTime).toBe(3600);
  });

  it('normalizes a day plan estimate so it is not shorter than its task allocations', () => {
    const source = ensureTodoDayPlans({
      ...todo('todo-1', 'Shared plan'),
      estimatedTimeTodo: 1800,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 900 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 900 },
      },
      scheduleSlots: [{ dateKey: '2026-05-14', startTime: '14:00', endTime: '14:30' }],
      dayPlans: {
        '2026-05-14': {
          dateKey: '2026-05-14',
          scheduleSlot: { dateKey: '2026-05-14', startTime: '14:00', endTime: '14:30' },
          status: TodoStatus.STOP,
          estimatedTimeTodo: 1800,
          actualTimeTodo: 0,
          taskCompleted: 0,
          taskTotal: 2,
          taskAllocations: {
            'task-1': { estimatedTime: 1800, actualTime: 0, status: TaskStatus.NOT_STARTED },
            'task-2': { estimatedTime: 1800, actualTime: 0, status: TaskStatus.NOT_STARTED },
          },
        },
      },
    });

    expect(getTodoForDate(source, '2026-05-14').estimatedTimeTodo).toBe(3600);
  });

  it('applies edited time allocation only to the active TodoFlow day plan', () => {
    const source = ensureTodoDayPlans({
      ...todo('todo-1', 'Shared plan'),
      estimatedTimeTodo: 7200,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 3600 },
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
        { dateKey: '2026-05-14', startTime: '14:00', endTime: '16:00' },
      ],
    });
    const edited = {
      ...getTodoForDate(source, '2026-05-14'),
      estimatedTimeTodo: 9000,
      actualTimeTodo: 60,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        ...source.tasks,
        'task-1': { ...source.tasks['task-1'], estimatedTime: 6000, actualTime: 60, status: TaskStatus.PAUSED },
        'task-2': { ...source.tasks['task-2'], estimatedTime: 3000, actualTime: 0, status: TaskStatus.NOT_STARTED },
      },
      currentTaskId: 'task-1',
      timeLeft: 60,
    };

    const updated = applyTodoDateState(source, '2026-05-14', edited);

    expect(getTodoForDate(updated, '2026-05-14')).toEqual(expect.objectContaining({
      estimatedTimeTodo: 9000,
      actualTimeTodo: 60,
      currentTaskId: 'task-1',
      timeLeft: 60,
    }));
    expect(getTodoForDate(updated, '2026-05-14').tasks['task-1'].estimatedTime).toBe(6000);
    expect(getTodoForDate(updated, '2026-05-13').estimatedTimeTodo).toBe(7200);
    expect(getTodoForDate(updated, '2026-05-13').tasks['task-1'].estimatedTime).toBe(3600);
  });

  it('builds persisted TodoFlow state from an active scoped day without replacing other day plans', () => {
    const source = ensureTodoDayPlans({
      ...todo('todo-1', 'Shared plan'),
      estimatedTimeTodo: 7200,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 3600 },
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
        { dateKey: '2026-05-14', startTime: '14:00', endTime: '16:00' },
      ],
    });
    const scoped = {
      ...getTodoForDate(source, '2026-05-14'),
      status: TodoStatus.START_ON_PROGRESS,
      actualTimeTodo: 90,
      currentTaskId: 'task-2',
      timeLeft: 1200,
      tasks: {
        ...source.tasks,
        'task-1': { ...source.tasks['task-1'], status: TaskStatus.COMPLETED, actualTime: 3600 },
        'task-2': { ...source.tasks['task-2'], status: TaskStatus.IN_PROGRESS, actualTime: 90 },
      },
      activeDateKey: '2026-05-14',
      timer: setTimeout(() => undefined, 1),
    };

    const persisted = getPersistableTodoDateState(scoped);
    clearTimeout(scoped.timer as NodeJS.Timeout);

    expect(persisted.timer).toBeNull();
    expect(getTodoForDate(persisted, '2026-05-14')).toEqual(expect.objectContaining({
      status: TodoStatus.START_ON_PROGRESS,
      actualTimeTodo: 90,
      currentTaskId: 'task-2',
      timeLeft: 1200,
    }));
    expect(getTodoForDate(persisted, '2026-05-14').tasks['task-2'].status).toBe(TaskStatus.IN_PROGRESS);
    expect(getTodoForDate(persisted, '2026-05-13').status).toBe(TodoStatus.STOP);
    expect(getTodoForDate(persisted, '2026-05-13').tasks['task-1'].status).toBe(TaskStatus.NOT_STARTED);
  });

  it('replaces assigned TodoFlow dates and removes schedule slots outside the new date set', () => {
    const scheduledTodo = {
      ...todo('todo-1', 'Plan'),
      scheduledDate: '2026-05-13',
      scheduledDates: ['2026-05-13', '2026-05-14'],
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '11:00', endTime: '12:00' },
      ],
    };

    const updated = setTodoAssignedDates(scheduledTodo, ['2026-05-15']);

    expect(updated.scheduledDate).toBe('2026-05-15');
    expect(updated.scheduledDates).toBeUndefined();
    expect(updated.scheduleSlots).toBeUndefined();
  });

  it('uses existing schedule slot duration as the TodoFlow schedule target before falling back to estimates', () => {
    const scheduledTodo = {
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 7200,
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
      ],
    };

    expect(getTodoScheduleTargetDurationSeconds(scheduledTodo)).toBe(3600);
    expect(getTodoScheduleTargetDurationSeconds({ ...scheduledTodo, scheduleSlots: undefined })).toBe(7200);
  });

  it('uses existing TodoFlow estimate when first assigning schedule time', () => {
    const aiDraftTodo = {
      ...todo('todo-ai', 'AI draft'),
      estimatedTimeTodo: 9000,
    };

    expect(
      getTodoScheduleSelectionDurationSeconds({
        isCreateMode: false,
        selectedDurationSeconds: 15 * 60,
        targetScheduleDurationSeconds: aiDraftTodo.estimatedTimeTodo,
      })
    ).toBe(9000);
  });

  it('does not reduce TodoFlow estimate when saving an edited schedule', () => {
    const aiDraftTodo = {
      ...todo('todo-ai', 'AI draft'),
      estimatedTimeTodo: 9000,
      scheduleSlots: [{ dateKey: '2026-05-14', startTime: '09:00', endTime: '10:00' }],
    };

    expect(
      getTodoScheduleSaveEstimateDurationSeconds({
        todo: aiDraftTodo,
        isCreateMode: false,
        totalSelectedDurationSeconds: 3600,
      })
    ).toBe(9000);
  });

  it('does not save an edited schedule estimate below the current tasks total', () => {
    const scheduledTodo = {
      ...todo('todo-ai', 'AI draft'),
      estimatedTimeTodo: 3600,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
      },
      scheduleSlots: [{ dateKey: '2026-05-14', startTime: '09:00', endTime: '10:00' }],
    };

    expect(
      getTodoScheduleSaveEstimateDurationSeconds({
        todo: scheduledTodo,
        isCreateMode: false,
        totalSelectedDurationSeconds: 3600,
      })
    ).toBe(5400);
  });

  it('uses task total as schedule target when stored TodoFlow estimate is too short', () => {
    const source = {
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 600,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 1800 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
      },
    };

    expect(getTodoScheduleTargetDurationSeconds(source)).toBe(3600);
    expect(getTodoScheduleSlotTargetDurationSeconds(source)).toBe(3600);
  });

  it('uses TodoFlow estimate as editor minimum when edited TodoFlow has no initial schedule slots', () => {
    expect(
      getTodoScheduleMinimumTotalDurationSeconds({
        todo: { ...todo('todo-ai', 'AI draft'), estimatedTimeTodo: 9000 },
        isCreateMode: false,
        initialScheduleSlots: [],
      })
    ).toBe(9000);
  });

  it('uses current tasks total as editor minimum when it is longer than the TodoFlow estimate', () => {
    expect(
      getTodoScheduleMinimumTotalDurationSeconds({
        todo: {
          ...todo('todo-ai', 'AI draft'),
          estimatedTimeTodo: 3600,
          taskIds: ['task-1', 'task-2'],
          tasks: {
            'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
            'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
          },
        },
        isCreateMode: false,
        initialScheduleSlots: [],
      })
    ).toBe(5400);
  });

  it('uses TodoFlow estimate as per-slot resize minimum for edited TodoFlows', () => {
    expect(
      getTodoScheduleMinimumSlotDurationSeconds({
        todo: {
          ...todo('todo-ai', 'AI draft'),
          estimatedTimeTodo: 9000,
          scheduleSlots: [
            { dateKey: '2026-05-14', startTime: '09:00', endTime: '11:30' },
            { dateKey: '2026-05-15', startTime: '09:00', endTime: '11:30' },
          ],
        },
        isCreateMode: false,
        dateKey: '2026-05-14',
        minimumStepSeconds: 900,
      })
    ).toBe(9000);
  });

  it('uses current tasks total as per-slot resize minimum for edited TodoFlows', () => {
    expect(
      getTodoScheduleMinimumSlotDurationSeconds({
        todo: {
          ...todo('todo-ai', 'AI draft'),
          estimatedTimeTodo: 3600,
          taskIds: ['task-1', 'task-2'],
          tasks: {
            'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
            'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
          },
        },
        isCreateMode: false,
        dateKey: '2026-05-14',
        minimumStepSeconds: 900,
      })
    ).toBe(5400);
  });

  it('does not increase TodoFlow estimate from total multi-day schedule duration when saving an edited schedule', () => {
    const multiDayTodo = {
      ...todo('todo-ai', 'AI draft'),
      estimatedTimeTodo: 9000,
      scheduleSlots: [
        { dateKey: '2026-05-14', startTime: '09:00', endTime: '11:30' },
        { dateKey: '2026-05-15', startTime: '09:00', endTime: '11:30' },
      ],
    };

    expect(
      getTodoScheduleSaveEstimateDurationSeconds({
        todo: multiDayTodo,
        isCreateMode: false,
        totalSelectedDurationSeconds: 18000,
      })
    ).toBe(9000);
  });

  it('uses the full TodoFlow estimate for each first assigned day', () => {
    expect(
      getTodoScheduleSelectionDurationSeconds({
        isCreateMode: false,
        selectedDurationSeconds: 15 * 60,
        targetScheduleDurationSeconds: 9000,
        unslottedSelectionCount: 2,
      })
    ).toBe(9000);
  });

  it('previews first schedule assignment using the TodoFlow estimate', () => {
    expect(
      getTodoScheduleSelectionRangeMinutes({
        isCreateMode: false,
        startMinutes: 9 * 60,
        selectedEndMinutes: 9 * 60 + 15,
        selectedDurationSeconds: 15 * 60,
        targetScheduleDurationSeconds: 9000,
        unslottedSelectionCount: 2,
      })
    ).toEqual({ start: 9 * 60, end: 11 * 60 + 30 });
  });

  it('previews multiple first assigned days using the full TodoFlow estimate', () => {
    expect(
      getTodoScheduleSelectionRangeMinutes({
        isCreateMode: false,
        startMinutes: 9 * 60,
        selectedEndMinutes: 9 * 60 + 15,
        selectedDurationSeconds: 15 * 60,
        targetScheduleDurationSeconds: 9000,
      })
    ).toEqual({ start: 9 * 60, end: 11 * 60 + 30 });
  });

  it('sets a Task schedule slot and updates estimated time from duration', () => {
    const updated = setTaskScheduleSlot(task('task-1', 'Email'), {
      dateKey: '2026-05-13',
      startTime: '13:00',
      endTime: '14:00',
    });

    expect(updated.scheduleSlots).toEqual([
      { dateKey: '2026-05-13', startTime: '13:00', endTime: '14:00' },
    ]);
    expect(updated.scheduledDate).toBe('2026-05-13');
    expect(updated.estimatedTime).toBe(3600);
  });

  it('finds a schedule slot by date', () => {
    const slot = getScheduleSlotForDate(
      [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '11:00', endTime: '12:00' },
      ],
      '2026-05-14'
    );

    expect(slot?.startTime).toBe('11:00');
  });

  it('calculates seconds between valid time strings', () => {
    expect(secondsBetweenTimeStrings('09:30', '11:00')).toBe(5400);
  });

  it('rejects end times that are not after start times', () => {
    expect(() => secondsBetweenTimeStrings('11:00', '11:00')).toThrow('End time must be after start time');
  });

  it('groups selected range items by the same id', () => {
    const sharedTodo = {
      ...todo('todo-1', 'Shared plan'),
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '10:00', endTime: '11:00' },
      ],
    };
    const sharedTask = {
      ...task('task-1', 'Shared task'),
      scheduleSlots: [
        { dateKey: '2026-05-14', startTime: '13:00', endTime: '14:00' },
        { dateKey: '2026-05-15', startTime: '13:00', endTime: '14:00' },
      ],
    };

    const grouped = groupScheduledItemsForDateRange(
      [sharedTodo],
      [sharedTask],
      ['2026-05-13', '2026-05-14']
    );

    expect(grouped.todos).toHaveLength(1);
    expect(grouped.todos[0].dateKeys).toEqual(['2026-05-13', '2026-05-14']);
    expect(grouped.tasks).toHaveLength(1);
    expect(grouped.tasks[0].dateKeys).toEqual(['2026-05-14']);
  });

  it('removes only the selected calendar date from a multi-date TodoFlow', () => {
    const updated = unsetTodoAssignedDate(
      { ...todo('todo-1', 'Plan', '2026-05-13'), scheduledDates: ['2026-05-13', '2026-05-14'] },
      '2026-05-13'
    );

    expect(updated.scheduledDate).toBe('2026-05-14');
    expect(updated.scheduledDates).toBeUndefined();
  });

  it('splits one scheduled date into an independent TodoFlow and keeps the other dates on the original', () => {
    const source = {
      ...todo('todo-1', 'Shared plan'),
      taskCompleted: 1,
      taskTotal: 2,
      actualTimeTodo: 90,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), status: TaskStatus.COMPLETED, actualTime: 90 },
        'task-2': task('task-2', 'Second'),
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '11:00', endTime: '12:30' },
      ],
      scheduledDate: '2026-05-13',
      scheduledDates: ['2026-05-13', '2026-05-14'],
      estimatedTimeTodo: 9000,
      timer: setTimeout(() => undefined, 1),
    };

    const result = splitTodoFlowForDate(source, 'todo-2', '2026-05-13');

    expect(result).not.toBeNull();
    expect(result?.detachedTodo.id).toBe('todo-2');
    expect(result?.detachedTodo.scheduledDate).toBe('2026-05-13');
    expect(result?.detachedTodo.scheduledDates).toBeUndefined();
    expect(result?.detachedTodo.scheduleSlots).toEqual([
      { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
    ]);
    expect(result?.detachedTodo.taskCompleted).toBe(1);
    expect(result?.detachedTodo.tasks['task-1'].status).toBe(TaskStatus.COMPLETED);
    expect(result?.detachedTodo.timer).toBeNull();
    expect(result?.detachedTodo.estimatedTimeTodo).toBe(3600);
    expect(result?.originalTodo.id).toBe('todo-1');
    expect(result?.originalTodo.scheduledDate).toBe('2026-05-14');
    expect(result?.originalTodo.scheduledDates).toBeUndefined();
    expect(result?.originalTodo.scheduleSlots).toEqual([
      { dateKey: '2026-05-14', startTime: '11:00', endTime: '12:30' },
    ]);
    expect(result?.originalTodo.estimatedTimeTodo).toBe(5400);
  });

  it('does not split a TodoFlow into entries shorter than their task estimates', () => {
    const source = {
      ...todo('todo-1', 'Shared plan'),
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
      },
      scheduleSlots: [
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-14', startTime: '11:00', endTime: '12:00' },
      ],
      scheduledDate: '2026-05-13',
      scheduledDates: ['2026-05-13', '2026-05-14'],
      estimatedTimeTodo: 7200,
    };

    const result = splitTodoFlowForDate(source, 'todo-2', '2026-05-13');

    expect(result?.detachedTodo.estimatedTimeTodo).toBe(5400);
    expect(result?.originalTodo.estimatedTimeTodo).toBe(5400);
  });

  it('can split a TodoFlow with new task ids so the detached copy is independent', () => {
    const source = {
      ...todo('todo-1', 'Shared plan'),
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), status: TaskStatus.PAUSED, actualTime: 30 },
        'task-2': task('task-2', 'Second'),
      },
      currentTaskId: 'task-1',
      scheduledDates: ['2026-05-13', '2026-05-14'],
    };
    let counter = 0;

    const result = splitTodoFlowForDate(source, 'todo-2', '2026-05-13', () => `new-task-${++counter}`);

    expect(result?.detachedTodo.taskIds).toEqual(['new-task-1', 'new-task-2']);
    expect(result?.detachedTodo.currentTaskId).toBe('new-task-1');
    expect(result?.detachedTodo.tasks['new-task-1'].id).toBe('new-task-1');
    expect(result?.detachedTodo.tasks['new-task-1'].title).toBe('First');
    expect(result?.detachedTodo.tasks['new-task-1'].status).toBe(TaskStatus.PAUSED);
    expect(result?.detachedTodo.tasks['task-1']).toBeUndefined();
  });

  it('does not split a TodoFlow that only has one scheduled date', () => {
    expect(splitTodoFlowForDate(todo('todo-1', 'Plan', '2026-05-13'), 'todo-2', '2026-05-13')).toBeNull();
  });

  it('filters manage items by search text and type/status', () => {
    const scheduledTodo = {
      ...todo('todo-1', 'Client plan', '2026-05-13'),
      taskIds: ['task-1'],
      tasks: { 'task-1': task('task-1', 'Draft proposal') },
    };
    const unscheduledTodo = todo('todo-2', 'Backlog');
    const scheduledTask = task('task-1', 'Client email', '2026-05-13');

    expect(filterManageItems([scheduledTodo, unscheduledTodo], [scheduledTask], 'proposal', 'all').todos).toEqual([
      scheduledTodo,
    ]);
    expect(filterManageItems([scheduledTodo, unscheduledTodo], [scheduledTask], '', 'scheduled').todos).toEqual([
      scheduledTodo,
    ]);
    expect(filterManageItems([scheduledTodo, unscheduledTodo], [scheduledTask], '', 'tasks').tasks).toEqual([
      scheduledTask,
    ]);
    expect(filterManageItems([scheduledTodo, unscheduledTodo], [scheduledTask], '', 'unscheduled').todos).toEqual([
      unscheduledTodo,
    ]);
  });

  it('summarizes TodoFlow analytics from local TodoFlow data', () => {
    const stats = getTodoFlowAnalytics(
      [
        {
          ...todo('todo-1', 'Today plan', '2026-05-13'),
          taskCompleted: 1,
          taskTotal: 2,
          status: TodoStatus.START_ON_PROGRESS,
          actualTimeTodo: 120,
          estimatedTimeTodo: 300,
        },
        {
          ...todo('todo-2', 'Tomorrow plan', '2026-05-14'),
          scheduledDates: ['2026-05-14', '2026-05-15'],
          taskCompleted: 3,
          taskTotal: 3,
          actualTimeTodo: 600,
          estimatedTimeTodo: 600,
        },
      ],
      [task('task-1', 'Standalone', '2026-05-13')],
      '2026-05-13'
    );

    expect(stats.totalTodoFlows).toBe(2);
    expect(stats.scheduledDays).toBe(3);
    expect(stats.todayTodoFlows).toBe(1);
    expect(stats.completedTasks).toBe(4);
    expect(stats.totalTasks).toBe(6);
    expect(stats.inProgressTodoFlows).toBe(1);
    expect(stats.plannedSeconds).toBe(1020);
    expect(stats.actualSeconds).toBe(720);
  });

  it('summarizes invalid TodoFlow estimates using at least the current tasks total', () => {
    const stats = getTodoFlowAnalytics(
      [
        {
          ...todo('todo-1', 'Invalid plan', '2026-05-13'),
          estimatedTimeTodo: 1800,
          taskIds: ['task-1', 'task-2'],
          tasks: {
            'task-1': { ...task('task-1', 'First'), estimatedTime: 1800 },
            'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
          },
        },
      ],
      [],
      '2026-05-13'
    );

    expect(stats.plannedSeconds).toBe(3600);
  });

  it('summarizes TodoFlow analytics from per-day plans when present', () => {
    const scheduledTodo = ensureTodoDayPlans({
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 3600,
      actualTimeTodo: 0,
      taskIds: ['task-1'],
      tasks: {
        'task-1': task('task-1', 'First'),
      },
      scheduleSlots: [
        { dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '11:00' },
      ],
    });
    const updated = applyTodoDateState(scheduledTodo, '2026-05-13', {
      ...getTodoForDate(scheduledTodo, '2026-05-13'),
      estimatedTimeTodo: 7200,
      actualTimeTodo: 1800,
      taskCompleted: 1,
    });

    const stats = getTodoFlowAnalytics([updated], [], '2026-05-13');

    expect(stats.scheduledDays).toBe(2);
    expect(stats.todayTodoFlows).toBe(1);
    expect(stats.completedTasks).toBe(1);
    expect(stats.totalTasks).toBe(2);
    expect(stats.plannedSeconds).toBe(10800);
    expect(stats.actualSeconds).toBe(1800);
  });

  it('creates an AI analysis prompt with TodoFlow stats and user intent', () => {
    const prompt = createAiTodoFlowAnalysisPrompt(
      [todo('todo-1', 'Deep work', '2026-05-13')],
      [task('task-1', 'Email', '2026-05-13')],
      'Find schedule risks',
      '2026-05-13'
    );

    expect(prompt).toContain('Find schedule risks');
    expect(prompt).toContain('Total TodoFlows: 1');
    expect(prompt).toContain('Scheduled days: 1');
    expect(prompt).toContain('Deep work');
    expect(prompt).toContain('Email');
  });

  it('builds AI analysis context with fallback candidates when today has no TodoFlow', () => {
    const sourceTodos = [
      {
        ...todo('todo-active', 'Paused work'),
        status: TodoStatus.START_ON_PROGRESS,
        currentTaskId: 'task-active',
        taskIds: ['task-active'],
        taskTotal: 1,
        tasks: { 'task-active': { ...task('task-active', 'Resume implementation'), status: TaskStatus.PAUSED } },
      },
      todo('todo-overdue', 'Overdue work', '2026-05-19'),
      todo('todo-upcoming', 'Upcoming work', '2026-05-22'),
      todo('todo-far', 'Far future work', '2026-06-20'),
      todo('todo-unscheduled', 'Backlog work'),
    ];

    const context = buildAiTodoFlowAnalysisContext(sourceTodos, [task('task-standalone', 'Standalone task')], [], {
      todayKey: '2026-05-20',
      mode: 'today_plan',
    });

    expect(context.situation).toBe('empty_today_with_candidates');
    expect(context.todayTodoFlows).toHaveLength(0);
    expect(context.activeTodoFlows.map((item) => item.id)).toEqual(['todo-active']);
    expect(context.overdueTodoFlows.map((item) => item.id)).toEqual(['todo-overdue']);
    expect(context.upcomingTodoFlows.map((item) => item.id)).toEqual(['todo-upcoming']);
    expect(context.unscheduledTodoFlows.map((item) => item.id)).toEqual(['todo-active', 'todo-unscheduled']);
    expect(context.standaloneTasks.map((item) => item.id)).toEqual(['task-standalone']);
    expect(context.omittedCounts.upcomingTodoFlows).toBe(1);
  });

  it('detects whether AI TodoFlow has local context data', () => {
    expect(hasAiTodoFlowContextData([], [], [])).toBe(false);
    expect(hasAiTodoFlowContextData([todo('todo-1', 'Plan')], [], [])).toBe(true);
    expect(hasAiTodoFlowContextData([], [task('task-1', 'Write')], [])).toBe(true);
    expect(
      hasAiTodoFlowContextData(
        [],
        [],
        [
          {
            id: 'archive-1',
            todoId: 'todo-1',
            note: 'Past plan',
            removedDateKeys: ['2026-05-17'],
            archivedAt: '2026-05-18T10:00:00.000Z',
            scheduleSlots: [],
            totalEstimatedTime: 0,
            totalActualTime: 0,
            taskCompleted: 0,
            taskTotal: 0,
            tasks: [],
          },
        ]
      )
    ).toBe(true);
  });

  it('creates a structured AI analysis prompt from context mode and situation', () => {
    const context = buildAiTodoFlowAnalysisContext([todo('todo-1', 'Deep work', '2026-05-20')], [], [], {
      todayKey: '2026-05-20',
      mode: 'workload_review',
    });
    const prompt = createAiTodoFlowAnalysisPrompt(context, 'Find overload risks');

    expect(prompt).toContain('Return ONLY valid JSON');
    expect(prompt).toContain('"action": "move | split | shorten | add_break | clarify | create_todoflow"');
    expect(prompt).toContain('Analysis mode: workload_review');
    expect(prompt).toContain('Situation: today_schedule');
    expect(prompt).toContain('The user has TodoFlows scheduled for today.');
    expect(prompt).toContain('Find overload risks');
    expect(prompt).toContain('"todayTodoFlows"');
    expect(prompt).toContain('Deep work');
  });

  it('adds the selected output language to structured AI analysis prompts', () => {
    const context = buildAiTodoFlowAnalysisContext([todo('todo-1', 'Deep work', '2026-05-20')], [], [], {
      todayKey: '2026-05-20',
      mode: 'today_plan',
    });

    const prompt = createAiTodoFlowAnalysisPrompt(context, 'Analyze today', 'ja');

    expect(prompt).toContain('Output language: Japanese');
    expect(prompt).toContain('Write all user-facing string values in Japanese.');
  });

  it('parses valid AI analysis JSON and rejects markdown responses', () => {
    const parsed = parseAiTodoFlowAnalysisResult(
      JSON.stringify({
        summary: 'Today has one clear priority.',
        metrics: {
          plannedSeconds: 3600,
          actualSeconds: 0,
          completionRate: 0,
          overloadSeconds: 0,
          riskyItemCount: 1,
        },
        risks: [],
        priorities: [],
        scheduleSuggestions: [],
        estimationInsights: [],
        actionPlan: ['Start the first TodoFlow.'],
      })
    );

    expect(parsed.summary).toBe('Today has one clear priority.');
    expect(() => parseAiTodoFlowAnalysisResult('```json\n{}\n```')).toThrow('AI response must be raw JSON');
  });

  it('creates a compact AI analysis history entry', () => {
    const entry = createAiAnalysisHistoryEntry({
      id: 'history-1',
      createdAt: '2026-05-20T08:00:00.000Z',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      mode: 'today_plan',
      outputLanguage: 'vi',
      userRequest: 'Analyze today',
      rawResponse: '{"summary":"Good"}',
      result: {
        summary: 'Good',
        metrics: {
          plannedSeconds: 3600,
          actualSeconds: 1200,
          completionRate: 33,
          overloadSeconds: 0,
          riskyItemCount: 1,
        },
        risks: [],
        priorities: [],
        scheduleSuggestions: [],
        estimationInsights: [],
        actionPlan: ['Start work'],
      },
    });

    expect(entry).toEqual({
      id: 'history-1',
      kind: 'analysis',
      createdAt: '2026-05-20T08:00:00.000Z',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      mode: 'today_plan',
      outputLanguage: 'vi',
      userRequest: 'Analyze today',
      summary: 'Good',
      rawResponse: '{"summary":"Good"}',
      result: expect.objectContaining({ summary: 'Good' }),
    });
  });

  it('creates a compact AI TodoFlow draft history entry', () => {
    const draft = {
      title: 'Fix provider errors',
      suggestedDurationMinutes: 90,
      tasks: [
        {
          title: 'Trace error formatter',
          estimatedMinutes: 30,
          subtasks: [{ title: 'Open provider module', completed: false }],
        },
      ],
    };

    const entry = createAiTodoFlowDraftHistoryEntry({
      id: 'draft-history-1',
      createdAt: '2026-05-20T09:00:00.000Z',
      provider: 'openai',
      model: 'gpt-5-mini',
      outputLanguage: 'en',
      userRequest: '  Build a focused TodoFlow  ',
      rawResponse: '{"title":"Fix provider errors"}',
      result: draft,
    });

    expect(entry).toEqual({
      id: 'draft-history-1',
      kind: 'draft',
      createdAt: '2026-05-20T09:00:00.000Z',
      provider: 'openai',
      model: 'gpt-5-mini',
      outputLanguage: 'en',
      userRequest: 'Build a focused TodoFlow',
      summary: 'Fix provider errors',
      rawResponse: '{"title":"Fix provider errors"}',
      result: draft,
    });
  });

  it('includes archived TodoFlow summaries in the AI analysis prompt', () => {
    const prompt = createAiTodoFlowAnalysisPrompt(
      [],
      [],
      'Analyze history',
      '2026-05-18',
      [
        {
          id: 'archive-1',
          todoId: 'todo-1',
          note: 'Past plan',
          removedDateKeys: ['2026-05-17'],
          archivedAt: '2026-05-18T10:00:00.000Z',
          scheduleSlots: [{ dateKey: '2026-05-17', startTime: '09:00', endTime: '10:00' }],
          totalEstimatedTime: 3600,
          totalActualTime: 4200,
          taskCompleted: 1,
          taskTotal: 2,
          tasks: [
            {
              taskId: 'task-1',
              title: 'Done task',
              status: 'Completed',
              completed: true,
              estimatedTime: 1800,
              actualTime: 2100,
              timeRatio: 0.5,
            },
          ],
        },
      ]
    );

    expect(prompt).toContain('Archived TodoFlows:');
    expect(prompt).toContain('Past plan');
    expect(prompt).toContain('Done task');
    expect(prompt).toContain('ratio: 50%');
  });

  it('creates an AI TodoFlow creation prompt from user request and current data', () => {
    const prompt = createAiTodoFlowPrompt(
      [todo('todo-1', 'Existing plan', '2026-05-13')],
      [],
      'Create a 2 hour study flow',
      '2026-05-13'
    );

    expect(prompt).toContain('Create a 2 hour study flow');
    expect(prompt).toContain('Return ONLY valid JSON');
    expect(prompt).toContain('"title": "string"');
    expect(prompt).toContain('"tasks"');
    expect(prompt).toContain('Existing plan');
    expect(prompt).toContain('Total TodoFlows: 1');
  });

  it('parses a structured AI TodoFlow draft response', () => {
    const draft = parseAiTodoFlowDraftResult(
      JSON.stringify({
        title: 'Fix provider errors',
        suggestedDurationMinutes: 90,
        tasks: [
          {
            title: 'Trace provider failure',
            estimatedMinutes: 35,
            subtasks: ['Read logs', { title: 'Check API config', completed: true }],
          },
          { title: 'Review UI state', estimatedMinutes: 55 },
        ],
      })
    );

    expect(draft.title).toBe('Fix provider errors');
    expect(draft.suggestedDurationMinutes).toBe(90);
    expect(draft.tasks).toHaveLength(2);
    expect(draft.tasks[0].subtasks).toEqual([
      { title: 'Read logs', completed: false },
      { title: 'Check API config', completed: true },
    ]);
  });

  it('rejects markdown wrapped AI TodoFlow draft responses', () => {
    expect(() => parseAiTodoFlowDraftResult('```json\n{}\n```')).toThrow('AI draft response must be raw JSON');
  });

  it('creates a TodoFlow draft from a parsed AI draft', () => {
    let taskCounter = 0;
    const created = createTodoFlowFromAiDraft(
      {
        title: 'Fix provider errors',
        suggestedDurationMinutes: 90,
        tasks: [
          { title: 'Trace provider failure', estimatedMinutes: 35, subtasks: [{ title: 'Read logs', completed: false }] },
          { title: 'Review UI state', estimatedMinutes: 55, subtasks: [] },
        ],
      },
      'todo-ai',
      () => `task-ai-${++taskCounter}`
    );

    expect(created.note).toBe('Fix provider errors');
    expect(created.status).toBe(TodoStatus.STOP);
    expect(created.taskTotal).toBe(2);
    expect(created.estimatedTimeTodo).toBe(5400);
    expect(created.taskIds).toEqual(['task-ai-1', 'task-ai-2']);
    expect(created.tasks['task-ai-2']).toMatchObject({
      title: 'Review UI state',
      estimatedTime: 3300,
      actualTime: 0,
      status: TaskStatus.NOT_STARTED,
    });
    expect(created.tasks['task-ai-1'].subTasks).toEqual([{ id: 'task-ai-1-subtask-1', title: 'Read logs', completed: false }]);
  });

  it('keeps AI suggested TodoFlow duration when it is longer than the draft task total', () => {
    let taskCounter = 0;
    const created = createTodoFlowFromAiDraft(
      {
        title: 'Plan buffer',
        suggestedDurationMinutes: 120,
        tasks: [
          { title: 'Deep work', estimatedMinutes: 30, subtasks: [] },
          { title: 'Review', estimatedMinutes: 30, subtasks: [] },
        ],
      },
      'todo-ai',
      () => `task-ai-${++taskCounter}`
    );

    expect(getTodoTaskEstimatedSeconds(created)).toBe(3600);
    expect(created.estimatedTimeTodo).toBe(7200);
  });

  it('clears assignment when removing the last assigned date from a TodoFlow', () => {
    const updated = unsetTodoAssignedDate(todo('todo-1', 'Plan', '2026-05-13'), '2026-05-13');

    expect(updated.scheduledDate).toBeUndefined();
    expect(updated.scheduledDates).toBeUndefined();
    expect(updated.lastNotifiedDate).toBeUndefined();
  });

  it('detects calendar dates before today as past dates', () => {
    expect(isPastDateKey('2026-05-12', '2026-05-13')).toBe(true);
    expect(isPastDateKey('2026-05-13', '2026-05-13')).toBe(false);
    expect(isPastDateKey('2026-05-14', '2026-05-13')).toBe(false);
  });

  it('lists date keys between two selected calendar dates in order', () => {
    expect(listDateKeysBetween('2026-05-15', '2026-05-13')).toEqual([
      '2026-05-13',
      '2026-05-14',
      '2026-05-15',
    ]);
  });

  it('toggles non-contiguous selected calendar dates in sorted order', () => {
    expect(toggleDateKeySelection(['2026-05-15', '2026-05-13'], '2026-05-20')).toEqual([
      '2026-05-13',
      '2026-05-15',
      '2026-05-20',
    ]);
    expect(toggleDateKeySelection(['2026-05-13', '2026-05-15'], '2026-05-13')).toEqual(['2026-05-15']);
  });

  it('formats selected date keys without a comma-joined string', () => {
    expect(formatDateKeyList(['2026-05-13'])).toBe('2026-05-13');
    expect(formatDateKeyList(['2026-05-13', '2026-05-15', '2026-05-20'])).toBe(
      '2026-05-13 | 2026-05-15 | 2026-05-20'
    );
    expect(formatDateKeyList([])).toBe('No time selected');
  });

  it('returns sorted date labels for chip-based UI', () => {
    expect(formatDateChipLabels(['2026-05-20', '2026-05-13', '2026-05-15'])).toEqual([
      '2026-05-13',
      '2026-05-15',
      '2026-05-20',
    ]);
    expect(formatDateChipLabels([])).toEqual([]);
  });

  it('marks today in date chip data', () => {
    expect(formatDateChipItems(['2026-05-16', '2026-05-15'], '2026-05-15')).toEqual([
      { label: '2026-05-15', isToday: true },
      { label: '2026-05-16', isToday: false },
    ]);
  });

  it('returns schedule slot labels for chip-based UI', () => {
    expect(
      formatScheduleSlotChipLabels([
        { dateKey: '2026-05-15', startTime: '14:00', endTime: '15:00' },
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '10:00' },
      ])
    ).toEqual(['2026-05-13 09:00-10:00', '2026-05-15 14:00-15:00']);
  });

  it('keeps at least one selected calendar date when toggling', () => {
    expect(toggleDateKeySelection(['2026-05-13'], '2026-05-13')).toEqual(['2026-05-13']);
  });

  it('returns due notification items that have not been notified today', () => {
    const due = getDueNotificationItems(
      [
        todo('todo-1', 'Today plan', '2026-05-12'),
        { ...todo('todo-2', 'Already notified', '2026-05-12'), lastNotifiedDate: '2026-05-12' },
      ],
      [
        task('task-1', 'Today task', '2026-05-12'),
        task('task-2', 'Tomorrow task', '2026-05-13'),
      ],
      '2026-05-12'
    );

    expect(due.map((item) => item.id)).toEqual(['todo-1', 'task-1']);
  });

  it('returns slot notification items 15 minutes before start time', () => {
    const due = getDueSlotNotificationItems(
      [
        {
          ...todo('todo-1', 'Focus plan'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '10:00', endTime: '11:00' }],
        },
      ],
      [
        {
          ...task('task-1', 'Call client'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '10:15', endTime: '11:15' }],
        },
      ],
      new Date(2026, 4, 12, 9, 45)
    );

    expect(due.map((item) => item.id)).toEqual(['todo-1']);
  });

  it('does not return a slot notification twice for the same date and time', () => {
    const due = getDueSlotNotificationItems(
      [
        {
          ...todo('todo-1', 'Focus plan'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '10:00', endTime: '11:00' }],
          lastNotifiedDate: '2026-05-12T10:00',
        },
      ],
      [],
      new Date(2026, 4, 12, 9, 45)
    );

    expect(due).toHaveLength(0);
  });

  it('creates three default tasks whose total estimated time matches the selected duration', () => {
    const tasks = createDefaultTasksForSchedule(3600, ['task-1', 'task-2', 'task-3']);

    expect(tasks.map((item) => item.id)).toEqual(['task-1', 'task-2', 'task-3']);
    expect(tasks.map((item) => item.estimatedTime)).toEqual([1200, 1200, 1200]);
    expect(tasks.reduce((total, item) => total + item.estimatedTime, 0)).toBe(3600);
  });

  it('keeps default task durations balanced when selected duration is not divisible by three', () => {
    const tasks = createDefaultTasksForSchedule(3700, ['task-1', 'task-2', 'task-3']);

    expect(tasks.map((item) => item.estimatedTime)).toEqual([1234, 1233, 1233]);
    expect(tasks.reduce((total, item) => total + item.estimatedTime, 0)).toBe(3700);
  });

  it('preserves non-break task estimates when TodoFlow duration is longer than the current tasks total', () => {
    const synced = syncTodoTaskEstimatesWithDuration(
      {
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1', 'break-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 300, actualTime: 20, status: TaskStatus.PAUSED },
          'break-1': { ...task('break-1', 'Break'), estimatedTime: 600, isTaskBreak: true },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 300 },
        },
      },
      3601
    );

    expect(synced.tasks['task-1'].estimatedTime).toBe(300);
    expect(synced.tasks['task-2'].estimatedTime).toBe(300);
    expect(synced.tasks['break-1'].estimatedTime).toBe(600);
    expect(synced.tasks['task-1'].actualTime).toBe(20);
    expect(synced.tasks['task-1'].status).toBe(TaskStatus.PAUSED);
    expect(synced.estimatedTimeTodo).toBe(3601);
    expect(synced.taskTotal).toBe(2);
  });

  it('does not reduce task estimates when syncing a TodoFlow duration shorter than the current tasks total', () => {
    const synced = syncTodoTaskEstimatesWithDuration(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 1800,
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 1800 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
        },
      },
      1800
    );

    expect(synced.tasks['task-1'].estimatedTime).toBe(1800);
    expect(synced.tasks['task-2'].estimatedTime).toBe(1800);
    expect(synced.estimatedTimeTodo).toBe(3600);
    expect(synced.taskTotal).toBe(2);
  });

  it('redistributes remaining task estimates when one task estimate increases', () => {
    const updated = redistributeTaskEstimateWithinTodo(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 3600,
        taskIds: ['task-1', 'task-2', 'task-3'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 1200 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1200 },
          'task-3': { ...task('task-3', 'Third'), estimatedTime: 1200 },
        },
      },
      'task-1',
      1800
    );

    expect(updated.estimatedTimeTodo).toBe(3600);
    expect(updated.tasks['task-1'].estimatedTime).toBe(1800);
    expect(updated.tasks['task-2'].estimatedTime).toBe(900);
    expect(updated.tasks['task-3'].estimatedTime).toBe(900);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(3600);
  });

  it('normalizes invalid stored TodoFlow totals before redistributing task estimates', () => {
    const updated = redistributeTaskEstimateWithinTodo(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 600,
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 1800 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
        },
      },
      'task-1',
      2400
    );

    expect(updated.estimatedTimeTodo).toBe(3600);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(3600);
  });

  it('adds a task using the lowest current task estimate and preserves the TodoFlow total', () => {
    const source = {
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 600,
      taskIds: ['task-1', 'task-2', 'task-3'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 300 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 200 },
        'task-3': { ...task('task-3', 'Third'), estimatedTime: 100 },
      },
    };

    const updated = addTaskWithProportionalEstimate(source, {
      ...task('task-4', 'Fourth'),
      estimatedTime: 0,
    });

    expect(updated.taskIds).toEqual(['task-1', 'task-2', 'task-3', 'task-4']);
    expect(updated.tasks['task-4'].estimatedTime).toBe(100);
    expect(updated.tasks['task-1'].estimatedTime).toBe(250);
    expect(updated.tasks['task-2'].estimatedTime).toBe(167);
    expect(updated.tasks['task-3'].estimatedTime).toBe(83);
    expect(updated.estimatedTimeTodo).toBe(600);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(600);
  });

  it('normalizes invalid stored TodoFlow totals before adding a task', () => {
    const source = {
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 600,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 1800 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
      },
    };

    const updated = addTaskWithProportionalEstimate(source, {
      ...task('task-3', 'Third'),
      estimatedTime: 0,
    });

    expect(updated.estimatedTimeTodo).toBe(3600);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(3600);
  });

  it('keeps zero-estimate TodoFlows stable when adding the first task', () => {
    const updated = addTaskWithProportionalEstimate(
      { ...todo('todo-1', 'Plan'), estimatedTimeTodo: 0 },
      { ...task('task-1', 'First'), estimatedTime: 0 }
    );

    expect(updated.taskIds).toEqual(['task-1']);
    expect(updated.tasks['task-1'].estimatedTime).toBe(0);
    expect(updated.estimatedTimeTodo).toBe(0);
    expect(updated.taskTotal).toBe(1);
  });

  it('redistributes remaining task estimates when one task estimate decreases', () => {
    const updated = redistributeTaskEstimateWithinTodo(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 3600,
        taskIds: ['task-1', 'task-2', 'task-3'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 1800 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 900 },
          'task-3': { ...task('task-3', 'Third'), estimatedTime: 900 },
        },
      },
      'task-1',
      1200
    );

    expect(updated.estimatedTimeTodo).toBe(3600);
    expect(updated.tasks['task-1'].estimatedTime).toBe(1200);
    expect(updated.tasks['task-2'].estimatedTime).toBe(1200);
    expect(updated.tasks['task-3'].estimatedTime).toBe(1200);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(3600);
  });

  it('ignores break tasks when redistributing task estimates', () => {
    const updated = redistributeTaskEstimateWithinTodo(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 3600,
        taskIds: ['task-1', 'break-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 1200 },
          'break-1': { ...task('break-1', 'Break'), estimatedTime: 300, isTaskBreak: true },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 2400 },
        },
      },
      'task-1',
      1800
    );

    expect(updated.tasks['task-1'].estimatedTime).toBe(1800);
    expect(updated.tasks['task-2'].estimatedTime).toBe(1800);
    expect(updated.tasks['break-1'].estimatedTime).toBe(300);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(3600);
  });

  it('resizes the boundary between adjacent tasks while preserving the total estimate', () => {
    const updated = resizeTaskAllocationBoundary(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 3600,
        taskIds: ['task-1', 'task-2', 'task-3'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 1200 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1200 },
          'task-3': { ...task('task-3', 'Third'), estimatedTime: 1200 },
        },
      },
      'task-1',
      'task-2',
      300
    );

    expect(updated.tasks['task-1'].estimatedTime).toBe(1500);
    expect(updated.tasks['task-2'].estimatedTime).toBe(900);
    expect(updated.tasks['task-3'].estimatedTime).toBe(1200);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(3600);
  });

  it('prevents boundary resizing from creating negative task estimates', () => {
    const updated = resizeTaskAllocationBoundary(
      {
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 1800,
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 600 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1200 },
        },
      },
      'task-1',
      'task-2',
      1800
    );

    expect(updated.tasks['task-1'].estimatedTime).toBe(1800);
    expect(updated.tasks['task-2'].estimatedTime).toBe(0);
    expect(getTodoTaskEstimatedSeconds(updated)).toBe(1800);
  });

  it('calculates repeated boundary drag moves from the original snapshot instead of compounding deltas', () => {
    const source = {
      ...todo('todo-1', 'Plan'),
      estimatedTimeTodo: 2000,
      taskIds: ['task-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), estimatedTime: 1000 },
        'task-2': { ...task('task-2', 'Second'), estimatedTime: 1000 },
      },
    };

    const firstMove = resizeTaskAllocationBoundaryFromDrag(source, 'task-1', 'task-2', {
      startY: 100,
      currentY: 150,
      totalSeconds: 2000,
      laneHeight: 200,
    });
    const repeatedMove = resizeTaskAllocationBoundaryFromDrag(source, 'task-1', 'task-2', {
      startY: 100,
      currentY: 150,
      totalSeconds: 2000,
      laneHeight: 200,
    });

    expect(firstMove.tasks['task-1'].estimatedTime).toBe(1500);
    expect(firstMove.tasks['task-2'].estimatedTime).toBe(500);
    expect(repeatedMove.tasks['task-1'].estimatedTime).toBe(1500);
    expect(repeatedMove.tasks['task-2'].estimatedTime).toBe(500);
  });

  it('reorders TodoFlow task ids without changing task estimates', () => {
    const updated = reorderTodoTaskIds(
      {
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1', 'task-2', 'task-3'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 600 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1200 },
          'task-3': { ...task('task-3', 'Third'), estimatedTime: 1800 },
        },
      },
      2,
      0
    );

    expect(updated.taskIds).toEqual(['task-3', 'task-1', 'task-2']);
    expect(updated.tasks['task-1'].estimatedTime).toBe(600);
    expect(updated.tasks['task-2'].estimatedTime).toBe(1200);
    expect(updated.tasks['task-3'].estimatedTime).toBe(1800);
  });

  it('extends a TodoFlow schedule duration without overlapping another TodoFlow that day', () => {
    const resized = resizeTodoFlowScheduleDuration(
      {
        ...todo('todo-1', 'Plan'),
        scheduleSlots: [{ dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' }],
      },
      5400,
      [
        {
          ...todo('todo-2', 'Other'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '11:00', endTime: '12:00' }],
        },
      ]
    );

    expect(resized).toEqual({
      ok: true,
      todo: expect.objectContaining({
        estimatedTimeTodo: 5400,
        scheduleSlots: [{ dateKey: '2026-05-12', startTime: '09:00', endTime: '10:30' }],
      }),
    });
  });

  it('rejects resizing a TodoFlow schedule below the current tasks total', () => {
    const resized = resizeTodoFlowScheduleDuration(
      {
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 3600 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 1800 },
        },
        scheduleSlots: [{ dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' }],
      },
      3600
    );

    expect(resized).toEqual({
      ok: false,
      reason: 'TodoFlow total time cannot be shorter than the current tasks total',
    });
  });

  it('rejects extending a TodoFlow schedule duration when it would overlap another TodoFlow that day', () => {
    const resized = resizeTodoFlowScheduleDuration(
      {
        ...todo('todo-1', 'Plan'),
        scheduleSlots: [{ dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' }],
      },
      9000,
      [
        {
          ...todo('todo-2', 'Other'),
          scheduleSlots: [{ dateKey: '2026-05-12', startTime: '11:00', endTime: '12:00' }],
        },
      ]
    );

    expect(resized).toEqual({
      ok: false,
      reason: 'This total time overlaps with another TodoFlow',
    });
  });

  it('detects overlapping schedule slots on the same date', () => {
    expect(
      hasOverlappingScheduleSlot(
        { dateKey: '2026-05-12', startTime: '09:30', endTime: '10:30' },
        [{ dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' }]
      )
    ).toBe(true);
  });

  it('allows adjacent or different-day schedule slots', () => {
    expect(
      hasOverlappingScheduleSlot(
        { dateKey: '2026-05-12', startTime: '10:00', endTime: '11:00' },
        [
          { dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' },
          { dateKey: '2026-05-13', startTime: '10:00', endTime: '11:00' },
        ]
      )
    ).toBe(false);
  });

  it('returns Start for a TodoFlow with no progress', () => {
    expect(getTodoFlowLaunchLabel(todo('todo-1', 'Plan'))).toBe('Start');
  });

  it('returns Resume for a TodoFlow with existing progress', () => {
    expect(
      getTodoFlowLaunchLabel({
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), status: TaskStatus.PAUSED },
        },
        currentTaskId: 'task-1',
      })
    ).toBe('Resume');
  });

  it('detects whether a TodoFlow has actually been started', () => {
    expect(hasTodoFlowStarted(todo('todo-1', 'Plan'))).toBe(false);
    expect(
      hasTodoFlowStarted({
        ...todo('todo-1', 'Plan'),
        status: TodoStatus.START_ON_PROGRESS,
      })
    ).toBe(true);
    expect(
      hasTodoFlowStarted({
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), actualTime: 30 },
        },
      })
    ).toBe(true);
  });

  it('allows resuming an active TodoFlow entry from paused or in-progress task state', () => {
    expect(
      canResumeTodoFlowEntry({
        ...todo('todo-1', 'Plan'),
        currentTaskId: 'task-1',
        taskIds: ['task-1'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), status: TaskStatus.PAUSED },
        },
      })
    ).toBe(true);

    expect(
      canResumeTodoFlowEntry({
        ...todo('todo-1', 'Plan'),
        currentTaskId: 'task-1',
        taskIds: ['task-1'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), status: TaskStatus.IN_PROGRESS },
        },
      })
    ).toBe(true);
  });

  it('does not resume an entry with no current task or a completed current task', () => {
    expect(canResumeTodoFlowEntry(todo('todo-1', 'Plan'))).toBe(false);
    expect(
      canResumeTodoFlowEntry({
        ...todo('todo-1', 'Plan'),
        currentTaskId: 'task-1',
        taskIds: ['task-1'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), status: TaskStatus.COMPLETED },
        },
      })
    ).toBe(false);
  });

  it('resets TodoFlow progress and removes runtime break tasks', () => {
    const reset = resetTodoFlowProgress({
      ...todo('todo-1', 'Plan'),
      status: TodoStatus.START_ON_PROGRESS,
      currentTaskId: 'task-1',
      timeLeft: 42,
      actualTimeTodo: 90,
      taskCompleted: 1,
      taskTotal: 2,
      taskIds: ['task-1', '000-break-break-1', 'task-2'],
      tasks: {
        'task-1': { ...task('task-1', 'First'), status: TaskStatus.COMPLETED, actualTime: 90 },
        '000-break-break-1': { ...task('000-break-break-1', 'Break'), isTaskBreak: true, actualTime: 30 },
        'task-2': { ...task('task-2', 'Second'), status: TaskStatus.PAUSED, actualTime: 20 },
      },
    });

    expect(reset.status).toBe(TodoStatus.STOP);
    expect(reset.currentTaskId).toBeUndefined();
    expect(reset.timeLeft).toBe(0);
    expect(reset.actualTimeTodo).toBe(0);
    expect(reset.taskCompleted).toBe(0);
    expect(reset.taskTotal).toBe(2);
    expect(reset.taskIds).toEqual(['task-1', 'task-2']);
    expect(reset.tasks['task-1'].status).toBe(TaskStatus.NOT_STARTED);
    expect(reset.tasks['task-1'].actualTime).toBe(0);
    expect(reset.tasks['task-2'].status).toBe(TaskStatus.NOT_STARTED);
    expect(reset.tasks['task-2'].actualTime).toBe(0);
    expect(reset.tasks['000-break-break-1']).toBeUndefined();
  });

  it('allows a schedule slot to end exactly at midnight', () => {
    expect(secondsBetweenTimeStrings('23:30', '24:00')).toBe(1800);
  });

  it('rejects invalid times after midnight', () => {
    expect(() => secondsBetweenTimeStrings('23:30', '24:15')).toThrow('Time must use HH:mm format');
  });

  it('rejects schedule slots before the current time on today', () => {
    const now = new Date(2026, 4, 12, 10, 0);

    expect(
      isScheduleSlotSelectable(
        { dateKey: '2026-05-12', startTime: '09:45', endTime: '10:15' },
        now
      )
    ).toBe(false);
    expect(
      isScheduleSlotSelectable(
        { dateKey: '2026-05-12', startTime: '10:00', endTime: '10:15' },
        now
      )
    ).toBe(true);
  });

  it('allows future-day schedule slots regardless of current time', () => {
    expect(
      isScheduleSlotSelectable(
        { dateKey: '2026-05-13', startTime: '09:00', endTime: '09:30' },
        new Date(2026, 4, 12, 10, 0)
      )
    ).toBe(true);
  });

  it('calculates TodoFlow task estimated duration from non-break tasks', () => {
    expect(
      getTodoTaskEstimatedSeconds({
        ...todo('todo-1', 'Plan'),
        taskIds: ['task-1', 'break-1', 'task-2'],
        tasks: {
          'task-1': task('task-1', 'First'),
          'break-1': { ...task('break-1', 'Break'), isTaskBreak: true, estimatedTime: 300 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 600 },
        },
      })
    ).toBe(720);
  });

  it('normalizes TodoFlow estimated duration to at least the current tasks total', () => {
    expect(
      getTodoEstimatedSeconds({
        ...todo('todo-1', 'Plan'),
        estimatedTimeTodo: 300,
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { ...task('task-1', 'First'), estimatedTime: 300 },
          'task-2': { ...task('task-2', 'Second'), estimatedTime: 600 },
        },
      })
    ).toBe(900);
  });

  it('moves a schedule slot to a new start time without changing duration', () => {
    expect(
      moveScheduleSlotPreservingDuration(
        { dateKey: '2026-05-12', startTime: '09:30', endTime: '11:00' },
        '2026-05-13',
        '14:15'
      )
    ).toEqual({ dateKey: '2026-05-13', startTime: '14:15', endTime: '15:45' });
  });

  it('moves a schedule slot earlier when the requested start would cut off the duration at midnight', () => {
    expect(
      moveScheduleSlotPreservingDuration(
        { dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' },
        '2026-05-13',
        '23:45'
      )
    ).toEqual({ dateKey: '2026-05-13', startTime: '23:00', endTime: '24:00' });
  });

  it('moves an overlapping slot to continue after the overlapping TodoFlow', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '09:30', endTime: '10:30' },
        [
          { dateKey: '2026-05-12', startTime: '09:00', endTime: '10:00' },
          { dateKey: '2026-05-12', startTime: '10:45', endTime: '11:15' },
        ]
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '11:15', endTime: '12:15' });
  });

  it('moves an overlapping slot before the conflict when continuing would pass the end of day', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '23:15', endTime: '23:45' },
        [{ dateKey: '2026-05-12', startTime: '23:00', endTime: '23:45' }]
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '22:30', endTime: '23:00' });
  });

  it('auto-fits an overlapping slot to end exactly at midnight', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '23:00', endTime: '23:30' },
        [{ dateKey: '2026-05-12', startTime: '22:45', endTime: '23:30' }]
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '23:30', endTime: '24:00' });
  });

  it('auto-fits a slot after the current time on today', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '09:00', endTime: '09:30' },
        [],
        { minStartTime: '10:00' }
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '10:00', endTime: '10:30' });
  });

  it('does not shorten a moved slot when the selected start would pass midnight', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '23:45', endTime: '24:00' },
        [{ dateKey: '2026-05-12', startTime: '23:00', endTime: '23:30' }],
        { durationSeconds: 3600 }
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '22:00', endTime: '23:00' });
  });

  it('moves a too-late slot earlier so the full duration ends at midnight', () => {
    expect(
      findAutoFitScheduleSlot(
        { dateKey: '2026-05-12', startTime: '23:45', endTime: '24:00' },
        [],
        { durationSeconds: 3600 }
      )
    ).toEqual({ dateKey: '2026-05-12', startTime: '23:00', endTime: '24:00' });
  });
});
