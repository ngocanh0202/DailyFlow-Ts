import { PageType } from "~/enums/PageType.enum";

class WindowDragger {
  windowType: string;
  isDragging: boolean;
  private dragElements: Set<HTMLElement | HTMLDivElement>;

  constructor(windowType = 'main') {
    this.windowType = windowType;
    this.isDragging = false;
    this.dragElements = new Set();
  }

  makeDraggable(element: HTMLElement | HTMLDivElement, pageType: PageType) {
    if (!element) {
      console.warn('WindowDragger: Element not found');
      return;
    }
    
    if (this.dragElements.has(element)) {
      return;
    }
    
    this.dragElements.add(element);
    element.style.cursor = 'move';
    element.style.userSelect = 'none';
    
    const mouseDownHandler = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      if (mouseEvent.button === 0) { 
        this.startDrag(mouseEvent, pageType);
      }
    };
    
    const selectStartHandler = (e: Event) => {
      if (this.isDragging) {
        e.preventDefault();
      }
    };
    
    element.addEventListener('mousedown', mouseDownHandler);
    element.addEventListener('selectstart', selectStartHandler);
    
    (element as any)._dragHandlers = {
      mousedown: mouseDownHandler,
      selectstart: selectStartHandler
    };
  }

  removeDraggable(element: HTMLElement | HTMLDivElement) {
    if (!this.dragElements.has(element)) return;
    
    this.dragElements.delete(element);
    element.style.cursor = '';
    element.style.userSelect = '';
    
    const handlers = (element as any)._dragHandlers;
    if (handlers) {
      element.removeEventListener('mousedown', handlers.mousedown);
      element.removeEventListener('selectstart', handlers.selectstart);
      delete (element as any)._dragHandlers;
    }
  }

  async startDrag(event: MouseEvent, pageType: PageType) {
    if (this.isDragging) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
    try {
      const success = await window.electronAPI.dragWindowStart(pageType);
      if (success) {
        const stopDragHandler = async (e: MouseEvent) => {
          await this.stopDrag();
          document.removeEventListener('mouseup', stopDragHandler, true);
          document.removeEventListener('mouseleave', stopDragHandler, true);
        };
        
        document.addEventListener('mouseup', stopDragHandler, true);
        document.addEventListener('mouseleave', stopDragHandler, true);
      } else {
        await this.stopDrag();
      }
    } catch (error) {
      console.error('Error starting drag:', error);
      await this.stopDrag();
    }
  }
  
  async stopDrag() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    try {
      await window.electronAPI.dragWindowStop(this.windowType);
    } catch (error) {
      console.error('Error stopping drag:', error);
    }
  }
  
  destroy() {
    this.dragElements.forEach(element => {
      this.removeDraggable(element);
    });
    this.dragElements.clear();
  }
}

export default WindowDragger;