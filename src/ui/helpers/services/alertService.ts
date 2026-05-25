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
  private uiAlerts: Array<{ id: string; options: AlertOptions; onClose: (result?: AlertResult) => void }> = [];
  private alertIdCounter = 0;


  async showSystemAlert(options: AlertOptions): Promise<AlertResult> {
    if (options.type === AlertType.QUESTION) {
      return this.askInApp(options.message, options.title, options.buttons);
    }

    return new Promise((resolve) => {
      this.showUIAlert(options, () => {
        resolve({ response: 0, checkboxChecked: false });
      });
    });
  }

  async showSystemNotification(options: NotificationOptions): Promise<boolean> {
    this.showUIAlert(
      {
        type: AlertType.INFO,
        title: options.title,
        message: options.body,
      },
      () => {}
    );
    return true;
  }

  showUIAlert(options: AlertOptions, onClose: (result?: AlertResult) => void): string {
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
    if (options.type === AlertType.QUESTION) {
      return this.askInApp(options.message, options.title, options.buttons);
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
    return this.showAlert({ type: AlertType.ERROR, title, message });
  }

  async confirm(message: string, title = 'Confirm'): Promise<AlertResult> {
    return this.askInApp(
      message,
      title,
      ['Yes', 'No']
    );
  }

  async ask(message: string, title = 'Question', buttons = ['OK', 'Cancel']): Promise<AlertResult> {
    return this.askInApp(
      message,
      title,
      buttons
    );
  }

  async askInApp(message: string, title = 'Question', buttons = ['OK', 'Cancel']): Promise<AlertResult> {
    return new Promise((resolve) => {
      const id = this.showUIAlert(
        {
          type: AlertType.QUESTION,
          title,
          message,
          buttons,
        },
        (result) => {
          resolve(result || { response: buttons.length - 1, checkboxChecked: false });
        }
      );

      const handleQuestionResponse = (event: CustomEvent) => {
        if (event.detail.id !== id) return;
        window.removeEventListener('ui-alert-response', handleQuestionResponse as EventListener);
        const alertIndex = this.uiAlerts.findIndex(alert => alert.id === id);
        if (alertIndex !== -1) {
          const alert = this.uiAlerts[alertIndex];
          this.uiAlerts.splice(alertIndex, 1);
          const result = { response: event.detail.response, checkboxChecked: false };
          alert.onClose(result);
          window.dispatchEvent(new CustomEvent('ui-alert-close', { detail: { id } }));
        }
      };

      window.addEventListener('ui-alert-response', handleQuestionResponse as EventListener);
    });
  }

  async notify(title: string, body: string, icon?: string): Promise<boolean> {
    return this.showSystemNotification({ title, body, icon });
  }
}

export const alertService = new AlertService();

export const showSystemAlert = alertService.showSystemAlert.bind(alertService);
export const showSystemNotification = alertService.showSystemNotification.bind(alertService);
export const showUIAlert = alertService.showUIAlert.bind(alertService);
export const closeUIAlert = alertService.closeUIAlert.bind(alertService);
export const showAlert = alertService.showAlert.bind(alertService);
export const info = alertService.info.bind(alertService);
export const success = alertService.success.bind(alertService);
export const warning = alertService.warning.bind(alertService);
export const error = alertService.error.bind(alertService);
export const confirm = alertService.confirm.bind(alertService);
export const ask = alertService.ask.bind(alertService);
export const askInApp = alertService.askInApp.bind(alertService);
export const notify = alertService.notify.bind(alertService);
