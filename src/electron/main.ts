import { app, BrowserWindow } from 'electron';
import { taskStore, todoStore, windowConfig } from '../shared/util.jsondata.js';
import { setupIpcMainHandlers } from '../shared/ipcMainHanlder.js';
import { createWindow, loadWindowConfigs } from '../shared/util.window.js';

app.on('ready', async () => {
  try {
    await taskStore.init();
    await todoStore.init();
    await windowConfig.init();
  } catch (error) {
    console.error('Failed to initialize JSON stores:', error);
  }
  app.setAppUserModelId('Dailyflow');
  app.setName('Dailyflow'); 
  await loadWindowConfigs();
  setupIpcMainHandlers();
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
