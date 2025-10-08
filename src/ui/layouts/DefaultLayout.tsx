import { ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext, winDragger } from '../App';
import { 
  IoSettingsOutline, 
  IoMoonOutline, 
  IoSunnyOutline, 
  IoHomeOutline  
} from "react-icons/io5";
import { RiShutDownLine } from "react-icons/ri";
import { FaTasks } from "react-icons/fa";
import './DefaultLayout.css';
import { PageType } from '~/enums/PageType.enum';
import { useAppDispatch } from '../store/hooks';
import { initializeTodoFlow } from '../store/todo/todoSlice';
import TaskCart from '../components/TaskCart/TaskCart';
import { useAlert } from '../helpers/hooks/useAlert';

interface DefaultLayoutProps {
  children: ReactNode;
}

const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  const navigate = useNavigate();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const dispatch = useAppDispatch();
  const { 
      ask, 
  } = useAlert();
  const { onClearDraggable, onMakeDraggable, onDestroyDragger } = useContext(winDragger);
  const sidebar = useRef<(HTMLDivElement | null)>(null);

  useEffect(() => {
    async function initDrag() {
      try {
        const arrayRef: HTMLDivElementWithPageTypeArray = {
          elements: []
        };
        if (sidebar.current) {
          arrayRef.elements.push({ element: sidebar.current, pageType: PageType.MAIN });
        }
        onClearDraggable(arrayRef.elements.map(el => el.element));
        onMakeDraggable(arrayRef);
      } catch (error) {
        console.error('Error initializing drag:', error);
      }
    }

    initDrag();
    return () => {
      onDestroyDragger();
    };
  }, []);

  return (
    <div className="layout-container">
      <nav className="sidebar" ref={sidebar}>
        <div className="nav-top">
          <button className="btn-icon nav-btn" onClick={() => navigate('/dashboard')}>
            <IoHomeOutline />
          </button>
          <button className="btn btn-primary h-[25px]" onClick={() => {
            dispatch(initializeTodoFlow({ id: '' }));
            navigate('/todoflow')
          }}>
            <FaTasks />
          </button>
        </div>
        <div className="nav-bottom">
          <button className="btn-icon nav-btn" onClick={() => navigate('/setting')}>
            <IoSettingsOutline />
          </button>
          <button className="btn-icon nav-btn" onClick={toggleTheme}>
            {isDarkTheme ? <IoMoonOutline /> : <IoSunnyOutline />}
          </button>
          <button 
            className="btn-icon nav-btn" 
            style={{ color: '#ef4444' }}
            onClick={async () => {
              const result = await ask('Are you sure you want to exit the application?', 'Confirm Exit', ['Yes', 'No']);
              if (result.response === 0) { 
                  await window.electronAPI.appClose();
              } else if (result.response === 1) {
                await window.electronAPI.appMinimize();
              }
            }}>
            <RiShutDownLine />
          </button>
        </div>
      </nav>
      <main className="main-content-area">
        {children}
      </main>
      <TaskCart className='custom-display-none' />
    </div>
  );
};

export default DefaultLayout;