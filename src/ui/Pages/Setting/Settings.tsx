import React, { useState, useContext, useEffect } from 'react';
import './Settings.css';
import { ThemeContext } from '../../App';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';

const Settings = () => {
  useEffect(() =>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.MAIN);
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60);
    }
    handleToResize();
  },[])
  return (
    <div className="dashboard-container">

    </div>
  );
};

export default Settings;
