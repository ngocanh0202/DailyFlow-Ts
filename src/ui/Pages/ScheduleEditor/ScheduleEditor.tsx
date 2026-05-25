import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoClose, IoSaveOutline } from 'react-icons/io5';
import './ScheduleEditor.css';
import { generateId } from '~/ui/helpers/utils/utils';
import {
  applyTodoDateState,
  createDefaultTasksForSchedule,
  createScheduledTodoFlow,
  ensureTodoDayPlans,
  findAutoFitScheduleSlot,
  getTodoForDate,
  getTodoScheduleMinimumSlotDurationSeconds,
  getTodoScheduleMinimumTotalDurationSeconds,
  getTodoScheduleSelectionDurationSeconds,
  getTodoScheduleSelectionRangeMinutes,
  getTodoScheduleSaveEstimateDurationSeconds,
  getTodoScheduleSlotTargetDurationSeconds,
  getTodoScheduleTargetDurationSeconds,
  hasOverlappingScheduleSlot,
  isScheduleSlotSelectable,
  moveScheduleSlotPreservingDuration,
  secondsBetweenTimeStrings,
  setTodoAssignedDates,
  setTodoScheduleSlot,
  syncTodoTaskEstimatesWithDuration,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const HOUR_HEIGHT = 64;
const MIN_DAY_WIDTH = 220;
const MINUTE_STEP = 15;
const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_STEP = 18;

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const minutesFromTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const timeFromMinutes = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  if (clamped === 24 * 60) {
    return '24:00';
  }
  const hours = Math.floor(clamped / 60);
  const remainingMinutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

const snapMinutes = (minutes: number): number => Math.round(minutes / MINUTE_STEP) * MINUTE_STEP;

const ceilToMinuteStep = (minutes: number): number => Math.ceil(minutes / MINUTE_STEP) * MINUTE_STEP;

const getMinutesFromClientY = (clientY: number, container: HTMLElement): number => {
  const rect = container.getBoundingClientRect();
  const rawMinutes = ((clientY - rect.top) / HOUR_HEIGHT) * 60;
  return Math.max(0, Math.min(24 * 60, snapMinutes(rawMinutes)));
};

const getRange = (start: number, end: number) => ({
  start: Math.min(start, end),
  end: Math.max(start, end),
});

const getScheduleSlotsDuration = (slots: ScheduleSlot[] = []): number =>
  slots.reduce((total, slot) => total + secondsBetweenTimeStrings(slot.startTime, slot.endTime), 0);

type ScheduleSelection = {
  startDateIndex: number;
  endDateIndex: number;
  startMinutes: number;
  endMinutes: number;
};

const parseDateKeys = (value: string | null): string[] => {
  const keys = (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return keys.length > 0 ? keys : [toDateKey(new Date())];
};

const getMinSelectableMinutes = (dateKey: string, now = new Date()): number => {
  if (dateKey !== toDateKey(now)) {
    return 0;
  }

  return Math.min(24 * 60, ceilToMinuteStep(now.getHours() * 60 + now.getMinutes()));
};

const getMinSelectableTime = (dateKey: string): string | undefined => {
  const minMinutes = getMinSelectableMinutes(dateKey);
  return minMinutes > 0 ? timeFromMinutes(minMinutes) : undefined;
};

const ScheduleEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const timelineWrapRef = useRef<HTMLDivElement | null>(null);
  const dateKeys = useMemo(() => parseDateKeys(searchParams.get('dates')), [searchParams]);
  const todoId = searchParams.get('todoId');
  const returnTo = searchParams.get('returnTo');
  const activeDateKey = searchParams.get('activeDateKey');
  const [todo, setTodo] = useState<TodoFlow | null>(null);
  const [sourceTodo, setSourceTodo] = useState<TodoFlow | null>(null);
  const [initialScheduleSlots, setInitialScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [otherTodos, setOtherTodos] = useState<TodoFlow[]>([]);
  const [noteError, setNoteError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [dragState, setDragState] = useState<{
    dateKey: string;
    edge: 'start' | 'end' | 'move';
    startY: number;
    originalStartTime: string;
    originalEndTime: string;
  } | null>(null);
  const [selection, setSelection] = useState<ScheduleSelection | null>(null);
  const selectionRef = useRef<ScheduleSelection | null>(null);
  const isCreateMode = !todoId;

  useEffect(() => {
    const loadTodo = async () => {
      if (todoId) {
        const [existing, allTodos]: [TodoFlow, TodoFlow[]] = await Promise.all([
          window.electronAPI.todoGetById(todoId),
          window.electronAPI.todoGetAll(),
        ]);
        setOtherTodos(allTodos.filter((item) => item.id !== todoId));
        if (existing) {
          const source = withoutRuntimeTimer(existing);
          const scopedExisting = setTodoAssignedDates(source, dateKeys);
          setSourceTodo(source);
          setTodo(scopedExisting);
          setInitialScheduleSlots(scopedExisting.scheduleSlots || []);
          return;
        }
      }

      const allTodos = await window.electronAPI.todoGetAll();
      setOtherTodos(allTodos);
      const draftTodo = createScheduledTodoFlow(generateId(), dateKeys);
      setSourceTodo(null);
      setTodo(draftTodo);
      setInitialScheduleSlots(draftTodo.scheduleSlots || []);
    };

    loadTodo();
  }, [todoId, dateKeys.join(',')]);

  useEffect(() => {
    if (!dragState || !todo) return;

    const scrollTimelineNearEdge = (event: MouseEvent) => {
      const container = timelineWrapRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let left = 0;
      let top = 0;
      if (event.clientY > rect.bottom - AUTO_SCROLL_EDGE) top = AUTO_SCROLL_STEP;
      if (event.clientY < rect.top + AUTO_SCROLL_EDGE) top = -AUTO_SCROLL_STEP;
      if (event.clientX > rect.right - AUTO_SCROLL_EDGE) left = AUTO_SCROLL_STEP;
      if (event.clientX < rect.left + AUTO_SCROLL_EDGE) left = -AUTO_SCROLL_STEP;
      if (left || top) {
        container.scrollBy({ left, top });
      }
    };

    const handleMove = (event: MouseEvent) => {
      scrollTimelineNearEdge(event);
      const deltaMinutes = snapMinutes(((event.clientY - dragState.startY) / HOUR_HEIGHT) * 60);
      const slot = todo.scheduleSlots?.find((item) => item.dateKey === dragState.dateKey);
      if (!slot) return;

      const originalStart = minutesFromTime(dragState.originalStartTime);
      const originalEnd = minutesFromTime(dragState.originalEndTime);
      const minimumDuration = getMinimumDurationSecondsForSlot(slot.dateKey) / 60;
      const nextStart =
        dragState.edge === 'move'
          ? Math.max(
              getMinSelectableMinutes(slot.dateKey),
              Math.min(24 * 60 - (originalEnd - originalStart), originalStart + deltaMinutes)
            )
          : dragState.edge === 'start'
          ? Math.min(originalEnd - minimumDuration, Math.max(0, originalStart + deltaMinutes))
          : originalStart;
      const nextEnd =
        dragState.edge === 'move'
          ? nextStart + (originalEnd - originalStart)
          : dragState.edge === 'end'
          ? Math.max(
              originalStart + minimumDuration,
              Math.min(24 * 60, originalEnd + deltaMinutes)
            )
          : originalEnd;

      const nextSlot = {
        ...slot,
        startTime: timeFromMinutes(nextStart),
        endTime: timeFromMinutes(nextEnd),
      };
      const otherSlots = busySlots.filter((busySlot) => busySlot.dateKey === nextSlot.dateKey);
      if (!isScheduleSlotSelectable(nextSlot)) {
        setSlotError('This time is no longer available today');
        return;
      }
      if (hasOverlappingScheduleSlot(nextSlot, otherSlots)) {
        setSlotError('This time overlaps with another TodoFlow');
        return;
      }

      setSlotError('');
      setTodo(setTodoScheduleSlot(todo, nextSlot));
    };

    const stopDragging = () => setDragState(null);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', stopDragging);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', stopDragging);
    };
  }, [dragState, todo]);

  useEffect(() => {
    if (!selection) return;

    const scrollTimelineNearEdge = (event: MouseEvent) => {
      const container = timelineWrapRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let left = 0;
      let top = 0;
      if (event.clientY > rect.bottom - AUTO_SCROLL_EDGE) top = AUTO_SCROLL_STEP;
      if (event.clientY < rect.top + AUTO_SCROLL_EDGE) top = -AUTO_SCROLL_STEP;
      if (event.clientX > rect.right - AUTO_SCROLL_EDGE) left = AUTO_SCROLL_STEP;
      if (event.clientX < rect.left + AUTO_SCROLL_EDGE) left = -AUTO_SCROLL_STEP;
      if (left || top) {
        container.scrollBy({ left, top });
      }
    };

    const handleMove = (event: MouseEvent) => {
      scrollTimelineNearEdge(event);
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const hoursContainer = target?.closest?.('.schedule-editor-hours') as HTMLElement | null;
      if (!hoursContainer) return;

      const endDateIndex = Number(hoursContainer.dataset.dateIndex);
      const endMinutes = getMinutesFromClientY(event.clientY, hoursContainer);
      setSelection((current) => {
        const nextSelection = current
          ? {
              ...current,
              endDateIndex: Number.isFinite(endDateIndex) ? endDateIndex : current.endDateIndex,
              endMinutes,
            }
          : current;
        selectionRef.current = nextSelection;
        return nextSelection;
      });
    };

    const handleMouseUp = () => applySelection();
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selection, todo]);

  const title = dateKeys.length > 1 ? `${dateKeys.length} days` : dateKeys[0];
  const busySlots = otherTodos.flatMap((item) =>
    (item.scheduleSlots || []).map((slot) => ({ ...slot, todoId: item.id, title: item.note || 'TodoFlow' }))
  );
  const totalSelectedDuration = getScheduleSlotsDuration(todo?.scheduleSlots);
  const targetScheduleDuration = todo ? getTodoScheduleTargetDurationSeconds(todo, initialScheduleSlots) : 0;
  const targetScheduleSlotDuration = todo ? getTodoScheduleSlotTargetDurationSeconds(todo, initialScheduleSlots) : 0;
  const minimumTotalDuration = todo
    ? getTodoScheduleMinimumTotalDurationSeconds({ todo, isCreateMode, initialScheduleSlots })
    : 0;

  const getMinimumDurationSecondsForSlot = (dateKey: string): number => {
    if (!todo) {
      return MINUTE_STEP * 60;
    }

    return getTodoScheduleMinimumSlotDurationSeconds({
      todo,
      isCreateMode,
      dateKey,
      minimumStepSeconds: MINUTE_STEP * 60,
    });
  };

  const applySelection = (selectionToApply = selectionRef.current) => {
    if (!selectionToApply || !todo) return;

    const dateRange = getRange(selectionToApply.startDateIndex, selectionToApply.endDateIndex);
    const minuteRange = getRange(selectionToApply.startMinutes, selectionToApply.endMinutes);
    if (minuteRange.end <= minuteRange.start && isCreateMode) {
      selectionRef.current = null;
      setSelection(null);
      return;
    }

    const selectedSlots: Array<{ slot: ScheduleSlot; durationSeconds: number }> = [];
    for (let index = dateRange.start; index <= dateRange.end; index += 1) {
      const targetDateKey = dateKeys[index];
      const existingSlot = !isCreateMode
        ? initialScheduleSlots.find((slot) => slot.dateKey === targetDateKey)
        : undefined;
      const selectedDurationSeconds = Math.max(MINUTE_STEP * 60, (minuteRange.end - minuteRange.start) * 60);
      const durationSeconds = getTodoScheduleSelectionDurationSeconds({
        isCreateMode,
        existingSlotDurationSeconds: existingSlot
          ? secondsBetweenTimeStrings(existingSlot.startTime, existingSlot.endTime)
          : undefined,
        selectedDurationSeconds,
        targetScheduleDurationSeconds: targetScheduleSlotDuration,
      });
      const durationMinutes = durationSeconds / 60;
      const startMinutes = Math.max(0, Math.min(selectionToApply.startMinutes, 24 * 60 - durationMinutes));
      const endMinutes = startMinutes + durationMinutes;

      selectedSlots.push(
        {
          slot: existingSlot
            ? moveScheduleSlotPreservingDuration(existingSlot, targetDateKey, timeFromMinutes(startMinutes))
            : {
                dateKey: targetDateKey,
                startTime: timeFromMinutes(startMinutes),
                endTime: timeFromMinutes(endMinutes),
              },
          durationSeconds,
        }
      );
    }

    const fittedSlots = selectedSlots.map(({ slot, durationSeconds }) => {
      const selectedDurationSeconds = secondsBetweenTimeStrings(slot.startTime, slot.endTime);
      const needsFit =
        selectedDurationSeconds !== durationSeconds ||
        !isScheduleSlotSelectable(slot) ||
        hasOverlappingScheduleSlot(slot, busySlots);

      return needsFit
        ? findAutoFitScheduleSlot(slot, busySlots, {
            durationSeconds,
            minStartTime: getMinSelectableTime(slot.dateKey),
          })
        : slot;
    });

    if (fittedSlots.some((slot): slot is null => slot === null)) {
      setSlotError('No available time left for this TodoFlow on the selected day');
      selectionRef.current = null;
      setSelection(null);
      return;
    }
    const validFittedSlots = fittedSlots as ScheduleSlot[];

    let nextTodo = todo;
    for (const slot of validFittedSlots) {
      nextTodo = setTodoScheduleSlot(nextTodo, slot);
    }

    setSlotError('');
    setTodo(nextTodo);
    selectionRef.current = null;
    setSelection(null);
  };

  const ensureDefaultTasks = (nextTodo: TodoFlow): TodoFlow => {
    if (nextTodo.taskIds.length > 0) {
      return nextTodo;
    }

    const ids = [generateId(), generateId(), generateId()];
    const tasks = createDefaultTasksForSchedule(totalSelectedDuration, ids);
    return {
      ...nextTodo,
      taskIds: ids,
      tasks: Object.fromEntries(tasks.map((task) => [task.id, task])),
      taskTotal: tasks.length,
      estimatedTimeTodo: totalSelectedDuration,
    };
  };

  const saveTodo = async () => {
    if (!todo) return;
    if (!todo.note.trim()) {
      setNoteError('Note is required');
      return;
    }
    if (!todo.scheduleSlots || todo.scheduleSlots.length === 0) {
      setSlotError('Choose at least one time slot');
      return;
    }
    if (todo.scheduleSlots.some((slot) => !isScheduleSlotSelectable(slot))) {
      setSlotError('Choose a time that is not in the past');
      return;
    }
    if (!isCreateMode && totalSelectedDuration < minimumTotalDuration) {
      setSlotError('TodoFlow total time can only stay the same or be extended');
      return;
    }

    try {
      const nextEstimateDuration = getTodoScheduleSaveEstimateDurationSeconds({
        todo,
        isCreateMode,
        totalSelectedDurationSeconds: totalSelectedDuration,
      });
      const scopedTodo = ensureTodoDayPlans(syncTodoTaskEstimatesWithDuration(ensureDefaultTasks(todo), nextEstimateDuration));
      scopedTodo.scheduleSlots?.forEach((slot) => secondsBetweenTimeStrings(slot.startTime, slot.endTime));
      const nextTodo = sourceTodo
        ? dateKeys.reduce(
            (mergedTodo, dateKey) => applyTodoDateState(mergedTodo, dateKey, getTodoForDate(scopedTodo, dateKey)),
            sourceTodo
          )
        : scopedTodo;
      await window.electronAPI.todoUpsert(withoutRuntimeTimer(nextTodo));
      for (const taskId of nextTodo.taskIds) {
        const task = nextTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
      await window.electronAPI.completeScheduleEditor({
        todo: withoutRuntimeTimer(nextTodo),
        mode: isCreateMode ? 'create' : 'edit',
        returnTo,
        activeDateKey,
      });
    } catch (error: any) {
      setSlotError(error.message || 'Invalid time slot');
    }
  };

  if (!todo) {
    return <div className="schedule-editor-page">Loading...</div>;
  }

  return (
    <div className="schedule-editor-page">
      <header className="schedule-editor-header drag-area">
        <div>
          <h1>TodoFlow Schedule</h1>
          <p>{title}</p>
        </div>
        <div className="schedule-editor-actions no-drag">
          <button className="btn btn-secondary schedule-editor-button" onClick={() => window.electronAPI.closeWindow('schedule-editor')}>
            <IoClose />
            Close
          </button>
          <button className="btn btn-primary schedule-editor-button" onClick={saveTodo}>
            <IoSaveOutline />
            Save
          </button>
        </div>
      </header>

      <section className="schedule-editor-note">
        <label>
          <span>TodoFlow note</span>
          <input
            className={`input input-primary ${noteError ? 'input-error' : ''}`}
            value={todo.note}
            onChange={(event) => {
              setTodo({ ...todo, note: event.target.value });
              setNoteError('');
            }}
            placeholder="What will this TodoFlow focus on?"
          />
        </label>
      </section>

      {slotError && <p className="schedule-editor-error">{slotError}</p>}

      <div className="schedule-editor-timeline-wrap" ref={timelineWrapRef}>
        <div
          className="schedule-editor-timeline"
          style={{ gridTemplateColumns: `72px repeat(${dateKeys.length}, minmax(${MIN_DAY_WIDTH}px, 1fr))` }}
        >
          <div className="schedule-editor-time-axis">
            <div className="schedule-editor-day-heading" />
            {HOURS.map((hour) => (
              <div key={hour} className="schedule-editor-hour-label">
                {hour}
              </div>
            ))}
          </div>

          {dateKeys.map((dateKey) => (
            <div key={dateKey} className="schedule-editor-day-column">
              <div className="schedule-editor-day-heading">{dateKey}</div>
              <div className="schedule-editor-hours" data-date-index={dateKeys.indexOf(dateKey)}>
                {HOURS.map((hour) => {
                  const hourStartMinutes = minutesFromTime(hour);
                  const hourEndMinutes = hourStartMinutes + 60;
                  const isHourUnavailable = hourEndMinutes <= getMinSelectableMinutes(dateKey);

                  return (
                    <button
                      key={`${dateKey}-${hour}`}
                      className={`schedule-editor-hour-cell ${isHourUnavailable ? 'disabled' : ''}`}
                      disabled={isHourUnavailable}
                      onMouseDown={(event) => {
                        if (isHourUnavailable) return;
                        const container = event.currentTarget.parentElement;
                        if (!container) return;
                        const startMinutes = Math.max(
                          getMinutesFromClientY(event.clientY, container),
                          getMinSelectableMinutes(dateKey)
                        );
                        const startDateIndex = dateKeys.indexOf(dateKey);
                        const nextSelection = {
                          startDateIndex,
                          endDateIndex: startDateIndex,
                          startMinutes,
                          endMinutes: Math.min(24 * 60, startMinutes + MINUTE_STEP),
                        };
                        selectionRef.current = nextSelection;
                        setSelection(nextSelection);
                      }}
                      onMouseEnter={() => {
                        if (!selection || isHourUnavailable) return;
                        const nextSelection = { ...selection, endDateIndex: dateKeys.indexOf(dateKey) };
                        selectionRef.current = nextSelection;
                        setSelection(nextSelection);
                      }}
                      onMouseUp={() => applySelection()}
                    />
                  );
                })}
                {selection && (() => {
                  const dateRange = getRange(selection.startDateIndex, selection.endDateIndex);
                  const minuteRange = isCreateMode
                    ? getRange(selection.startMinutes, selection.endMinutes)
                    : (() => {
                        const existingSlot = initialScheduleSlots.find((slot) => slot.dateKey === dateKey);
                        const existingSlotDurationSeconds = existingSlot
                          ? secondsBetweenTimeStrings(existingSlot.startTime, existingSlot.endTime) / 60
                          : undefined;
                        const selectedRange = getRange(selection.startMinutes, selection.endMinutes);
                        return getTodoScheduleSelectionRangeMinutes({
                          isCreateMode,
                          existingSlotDurationSeconds: existingSlotDurationSeconds
                            ? existingSlotDurationSeconds * 60
                            : undefined,
                          startMinutes: selection.startMinutes,
                          selectedEndMinutes: selectedRange.end,
                          selectedDurationSeconds: Math.max(
                            MINUTE_STEP * 60,
                            (selectedRange.end - selectedRange.start) * 60
                          ),
                          targetScheduleDurationSeconds: targetScheduleSlotDuration,
                        });
                      })();
                  if (dateKeys.indexOf(dateKey) < dateRange.start || dateKeys.indexOf(dateKey) > dateRange.end) {
                    return null;
                  }
                  return (
                    <div
                      className="schedule-editor-selection"
                      style={{
                        top: `${(minuteRange.start / 60) * HOUR_HEIGHT}px`,
                        height: `${Math.max(16, ((minuteRange.end - minuteRange.start) / 60) * HOUR_HEIGHT)}px`,
                      }}
                    />
                  );
                })()}
                {(todo.scheduleSlots || [])
                  .filter((slot) => slot.dateKey === dateKey)
                  .map((slot) => {
                    const startMinutes = minutesFromTime(slot.startTime);
                    const durationMinutes = secondsBetweenTimeStrings(slot.startTime, slot.endTime) / 60;
                    return (
                      <div
                        key={`${slot.dateKey}-${slot.startTime}`}
                        className="schedule-editor-slot"
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          setDragState({
                            dateKey,
                            edge: 'move',
                            startY: event.clientY,
                            originalStartTime: slot.startTime,
                            originalEndTime: slot.endTime,
                          });
                        }}
                        style={{
                          top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
                          height: `${(durationMinutes / 60) * HOUR_HEIGHT}px`,
                        }}
                      >
                        <strong>{todo.note || 'TodoFlow'}</strong>
                        <span>
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {isCreateMode && (
                          <button
                            className="schedule-editor-slot-resize schedule-editor-slot-resize-top"
                            onMouseDown={(event) => {
                              event.stopPropagation();
                              setDragState({
                                dateKey,
                                edge: 'start',
                                startY: event.clientY,
                                originalStartTime: slot.startTime,
                                originalEndTime: slot.endTime,
                              });
                            }}
                            aria-label="Resize slot start"
                          />
                        )}
                        <button
                          className="schedule-editor-slot-resize schedule-editor-slot-resize-bottom"
                          onMouseDown={(event) => {
                            event.stopPropagation();
                            setDragState({
                              dateKey,
                              edge: 'end',
                              startY: event.clientY,
                              originalStartTime: slot.startTime,
                              originalEndTime: slot.endTime,
                            });
                          }}
                          aria-label="Resize slot end"
                        />
                      </div>
                    );
                  })}
                {busySlots
                  .filter((slot) => slot.dateKey === dateKey)
                  .map((slot) => {
                    const startMinutes = minutesFromTime(slot.startTime);
                    const durationMinutes = secondsBetweenTimeStrings(slot.startTime, slot.endTime) / 60;
                    return (
                      <div
                        key={`${slot.todoId}-${slot.dateKey}-${slot.startTime}`}
                        className="schedule-editor-busy-slot"
                        style={{
                          top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
                          height: `${(durationMinutes / 60) * HOUR_HEIGHT}px`,
                        }}
                      >
                        <strong>{slot.title}</strong>
                        <span>{slot.startTime} - {slot.endTime}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;
