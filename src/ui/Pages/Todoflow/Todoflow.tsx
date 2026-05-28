import { useLocation, useNavigate } from 'react-router-dom';
import { IoAddCircleOutline, IoSettingsOutline } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import './Todoflow.css';
import Task from "~/ui/components/Task/Task";
import { calculateProgressWidth, formatTime, generateId, getOnLeftInScreen } from "~/ui/helpers/utils/utils";
import { useAppSelector, useAppDispatch } from "~/ui/store/hooks";
import { 
  initializeTodoFlow, 
  addTask,
  setTodo,
  setTodoStatus,
  setNote,
  setStopTimer,
  setStartTimer,
  setTimeLeft,
  setDoneAndNextTask,
  setChangeCurrentTask,
  setTaskStatus,
  setCurrentTaskId,
  setResetTodoFlow,
  addAndSetTaskBreak,
} from "~/ui/store/todo/todoSlice";
import { useAlert } from "~/ui/helpers/hooks/useAlert";
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { IoHomeOutline } from "react-icons/io5";
import { IoMdArrowRoundUp } from "react-icons/io";
import { RiCollapseDiagonalFill, RiResetLeftLine } from "react-icons/ri";
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import TaskPlayer from '~/ui/components/TaskPlayer/TaskPlayer';
import SoundPlayer from '~/ui/helpers/utils/SoundPlayer';
import { SoundType } from '~/enums/Sound.Type.enum';
import { FaMinus } from 'react-icons/fa';
import InputHandler from '~/ui/components/InputHandler/InputHandler';
import { mainWindowResizeState } from '~/ui/helpers/utils/pageResizeState';
import {
  canResumeTodoFlowEntry,
  getRenderableTodoFlowTaskIds,
  getPersistableTodoDateState,
  getTodoEstimatedSeconds,
  getTodoFlowCurrentTask,
  getTodoScheduleDateKeys,
  hasTodoFlowStarted,
  resetTodoFlowProgress,
  toDateKey,
} from '~/ui/helpers/utils/scheduleUtils';

const Todoflow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { info, notify } = useAlert();
  const todoFlow = useAppSelector((state) => state.todoflow);
  const containerTaskDiv = useRef<(HTMLDivElement | null)>(null);
  const entryPromptShownRef = useRef(false);
  const [showEntryPrompt, setShowEntryPrompt] = useState(false);
  const isInitializingRef = useRef(true);
  const [noteError, setNoteError] = useState<string>('');
  const [triggerTaskValidation, setTriggerTaskValidation] = useState<boolean>(false);
  const [isNewTodo, setIsNewTodo] = useState<boolean>(true);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const soundPlayer = SoundPlayer.getInstance();
  const routeState = location.state as { mode?: string; fromDashboard?: boolean; dateKey?: string } | null;
  const isCreateMode = routeState?.mode === 'create';
  const isFromDashboard = routeState?.fromDashboard === true;
  const assignedDateKeys = getTodoScheduleDateKeys(todoFlow);
  const currentTask = getTodoFlowCurrentTask(todoFlow);
  const renderableTaskIds = getRenderableTodoFlowTaskIds(todoFlow);
  const estimatedTimeTodo = getTodoEstimatedSeconds(todoFlow);
  const todayKey = toDateKey(new Date());
  const activeDateKey =
    routeState?.dateKey && assignedDateKeys.includes(routeState.dateKey)
      ? routeState.dateKey
      : assignedDateKeys.includes(todayKey)
        ? todayKey
        : assignedDateKeys[0];

  useEffect(() =>{
    const handleToResize = async () => {
      if (!mainWindowResizeState.shouldResize(PageType.TODOFLOW)) {
        return;
      }

      const {width, height} = getPageSize(PageType.TODOFLOW);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60, 
        getOnLeftInScreen(currentWidth, currentHeight, width, height));
      mainWindowResizeState.markResized(PageType.TODOFLOW);
    }
    handleToResize();
  },[])

  useEffect(() => {
    const fetchAndInitialize = async () => {
      if (todoFlow.id) {
        setIsNewTodo(isCreateMode);
        if (isFromDashboard && hasTodoFlowStarted(todoFlow) && !entryPromptShownRef.current) {
          entryPromptShownRef.current = true;
          dispatch(setStopTimer());
          setShowEntryPrompt(true);
          await window.electronAPI.setWindowAlwaysOnTop('main', true);
          return;
        }
        if (
          todoFlow.status === TodoStatus.START_ON_TODO &&
          todoFlow.timer == null &&
          todoFlow.currentTaskId &&
          todoFlow.tasks[todoFlow.currentTaskId]?.status === TaskStatus.IN_PROGRESS
        ) {
          dispatch(setStartTimer(setInterval(() => {
             dispatch(setTimeLeft(undefined));
          }, 1000)));
        }
        await window.electronAPI.setWindowAlwaysOnTop('main', true);
      } else {
        setIsNewTodo(true);
        const newId = generateId();
        dispatch(initializeTodoFlow({ id: newId }));
      }
    }
    fetchAndInitialize();
  }, []);

  useEffect(() => {
    isInitializingRef.current = false;
  }, []);

  const getPersistableTodoFlow = (todo: TodoFlow): TodoFlow => ({
    ...todo,
    timer: null,
  });

  const persistTodoFlow = async (todo: TodoFlow = todoFlow) => {
    if (!todo.id || !todo.note.trim()) return;

    try {
      const persistableTodo = getPersistableTodoFlow(todo);
      const nextTodo = getPersistableTodoDateState(persistableTodo, activeDateKey);
      await window.electronAPI.todoUpsert(nextTodo);
      for (const taskId of persistableTodo.taskIds) {
        const task = nextTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
    } catch (error) {
      console.error('Failed to persist todo state:', error);
    }
  };

  useEffect(() => {
    if (isInitializingRef.current || showEntryPrompt || isCreateMode) {
      return;
    }
    if (!todoFlow.id || !todoFlow.note.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      persistTodoFlow();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    todoFlow.id,
    todoFlow.note,
    todoFlow.status,
    todoFlow.taskCompleted,
    todoFlow.taskTotal,
    estimatedTimeTodo,
    todoFlow.actualTimeTodo,
    todoFlow.currentTaskId,
    todoFlow.timeLeft,
    todoFlow.taskIds,
    todoFlow.tasks,
    showEntryPrompt,
    isCreateMode,
  ]);

  const resumeTodoFlowEntry = async () => {
    setShowEntryPrompt(false);
    if (canResumeTodoFlowEntry(todoFlow)) {
      dispatch(setStartTimer(setInterval(() => {
         dispatch(setTimeLeft(undefined));
      }, 1000)));
    }
    await window.electronAPI.setWindowAlwaysOnTop('main', true);
  };

  const resetTodoFlowEntry = async () => {
    const resetTodo = resetTodoFlowProgress(todoFlow);
    dispatch(setResetTodoFlow());
    await persistTodoFlow(resetTodo);
    setShowEntryPrompt(false);
    await window.electronAPI.setWindowAlwaysOnTop('main', true);
  };

  useEffect(() =>{
    const handleByStatusChange = async () => {
      if (isFromDashboard && entryPromptShownRef.current) {
        return;
      }

      if(todoFlow.status === TodoStatus.STOP){
        const currentTask = todoFlow.currentTaskId;
        const isTaskBreak = currentTask ? todoFlow.tasks[currentTask]?.isTaskBreak : false;
        const isTaskCompleted = currentTask ? todoFlow.tasks[currentTask]?.status === TaskStatus.COMPLETED : false;
        const canTaskPlay = currentTask && isTaskBreak && !isTaskCompleted;
        if (canTaskPlay){
          dispatch(setStartTimer(setInterval(() => {
             dispatch(setTimeLeft(undefined));
          }, 1000)));
        }
        else{
          dispatch(setStopTimer());
        }
        await window.electronAPI.setWindowAlwaysOnTop('main', false);
      }
      else if(todoFlow.status === TodoStatus.START_ON_PROGRESS){
        navigate(`/ontask`);
        await window.electronAPI.setWindowAlwaysOnTop('main', true);
      }
    }

    handleByStatusChange();
  },[todoFlow.status])

  useEffect(() => {
    const checkTimeEst = async () => {
      const currentTask = todoFlow.currentTaskId && todoFlow.tasks[todoFlow.currentTaskId];
      if (!currentTask || currentTask.status !== TaskStatus.IN_PROGRESS) return;

      const { estimatedTime, isTaskBreak } = currentTask;
      const { timeLeft } = todoFlow;

     const shouldNotify = 
        estimatedTime > 0 && 
        (timeLeft === estimatedTime || (timeLeft === 0 && isTaskBreak));

      if (shouldNotify) {
        try {
          let message = null;
          if (isTaskBreak){
            message = { title: 'Break Time Over', body: 'Your break time is over. Time to get back to work!' };
            soundPlayer.play(SoundType.SOUND_SHINDERU);
          }else{
            message = { title: 'Deadline Approaching', body: 'You are getting close to the deadline. Please complete your task on time.' };
            soundPlayer.play(SoundType.SOUND_HAYAY);
          }
          dispatch(setStopTimer());
          await notify(message.title, message.body);
        } catch (err) {
          console.error('Failed to show notification:', err);
        }
      }
    };

    checkTimeEst();
  }, [todoFlow.timeLeft]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setNote(value));
    if (noteError && value.trim()) {
      setNoteError('');
    }
  };

  const handleNoteBlur = () => {
    if (!todoFlow.note.trim()) {
      setNoteError('Note cannot be empty');
    }
  };

  const handleAddNewTask = async () => {
    const newTask: Task = { 
      id: generateId(), 
      title: '', 
      estimatedTime: 0, 
      actualTime: 0, 
      subTasks: [], 
      status: 'Not Started' 
    };
    dispatch(addTask(newTask));
  }

  const validationRules = () => {
    let valid = true;
    const existingTaskIds = todoFlow.taskIds.filter((taskId, index, taskIds) => {
      return Boolean(todoFlow.tasks[taskId]) && taskIds.indexOf(taskId) === index;
    });

    if (!todoFlow.note.trim()) {
      setNoteError('Note cannot be empty');
      valid = false;
    }

    if (existingTaskIds.length === 0) {
      info('Please add at least one task before starting.');
      return false;
    }

    setTriggerTaskValidation(true);
    setTimeout(() => {
      setTriggerTaskValidation(false);
    }, 100);

    const hasEmptyTasks = existingTaskIds.some(taskId => {
      const task = todoFlow.tasks[taskId];
      return !task.title.trim();
    });

    if (hasEmptyTasks) {
      valid = false;
    }

    const hasEmptySubtasks = existingTaskIds.some(taskId => {
      const task = todoFlow.tasks[taskId];
      return task.subTasks.some(subTask => !subTask.title.trim());
    });

    if (hasEmptySubtasks) {
      valid = false;
    }

    if (!valid) {
      info('Please fix the errors in the tasks before starting.');
        setTimeout(() => {
        const firstErrorElement = document.querySelector('.input-error') as HTMLInputElement;
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorElement.focus();
        }
      }, 150);
    }

    return valid; 
  };

  const handleToStart = async () => {
    let isValid = validationRules();
    if (!isValid) {
      return;
    }
    soundPlayer.play(SoundType.SOUND_GAMBUSTA);
    if (todoFlow.currentTaskId && !currentTask) {
      dispatch(setCurrentTaskId(undefined));
    }
    dispatch(setTodoStatus(TodoStatus.START_ON_PROGRESS));
    await handleTodoCreation({ ...todoFlow, status: TodoStatus.START_ON_PROGRESS });
  };

  const handleTodoCreation = async (todo: TodoFlow = todoFlow) => {
    try {
      setIsSavingTodo(true);
      const persistableTodo = getPersistableTodoFlow(todo);
      const nextTodo = getPersistableTodoDateState(persistableTodo, activeDateKey);
      await window.electronAPI.todoUpsert(nextTodo);
      let tasksArray = persistableTodo.taskIds;

      for (const taskId of tasksArray) {
        const task = nextTodo.tasks[taskId];
        await window.electronAPI.taskUpsert(task);
      }
      
    } catch (error) {
      console.error('Failed to save todo:', error);
      info('Failed to save todo');
    } finally {
      setIsSavingTodo(false);
    }
  };

  const completionPercent = todoFlow.taskTotal > 0 ? Math.round((todoFlow.taskCompleted / todoFlow.taskTotal) * 100) : 0;

  return (
    <div className="todoflow-page h-full">
      <div className="todoflow-header" >
        <div className='todoflow-title-group'>
          <button className='btn btn-icon todoflow-nav-button' title="Back to dashboard" onClick={async () =>{
            dispatch(setStopTimer());
            try {
              await window.electronAPI.setWindowAlwaysOnTop('main', false);
            } catch (error) {
              console.error('Failed to disable always-on-top:', error);
            }
            navigate('/dashboard');
          }}><IoHomeOutline /></button>
          <div className="todoflow-title-copy">
            <div className="todoflow-title-meta drag-area">
              <span className={`todoflow-entry-badge ${isNewTodo ? 'draft' : 'saved'}`}>
                {isNewTodo ? 'Draft' : 'Saved'}
              </span>
              <span>{activeDateKey || 'Unscheduled'}</span>
            </div>
            <p className='drag-area'>
              {isNewTodo ? '🆕' : '✏️'}
            </p>
            <div className='todoflow-note-area'>
              <input 
                type="text" 
                className={`input input-primary z-50 todoflow-note-input ${noteError ? 'input-error' : ''}`} 
                placeholder="What are you working on?" 
                value={todoFlow.note}
                onChange={handleNoteChange}
                onBlur={handleNoteBlur}
              />
              {noteError && <p className="text-red-500 text-sm mt-1">{noteError}</p>}
            </div>
          </div>
        </div>
        <div className='todoflow-header-actions'>
          <button className="btn btn-icon" title="Reset progress" onClick={async () => {
            const resetTodo = resetTodoFlowProgress(todoFlow);
            dispatch(setResetTodoFlow());
            await persistTodoFlow(resetTodo);
          }}>
            <RiResetLeftLine />
          </button>
          {
            todoFlow.timer != null && (
              <button className="btn btn-icon" title="Focus current task" onClick={() => {
                const isValid = validationRules();
                if (!isValid) return;
                dispatch(setTodoStatus(TodoStatus.START_ON_PROGRESS));
              }}>
                <RiCollapseDiagonalFill />
              </button>
            )
          }
          <button
            className="btn btn-icon"
            title="TodoFlow settings"
            onClick={() => {
              navigate('/todoflow-setting', { state: { activeDateKey } });
            }}
          >
            <IoSettingsOutline />
          </button>
          <button
            className="btn btn-icon"
            title="Minimize"
            onClick={async () => {
              await window.electronAPI.appMinimize();
            }}
          >
            <FaMinus className='cursor-pointer animate-pop' />
          </button>
        </div>
      </div>
  
      <div className="card todoflow-progress-card">
        <div className='todoflow-progress-summary'>
          <div className="todoflow-metric">
            <span>Status</span>
            <strong className="text-highlight">{todoFlow.status == TodoStatus.STOP ? 'Ready' : 'Running'}</strong>
          </div>
          <div className="todoflow-metric">
            <span>Actual</span>
            <strong className={todoFlow.actualTimeTodo > estimatedTimeTodo ? 'text-orange-500' : ''}>{formatTime(todoFlow.actualTimeTodo)}</strong>
          </div>
          <div className="todoflow-metric">
            <span>Estimate</span>
            <strong>{formatTime(estimatedTimeTodo)}</strong>
          </div>
          <div className="todoflow-metric">
            <span>Done</span>
            <strong>{completionPercent}%</strong>
          </div>
        </div>
        <div className='todoflow-progress-row'>
          <div className="progress progress-xl">
              <div className="progress-bar" style={{ width: calculateProgressWidth(todoFlow.taskCompleted, todoFlow.taskTotal) }}></div>
          </div>
          <p className='whitespace-nowrap'>{`${todoFlow.taskCompleted}/${todoFlow.taskTotal} done`}</p>
        </div>
      </div>
      {!currentTask && 
        <div className='todoflow-action-row'>
          <button 
            className={`btn btn-primary todoflow-start-button ${todoFlow.status === 'Start' ? 'disabled' : ''}`} 
            onClick={handleToStart}
            disabled={isSavingTodo}
          >
            {isSavingTodo ? 'Saving' : 'Start TodoFlow'}
          </button>
        </div>        
       }
      {isSavingTodo && (
        <div className="async-blocking-overlay no-drag" role="status">
          <span className="startup-spinner" aria-hidden="true" />
          <span>Saving TodoFlow</span>
        </div>
      )}
      <button className="todoflow-add-task btn btn-secondary"
        onClick={handleAddNewTask}>
        <IoAddCircleOutline />
        <span>Add task</span>
      </button>
      <div className="todoflow-task-list overflow-y-auto" ref={containerTaskDiv}>
        {currentTask && (
          <TaskPlayer 
            task={currentTask}
            isTimer={todoFlow.timer === null}
            isDoneTodo={todoFlow.taskCompleted === todoFlow.taskTotal} 
            onTakeBreak={() => {
              dispatch(addAndSetTaskBreak());
              soundPlayer.play(SoundType.SOUND_CAU_MET_LAM_HA);
              dispatch(setStartTimer(setInterval(() => {
                dispatch(setTimeLeft(undefined));
              }, 1000)));
            }}
            onStartTask={() => {
              soundPlayer.play(SoundType.SOUND_SUGOI_SUGOI);
              dispatch(setStartTimer(setInterval(() => {
                dispatch(setTimeLeft(undefined));
              }, 1000)));
            }}
            onPauseTask={() => {
              dispatch(setStopTimer());
            }}
            onDoneTask={() => {
              if (todoFlow.currentTaskId && currentTask) {
                dispatch(setStopTimer());
                soundPlayer.play(currentTask.isTaskBreak ? SoundType.SOUND_SHINDERU : SoundType.SOUND_BOCCHI);
                dispatch(setTaskStatus(TaskStatus.COMPLETED));
                dispatch(setTodoStatus(TodoStatus.STOP));
              }
            }}
            onDoneAndNextTask={() => {
              const isValid = validationRules();
              if (!isValid) return;
              soundPlayer.play(SoundType.SOUND_GAMBUSTA);
              dispatch(setDoneAndNextTask());            
            }}
            onChangeTask={(next: boolean, status: string) => {
              if (todoFlow && todoFlow.currentTaskId) {
                  dispatch(setChangeCurrentTask({ isNext: next, status: status as TaskStatus }));
                  dispatch(setStartTimer(setInterval(() => {
                    dispatch(setTimeLeft(undefined));
                  }
                  , 1000)));
                  return true;
                }
                else
                  return false;
              }
            }
          />
        )}
        {renderableTaskIds.map((taskIds, index) => (
          <Task key={taskIds} taskId={taskIds} index={currentTask ? index + 1 : index} triggerValidation={triggerTaskValidation} />
        ))}
      </div>
      <button className='absolute bottom-4 left-4 btn btn-icon primary rounded-full text-4xl'
        onClick={() =>{
          if (containerTaskDiv.current) {
            containerTaskDiv.current.scrollTo({
              top: 0,
              behavior: "smooth"
            });
          }
        }}
      >
        <IoMdArrowRoundUp />
      </button>
      <InputHandler />
      {showEntryPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 no-drag">
          <div className="card w-[min(360px,calc(100vw-32px))] p-5">
            <h2 className="text-xl font-bold text-highlight">Open TodoFlow</h2>
            <p className="mt-3 text-sm text-gray-400">
              Resume the current TodoFlow state or reset its progress before starting again.
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn btn-primary flex-1 h-[38px]" onClick={resumeTodoFlowEntry}>
                Resume
              </button>
              <button className="btn btn-secondary flex-1 h-[38px]" onClick={resetTodoFlowEntry}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Todoflow;
