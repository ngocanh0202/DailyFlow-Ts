import { app, BrowserWindow, ipcMain, screen, dialog, Notification, nativeImage } from 'electron';
import { getAssetPath, getIconPath, getPreloadPath, getUIPath } from '../pathResolver.js';
import { isDev} from '../shared/util.js';
import { taskStore, todoStore, windowConfig } from '../shared/util.jsondata.js';
import { GetCurrentPosition, handleDragWindow, smoothResizeAndMove, stopDragWindow } from '../shared/util.window.js';
import Store from 'electron-store';

const windows = new Map();

const defaultWindowConfig = {
  resizable: false,
  width: 1100,
  height: 750,
  titleBarStyle: 'hidden',
  frame: false,
  webPreferences: {
    preload: getPreloadPath(),
    autoplayPolicy: 'no-user-gesture-required',
    spellcheck: false,
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    webSecurity: true,
  }
};

let windowConfigs: dataJson = { items: [] };

async function loadWindowConfigs() {
  windowConfigs = await windowConfig.readAll();
}

const createWindow = (windowType = 'main') => {
  let config;
  const windowConfig = windowConfigs.items?.find((item: any) => item.type === windowType);

  if (windowConfig) {
    config = {
      ...windowConfig,
      icon: getIconPath("windowIcon.png"),
      webPreferences: {
        ...windowConfig.webPreferences,
        preload: getPreloadPath(),
        autoplayPolicy: 'no-user-gesture-required',
        spellcheck: false,
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
      }
    };
  } else {
    config = { ...defaultWindowConfig };
  }

  const win = new BrowserWindow(config);

  if (isDev()) {
    win.loadURL('http://localhost:5123');
  } else {
    const uiPath = getUIPath();
    win.loadFile(uiPath);
  }

  windows.set(windowType, { window: win, type: windowType });
  
  win.on('closed', () => {
    windows.delete(windowType);
  });

  if (isDev()) {
    win.webContents.openDevTools();
  }

  return { id: windowType, type: windowType };
};

const closeWindow = (windowId : string) => {
  const windowData = windows.get(windowId);
  if (windowData) {
    windowData.window.close();
    return true;
  }
  return false;
};

const closeWindowsByType = (windowType: string) => {
  let closedCount = 0;
  for (const [id, data] of windows.entries()) {
    if (data.type === windowType) {
      data.window.close();
      closedCount++;
    }
  }
  return closedCount;
};

const closeAllExceptMain = () => {
  let closedCount = 0;
  for (const [id, data] of windows.entries()) {
    if (data.type !== 'main') {
      data.window.close();
      closedCount++;
    }
  }
  return closedCount;
};

const getAllWindows = () => {
  return Array.from(windows.entries()).map(([id, data]) => ({
    id,
    type: data.type,
    isVisible: data.window.isVisible(),
    isFocused: data.window.isFocused()
  }));
};

const focusWindow = (windowId: string) => {
  const windowData = windows.get(windowId);
  if (windowData) {
    windowData.window.focus();
    return true;
  }
  return false;
};

// window operations
ipcMain.handle('set-window-always-on-top', async (event, windowId: string, isAlwaysOnTop: boolean) => {
  const windowData = windows.get(windowId);
  if (windowData) {
    windowData.window.setAlwaysOnTop(isAlwaysOnTop);
    return true;
  }
  return false;
});

ipcMain.handle('create-window', async (event, windowType) => {
  return createWindow(windowType);
});

ipcMain.handle('load-window-configs', async () => {
  return await loadWindowConfigs();
});

ipcMain.handle('close-window', async (event, windowId) => {
  return closeWindow(windowId);
});

ipcMain.handle('close-windows-by-type', async (event, windowType) => {
  return closeWindowsByType(windowType);
});

ipcMain.handle('close-all-except-main', async (event) => {
  return closeAllExceptMain();
});

ipcMain.handle('get-all-windows', async (event) => {
  return getAllWindows();
});

ipcMain.handle('focus-window', async (event, windowId) => {
  return focusWindow(windowId);
});

// Task Store CRUD operations
ipcMain.handle('task-upsert', async (event, task) => {
  try {
    const result = await taskStore.upsert(task);
    return result;
  } catch (error) {
    console.error('IPC: task-upsert error:', error);
    throw error;
  }
});

ipcMain.handle('task-get-all', async () => {
  try {
    const result = await taskStore.getAll();
    return result;
  } catch (error) {
    console.error('IPC: task-get-all error:', error);
    throw error;
  }
});

ipcMain.handle('task-get-by-id', async (event, id) => {
  return await taskStore.getById(id);
});

ipcMain.handle('task-create', async (event, task) => {
  return await taskStore.create(task);
});

ipcMain.handle('task-update', async (event, id, partial) => {
  return await taskStore.update(id, partial);
});

ipcMain.handle('task-remove', async (event, id) => {
  return await taskStore.remove(id);
});

ipcMain.handle('task-clear', async () => {
  return await taskStore.clear();
});

// Todo Store CRUD operations
ipcMain.handle('todo-upsert', async (event, todo) => {
  return await todoStore.upsert(todo);
});
ipcMain.handle('todo-get-all', async () => {
  return await todoStore.getAll();
});

ipcMain.handle('todo-get-by-id', async (event, id) => {
  return await todoStore.getById(id);
});

ipcMain.handle('todo-create', async (event, todo) => {
  return await todoStore.create(todo);
});

ipcMain.handle('todo-update', async (event, id, partial) => {
  return await todoStore.update(id, partial);
});

ipcMain.handle('todo-remove', async (event, id) => {
  return await todoStore.remove(id);
});

ipcMain.handle('todo-clear', async () => {
  return await todoStore.clear();
});

ipcMain.handle('todo-reset', async () => {
  const allTodos = await todoStore.getAll();
  for (const todo of allTodos) {
    todo.status = 'Stop';
    
    if (todo.tasks) {
      for (const taskId of todo.taskIds) {
        if (todo.tasks[taskId]) {
          todo.tasks[taskId].status = 'Not Started';
        }
      }
    }
    
    await todoStore.update(todo.id, todo);
  }
});

// Get Height and Width of user screen
ipcMain.handle('get-user-screen-size', async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

// Window configuration handlers
ipcMain.handle('get-window-sizes', async () => {
  return windowConfigs;
});

ipcMain.handle('get-window-size', async (event, windowType: string) => {
  const config = windowConfigs.items?.find((item: any) => item.type === windowType);
  return config || null;
});

ipcMain.handle('get-window-types', async () => {
  return windowConfigs.items?.map((item: any) => item.type) || [];
});

ipcMain.handle('has-window-type', async (event, windowType: string) => {
  const config = windowConfigs.items?.find((item: any) => item.type === windowType);
  return config !== null && config !== undefined;
});

// App settings using electron-store
let store = new Store({ name: 'settings' });
ipcMain.handle('get-settings', async () => {
  try {
    const settings = store.get('settings');
    return settings || { startWithWindows: false, breakTime: 300, soundEnabled: true, startupSoundEnabled: true };
  } catch (err) {
    console.error('get-settings error:', err);
    return { startWithWindows: false, breakTime: 300, soundEnabled: true, startupSoundEnabled: true };
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    store.set('settings', settings);
    if (settings.startWithWindows) {
      if (process.platform === 'win32') {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: app.getPath('exe'),
          args: []
        });
      } else if (process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: true,
          path: process.execPath,
          args: []
        });
      }
    } else {
      if (process.platform === 'win32') {
        app.setLoginItemSettings({
          openAtLogin: false
        });
      } else if (process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: false,
          openAsHidden: false
        });
      }
    }

    return true;
  } catch (err) {
    console.error('save-settings error:', err);
    return false;
  }
});

ipcMain.handle('delete-all-data', async () => {
  try {
    store.set('settings', {
      startWithWindows: false,
      breakTime: 300
    });
    await taskStore.clear();
    await todoStore.clear();
    return true;
  } catch (err) {
    console.error('delete-all-data error:', err);
    return false;
  }
});

ipcMain.handle(
  "smooth-resize-and-move",
  async (
    event,
    windowType: string,
    targetWidth: number,
    targetHeight: number,
    duration = 100,
    targetPosition = GetCurrentPosition(windows.get(windowType)?.window)
  ) => {
    const windowData = windows.get(windowType);
    if (windowData) {
      smoothResizeAndMove(windowData.window, targetWidth, targetHeight, duration, targetPosition.x, targetPosition.y);
      return true;
    }
    return false;
  }
);

// Drag window follow mouse
ipcMain.handle("drag-window-start", async (event, windowType = "main", pageType: string) => {
  const windowData = windows.get(windowType);
  if (!windowData) return false;
  const result = handleDragWindow(windowData.window, windowType, pageType);
  return result;
});
ipcMain.handle("drag-window-stop", async (event, windowType = "main") => {
  stopDragWindow(windowType);
  return true;
});

// System Alert handlers
ipcMain.handle('system-alert', async (event, options) => {
  const { type = 'info', title = 'Alert', message, buttons = ['OK'] } = options;
  
  const windowData = windows.get('main');
  const parentWindow = windowData?.window;
  
  try {
    let result;
    
    switch (type) {
      case 'error':
        result = await dialog.showErrorBox(title, message);
        return { response: 0, checkboxChecked: false };
        
      case 'warning':
        result = await dialog.showMessageBox(parentWindow, {
          type: 'warning',
          title,
          message,
          buttons,
          defaultId: 0,
          cancelId: buttons.length - 1
        });
        return result;
        
      case 'question':
        result = await dialog.showMessageBox(parentWindow, {
          type: 'question',
          title,
          message,
          buttons,
          defaultId: 0,
          cancelId: buttons.length - 1
        });
        return result;
        
      case 'info':
      default:
        result = await dialog.showMessageBox(parentWindow, {
          type: 'info',
          title,
          message,
          buttons,
          defaultId: 0,
          cancelId: buttons.length - 1
        });
        return result;
    }
  } catch (error) {
    console.error('System alert error:', error);
    return { response: 0, checkboxChecked: false };
  }
});

ipcMain.handle('system-notification', async (event, options) => {
  const { title, body, icon } = options;
  const iconPath = icon ? getIconPath(icon) : getIconPath("windowIcon.png");

  try {
    if (!Notification.isSupported()) {
      console.error('Notifications are not supported on this system');
      return false;
    }

    const notificationOptions: any = {
      title,
      body,
      icon: nativeImage.createFromPath(iconPath),
      silent: false,
      timeoutType: 'default',
    };

    const notification = new Notification(notificationOptions);
    
    notification.show();

    notification.on('click', () => {
      const mainWin = windows.get('main')?.window;
      if (mainWin) {
        try {
          if (mainWin.isMinimized && mainWin.isMinimized()) {
            mainWin.restore();
          }
        } catch (e) {
          console.error('Notification click error:', e);
        }
        mainWin.show();
        mainWin.focus();
      }
    });

    return true;
  } catch (error) {
    console.error('Notification error:', error);
    return false;
  }
});

// App close and minimize
ipcMain.handle('app-close', async () => {
  app.quit();
});
ipcMain.handle('app-minimize', async () => {
  const mainWin = windows.get('main')?.window;
  if (mainWin) {
    mainWin.minimize();
    return true;
  }
  return false;
});

app.on('ready', async () => {
  app.setAppUserModelId('Dailyflow');
  app.setName('Dailyflow'); 
  
  try {
    await taskStore.init();
    await todoStore.init();
    await windowConfig.init();
  } catch (error) {
    console.error('Failed to initialize JSON stores:', error);
  }
  
  await loadWindowConfigs();
  createWindow('main');
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow('main')
    }
  })
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
