import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState : TaskCart = {
  tasks: {},
  taskIds: [],
  taskIdsInCart: []
};

const taskCartSlice = createSlice({
  name: 'taskCart',
  initialState,
  reducers: {
    addTaskCart: (state, action: PayloadAction<Task>) => {
      const task = action.payload;
      if (!state.taskIds.includes(task.id)) {
        state.tasks[task.id] = task;
        state.taskIds.push(task.id);
      }
    },
    removeTaskCart: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      delete state.tasks[taskId];
      state.taskIds = state.taskIds.filter(id => id !== taskId);
      state.taskIdsInCart = state.taskIdsInCart?.filter(id => id !== taskId);
    },
    addTaskCartsInRange: (state, action: PayloadAction<Task[]>) => {
      const tasks = action.payload;
      tasks.forEach(task => {
        state.tasks[task.id] = task;
        if (!state.taskIds.includes(task.id)) {
          state.taskIds.push(task.id);
        }
      });
    },
    addTaskInCart: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      if (!state.taskIdsInCart) {
        state.taskIdsInCart = [];
      }
      if (!state.taskIdsInCart.includes(taskId)) {
        state.taskIdsInCart.push(taskId);
        state.taskIds = state.taskIds.filter(id => id !== taskId);
      }
    },
    removeTaskInCart: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      if (state.taskIdsInCart) {
        state.taskIdsInCart = state.taskIdsInCart.filter(id => id !== taskId);
        if (!state.taskIds.includes(taskId)) {
          state.taskIds.push(taskId);
        }
      }
    },
    removeAllCartTasks: (state) => {
      state.taskIds = [];
      state.taskIdsInCart = [];
      state.tasks = {};
    }

  }
});

export const {
  addTaskCart,
  removeTaskCart,
  addTaskCartsInRange,
  addTaskInCart,
  removeTaskInCart,
  removeAllCartTasks
} = taskCartSlice.actions;

export default taskCartSlice.reducer;