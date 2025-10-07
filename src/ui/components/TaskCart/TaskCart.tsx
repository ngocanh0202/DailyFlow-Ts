import { useAppDispatch, useAppSelector } from "~/ui/store/hooks";
import { FaCartShopping } from "react-icons/fa6";
import { MdDeleteForever } from "react-icons/md";
import { FaPlus } from "react-icons/fa";
import { useEffect, useState } from "react";
import { addTaskCartsInRange, addTaskInCart, removeTaskInCart } from "~/ui/store/task/taskCartSlice";
import { addTask } from "~/ui/store/todo/todoSlice";
import { generateId } from "~/ui/helpers/utils/utils";

interface TaskCartProps {
  className?: string;
}

const TaskCart = ({ className }: TaskCartProps) => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.taskCart);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const allTasks: Task[] = await window.electronAPI.taskGetAll();
      dispatch(addTaskCartsInRange(allTasks));
    };
    fetchTasks();
  }, []);

  const handleAddTaskToTodoFlow = (taskId: string) => {
    if (window.location.pathname === '/todoflow') {
      const newTask = {...tasks.tasks[taskId], id: generateId()};
      dispatch(addTask(newTask));
    }
  }

  return (
    <>
      <div className={`absolute bottom-4 right-4 ${className}`}>
        <button
          className="btn btn-icon primary rounded-full text-4xl"
          onClick={() => setOpen((prev) => !prev)}
        >
          <FaCartShopping />
        </button>
        {open && (
          <div className="absolute right-0 bottom-16 card shadow-lg !p-2 rounded min-w-[200px] max-w-[325px] max-h-[400px] overflow-y-auto z-10">
            <div className="font-bold mb-2">Tasks in Cart</div>
            {tasks.taskIdsInCart?.length === 0 ? (
              <div className="text-gray-500">No tasks in cart</div>
            ) : (
              <div>
                {tasks.taskIdsInCart?.map((id) => {
                  const task = tasks.tasks[id];
                  return (
                    <div key={id} className="flex items-center mb-1">
                      <span className="mr-2 text-lg">•</span>
                      <span className="flex-1 truncate">{task.title}</span>
                      <button
                        className="btn btn-icon btn-xs"
                        title="Add"
                        onClick={() => handleAddTaskToTodoFlow(id)}
                      >
                        <FaPlus />
                      </button>
                      <button
                        className="btn btn-icon btn-xs"
                        title="Delete"
                        onClick={() => dispatch(removeTaskInCart(id))}
                      >
                        <MdDeleteForever />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default TaskCart;