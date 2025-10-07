import React, { useState, useContext, useEffect } from 'react';
import './Settings.css';
import { ThemeContext } from '../../App';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';
import { getOnMiddleInScreen } from '~/ui/helpers/utils/utils';

const Settings = () => {
  useEffect(() =>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.MAIN);
      const { width: currentWidth, height: currentHeight} = await window.electronAPI.getUserScreenSize();
        await window.electronAPI.smoothResizeAndMove('main', width, height, 60, 
          getOnMiddleInScreen(currentWidth, currentHeight, width, height));
    }
    handleToResize();
  },[])
  return (
    <div className="dashboard-container">
      <p className='text-lg'>Coming Soon...</p>
    </div>
  );
};

export default Settings;
