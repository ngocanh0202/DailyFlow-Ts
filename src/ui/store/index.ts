import { configureStore } from '@reduxjs/toolkit';
import todoflowReducer from './todo/todoSlice';
import taskCartReducer from './task/taskCartSlice';

export const store = configureStore({
  reducer: {
    todoflow: todoflowReducer,
    taskCart: taskCartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
