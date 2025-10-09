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
        <div className='card-border rounded-lg p-3 shadow-lg relative max-w-sm'>
          <div className='absolute left-[-5px] top-[35px] transform -translate-y-1/2 -translate-x-full'>
            <div className='w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] card-border-triangle'></div>
          </div>
          <div className='space-y-2'>
            <p className='text-lg whitespace-nowrap font-bold text-center mb-3'>
              Quick Start Guide
            </p>
            
            <div className='text-xs space-y-1'>
              <p className='font-semibold text-blue-400'>Getting Started:</p>
              <p>• Click "this" to begin</p>
              <p>• Add your tasks and start working</p>
            </div>
            
            <div className='text-xs space-y-1 mt-3'>
              <p className='font-semibold text-green-400'>Keyboard Shortcuts:</p>
              <p>• <span className='font-mono bg-gray-700 px-1 rounded !text-white'>Ctrl+N</span> - New task</p>
              <p>• <span className='font-mono bg-gray-700 px-1 rounded !text-white'>Ctrl+Shift+N</span> - Add subtask</p>
              <p>• <span className='font-mono bg-gray-700 px-1 rounded !text-white'>Ctrl+D</span> - Delete task</p>
              <p>• <span className='font-mono bg-gray-700 px-1 rounded !text-white'>Ctrl+Shift+F</span> - Focus mode</p>
              <p>• <span className='font-mono bg-gray-700 px-1 rounded !text-white'>Ctrl+,</span> - Settings</p>
            </div>
            
            <div className='text-xs space-y-1 mt-3'>
              <p className='font-semibold text-yellow-400'>Tips:</p>
              <p>• Focus on task input to use shortcuts</p>
              <p>• Track your time efficiently</p>
              <p>• Take breaks when needed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
