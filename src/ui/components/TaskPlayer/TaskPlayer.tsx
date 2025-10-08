import { useEffect, useRef, useState } from 'react';
import { formatTime } from '~/ui/helpers/utils/utils';
import { BiSkipPrevious } from 'react-icons/bi';
import { FaPause, FaPlay } from 'react-icons/fa';
import { MdSkipNext } from 'react-icons/md';
import { LuGamepad2 } from "react-icons/lu";
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';
import myGif from '~/ui/assets/BocchiKitaGIF.gif';

interface TaskPlayerProps {
  task: Task;
  isDoneTodo: boolean;
  isTimer: boolean;
  onStartTask?: () => void;
  onPauseTask?: () => void;
  onDoneTask: () => void;
  onDoneAndNextTask: () => void;
  onChangeTask: (next: boolean, status: string) => void;
  onTakeBreak: () => void;
}

const TaskPlayer = ({ 
  task, 
  isDoneTodo,
  isTimer,
  onStartTask, 
  onPauseTask, 
  onDoneTask, 
  onDoneAndNextTask,
  onChangeTask,
  onTakeBreak
}: TaskPlayerProps) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isTimeHovered, setIsTimeHovered] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (textContainerRef.current && textRef.current) {
      const containerWidth = textContainerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      setShouldAnimate(textWidth > containerWidth);
    }
  }, [task.title]);

  const handlePreviousTask = () => {
    onChangeTask(false, TaskStatus.PAUSED);
  };

  const handleNextTask = () => {
    onChangeTask(true, TaskStatus.PAUSED);
  };

  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isPaused = isTimer;

  if (isCompleted) {
    return (
      <div className="card primary flex flex-col gap-3 justify-center items-center mt-3" style={{ padding: '1rem 1.5rem' }}>
        <p className='font-bold'>Congratulations! You've completed the task.</p>
        <img 
          src={myGif} 
          alt="Task completed" 
          className="w-100 h-70 object-contain"
        />
        <p className='font-bold'>{task.title}</p>
        <div className='flex flex-col gap-2 items-center'>
          <button className="btn btn-primary !p-2" onClick={onDoneAndNextTask}>
            {isDoneTodo ? 'All Done!' : 'Next Task'}
          </button>
          {!isDoneTodo && 
          <button className='btn btn-secondary !p-1' onClick={onTakeBreak}>
            <LuGamepad2 className='mr-2' />
            Take Break!
          </button>}
        </div>

      </div>
    );
  }

  return (
    <div className="card primary flex gap-2 justify-between items-center mt-3" style={{ padding: '0.5rem 1.5rem' }}>
      <div 
        className="w-1 flex-5 overflow-hidden whitespace-nowrap" 
        ref={textContainerRef}
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
      >
        <div
          ref={textRef}
          className={shouldAnimate && isTitleHovered ? 'animate-marquee' : 'truncate'}
        >
          {task.title}
        </div>
      </div>

      <div 
        className="flex-1 flex items-center h-full"
        onMouseEnter={() => setIsTimeHovered(true)}
        onMouseLeave={() => setIsTimeHovered(false)}
      >
        {!isTimeHovered ? (
          <span className="font-bold">{formatTime(task.actualTime)}</span>
        ) : (
          <div className="flex gap-1 justify-between items-center w-full">
            <button 
              className="btn btn-primary h-[10px] w-[1px] text-sm" 
              onClick={onDoneTask}
            >
              Done!
            </button>
            
            {!task.isTaskBreak && (
              <BiSkipPrevious 
                className="cursor-pointer animate-pop" 
                onClick={handlePreviousTask}
              />    
            )}
            
            {isPaused ? (
              <FaPlay
                className="cursor-pointer animate-pop"
                onClick={onStartTask}
              />
            ) : (
              <FaPause 
                className="cursor-pointer animate-pop" 
                onClick={onPauseTask} 
              />
            )}

            {!task.isTaskBreak && (
              <MdSkipNext 
                className="cursor-pointer animate-pop" 
                onClick={handleNextTask}
              />      
            )}
     
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPlayer;