import path from 'path';
import { app } from 'electron';
import { isDev } from './shared/util.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getPreloadPath(): string {
  return path.join(app.getAppPath(), 'dist-electron/electron/preload.cjs');
}

export function getUIPath(): string {
  return path.join(app.getAppPath(), '/dist-react/index.html');
}

export function getAssetPath(): string {
  return path.join(app.getAppPath(), 'src/assets');
}

export function getPathLocalData(nameFile: string): string {
  if (isDev()) {
    return path.join(app.getAppPath(), 'localdata/', nameFile);
  } else {
    return path.join(app.getPath('userData'), 'localdata', nameFile);
  }
}

export function getIconPath(iconName: string): string {
  return path.join(getAssetPath(), iconName);
}