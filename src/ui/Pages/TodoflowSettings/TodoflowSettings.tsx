import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoArrowBackOutline, IoCalendarOutline, IoGitBranchOutline, IoPieChartOutline, IoSaveOutline } from 'react-icons/io5';
import { PageType } from '~/enums/PageType.enum';
import DateChipList from '~/ui/components/DateChipList/DateChipList';
import SettingsPanel, { type SettingsPanelHandle } from '~/ui/components/SettingsPanel/SettingsPanel';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import { formatTime, generateId, parseTime } from '~/ui/helpers/utils/utils';
import { useAppDispatch, useAppSelector } from '~/ui/store/hooks';
import { setTodo } from '~/ui/store/todo/todoSlice';
import {
  applyTodoDateState,
  buildMonthDays,
  formatDateChipLabels,
  formatScheduleSlotChipLabels,
  getTodoForDate,
  getTodoScheduleDateKeys,
  getTodoTaskEstimatedSeconds,
  isPastDateKey,
  listDateKeysBetween,
  resizeTodoFlowScheduleDuration,
  splitTodoFlowForDate,
  syncTodoTaskEstimatesWithDuration,
  toggleDateKeySelection,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';
import './TodoflowSettings.css';

const formatDurationInput = (value: string): string => {
  const numbersOnly = value.replace(/\D/g, '');
  if (numbersOnly === '') return '';
  const limitedNumbers = numbersOnly.slice(0, 6);
  if (limitedNumbers.length <= 2) return limitedNumbers;
  if (limitedNumbers.length <= 4) return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2)}`;
  return `${limitedNumbers.slice(0, 2)}:${limitedNumbers.slice(2, 4)}:${limitedNumbers.slice(4)}`;
};

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });

const TodoflowSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const todoFlow = useAppSelector((state) => state.todoflow);
  const { info } = useAlert();
  const settingsPanelRef = useRef<SettingsPanelHandle>(null);
  const routeState = location.state as { activeDateKey?: string } | null;
  const [actualTimeInputValue, setActualTimeInputValue] = useState('');
  const [estimatedTimeInputValue, setEstimatedTimeInputValue] = useState('');
  const [timeError, setTimeError] = useState('');
  const [isAssigningDates, setIsAssigningDates] = useState(false);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => new Date());
  const [selectedAssignDateKeys, setSelectedAssignDateKeys] = useState<string[]>([]);
  const [rangeStartDateKey, setRangeStartDateKey] = useState(() => toDateKey(new Date()));

  useResizePage(PageType.TODOFLOW, 'left');

  const assignedDateKeys = getTodoScheduleDateKeys(todoFlow);
  const todayKey = toDateKey(new Date());
  const assignCalendarDays = buildMonthDays(visibleMonthDate);
  const activeDateKey =
    routeState?.activeDateKey && assignedDateKeys.includes(routeState.activeDateKey)
      ? routeState.activeDateKey
      : assignedDateKeys.includes(todayKey)
        ? todayKey
        : assignedDateKeys[0];
  const activeTodoFlow = activeDateKey ? getTodoForDate(todoFlow, activeDateKey) : todoFlow;
  const canDetachTodoFlow = assignedDateKeys.length > 1 && Boolean(activeDateKey);
  const slotLabels = formatScheduleSlotChipLabels(todoFlow.scheduleSlots || []);

  useEffect(() => {
    setActualTimeInputValue(formatTime(activeTodoFlow.actualTimeTodo || 0));
    setEstimatedTimeInputValue(formatTime(activeTodoFlow.estimatedTimeTodo || 0));
  }, [activeTodoFlow.actualTimeTodo, activeTodoFlow.estimatedTimeTodo]);

  useEffect(() => {
    setSelectedAssignDateKeys(assignedDateKeys.filter((dateKey) => !isPastDateKey(dateKey)));
    setRangeStartDateKey(assignedDateKeys.find((dateKey) => !isPastDateKey(dateKey)) || todayKey);
  }, [assignedDateKeys.join('|'), todayKey]);

  const persistTodoFlow = async (todo: TodoFlow) => {
    const persistableTodo = withoutRuntimeTimer(todo);
    await window.electronAPI.todoUpsert(persistableTodo);
    for (const taskId of persistableTodo.taskIds) {
      const task = persistableTodo.tasks[taskId];
      if (task) {
        await window.electronAPI.taskUpsert(task);
      }
    }
  };

  const saveActualTime = async () => {
    const seconds = Math.max(0, Math.min(86400, parseTime(actualTimeInputValue) || 0));
    const scopedTodo = { ...activeTodoFlow, actualTimeTodo: seconds };
    const nextTodo = withoutRuntimeTimer(activeDateKey ? applyTodoDateState(todoFlow, activeDateKey, scopedTodo) : scopedTodo);
    dispatch(setTodo(nextTodo));
    await persistTodoFlow(nextTodo);
    setActualTimeInputValue(formatTime(seconds));
    setTimeError('');
  };

  const saveEstimatedTime = async () => {
    const seconds = Math.max(0, Math.min(86400, parseTime(estimatedTimeInputValue) || 0));
    const taskTotal = getTodoTaskEstimatedSeconds(activeTodoFlow);
    if (seconds < taskTotal) {
      setTimeError('Estimated time cannot be less than the current tasks total');
      setEstimatedTimeInputValue(formatTime(activeTodoFlow.estimatedTimeTodo || 0));
      return;
    }

    const latestTodos = await window.electronAPI.todoGetAll().catch(() => []);
    const resized = resizeTodoFlowScheduleDuration(activeTodoFlow, seconds, latestTodos);
    if (!resized.ok) {
      setTimeError(resized.reason);
      setEstimatedTimeInputValue(formatTime(activeTodoFlow.estimatedTimeTodo || 0));
      return;
    }

    const scopedTodo = syncTodoTaskEstimatesWithDuration(resized.todo, seconds);
    const nextTodo = withoutRuntimeTimer(activeDateKey ? applyTodoDateState(todoFlow, activeDateKey, scopedTodo) : scopedTodo);
    dispatch(setTodo(nextTodo));
    await persistTodoFlow(nextTodo);
    setEstimatedTimeInputValue(formatTime(seconds));
    setTimeError('');
  };

  const openScheduleEditor = async () => {
    if (!todoFlow.id) {
      info('Save the TodoFlow before editing schedule.');
      return;
    }

    if (assignedDateKeys.length === 0) {
      setSelectedAssignDateKeys([]);
      setRangeStartDateKey(todayKey);
      setVisibleMonthDate(new Date());
      setIsAssigningDates((current) => !current);
      return;
    }

    await persistTodoFlow(todoFlow);
    await window.electronAPI.openScheduleEditorWindow({
      todoId: todoFlow.id,
      dateKeys: getTodoScheduleDateKeys(todoFlow),
      returnTo: '/todoflow-setting',
      activeDateKey,
    });
  };

  const openTodoTimeEditor = async () => {
    if (!todoFlow.id) {
      info('Save the TodoFlow before editing time allocation.');
      return;
    }
    await window.electronAPI.openTodoTimeEditorWindow({
      todoId: todoFlow.id,
      returnTo: '/todoflow-setting',
      activeDateKey,
    });
  };

  const moveAssignCalendar = (offset: number) => {
    setVisibleMonthDate((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const selectAssignDate = (dateKey: string) => {
    if (isPastDateKey(dateKey)) return;
    setSelectedAssignDateKeys([dateKey]);
    setRangeStartDateKey(dateKey);
  };

  const selectAssignDateRange = (dateKey: string) => {
    if (isPastDateKey(dateKey)) return;
    const nextRange = listDateKeysBetween(rangeStartDateKey, dateKey).filter((key) => !isPastDateKey(key));
    setSelectedAssignDateKeys(nextRange);
  };

  const toggleAssignDate = (dateKey: string) => {
    if (isPastDateKey(dateKey)) return;
    setSelectedAssignDateKeys((current) => toggleDateKeySelection(current, dateKey).filter((key) => !isPastDateKey(key)));
    setRangeStartDateKey(dateKey);
  };

  const saveAssignedDates = async () => {
    if (!todoFlow.id) {
      info('Save the TodoFlow before assigning dates.');
      return;
    }
    if (selectedAssignDateKeys.length === 0) {
      info('Select at least one date.');
      return;
    }

    setIsAssigningDates(false);
    await persistTodoFlow(todoFlow);
    await window.electronAPI.openScheduleEditorWindow({
      todoId: todoFlow.id,
      dateKeys: selectedAssignDateKeys,
      returnTo: '/todoflow-setting',
      activeDateKey: selectedAssignDateKeys[0],
    });
  };

  const handleDetachTodoFlow = async () => {
    if (!activeDateKey) return;

    const result = splitTodoFlowForDate(todoFlow, generateId(), activeDateKey, () => generateId());
    if (!result) {
      info('This TodoFlow cannot be detached.');
      return;
    }

    try {
      await window.electronAPI.todoUpsert(result.originalTodo);
      await window.electronAPI.todoUpsert(result.detachedTodo);
      for (const taskId of result.detachedTodo.taskIds) {
        const task = result.detachedTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
      dispatch(setTodo(result.detachedTodo));
      info('TodoFlow detached for this day.');
      navigate('/todoflow-setting', { replace: true, state: { activeDateKey } });
    } catch (error) {
      console.error('Failed to detach TodoFlow:', error);
      info('Failed to detach TodoFlow');
    }
  };

  const handleDone = async () => {
    await settingsPanelRef.current?.saveSettings();
    navigate('/todoflow');
  };

  return (
    <div className="todoflow-settings-page">
      <header className="todoflow-settings-header">
        <button className="btn btn-icon" title="Back to TodoFlow" onClick={() => navigate('/todoflow')}>
          <IoArrowBackOutline />
        </button>
        <div className="todoflow-settings-title">
          <h1>TodoFlow Settings</h1>
          <p>{todoFlow.note || 'Untitled TodoFlow'}</p>
        </div>
      </header>

      <section className="todoflow-settings-section">
        <div className="todoflow-settings-section-title">
          <IoCalendarOutline />
          <h2>Assigned Days</h2>
        </div>
        <DateChipList labels={formatDateChipLabels(assignedDateKeys)} emptyText="No assigned days" />
        <DateChipList labels={slotLabels} emptyText="No time slots" className="todoflow-settings-slots" />
        <button className="btn btn-secondary todoflow-settings-action" onClick={openScheduleEditor}>
          {assignedDateKeys.length === 0 ? 'Assign Date' : 'Edit Schedule'}
        </button>
        {isAssigningDates && (
          <div className="todoflow-settings-calendar">
            <div className="todoflow-settings-calendar-header">
              <button className="btn btn-secondary" onClick={() => moveAssignCalendar(-1)}>
                Prev
              </button>
              <strong>{visibleMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
              <button className="btn btn-secondary" onClick={() => moveAssignCalendar(1)}>
                Next
              </button>
            </div>
            <div className="todoflow-settings-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="todoflow-settings-month-grid">
              {assignCalendarDays.map((day) => {
                const dateKey = day.dateKey;
                const isPastDay = isPastDateKey(dateKey);
                const isSelected = selectedAssignDateKeys.includes(dateKey);
                return (
                  <button
                    key={dateKey}
                    className={`todoflow-settings-day ${day.isCurrentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${
                      isSelected ? 'selected' : ''
                    }`}
                    disabled={isPastDay}
                    onClick={(event) => {
                      if (event.shiftKey) {
                        selectAssignDateRange(dateKey);
                        return;
                      }
                      if (event.ctrlKey || event.metaKey) {
                        toggleAssignDate(dateKey);
                        return;
                      }
                      selectAssignDate(dateKey);
                    }}
                  >
                    {day.dayOfMonth}
                  </button>
                );
              })}
            </div>
            <div className="todoflow-settings-calendar-actions">
              <span>{selectedAssignDateKeys.length} selected</span>
              <button className="btn btn-secondary" onClick={() => setIsAssigningDates(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveAssignedDates}>
                Assign
              </button>
            </div>
          </div>
        )}
        <button className="btn btn-secondary todoflow-settings-action" onClick={openTodoTimeEditor}>
          <IoPieChartOutline />
          Edit Time Allocation
        </button>
        {canDetachTodoFlow && (
          <button className="btn btn-secondary todoflow-settings-action todoflow-settings-detach" onClick={handleDetachTodoFlow}>
            <IoGitBranchOutline />
            Detach {activeDateKey}
          </button>
        )}
      </section>

      <section className="todoflow-settings-section">
        <h2>Time</h2>
        <div className="todoflow-settings-time-grid">
          <label className="todoflow-settings-field">
            <span>Actual time</span>
            <input
              className="input todoflow-settings-time-input"
              value={actualTimeInputValue}
              onChange={(event) => setActualTimeInputValue(formatDurationInput(event.target.value))}
              onBlur={saveActualTime}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              placeholder="HH:MM:SS"
            />
          </label>
          <label className="todoflow-settings-field">
            <span>Estimated time</span>
            <input
              className={`input todoflow-settings-time-input ${timeError ? 'input-error' : ''}`}
              value={estimatedTimeInputValue}
              onChange={(event) => {
                setEstimatedTimeInputValue(formatDurationInput(event.target.value));
                if (timeError) setTimeError('');
              }}
              onBlur={saveEstimatedTime}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              placeholder="HH:MM:SS"
            />
          </label>
        </div>
        {timeError && <p className="todoflow-settings-error">{timeError}</p>}
      </section>

      <section className="todoflow-settings-section">
        <h2>Summary</h2>
        <div className="todoflow-settings-summary">
          <span>Status</span>
          <strong>{todoFlow.status}</strong>
          <span>Tasks</span>
          <strong>{todoFlow.taskCompleted}/{todoFlow.taskTotal}</strong>
        </div>
      </section>

      <SettingsPanel ref={settingsPanelRef} hideStartWithWindows hideSaveButton showSuccessMessage={false} />

      <button className="btn btn-primary todoflow-settings-save" onClick={handleDone}>
        <IoSaveOutline />
        Done
      </button>
    </div>
  );
};

export default TodoflowSettings;
