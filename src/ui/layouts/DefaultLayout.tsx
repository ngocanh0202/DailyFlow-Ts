import { ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext, winDragger } from '../App';
import { 
  IoSettingsOutline, 
  IoMoonOutline, 
  IoSunnyOutline, 
  IoHomeOutline  
} from "react-icons/io5";
import { FaTasks } from "react-icons/fa";
import './DefaultLayout.css';
import WindowDragger from '../helpers/utils/WindowDragger';
import { PageType } from '~/enums/PageType.enum';
import { getPageSize } from '~/shared/util.page';
import { useAppDispatch } from '../store/hooks';
import { initializeTodoFlow } from '../store/todo/todoSlice';

interface DefaultLayoutProps {
  children: ReactNode;
}

const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  const navigate = useNavigate();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const dispatch = useAppDispatch();
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
          <button className="btn-icon nav-btn" onClick={() => navigate('/')}>
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
        </div>
      </nav>
      <main className="main-content-area">
        {children}
      </main>
    </div>
  );
};

export default DefaultLayout;