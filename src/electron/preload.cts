const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window operations
    createWindow: (windowType : string) => ipcRenderer.invoke('create-window', windowType),
    closeWindow: (windowId : string) => ipcRenderer.invoke('close-window', windowId),
    closeWindowsByType: (windowType : string) => ipcRenderer.invoke('close-windows-by-type', windowType),
    closeAllExceptMain: () => ipcRenderer.invoke('close-all-except-main'),
    getAllWindows: () => ipcRenderer.invoke('get-all-windows'),
    focusWindow: (windowId : string) => ipcRenderer.invoke('focus-window', windowId),
    setWindowAlwaysOnTop: (windowId: string, isAlwaysOnTop: boolean) => ipcRenderer.invoke('set-window-always-on-top', windowId, isAlwaysOnTop),
    // Task operations
    taskUpsert: (task: any) => ipcRenderer.invoke('task-upsert', task),
    taskGetAll: () => ipcRenderer.invoke('task-get-all'),
    taskGetById: (id : string) => ipcRenderer.invoke('task-get-by-id', id),
    taskCreate: (task : any) => ipcRenderer.invoke('task-create', task),
    taskUpdate: (id : string, partial : any) => ipcRenderer.invoke('task-update', id, partial),
    taskRemove: (id : string) => ipcRenderer.invoke('task-remove', id),
    taskClear: () => ipcRenderer.invoke('task-clear'),
    // Todo operations
    todoUpsert: (todo: any) => ipcRenderer.invoke('todo-upsert', todo),
    todoGetAll: () => ipcRenderer.invoke('todo-get-all'),
    todoGetById: (id : string) => ipcRenderer.invoke('todo-get-by-id', id),
    todoCreate: (todo : any) => ipcRenderer.invoke('todo-create', todo),
    todoUpdate: (id : string, partial : any) => ipcRenderer.invoke('todo-update', id, partial),
    todoRemove: (id : string) => ipcRenderer.invoke('todo-remove', id),
    todoClear: () => ipcRenderer.invoke('todo-clear'),
    todoReset: () => ipcRenderer.invoke('todo-reset'),
    // Get user screen size
    getUserScreenSize: () => ipcRenderer.invoke('get-user-screen-size'),
    // Window configuration access
    getWindowSizes: () => ipcRenderer.invoke('get-window-sizes'),
    getWindowSize: (windowType: string) => ipcRenderer.invoke('get-window-size', windowType),
    getWindowTypes: () => ipcRenderer.invoke('get-window-types'),
    hasWindowType: (windowType: string) => ipcRenderer.invoke('has-window-type', windowType),
    // Smooth Resize and Move
    smoothResizeAndMove: (
        windowType: string, 
        targetWidth: number,
        targetHeight: number,
        duration?: number,
        targetPosition?: { x: number; y: number }
    ) =>
        ipcRenderer.invoke('smooth-resize-and-move',
            windowType, targetWidth, targetHeight, duration, targetPosition),
    // Drag window
    dragWindowStart: (page: string, windowType?: string) => {
        return ipcRenderer.invoke('drag-window-start', windowType, page);
    },
    dragWindowStop: (windowType?: string) => {
        return ipcRenderer.invoke('drag-window-stop', windowType);
    },
    // System alerts
    systemAlert: (options: {
        type?: 'info' | 'warning' | 'error' | 'question';
        title?: string;
        message: string;
        buttons?: string[];
    }) => ipcRenderer.invoke('system-alert', options),
    systemNotification: (options: {
        title: string;
        body: string;
        icon?: string;
    }) => ipcRenderer.invoke('system-notification', options),
    // App settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
    deleteAllData: () => ipcRenderer.invoke('delete-all-data'),
    // App close
    appClose: () => ipcRenderer.invoke('app-close'),
    appMinimize: () => ipcRenderer.invoke('app-minimize'),
} satisfies Window['electronAPI']);
