import { useEffect, useLayoutEffect, useState } from 'react';
import './Dashboard.css';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { getOnMiddleInScreen } from '~/ui/helpers/utils/utils';
import TodoInfo from '~/ui/components/TodoInfo/TodoInfo';
import { useAppDispatch, useAppSelector } from '~/ui/store/hooks';
import { setTodo } from '~/ui/store/todo/todoSlice';
import { useNavigate } from 'react-router-dom';
import TaskInfo from '~/ui/components/TaskInfo/TaskInfo';

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tasks = useAppSelector((state) => state.taskCart);
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<TodoFlow[]>([]);
  const [filteredTaskIds, setFilteredTaskIds] = useState<string[]>([]);
  const [todoKeySearch, setTodoKeySearch] = useState<string>('');
  const [taskKeySearch, setTaskKeySearch] = useState<string>('');
  const [isTriggerRefresh, setIsTriggerRefresh] = useState<boolean>(false);

  useEffect(()=>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.MAIN);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60, 
        getOnMiddleInScreen(currentWidth, currentHeight, width, height));
    }
    handleToResize();
  },[])

  useEffect(() =>{
    const fetchTodos = async () => {
      try {
        const allTodos: TodoFlow[] = await window.electronAPI.todoGetAll();
        setTodos(allTodos);
        setFilteredTodos(allTodos);
      } catch (err) {
        console.error('Failed to fetch todos:', err);
      }
    };
    fetchTodos();
  },[isTriggerRefresh])

  useLayoutEffect(() =>{
    const filtered = tasks.taskIds.filter(id => 
      tasks.tasks[id].title.toLowerCase().includes(taskKeySearch.toLowerCase())
    );
    setFilteredTaskIds(filtered);
  },[tasks, taskKeySearch])

  const handleTodoSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTodoKeySearch(e.target.value);
    const filtered = todos.filter(todo => 
      todo.note.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredTodos(filtered);
  };

  const handleTaskSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaskKeySearch(e.target.value);
    const filtered = tasks.taskIds.filter(id => 
      tasks.tasks[id].title.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredTaskIds(filtered);
  };

  const handleToMakeTodo = (todo: TodoFlow) => {
    dispatch(setTodo(todo));
    navigate(`/todoflow`);
  }

  return (
    <div className="h-full dashboard flex flex-col w-full max-w-full">
      <h1 className='text-2xl font-bold'>Dashboards</h1>
      <div className="mt-3 flex gap-4">
        <div className='flex-3'>
          <input 
            type="text" 
            className={`input input-primary `} 
            placeholder="Search Todo by Note" 
            value={todoKeySearch}
            onChange={handleTodoSearchChange}
          />
          <div
            className="grid grid-cols-2 gap-4 w-full overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {filteredTodos.map((todo) => (
              <TodoInfo 
                key={todo.id} 
                todo={todo} 
                onMakeTodo={handleToMakeTodo} 
                setTrigger={setIsTriggerRefresh}
                className="w-full action" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <input 
            type="text" 
            className={`input input-primary `} 
            placeholder="Search Task by title" 
            value={taskKeySearch}
            onChange={handleTaskSearchChange}
          />
          <div
            className="grid grid-cols-1 gap-4 w-full overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {filteredTaskIds.map((id) => (
              <TaskInfo key={id} task={tasks.tasks[id]} className="w-full action" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
