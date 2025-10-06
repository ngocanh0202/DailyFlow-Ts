import React from 'react';
import { useAlert } from '../../helpers/hooks/useAlert';
import './AlertSystemExample.css';
import { AlertType } from '~/enums/Alert.Type.enum';

const AlertSystemExample: React.FC = () => {
  const { 
    info, 
    success, 
    warning, 
    error, 
    confirm, 
    ask, 
    notify,
    showSystemAlert,
    showUIAlert,
    showSystemNotification
  } = useAlert();

  const handleInfoAlert = async () => {
    await info('This is an informational message!');
  };

  const handleSuccessAlert = async () => {
    await success('Operation completed successfully!');
  };

  const handleWarningAlert = async () => {
    await warning('Please be careful with this action.');
  };

  const handleErrorAlert = async () => {
    await error('Something went wrong!');
  };

  const handleConfirmAlert = async () => {
    const result = await confirm('Are you sure you want to delete this item?');
    if (result.response === 0) {
      await success('Item deleted successfully!');
    } else {
      await info('Deletion cancelled.');
    }
  };

  const handleAskAlert = async () => {
    const result = await ask('What would you like to do?', 'Choose Action', ['Save', 'Discard', 'Cancel']);
    switch (result.response) {
      case 0:
        await success('Changes saved!');
        break;
      case 1:
        await warning('Changes discarded.');
        break;
      case 2:
        await info('Action cancelled.');
        break;
    }
  };

  const handleNotification = async () => {
    await notify('DailyFlow', 'You have a new task reminder!' );
  };
  
  const handleSystemAlert = async () => {
    const let1 = await showSystemAlert({
      type: AlertType.QUESTION,
      title: 'System Alert',
      message: 'This is a native system dialog!',
      buttons: ['OK']
    });
  };

  const handleUIAlert = () => {
    showUIAlert({
      type: AlertType.INFO,
      title: 'UI Alert',
      message: 'This is a custom UI alert!',
      duration: 5000
    });
  };

  return (
    <div className="alert-system-example">
      <h2>Alert System Demo</h2>
      <div className="alert-buttons">
        <button onClick={handleInfoAlert} className="btn btn-info">
          Info Alert
        </button>
        <button onClick={handleSuccessAlert} className="btn btn-success">
          Success Alert
        </button>
        <button onClick={handleWarningAlert} className="btn btn-warning">
          Warning Alert
        </button>
        <button onClick={handleErrorAlert} className="btn btn-error">
          Error Alert
        </button>
        <button onClick={handleConfirmAlert} className="btn btn-question">
          Confirm Dialog
        </button>
        <button onClick={handleAskAlert} className="btn btn-question">
          Ask Dialog
        </button>
        <button onClick={handleNotification} className="btn btn-notification">
          System Notification
        </button>
        <button onClick={handleSystemAlert} className="btn btn-system">
          System Dialog
        </button>
        <button onClick={handleUIAlert} className="btn btn-ui">
          UI Alert
        </button>
      </div>
    </div>
  );
};

export default AlertSystemExample;
