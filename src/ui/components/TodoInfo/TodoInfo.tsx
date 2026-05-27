import { useState } from "react";
import { calculateProgressWidth, formatTime } from "~/ui/helpers/utils/utils";
import { MdDeleteForever } from "react-icons/md";
import { getTodoEstimatedSeconds } from "~/ui/helpers/utils/scheduleUtils";

interface TodoInfoProps {
  todo: TodoFlow;
  className?: string;
  onMakeTodo: (todo: TodoFlow) => void;
  onDeleted?: () => void;
}

const TodoInfo = ({ todo, onMakeTodo, className, onDeleted }: TodoInfoProps) => {
  const { note, taskCompleted, taskTotal, actualTimeTodo } = todo;
  const estimatedTimeTodo = getTodoEstimatedSeconds(todo);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await window.electronAPI.todoRemove(todo.id);
      onDeleted?.();
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <div className={`card mt-3 ${className} relative`}>
      <span>Note: </span> <span className="text-highlight">{note}</span>
      <div className="progress progress-xl">
          <div className="progress-bar" style={{ width: calculateProgressWidth(taskCompleted, taskTotal) }}></div>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <p>progress:</p>
        <p>{`${taskCompleted}/${taskTotal}`}</p>
      </div>
      <div className='flex justify-between text-sm mt-1'>
        <p>Actual time spent:</p>
        <p>{formatTime(actualTimeTodo)}</p>
      </div>
      <div className="flex justify-between text-sm mt-1">
        <p>Estimated time todo:</p>
        <p>{formatTime(estimatedTimeTodo)}</p>
      </div>
      <button className="btn btn-primary btn-sm w-full mt-3" onClick={() => onMakeTodo(todo)}>Make it my Todo for today!</button>
      <button className="btn btn-icon absolute top-2 right-2"
        disabled={isDeleting}
        onClick={handleToDelete}
        title={isDeleting ? 'Deleting TodoFlow' : 'Delete TodoFlow'}
      >
        <MdDeleteForever /> 
      </button>
      {isDeleting && (
        <div className="async-inline-overlay no-drag" role="status">
          Deleting
        </div>
      )}
    </div>
  );
};

export default TodoInfo;
