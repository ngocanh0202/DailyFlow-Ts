import { createSlice, PayloadAction  } from '@reduxjs/toolkit';
import { stat } from 'fs';
import { PrefixType } from '~/enums/Prefix.Type.enum';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import { TodoStatus } from '~/enums/TodoStatus.Type.enum';
import { generateId } from '~/ui/helpers/utils/utils';

const initialState: TodoFlow = {
  id: '',
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
  timer: null
};

const todoflowSlice = createSlice({
  name: 'todoflow',
  initialState,
  reducers: {
    initializeTodoFlow: (state, action: PayloadAction<{ id: string }>) => {
      state.id = action.payload.id;
      state.note = '';
      state.status = TodoStatus.STOP;
      state.taskCompleted = 0;
      state.taskTotal = 0;
      state.estimatedTimeTodo = 0;
      state.actualTimeTodo = 0;
      state.taskIds = [];
      state.tasks = {};
      state.currentTaskId = undefined;
      state.timeLeft = 0;
      state.timer = null;
    },

    setTodo: (state, action: PayloadAction<TodoFlow>) => {
      return { ...state, ...action.payload};
    },
    
    addTask: (state, action: PayloadAction<Task>) => {
      const task = action.payload;
      state.tasks[task.id] = task;
      state.taskIds.push(task.id);
      state.taskTotal += 1;
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
    },

    addAndSetTaskBreak: (state) => {
      const newId = PrefixType.BREAK_PREFIX + generateId();
      const breakTime = 5;
      const breakTask = {
        id: newId,
        title: 'Take a break',
        estimatedTime: breakTime + 1,
        actualTime: breakTime,
        subTasks: [],
        isTaskBreak: true,
        status: 'Not Started'
      }
      state.tasks[newId] = breakTask;
      state.taskIds.push(newId);
      state.taskTotal += 1;
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
      state.currentTaskId = newId;
      state.timeLeft = breakTime;
    },
    
    removeTask: (state, action: PayloadAction<string>) => {
      const taskIds = action.payload;
      delete state.tasks[taskIds];
      state.taskIds = state.taskIds.filter(id => id !== taskIds);
      state.taskTotal = Math.max(0, state.taskTotal - 1);
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
    },
    
    updateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const { id, updates } = action.payload;
      if (state.tasks[id]) {
        state.tasks[id] = { ...state.tasks[id], ...updates };
        todoflowSlice.caseReducers.calculateEstimatedTime(state);
      }
    },
    
    reorderTasks: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      if (toIndex < 0 || toIndex >= state.taskIds.length) return;
      if (fromIndex < 0 || fromIndex >= state.taskIds.length) return;
      if (fromIndex === toIndex) return;
      
      const newtaskIds = [...state.taskIds];
      const [movedItem] = newtaskIds.splice(fromIndex, 1);
      newtaskIds.splice(toIndex, 0, movedItem);
      state.taskIds = newtaskIds;
    },
    
    calculateEstimatedTime: (state) => {
      const totalEstimatedTime = state.taskIds.reduce((total, taskIds) => {
        const task = state.tasks[taskIds];
        return total + (task ? task.estimatedTime : 0);
      }, 0);
      const numberOfCompletedTasks = state.taskIds.reduce((count, taskIds) => {
        const task = state.tasks[taskIds];
        return count + (task && task.status === TaskStatus.COMPLETED ? 1 : 0);
      }, 0);
      const totalActualTime = state.taskIds.reduce((total, taskIds) => {
        const task = state.tasks[taskIds];
        return total + (task ? task.actualTime : 0);
      }, 0);
      state.actualTimeTodo = totalActualTime;
      state.taskCompleted = numberOfCompletedTasks;
      state.estimatedTimeTodo = totalEstimatedTime;
    },

    setNote: (state, action: PayloadAction<string>) => {
      state.note = action.payload;
    },

    setTodoStatus: (state, action: PayloadAction<TodoStatus>) => {
      state.status = action.payload;
      if (state.status === TodoStatus.START_ON_PROGRESS){
        if (state.taskCompleted === state.taskTotal) {
          state.currentTaskId = undefined;
          state.timeLeft = 0;
          state.taskIds.forEach(taskId => {
            state.tasks[taskId].status = TaskStatus.NOT_STARTED;
            state.tasks[taskId].actualTime = 0;
          });
          state.taskCompleted = 0;
        }
      }
    },

    setTaskStatus: (state, action: PayloadAction<TaskStatus>) => {
      const taskId = state.currentTaskId;
      if (!taskId || !state.tasks[taskId]) return;
      
      const task = state.tasks[taskId];
      task.status = action.payload;
      
      if (task.status === TaskStatus.COMPLETED && taskId.includes(PrefixType.BREAK_PREFIX)) {
        delete state.tasks[taskId];
        state.taskIds = state.taskIds.filter(id => id !== taskId);
        state.taskTotal = Math.max(0, state.taskTotal - 1); 
        state.currentTaskId = undefined;
        state.timeLeft = 0;
      }
      
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
    },

    setCurrentTaskId: (state, action: PayloadAction<string | undefined>) => {
      state.currentTaskId = action.payload;
      if (state.currentTaskId && state.tasks[state.currentTaskId]) {
        const currentTask = state.tasks[state.currentTaskId];
        state.timeLeft = currentTask.actualTime;
        if (state.timeLeft < 0) {
          state.timeLeft = 0;
        }
      } else {
        state.timeLeft = 0;
      }
    },
    
    setTimeLeft: (state, action: PayloadAction<number | undefined>) => {
      const task = state.currentTaskId && state.tasks[state.currentTaskId];
      if (!task) return;

      if (action.payload === undefined) {
        const timeLeft = state.timeLeft ?? (task.isTaskBreak ? 1 : 0);
        state.timeLeft = Math.max(0, task.isTaskBreak ? timeLeft - 1 : timeLeft + 1);
      } else {
        state.timeLeft = action.payload;
      }

      task.actualTime = state.timeLeft;
      state.actualTimeTodo = state.taskIds.reduce(
        (total, id) => total + (state.tasks[id]?.actualTime || 0),
        0
      );
    },

    setStartTimer: (state, action: PayloadAction<NodeJS.Timeout | null>) => {
      if (state.timer) {
        clearInterval(state.timer);
      }
      state.tasks[state.currentTaskId as string].status = TaskStatus.IN_PROGRESS;
      state.timer = action.payload;
      todoflowSlice.caseReducers.calculateEstimatedTime(state);
    },

    setStopTimer: (state) => {
      if (state.timer) {
        const currentTaskStatus =  state.tasks[state.currentTaskId as string]?.status;
        if (currentTaskStatus === TaskStatus.IN_PROGRESS && state.currentTaskId) {
          state.tasks[state.currentTaskId as string].status = TaskStatus.PAUSED;
        }
        clearInterval(state.timer);
        state.timer = null;
      }
    },

    setDoneAndNextTask: (state) => {
      if (state.currentTaskId && state.tasks[state.currentTaskId]) {
        state.tasks[state.currentTaskId].status = TaskStatus.COMPLETED;
        state.status = TodoStatus.START_ON_PROGRESS;
        const currentIndex = state.taskIds.indexOf(state.currentTaskId);
        const nextIndex = (currentIndex + 1) % state.taskIds.length;
        const nextTaskId = state.taskIds[nextIndex];
        state.currentTaskId = nextTaskId;
        state.timeLeft = state.tasks[nextTaskId]?.actualTime || 0;
        const numberOfCompletedTasks = state.taskIds.reduce((count, taskIds) => {
          const task = state.tasks[taskIds];
          return count + (task && task.status === TaskStatus.COMPLETED ? 1 : 0);
        }, 0);
        state.taskCompleted = numberOfCompletedTasks;
        if(state.taskCompleted === state.taskTotal){  
          state.status = TodoStatus.STOP;
          state.currentTaskId = undefined;
          state.timeLeft = 0;
          if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
          }
          state.taskCompleted = 0;
          state.taskIds.forEach(taskId => {
            state.tasks[taskId].status = TaskStatus.NOT_STARTED;
            state.tasks[taskId].actualTime = 0;
          });
        }
      }
    },

    setChangeCurrentTask: (state, action: PayloadAction<{ isNext: boolean; status: TaskStatus }>) => {
      const { isNext, status } = action.payload;
      if (state.currentTaskId) {
        const incompleteTaskIds = state.taskIds.filter(id => state.tasks[id].status !== TaskStatus.COMPLETED);
        const currentIndex = incompleteTaskIds.indexOf(state.currentTaskId);
        const nextIndex = isNext ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < incompleteTaskIds.length) {
          const nextTaskId = incompleteTaskIds[nextIndex];
          state.tasks[state.currentTaskId].status = status;
          state.currentTaskId = nextTaskId;
          state.timeLeft = state.tasks[nextTaskId]?.actualTime || 0;
        }
      }
    },

      setResetTodoFlow: (state) => {
        state.taskCompleted = 0;
        state.status = TodoStatus.STOP;
        state.currentTaskId = undefined;
        state.timeLeft = 0;

        if (state.timer) {
          clearInterval(state.timer);
          state.timer = null;
        }

        const nonBreakTaskIds = state.taskIds.filter(id => !id.includes(PrefixType.BREAK_PREFIX));
        const newTasks: Record<string, Task> = {};
        nonBreakTaskIds.forEach(id => {
          const t = state.tasks[id];
          if (t) {
            newTasks[id] = { ...t, status: TaskStatus.NOT_STARTED, actualTime: 0 };
          }
        });

        state.tasks = newTasks;
        state.taskIds = nonBreakTaskIds;
        state.taskTotal = state.taskIds.length;

        todoflowSlice.caseReducers.calculateEstimatedTime(state);
      }

  },
});

export const {
  initializeTodoFlow,
  setTodo,
  addTask,
  addAndSetTaskBreak,
  removeTask,
  updateTask,
  reorderTasks,
  calculateEstimatedTime,
  setTodoStatus,
  setTaskStatus,
  setNote,
  setCurrentTaskId,
  setTimeLeft,
  setStartTimer,
  setStopTimer,
  setDoneAndNextTask,
  setChangeCurrentTask,
  setResetTodoFlow
} = todoflowSlice.actions;

export default todoflowSlice.reducer;