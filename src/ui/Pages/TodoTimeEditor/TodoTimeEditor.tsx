import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { IoAddCircleOutline, IoClose, IoSaveOutline } from 'react-icons/io5';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { formatTime, generateId, parseTime } from '~/ui/helpers/utils/utils';
import {
  addTaskWithProportionalEstimate,
  applyTodoDateState,
  getTodoForDate,
  getTodoEstimatedSeconds,
  getTodoTaskEstimatedSeconds,
  redistributeTaskEstimateWithinTodo,
  reorderTodoTaskIds,
  resizeTaskAllocationBoundaryFromDrag,
} from '~/ui/helpers/utils/scheduleUtils';
import './TodoTimeEditor.css';

const MIN_BLOCK_HEIGHT = 44;
const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const formatDurationInput = (value: string): string => {
  const numbersOnly = value.replace(/\D/g, '');
  if (numbersOnly === '') return '';
  const limitedNumbers = numbersOnly.slice(0, 6);
  if (limitedNumbers.length <= 2) return limitedNumbers;
  if (limitedNumbers.length <= 4) return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2)}`;
  return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2, 4)}:${limitedNumbers.slice(4)}`;
};

const TodoTimeEditor = () => {
  const [searchParams] = useSearchParams();
  const todoId = searchParams.get('todoId');
  const returnTo = searchParams.get('returnTo');
  const activeDateKey = searchParams.get('activeDateKey');
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [todo, setTodo] = useState<TodoFlow | null>(null);
  const [sourceTodo, setSourceTodo] = useState<TodoFlow | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timeInputValue, setTimeInputValue] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dragBoundary, setDragBoundary] = useState<{
    sourceTodo: TodoFlow;
    previousTaskId: string;
    nextTaskId: string;
    startY: number;
    totalSeconds: number;
    laneHeight: number;
  } | null>(null);

  useEffect(() => {
    const loadTodo = async () => {
      if (!todoId) {
        setError('Missing TodoFlow id');
        return;
      }
      const existing = await window.electronAPI.todoGetById(todoId);
      if (!existing) {
        setError('TodoFlow not found');
        return;
      }
      const persistableSource = withoutRuntimeTimer(existing);
      const scopedTodo = activeDateKey ? getTodoForDate(persistableSource, activeDateKey) : persistableSource;
      setSourceTodo(persistableSource);
      setTodo(withoutRuntimeTimer(scopedTodo));
      const firstTaskId = scopedTodo.taskIds.find((taskId) => scopedTodo.tasks[taskId] && !scopedTodo.tasks[taskId].isTaskBreak);
      setSelectedTaskId(firstTaskId || null);
      if (firstTaskId) {
        setTimeInputValue(formatTime(scopedTodo.tasks[firstTaskId].estimatedTime || 0));
      }
    };

    loadTodo();
  }, [todoId, activeDateKey]);

  const taskIds = useMemo(
    () => todo?.taskIds.filter((taskId) => todo.tasks[taskId] && !todo.tasks[taskId].isTaskBreak) || [],
    [todo]
  );
  const totalSeconds = todo ? getTodoEstimatedSeconds(todo) : 0;
  const selectedTask = todo && selectedTaskId ? todo.tasks[selectedTaskId] : undefined;

  useEffect(() => {
    if (!dragBoundary || !todo) return;

    const handleMove = (event: MouseEvent) => {
      setTodo(
        resizeTaskAllocationBoundaryFromDrag(dragBoundary.sourceTodo, dragBoundary.previousTaskId, dragBoundary.nextTaskId, {
          startY: dragBoundary.startY,
          currentY: event.clientY,
          totalSeconds: dragBoundary.totalSeconds,
          laneHeight: dragBoundary.laneHeight,
        })
      );
    };

    const stopDragging = () => setDragBoundary(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', stopDragging);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', stopDragging);
    };
  }, [dragBoundary, todo]);

  const selectTask = (taskId: string) => {
    if (!todo) return;
    setSelectedTaskId(taskId);
    setTimeInputValue(formatTime(todo.tasks[taskId].estimatedTime || 0));
  };

  const applyExactTime = () => {
    if (!todo || !selectedTaskId) return;
    const seconds = Math.max(0, parseTime(timeInputValue) || 0);
    setTodo(redistributeTaskEstimateWithinTodo(todo, selectedTaskId, seconds));
    setTimeInputValue(formatTime(seconds));
  };

  const resetEvenly = () => {
    if (!todo || taskIds.length === 0) return;
    const base = Math.floor(totalSeconds / taskIds.length);
    let remainder = totalSeconds - base * taskIds.length;
    const tasks = { ...todo.tasks };
    taskIds.forEach((taskId) => {
      tasks[taskId] = {
        ...tasks[taskId],
        estimatedTime: base + (remainder > 0 ? 1 : 0),
      };
      remainder = Math.max(0, remainder - 1);
    });
    setTodo({ ...todo, tasks });
  };

  const normalize = () => {
    if (!todo || taskIds.length === 0) return;
    const currentTotal = getTodoTaskEstimatedSeconds(todo);
    if (currentTotal === totalSeconds) return;
    const firstTaskId = taskIds[0];
    const delta = totalSeconds - currentTotal;
    setTodo({
      ...todo,
      tasks: {
        ...todo.tasks,
        [firstTaskId]: {
          ...todo.tasks[firstTaskId],
          estimatedTime: Math.max(0, (todo.tasks[firstTaskId].estimatedTime || 0) + delta),
        },
      },
    });
  };

  const handleDropTask = (targetTaskId: string) => {
    if (!todo || !selectedTaskId || selectedTaskId === targetTaskId) return;
    const fromIndex = todo.taskIds.indexOf(selectedTaskId);
    const toIndex = todo.taskIds.indexOf(targetTaskId);
    setTodo(reorderTodoTaskIds(todo, fromIndex, toIndex));
  };

  const createDraftTask = (): Task => ({
    id: generateId(),
    title: '',
    estimatedTime: 0,
    actualTime: 0,
    subTasks: [],
    isTaskBreak: false,
    status: TaskStatus.NOT_STARTED,
  });

  const addTaskAtIndex = (insertIndex: number) => {
    if (!todo) return;
    const task = createDraftTask();
    const addedTodo = addTaskWithProportionalEstimate(todo, task);
    const taskIds = addedTodo.taskIds.filter((taskId) => taskId !== task.id);
    const safeIndex = Math.max(0, Math.min(insertIndex, taskIds.length));
    taskIds.splice(safeIndex, 0, task.id);
    setTodo({ ...addedTodo, taskIds });
    setSelectedTaskId(task.id);
    setTimeInputValue(formatTime(addedTodo.tasks[task.id].estimatedTime || 0));
  };

  const addTaskAtEnd = () => {
    if (!todo || taskIds.length === 0) {
      addTaskAtIndex(todo?.taskIds.length || 0);
      return;
    }

    const lastVisibleTaskId = taskIds[taskIds.length - 1];
    addTaskAtIndex(todo.taskIds.indexOf(lastVisibleTaskId) + 1);
  };

  const addTaskRelativeToSelected = (position: 'above' | 'below') => {
    if (!todo || !selectedTaskId) {
      addTaskAtEnd();
      return;
    }

    const selectedIndex = todo.taskIds.indexOf(selectedTaskId);
    if (selectedIndex === -1) {
      addTaskAtEnd();
      return;
    }

    addTaskAtIndex(position === 'above' ? selectedIndex : selectedIndex + 1);
  };

  const moveSelectedTask = (direction: 'up' | 'down') => {
    if (!todo || !selectedTaskId) return;
    const visibleIndex = taskIds.indexOf(selectedTaskId);
    const targetTaskId = taskIds[direction === 'up' ? visibleIndex - 1 : visibleIndex + 1];
    if (!targetTaskId) return;
    const fromIndex = todo.taskIds.indexOf(selectedTaskId);
    const toIndex = todo.taskIds.indexOf(targetTaskId);
    setTodo(reorderTodoTaskIds(todo, fromIndex, toIndex));
  };

  const saveAllocation = async () => {
    if (!todo || isSaving) return;
    try {
      setIsSaving(true);
      const baseTodo = sourceTodo || (todoId ? await window.electronAPI.todoGetById(todoId) : todo);
      const nextTodo = withoutRuntimeTimer(activeDateKey ? applyTodoDateState(withoutRuntimeTimer(baseTodo), activeDateKey, todo) : todo);
      await window.electronAPI.todoUpsert(nextTodo);
      for (const taskId of nextTodo.taskIds) {
        const task = nextTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
      await window.electronAPI.completeTodoTimeEditor({ todo: nextTodo, returnTo, activeDateKey });
    } catch (error: any) {
      setError(error.message || 'Failed to save time allocation');
    } finally {
      setIsSaving(false);
    }
  };

  if (!todo) {
    return <div className="todo-time-editor-page">{error || 'Loading...'}</div>;
  }

  return (
    <div className="todo-time-editor-page">
      <header className="todo-time-editor-header drag-area">
        <div>
          <h1>Time Allocation</h1>
          <p>{todo.note || 'Untitled TodoFlow'}</p>
        </div>
        <div className="todo-time-editor-actions no-drag">
          <button className="btn btn-secondary todo-time-editor-button" onClick={() => window.electronAPI.closeWindow('todo-time-editor')}>
            <IoClose />
            Close
          </button>
          <button className="btn btn-primary todo-time-editor-button" onClick={saveAllocation} disabled={isSaving}>
            <IoSaveOutline />
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </header>

      {isSaving && (
        <div className="async-blocking-overlay no-drag" role="status">
          <span className="startup-spinner" aria-hidden="true" />
          <span>Saving time allocation</span>
        </div>
      )}

      <section className="todo-time-editor-summary">
        <span>Total planned</span>
        <strong>{formatTime(totalSeconds)}</strong>
      </section>

      <main className="todo-time-editor-workspace">
        <aside className="todo-time-editor-task-list">
          <div className="todo-time-editor-task-actions">
            <button className="btn btn-secondary" onClick={addTaskAtEnd} title="Create task">
              <IoAddCircleOutline />
              New
            </button>
            <button className="btn btn-secondary" onClick={() => addTaskRelativeToSelected('above')} title="Create above selected task">
              <FaCaretUp />
              Above
            </button>
            <button className="btn btn-secondary" onClick={() => addTaskRelativeToSelected('below')} title="Create below selected task">
              <FaCaretDown />
              Below
            </button>
          </div>
          {taskIds.map((taskId) => {
            const task = todo.tasks[taskId];
            const percentage = totalSeconds > 0 ? Math.round((task.estimatedTime / totalSeconds) * 100) : 0;
            return (
              <button
                key={taskId}
                className={`todo-time-editor-task-row ${selectedTaskId === taskId ? 'active' : ''}`}
                draggable
                onClick={() => selectTask(taskId)}
                onDragStart={() => setSelectedTaskId(taskId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropTask(taskId)}
              >
                <strong>{task.title || 'Untitled task'}</strong>
                <span>{formatTime(task.estimatedTime || 0)} - {percentage}%</span>
              </button>
            );
          })}
        </aside>

        <section className="todo-time-editor-lane" ref={laneRef}>
          {taskIds.map((taskId, index) => {
            const task = todo.tasks[taskId];
            const blockHeight = totalSeconds > 0
              ? Math.max(MIN_BLOCK_HEIGHT, (task.estimatedTime / totalSeconds) * 100)
              : MIN_BLOCK_HEIGHT;
            const percentage = totalSeconds > 0 ? Math.round((task.estimatedTime / totalSeconds) * 100) : 0;
            return (
              <div
                key={taskId}
                className={`todo-time-editor-block ${selectedTaskId === taskId ? 'active' : ''}`}
                style={{ minHeight: `${blockHeight}px`, flexGrow: Math.max(1, task.estimatedTime || 1) }}
                onClick={() => selectTask(taskId)}
              >
                <strong>{task.title || 'Untitled task'}</strong>
                <span>{formatTime(task.estimatedTime || 0)} - {percentage}%</span>
                {index < taskIds.length - 1 && (
                  <button
                    className="todo-time-editor-boundary no-drag"
                    aria-label="Resize task boundary"
                    onMouseDown={(event) => {
                      const laneHeight = laneRef.current?.getBoundingClientRect().height || 1;
                      setDragBoundary({
                        sourceTodo: todo,
                        previousTaskId: taskId,
                        nextTaskId: taskIds[index + 1],
                        startY: event.clientY,
                        totalSeconds: Math.max(1, totalSeconds),
                        laneHeight,
                      });
                    }}
                  />
                )}
              </div>
            );
          })}
        </section>

        <aside className="todo-time-editor-inspector">
          <h2>{selectedTask?.title || 'Select a task'}</h2>
          {selectedTask && (
            <>
              <div className="todo-time-editor-field">
                <span>Estimated time</span>
                <input
                  className="input input-primary"
                  value={timeInputValue}
                  onChange={(event) => setTimeInputValue(formatDurationInput(event.target.value))}
                  onBlur={applyExactTime}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                />
              </div>
              <div className="todo-time-editor-field">
                <span>Status</span>
                <strong>{selectedTask.status || TaskStatus.NOT_STARTED}</strong>
              </div>
              <div className="todo-time-editor-field">
                <span>Actual time</span>
                <strong>{formatTime(selectedTask.actualTime || 0)}</strong>
              </div>
            </>
          )}
          <button className="btn btn-secondary todo-time-editor-panel-button" onClick={resetEvenly}>
            Reset Evenly
          </button>
          <button className="btn btn-secondary todo-time-editor-panel-button" onClick={normalize}>
            Normalize
          </button>
          <div className="todo-time-editor-move-row">
            <button className="btn btn-secondary todo-time-editor-panel-button" onClick={() => moveSelectedTask('up')}>
              <FaCaretUp />
              Move Up
            </button>
            <button className="btn btn-secondary todo-time-editor-panel-button" onClick={() => moveSelectedTask('down')}>
              <FaCaretDown />
              Move Down
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default TodoTimeEditor;
