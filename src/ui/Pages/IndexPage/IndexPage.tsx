import { useNavigate } from 'react-router-dom';
import './IndexPage.css';
import { useEffect } from 'react';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { getOnMiddleInScreen } from '~/ui/helpers/utils/utils';

const IndexPage = () => {
  const navigate = useNavigate();

  useEffect(()=>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.MAIN);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60, 
        getOnMiddleInScreen(currentWidth, currentHeight, width, height));
    }
    handleToResize();
  },[])

  const openDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <header className="text-center mb-5">
        <h1 className='text-4xl font-bold mb-2'>Dailflow</h1>
        <p className='text-lg text-gray-400'>Your personal task management application</p>
      </header>
      <main className="w-full flex flex-col justify-center">
        <div className="card w-full text-center">
          <h2 className="text-2xl font-semibold">Welcome to Dailflow Desktop</h2>
          <p className="mb-3 dark:text-gray-300">Manage your tasks and todos efficiently with this desktop application.</p>
          <div>
            <button 
              id="open-dashboard" 
              className="btn btn-primary p-3"
              onClick={openDashboard}
            >
              Open Dashboard
            </button>
          </div>
        </div>
      </main>
      <div className='absolute top-10 left-25 font-mono'>
        <div className='card-border rounded-lg p-3 shadow-lg relative'>
          <div className='absolute left-[-5px] top-1/2 transform -translate-y-1/2 -translate-x-full'>
            <div className='w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] card-border-triangle'></div>
          </div>
          <p className='text-xl whitespace-nowrap font-bold'>
            Click here!!! to start your task
          </p>
          <p className='text-xs whitespace-nowrap'>
            Press enter the note and add new task to start
          </p>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
