import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './IndexPage.css';
import { ThemeContext } from '../../App';
import { useEffect, useState } from 'react';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';

const IndexPage = () => {
  const navigate = useNavigate();

  useEffect(() =>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.MAIN);
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60);
    }
    handleToResize();
  },[])

  const openDashboard = () => {
    navigate('/dashboard');
  };

  const openSettings = () => {
    navigate('/setting');
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
    </div>
  );
};

export default IndexPage;
