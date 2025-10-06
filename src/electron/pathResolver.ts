import path from 'path';
import { app } from 'electron';
import { isDev } from '../shared/util.js';

export function getPreloadPath(): string {
  return path.join(
    app.getAppPath(),
    isDev() ? '.' : '..',
    '/dist-electron/electron/preload.cjs'
  );
}

export function getUIPath(): string {
  return path.join(app.getAppPath(), '/dist-react/index.html');
}

export function getAssetPath(): string {
  return path.join(app.getAppPath(), isDev() ? '.' : '..', '/src/assets');
}

export function getIconPath(iconName: string): string {
  return path.join(getAssetPath(), iconName);
}