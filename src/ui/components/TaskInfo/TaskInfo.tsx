import { useState } from "react";
import { MdDeleteForever } from "react-icons/md";

import { formatTime } from "~/ui/helpers/utils/utils";

interface TaskInfoProps {
  task: Task;
  className?: string;
  onDeleted?: () => void;
}

const TaskInfo = ({ task, className, onDeleted }: TaskInfoProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!task) return null;

  const { title, estimatedTime } = task;

  const handleDeleteTask = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await window.electronAPI.taskRemove(task.id);
      onDeleted?.();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={`card mt-3 ${className} relative`}>
      <span>Title: </span> <span className="text-highlight">{title}</span>
      <div className="flex justify-between text-sm mt-1">
        <p>Estimated time:</p>
        <p>{formatTime(estimatedTime)}</p>
      </div>
      <div className="absolute top-2 right-2 flex">
        <button className="btn btn-icon" onClick={handleDeleteTask} disabled={isDeleting} title={isDeleting ? 'Deleting task' : 'Delete task'}>
          <MdDeleteForever />
        </button>
      </div>    
      {isDeleting && (
        <div className="async-inline-overlay no-drag" role="status">
          Deleting
        </div>
      )}
    </div>
  );
};

export default TaskInfo;
