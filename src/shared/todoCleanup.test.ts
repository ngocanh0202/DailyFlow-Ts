import { describe, expect, it } from 'vitest';
import {
  buildArchivedTodoSummary,
  getTodoAssignedDateKeys,
  splitExpiredAssignedTodos,
} from './todoCleanup';

describe('todoCleanup', () => {
  it('reads assigned dates from legacy dates, multi-date assignments, and schedule slots', () => {
    expect(
      getTodoAssignedDateKeys({
        scheduledDate: '2026-04-10',
        scheduledDates: ['2026-04-11', '2026-04-10'],
        scheduleSlots: [{ dateKey: '2026-04-12', startTime: '09:00', endTime: '10:00' }],
      })
    ).toEqual(['2026-04-10', '2026-04-11', '2026-04-12']);
  });

  it('archives and removes assigned TodoFlows when all assignments are in the past', () => {
    const expired = {
      id: 'expired',
      note: 'Past plan',
      estimatedTimeTodo: 600,
      actualTimeTodo: 420,
      taskIds: ['task-1'],
      taskCompleted: 1,
      taskTotal: 1,
      tasks: {
        'task-1': {
          id: 'task-1',
          title: 'Done task',
          estimatedTime: 600,
          actualTime: 420,
          status: 'Completed',
          subTasks: [],
        },
      },
      scheduleSlots: [{ dateKey: '2026-05-17', startTime: '09:00', endTime: '09:10' }],
    };
    const unscheduled = { id: 'unscheduled' };

    const result = splitExpiredAssignedTodos([expired, unscheduled], new Date('2026-05-18T10:00:00'));

    expect(result.activeTodos).toEqual([unscheduled]);
    expect(result.expiredTodos).toEqual([expired]);
    expect(result.archivedSummaries).toEqual([
      expect.objectContaining({
        todoId: 'expired',
        note: 'Past plan',
        removedDateKeys: ['2026-05-17'],
        totalEstimatedTime: 600,
        totalActualTime: 420,
        taskCompleted: 1,
        taskTotal: 1,
        tasks: [
          expect.objectContaining({
            taskId: 'task-1',
            title: 'Done task',
            completed: true,
            estimatedTime: 600,
            timeRatio: 1,
          }),
        ],
      }),
    ]);
  });

  it('removes only past assignments from mixed TodoFlows and archives the removed dates', () => {
    const mixed = {
      id: 'mixed',
      note: 'Mixed plan',
      scheduledDates: ['2026-05-17', '2026-05-18', '2026-05-19'],
      scheduledDate: '2026-05-17',
      scheduleSlots: [
        { dateKey: '2026-05-17', startTime: '09:00', endTime: '10:00' },
        { dateKey: '2026-05-19', startTime: '09:00', endTime: '10:00' },
      ],
      estimatedTimeTodo: 7200,
      actualTimeTodo: 1800,
      taskCompleted: 0,
      taskTotal: 0,
      taskIds: [],
      tasks: {},
    };

    const result = splitExpiredAssignedTodos([mixed], new Date('2026-05-18T10:00:00'));

    expect(result.expiredTodos).toEqual([]);
    expect(result.activeTodos).toEqual([
      expect.objectContaining({
        id: 'mixed',
        scheduledDate: '2026-05-18',
        scheduledDates: ['2026-05-18', '2026-05-19'],
        scheduleSlots: [{ dateKey: '2026-05-19', startTime: '09:00', endTime: '10:00' }],
      }),
    ]);
    expect(result.archivedSummaries).toEqual([
      expect.objectContaining({
        todoId: 'mixed',
        removedDateKeys: ['2026-05-17'],
        scheduleSlots: [{ dateKey: '2026-05-17', startTime: '09:00', endTime: '10:00' }],
      }),
    ]);
  });

  it('builds archived task ratios from the TodoFlow planned total', () => {
    const summary = buildArchivedTodoSummary(
      {
        id: 'todo-1',
        note: 'Ratio plan',
        estimatedTimeTodo: 100,
        actualTimeTodo: 80,
        taskCompleted: 1,
        taskTotal: 2,
        taskIds: ['task-1', 'task-2'],
        tasks: {
          'task-1': { id: 'task-1', title: 'A', estimatedTime: 25, actualTime: 30, status: 'Completed' },
          'task-2': { id: 'task-2', title: 'B', estimatedTime: 75, actualTime: 50, status: 'Paused' },
        },
      },
      ['2026-05-17'],
      new Date('2026-05-18T10:00:00')
    );

    expect(summary.tasks.map((item) => item.timeRatio)).toEqual([0.25, 0.75]);
  });
});
