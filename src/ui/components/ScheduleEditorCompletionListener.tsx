import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTodo } from '~/ui/store/todo/todoSlice';
import { useAppDispatch } from '~/ui/store/hooks';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import { getTodoForDate, getTodoScheduleDateKeys, toDateKey } from '~/ui/helpers/utils/scheduleUtils';

const ScheduleEditorCompletionListener = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { askInApp } = useAlert();

  useEffect(() => {
    const removeScheduleListener = window.electronAPI.onScheduleEditorCompleted(async ({ todo, mode, returnTo, activeDateKey }) => {
      dispatch(setTodo(activeDateKey ? getTodoForDate(todo, activeDateKey) : todo));
      if (returnTo) {
        navigate(returnTo, { state: { activeDateKey } });
        return;
      }

      if (!getTodoScheduleDateKeys(todo).includes(toDateKey(new Date()))) {
        navigate('/dashboard');
        return;
      }

      const result = await askInApp('This TodoFlow is scheduled for today. Do you want to start it now?', 'Start TodoFlow', [
        'Start',
        'Dashboard',
      ]);
      if (result.response === 0) {
        navigate('/todoflow', { state: { mode } });
        return;
      }

      navigate('/dashboard');
    });

    const removeTodoTimeListener = window.electronAPI.onTodoTimeEditorCompleted(({ todo, returnTo, activeDateKey }) => {
      dispatch(setTodo(activeDateKey ? getTodoForDate(todo, activeDateKey) : todo));
      navigate(returnTo || '/todoflow-setting', { state: { activeDateKey } });
    });

    return () => {
      removeScheduleListener();
      removeTodoTimeListener();
    };
  }, [askInApp, dispatch, navigate]);

  return null;
};

export default ScheduleEditorCompletionListener;
