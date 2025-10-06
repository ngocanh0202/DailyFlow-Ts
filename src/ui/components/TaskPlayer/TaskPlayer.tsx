import { useEffect, useRef, useState } from 'react';
import { formatTime } from '~/ui/helpers/utils/utils';
import { BiSkipPrevious } from 'react-icons/bi';
import { FaPause, FaPlay } from 'react-icons/fa';
import { MdSkipNext } from 'react-icons/md';
import { TaskStatus } from '~/enums/TaskStatus.Type.enum';

interface TaskPlayerProps {
  task: Task;
  onStartTask?: () => void;
  onPauseTask?: () => void;
  onDoneTask: () => void;
  onChangeTask: (next: boolean, status: string) => void;
}

const TaskPlayer = ({ task, onStartTask, onPauseTask, onDoneTask, onChangeTask }: TaskPlayerProps) => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTitleHovered, setisTitleHovered] = useState(false);
  const [isTimeHovered, setisTimeHovered] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (textContainerRef.current && textRef.current) {
      const containerWidth = textContainerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      setShouldAnimate(textWidth > containerWidth);
    }
  }, [task.title]);

  return (
    <div className={`card primary flex gap-2 justify-between items-center mt-3`} style={{padding: '0.5rem 1.5rem'}}>
        <div 
          className='w-1 flex-5 overflow-hidden whitespace-nowrap' 
          ref={textContainerRef}
          onMouseEnter={() => setisTitleHovered(true)}
          onMouseLeave={() => setisTitleHovered(false)}
        >
          <div
            ref={textRef}
            className={shouldAnimate && isTitleHovered ? 'animate-marquee' : 'truncate'}
          >
            {task.title}
          </div>
        </div>
        <div 
          className='flex-1 flex items-center h-full'
          onMouseEnter={() => setisTimeHovered(true)}
          onMouseLeave={() => setisTimeHovered(false)}
        >
          {
            !isTimeHovered ? 
              <span className='font-bold'>{formatTime(task.actualTime)}</span> : 
              <div className='flex gap-1 justify-between items-center w-full'>
                <button className='btn btn-primary h-[10px] w-[1px]' onClick={onDoneTask}>Done!</button>
                <BiSkipPrevious className='cursor-pointer animate-pop' onClick={() => {onChangeTask(false, TaskStatus.PAUSED);}}/>
                {task.status === TaskStatus.PAUSED ? 
                  <FaPlay
                    className='cursor-pointer animate-pop'
                    onClick={onStartTask}
                  />
                  :
                  <FaPause className='cursor-pointer animate-pop' onClick={onPauseTask} />
                }
                <MdSkipNext className='cursor-pointer animate-pop' onClick={() => {onChangeTask(true, TaskStatus.PAUSED);}}/>           
              </div>
          }
        </div>
      </div>
  );
};

export default TaskPlayer;
