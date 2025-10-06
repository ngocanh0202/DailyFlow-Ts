import { useEffect, useState } from 'react';
import './Alert.css';
import { AlertType } from '~/enums/Alert.Type.enum';

interface AlertProps {
  message: string;
  duration: number;
  type?: AlertType;
  onClose: () => void;
}

const typeIcons: Record<AlertType, string> = {
  [AlertType.SUCCESS]: '✅',
  [AlertType.ERROR]: '❌',
  [AlertType.WARNING]: '⚠️',
  [AlertType.INFO]: 'ℹ️',
  [AlertType.QUESTION]: '❓',
};

const Alert = ({ message, duration, type = AlertType.INFO, onClose }: AlertProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onClose, 500); 
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`alert alert-${type} ${fadeOut ? 'fade-out' : ''}`}>
      <span className="alert-icon">{typeIcons[type]}</span>
      <span className="alert-message">{message}</span>
    </div>
  );
};

export default Alert;
