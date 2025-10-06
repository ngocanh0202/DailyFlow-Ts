import { useEffect, useRef, useState } from "react";
import { CiEdit } from "react-icons/ci";
import { FaCaretDown, FaCaretUp } from "react-icons/fa";
import { IoAddCircleOutline } from "react-icons/io5";
import { MdDeleteForever } from "react-icons/md";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { formatTime, parseTime } from "~/ui/helpers/utils/utils";
import { useAppSelector, useAppDispatch } from "~/ui/store/hooks";
import { removeTask, reorderTasks, updateTask } from "~/ui/store/todo/todoSlice";


interface TaskProps {
  taskId: string;
  index: number;
  triggerValidation?: boolean;
}

const Task = ({ taskId, index, triggerValidation = false}: TaskProps) => {
  const dispatch = useAppDispatch();
  const task = useAppSelector((state) => state.todoflow.tasks[taskId]);
  const currentTaskId = useAppSelector((state) => state.todoflow.currentTaskId);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeInputValue, setTimeInputValue] = useState<string>('');
  const [titleError, setTitleError] = useState<string>('');
  const [subTaskErrors, setSubTaskErrors] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (task) {
      setTimeInputValue(formatTime(task.estimatedTime));
    } else {
      setTimeInputValue('');
    }
  }, [task]);

  useEffect(() => {
    if (triggerValidation) {
      if (!task?.title.trim()) {
        setTitleError('Task title cannot be empty');
      }
      
      if (task) {
        const newSubTaskErrors: { [key: number]: string } = {};
        task.subTasks.forEach((subTask, index) => {
          if (!subTask.title.trim()) {
            newSubTaskErrors[index] = 'Subtask title cannot be empty';
          }
        });
        setSubTaskErrors(newSubTaskErrors);
      }
    }
  }, [triggerValidation]);

  const handleTaskChange = (field: keyof Task, value: (string | number)) => {
    if (!task) return;
    
    dispatch(updateTask({ id: taskId, updates: { [field]: value } }));    
    if (field === 'estimatedTime') {
        setTimeInputValue(formatTime(value as number));
    }
    if (field === 'title' && titleError && (value as string).trim()) {
        setTitleError('');
    }
  };

  const handleTitleBlur = () => {
    if (!task?.title.trim()) {
      setTitleError('Task title cannot be empty');
    }
  };

  const handleSubTaskChange = (index: number, value: string) => {
    if (!task) return;
    const newDetails = [...task.subTasks];
    newDetails[index] = { ...newDetails[index], title: value };
    dispatch(updateTask({ id: taskId, updates: { subTasks: newDetails } }));
    
    if (subTaskErrors[index] && value.trim()) {
      setSubTaskErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const handleSubTaskBlur = (index: number) => {
    if (!task?.subTasks[index]?.title.trim()) {
      setSubTaskErrors(prev => ({
        ...prev,
        [index]: 'Subtask title cannot be empty'
      }));
    }
  };

  const handleSubTaskOrderChange = (fromIndex: number, toIndex: number) => {
    if (!task) return;
    if (toIndex < 0 || toIndex >= task.subTasks.length) return;
    if (fromIndex < 0 || fromIndex >= task.subTasks.length) return;
    if (fromIndex === toIndex) return;

    const newSubTasks = [...task.subTasks];
    const [movedItem] = newSubTasks.splice(fromIndex, 1);
    newSubTasks.splice(toIndex, 0, movedItem);

    dispatch(updateTask({ id: taskId, updates: { subTasks: newSubTasks } }));
    
    setTimeout(() => {
        const targetInput = inputRefs.current[toIndex];
        if (targetInput) {
          targetInput.focus();
          targetInput.setSelectionRange(targetInput.value.length, targetInput.value.length);
        }
    }, 0);
  };

  const handleSubTaskDelete = (index: number) => {
    if (!task) return;
    const newSubTasks = [...task.subTasks];
    newSubTasks.splice(index, 1);
    dispatch(updateTask({ id: taskId, updates: { subTasks: newSubTasks } }));
    
    setTimeout(() => {
        const targetIndex = index < newSubTasks.length ? index : newSubTasks.length - 1;
        const targetInput = inputRefs.current[targetIndex];
        if (targetInput) {
          targetInput.focus();
          targetInput.setSelectionRange(targetInput.value.length, targetInput.value.length);
        }
    }, 0);
  };

  const handleInputOnChangeEstimatedTime = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    
    if (numbersOnly === '') {
        setTimeInputValue('');
        return;
    }
    
    const limitedNumbers = numbersOnly.slice(0, 6);
    
    let formattedTime = '';
    
    if (limitedNumbers.length <= 2) {
        formattedTime = limitedNumbers;
    } else if (limitedNumbers.length <= 4) {
        const hours = limitedNumbers.slice(0, 2);
        const minutes = limitedNumbers.slice(2);
        formattedTime = `${hours}:${minutes}`;
    } else {
        const hours = limitedNumbers.slice(0, 2);
        const minutes = limitedNumbers.slice(2, 4);
        const seconds = limitedNumbers.slice(4);
        formattedTime = `${hours}:${minutes}:${seconds}`;
    }
    
    setTimeInputValue(formattedTime);
  };

  const handleTimeInputBlur = () => {
    if (!task) return;
    let seconds = parseTime(timeInputValue);
    if (isNaN(seconds) || seconds < 0) {
        seconds = 0;
        setTimeInputValue('');
    }
    if (seconds > 86400) {
        seconds = 86400;
        setTimeInputValue(formatTime(seconds));
    }
    dispatch(updateTask({ id: taskId, updates: { estimatedTime: seconds } }));
  };

  const handleTaskDelete = (taskId: string) => {
    dispatch(removeTask(taskId));
  }

  const handleOrderTask = (fromIndex: number, toIndex: number) => {
    dispatch(reorderTasks({ fromIndex, toIndex }));
  }

  return (
    <div className={`card mt-3 animate-pop`}>
      <div className="flex justify-between items-center">
        <div className="font-semibold flex gap-2 items-center w-full">
          <p>{index + 1}.</p>
          <div className="flex-1">
            <input 
              type="text" 
              className={`input w-full ${titleError ? 'border-red-500' : ''}`} 
              value={task?.title} 
              placeholder="Task title"
              onChange={(e) => handleTaskChange('title', e.target.value)}
              onBlur={handleTitleBlur}
            />
            {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
          </div>
        </div>
        <div className="relative flex items-center group">
          <button className="btn ">...</button>
          <div className="absolute right-[-5px] top-[20px] context-menu hidden group-hover:block">
            <div className="context-menu-item" onClick={() => handleOrderTask(index, index - 1)}>
              <i><FaCaretUp /></i> Move up
            </div>
            <div className="context-menu-item" onClick={() => handleOrderTask(index, index + 1)}>
              <i><FaCaretDown /></i> Move down
            </div>
            <div className="context-menu-item">
              <i><CiEdit /></i> More note
            </div>
            <div className="context-menu-item" onClick={() => { if (!task) return; handleTaskDelete(task?.id); }}>
              <i><MdDeleteForever /></i> Delete
            </div>
          </div>
        </div>
      </div>
      <div>
        <input type="range" className="range" min="0" max="86400" step="300" value={task?.estimatedTime} onChange={(e) => handleTaskChange('estimatedTime', Number(e.target.value))} />
        <div className="text-sm text-gray-500 mt-1 flex items-center justify-between">
          <p>Est:  
            <input 
                type="text" 
                className="input ml-1 w-[65px]" 
                value={timeInputValue}
                onChange={(e) => handleInputOnChangeEstimatedTime(e.target.value)}
                onBlur={handleTimeInputBlur}
                placeholder="HH:MM:SS or MM:SS or SS"
              />
          </p>
          <p>
            Act: {formatTime(task?.actualTime || 0)}
          </p>
        </div>

      </div>
      <div className="px-2 mt-3 ">
        <button className="add-task flex items-center gap-2 btn btn-icon" onClick={() => {
            if (!task) return;
              const newSubTasks = [...task.subTasks, { id: `${task.subTasks.length + 1}`, title: '', completed: false }];
              dispatch(updateTask({ id: taskId, updates: { subTasks: newSubTasks } }));
            }}>
          <IoAddCircleOutline />
          <p>Add details ...</p>
        </button>
        <div className="item mt-3 flex flex-col items-center gap-2">
          {task?.subTasks.map((subTask, index) => (
            <div key={index} className={`sub-item-${task.id} relative w-full group mt-3`}>
              <div className="flex items-center gap-1 w-full">
                <input type="checkbox" className="checkbox" checked={subTask.completed} 
                  onChange={() => {
                    const newSubTasks = task.subTasks.map((st, i) =>
                      i === index ? { ...st, completed: !st.completed } : st
                    );
                    dispatch(updateTask({ id: taskId, updates: { subTasks: newSubTasks } }));
                  }} 
                />
                <div className="flex-1">
                  <input
                    ref={(el) => inputRefs.current[index] = el}
                    type="text"
                    placeholder="Subtask title"
                    className={`input w-full ${subTaskErrors[index] ? 'border-red-500' : ''}`}
                    value={subTask.title}
                    onChange={(e) => handleSubTaskChange(index, e.target.value)}
                    onBlur={() => handleSubTaskBlur(index)}
                  />
                  {subTaskErrors[index] && <p className="text-red-500 text-xs mt-1">{subTaskErrors[index]}</p>}
                </div>
                <div className="absolute right-[10px] top-[25px] hidden group-focus-within:flex gap-1">
                  <button className="btn btn-icon" onClick={() => handleSubTaskOrderChange(index, index - 1)}><FaCaretUp /></button>
                  <button className="btn btn-icon" onClick={() => handleSubTaskOrderChange(index, index + 1)}><FaCaretDown /></button>
                  <button className="btn btn-icon" onClick={() => handleSubTaskDelete(index)}><IoMdCloseCircleOutline /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
};

export default Task;