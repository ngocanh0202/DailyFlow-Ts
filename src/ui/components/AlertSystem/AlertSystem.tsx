import React from 'react';
import Alert from '../Alert/Alert';
import { useAlert } from '../../helpers/hooks/useAlert';
import { AlertType } from '../../../enums/Alert.Type.enum';
import './AlertSystem.css';

const AlertSystem: React.FC = () => {
  const { uiAlerts, closeUIAlert } = useAlert();

  return (
    <div className="alert-system">
      {uiAlerts.map((alert) => (
        <Alert
          key={alert.id}
          message={alert.options.message}
          duration={alert.options.duration || 1500}
          type={alert.options.type?.toString() as AlertType || AlertType.INFO}
          onClose={() => closeUIAlert(alert.id)}
        />
      ))}
    </div>
  );
};

export default AlertSystem;
