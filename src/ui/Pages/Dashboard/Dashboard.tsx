import { useEffect, useState } from 'react';
import './Dashboard.css';
import Alert from '~/ui/components/Alert/Alert';
import AlertSystemExample from '~/ui/components/AlertSystem/AlertSystemExample';
import { getPageSize } from '~/shared/util.page';
import { PageType } from '~/enums/PageType.enum';

const Dashboard = () => {
  useEffect(() =>{
    const handleToResize = async () => {
      const {width, height} = getPageSize(PageType.MAIN);
      await window.electronAPI.smoothResizeAndMove('main', width, height, 60);
    }
    handleToResize();
  },[])
  return (
    <div className="h-full dashboard flex flex-col w-full max-w-full">
      <h1 className='text-2xl font-bold'>Dashboards</h1>
      <div className="mt-8">
        <AlertSystemExample />
      </div>
    </div>
  );
};

export default Dashboard;
