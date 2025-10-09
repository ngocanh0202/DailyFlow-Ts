import type { BrowserWindow } from 'electron';

export const smoothResizeAndMove = (
  win: BrowserWindow,
  targetWidth: number,
  targetHeight: number,
  duration: number = 300,
  targetX: number,
  targetY: number,
) => {
  if (!win || win.isDestroyed()) return;

  const startBounds = win.getBounds();
  const steps = Math.max(1, Math.floor(duration / 4)); 
  let currentStep = 0;

  const interval = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(interval);
      return;
    }

    currentStep++;
    const progress = currentStep / steps;

    const newX = Math.round(startBounds.x + (targetX - startBounds.x) * progress);
    const newY = Math.round(startBounds.y + (targetY - startBounds.y) * progress);
    const newWidth = Math.round(startBounds.width + (targetWidth - startBounds.width) * progress);
    const newHeight = Math.round(startBounds.height + (targetHeight - startBounds.height) * progress);

    win.setBounds({ x: newX, y: newY, width: newWidth, height: newHeight });

    if (currentStep >= steps) clearInterval(interval);
  }, 4); 
};

export const GetCurrentPosition = (win: BrowserWindow) => {
  if (!win || win.isDestroyed()) return { x: 0, y: 0 };
  const { x, y } = win.getBounds();
  return { x, y };
};