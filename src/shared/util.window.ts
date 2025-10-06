import type { BrowserWindow } from 'electron';
import { screen } from 'electron';
import { getPageSize } from './util.page.js';

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

type DragState = {
  isDragging: boolean;
  offset: { x: number; y: number };
  window: BrowserWindow;
  intervalId: NodeJS.Timeout | null;
  initialSize: { width: number; height: number };
  lastPosition: { x: number; y: number };
};

const dragStates = new Map<string, DragState>();

export function handleDragWindow(window: BrowserWindow, windowType: string, pageType: string) {
  if (!window || window.isDestroyed()) return false;

  try {
    const mousePos = screen.getCursorScreenPoint();
    const windowBounds = window.getBounds();

    const offset = {
      x: mousePos.x - windowBounds.x,
      y: mousePos.y - windowBounds.y,
    };

    const initialSize = getPageSize(pageType);

    dragStates.set(windowType, {
      isDragging: true,
      offset,
      window,
      intervalId: null,
      initialSize,
      lastPosition: { x: windowBounds.x, y: windowBounds.y },
    });
    startMouseTracking(windowType);
    return true;
  } catch (error) {
    console.error('Error starting window drag:', error);
    return false;
  }
}

function startMouseTracking(windowType: string) {
  const dragState = dragStates.get(windowType);
  if (!dragState) return;

  if (dragState.intervalId) {
    clearInterval(dragState.intervalId);
    dragState.intervalId = null;
  }

  const tick = () => {
    if (!dragState.isDragging || dragState.window.isDestroyed()) return;

    try {
      const mousePos = screen.getCursorScreenPoint();
      const newX = mousePos.x - dragState.offset.x;
      const newY = mousePos.y - dragState.offset.y;

      const currentDisplay = screen.getDisplayNearestPoint(mousePos);
      const workArea = currentDisplay.workArea;

      const constrainedX = Math.max(
        workArea.x,
        Math.min(newX, workArea.x + workArea.width - dragState.initialSize.width)
      );
      const constrainedY = Math.max(
        workArea.y,
        Math.min(newY, workArea.y + workArea.height - dragState.initialSize.height)
      );

      if (
        constrainedX !== dragState.lastPosition.x ||
        constrainedY !== dragState.lastPosition.y
      ) {
        dragState.window.setBounds({
          x: constrainedX | 0, 
          y: constrainedY | 0,
          width: dragState.initialSize.width,
          height: dragState.initialSize.height,
        });
        dragState.lastPosition = { x: constrainedX, y: constrainedY };
      }

      if (dragState.isDragging) setImmediate(tick);
    } catch (error) {
      console.error('Error during window drag:', error);
      stopDragWindow(windowType);
    }
  };

  setImmediate(tick);
}

export function stopDragWindow(windowType: string) {
  const dragState = dragStates.get(windowType);
  if (!dragState) return;

  dragState.isDragging = false;

  if (dragState.intervalId) {
    clearInterval(dragState.intervalId);
    dragState.intervalId = null;
  }

  dragStates.delete(windowType);
}

export const GetCurrentPosition = (win: BrowserWindow) => {
  if (!win || win.isDestroyed()) return { x: 0, y: 0 };
  const { x, y } = win.getBounds();
  return { x, y };
};