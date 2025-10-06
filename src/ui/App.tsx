import { useState, createContext, useCallback, useContext, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import IndexPage from './Pages/IndexPage/IndexPage';
import Dashboard from './Pages/Dashboard/Dashboard';
import Settings from './Pages/Setting/Settings';
import DefaultLayout from './layouts/DefaultLayout';
import Todoflow from './Pages/Todoflow/Todoflow';
import AlertSystem from './components/AlertSystem/AlertSystem';
import OnTask from './Pages/OnTask/OnTask';
import WindowDragger from './helpers/utils/WindowDragger';
import { PageType } from '~/enums/PageType.enum';

type ThemeContextType = {
  isDarkTheme: boolean;
  toggleTheme: () => void;
};

type WindowDraggerContextType = {
  onGetDragger: () => WindowDragger | null;
  onDestroyDragger: () => void;
  onMakeDraggable: (element: HTMLDivElementWithPageTypeArray) => void;
  onClearDraggable: (element?: HTMLElement[] | HTMLDivElement[]) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  isDarkTheme: true,
  toggleTheme: () => {},
});

export const winDragger = createContext<WindowDraggerContextType>({
  onGetDragger: () => null,
  onDestroyDragger: () => {},
  onMakeDraggable: (element: HTMLDivElementWithPageTypeArray) => {},
  onClearDraggable: (element?: HTMLElement[] | HTMLDivElement[]) => {},
});

const windowDraggerRef = new WindowDragger('main');


function App() {
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    localStorage.getItem('isDarkTheme') === 'false' ? false : true
  );


  const toggleTheme = () => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      localStorage.setItem('isDarkTheme', next.toString());
      if (next) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
      return next;
    });
  };

  const handleDestroyDragger = () => {
    if (windowDraggerRef) {
      windowDraggerRef.destroy();
    }
  };

  const handleClearDraggable = (htmls?: HTMLElement[] | HTMLDivElement[]) => {
    try {
      if (!windowDraggerRef) {
        console.error('WindowDragger instance is not available.');
        return;
      }
      if (htmls && htmls.length > 0) {
        htmls.forEach((el) => {
          if (windowDraggerRef) {
            windowDraggerRef.removeDraggable(el);
          }
        });
      } else {
        windowDraggerRef.destroy();
      }
    } catch (error) {
      console.error('Error clearing draggable elements:', error);
    }
  };

  const handleMakeDraggable = (htmls: HTMLDivElementWithPageTypeArray) => {
    try {
      
      if (!windowDraggerRef) {
        console.error('WindowDragger instance is not available.');
        return;
      }
      else if (htmls.elements.length > 0 && windowDraggerRef) {
        htmls.elements.forEach((el) => {
          if (windowDraggerRef) {
            windowDraggerRef.makeDraggable(el.element, el.pageType);
          }
        });
      }
      
    } catch (error) {
      console.error('Error making element draggable:', error);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleResetTodo = async () =>{
      try{
        await window.electronAPI.todoReset();
      }catch(err){
        console.error('Failed to reset todo on app close:', err);
      }
    }

    handleResetTodo();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeContext.Provider value={{ isDarkTheme, toggleTheme }}>
        <winDragger.Provider value={{
          onGetDragger: () => windowDraggerRef,
          onDestroyDragger: handleDestroyDragger,
          onMakeDraggable: handleMakeDraggable,
          onClearDraggable: handleClearDraggable
        }}>
          <DefaultLayout>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/setting" element={<Settings />} />
            <Route path="/todoflow" element={<Todoflow />} />
            <Route path="/todoflow/:id" element={<Todoflow />} />
            <Route path="/ontask" element={<OnTask />} />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
          </DefaultLayout>
          <AlertSystem />
        </winDragger.Provider>
      </ThemeContext.Provider>
    </Provider>
  );
}

export default App;