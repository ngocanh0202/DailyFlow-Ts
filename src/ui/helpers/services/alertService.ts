import { AlertType } from "~/enums/Alert.Type.enum";

export interface AlertOptions {
  type?: AlertType;
  title?: string;
  message: string;
  buttons?: string[];
  duration?: number;
  useSystemAlert?: boolean;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export interface AlertResult {
  response: number;
  checkboxChecked: boolean;
}

class AlertService {
  private uiAlerts: Array<{ id: string; options: AlertOptions; onClose: () => void }> = [];
  private alertIdCounter = 0;


  async showSystemAlert(options: AlertOptions): Promise<AlertResult> {
    try {
      const systemType = options.type === 'success' ? 'info' : options.type;
      
      const result = await window.electronAPI.systemAlert({
        type: systemType,
        title: options.title,
        message: options.message,
        buttons: options.buttons
      });
      return result;
    } catch (error) {
      console.error('System alert error:', error);
      return { response: 0, checkboxChecked: false };
    }
  }

  async showSystemNotification(options: NotificationOptions): Promise<boolean> {
    try {
      if (
        typeof window === 'undefined' ||
        !window.electronAPI ||
        typeof window.electronAPI.systemNotification !== 'function'
      ) {
        console.error('System notification API is not available');
        return false;
      }
      return await window.electronAPI.systemNotification(options);
    } catch (error) {
      console.error('System notification error:', error);
      return false;
    }
  }

  showUIAlert(options: AlertOptions, onClose: () => void): string {
    const id = `alert-${++this.alertIdCounter}`;
    this.uiAlerts.push({ id, options, onClose });
    const event = new CustomEvent('ui-alert-show', {
      detail: { id, options, onClose }
    });
    window.dispatchEvent(event);
    
    return id;
  }

  closeUIAlert(id: string): void {
    const alertIndex = this.uiAlerts.findIndex(alert => alert.id === id);
    if (alertIndex !== -1) {
      const alert = this.uiAlerts[alertIndex];
      alert.onClose();
      this.uiAlerts.splice(alertIndex, 1);
      
      const event = new CustomEvent('ui-alert-close', {
        detail: { id }
      });
      window.dispatchEvent(event);
    }
  }

  async showAlert(options: AlertOptions): Promise<AlertResult | string> {
    if (options.useSystemAlert || options.type === 'error' || options.type === 'question') {
      return await this.showSystemAlert(options);
    }
    
    return new Promise((resolve) => {
      const id = this.showUIAlert(options, () => {
        resolve({ response: 0, checkboxChecked: false });
      });
    });
  }

  async info(message: string, title = 'Information'): Promise<AlertResult | string> {
    return this.showAlert({ type: AlertType.INFO, title, message });
  }

  async success(message: string, title = 'Success'): Promise<AlertResult | string> {
    return this.showAlert({ type: AlertType.SUCCESS, title, message });
  }

  async warning(message: string, title = 'Warning'): Promise<AlertResult | string> {
    return this.showAlert({ type: AlertType.WARNING, title, message });
  }

  async error(message: string, title = 'Error'): Promise<AlertResult | string> {
    return this.showAlert({ type: AlertType.ERROR, title, message, useSystemAlert: true });
  }

  async confirm(message: string, title = 'Confirm'): Promise<AlertResult> {
    return this.showSystemAlert({
      type: AlertType.QUESTION,
      title,
      message,
      buttons: ['Yes', 'No']
    });
  }

  async ask(message: string, title = 'Question', buttons = ['OK', 'Cancel']): Promise<AlertResult> {
    return this.showSystemAlert({
      type: AlertType.QUESTION,
      title,
      message,
      buttons
    });
  }

  async notify(title: string, body: string, icon?: string): Promise<boolean> {
    return this.showSystemNotification({ title, body, icon });
  }
}

export const alertService = new AlertService();

export const {
  showSystemAlert,
  showSystemNotification,
  showUIAlert,
  closeUIAlert,
  showAlert,
  info,
  success,
  warning,
  error,
  confirm,
  ask,
  notify
} = alertService;
