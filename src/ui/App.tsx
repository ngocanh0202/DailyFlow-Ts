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
import SoundPlayer from './helpers/utils/SoundPlayer';
import { SoundType } from '~/enums/Sound.Type.enum';
import sound_gambusta from '~/ui/assets/sound-gambusta.mp3';
import sound_waoo_congratulations from '~/ui/assets/sound-waoo-congratulations.mp3';
import sound_bocchi from '~/ui/assets/sound-bocchi.mp3';
import sound_sugoi_sugoi from '~/ui/assets/sound-sugoi-sugoi.mp3';
import sound_ahhh from '~/ui/assets/sound-ahhh.mp3';
import sound_cau_met_lam_ha from '~/ui/assets/sound-cau-met-lam-ha.mp3';
import sound_shinderu from '~/ui/assets/sound-shinderu.mp3';
import sound_sound_oh_my_god from '~/ui/assets/sound-oh-my-god.mp3';
import sound_hayay from '~/ui/assets/sound-hayay.mp3';

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
  const soundPlayer = SoundPlayer.getInstance();


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
    const handleResetTodo = async () =>{
      try{
        await window.electronAPI.todoReset();
      }catch(err){
        console.error('Failed to reset todo on app start:', err);
      }
    }

    const handleLoadSettings = async () =>{
      try{
        const settings = await window.electronAPI.getSettings();
        if(settings){
          localStorage.setItem('settings', JSON.stringify(settings));
          if(settings.soundEnabled !== undefined){
            soundPlayer.setSoundEnabled(settings.soundEnabled);
          }
          if(settings.startupSoundEnabled !== undefined){
            soundPlayer.setStartupSoundEnabled(settings.startupSoundEnabled);
          }
          const audioElements = {
            [SoundType.SOUND_GAMBUSTA]: new Audio(sound_gambusta),
            [SoundType.SOUND_WAOO_CONGRATULATIONS]: new Audio(sound_waoo_congratulations),
            [SoundType.SOUND_BOCCHI]: new Audio(sound_bocchi),
            [SoundType.SOUND_SUGOI_SUGOI]: new Audio(sound_sugoi_sugoi),
            [SoundType.SOUND_AHHH]: new Audio(sound_ahhh),
            [SoundType.SOUND_CAU_MET_LAM_HA]: new Audio(sound_cau_met_lam_ha),
            [SoundType.SOUND_SHINDERU]: new Audio(sound_shinderu),
            [SoundType.SOUND_OH_MY_GOD]: new Audio(sound_sound_oh_my_god),
            [SoundType.SOUND_HAYAY]: new Audio(sound_hayay),
          };
          soundPlayer.init(audioElements);
          soundPlayer.play(SoundType.SOUND_AHHH);
        }
      }catch(err){
        console.error('Failed to load settings on app start:', err);
      }
    }

    const handleSetThemeOnStart = () => {
      if (isDarkTheme) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    }

    handleResetTodo();
    handleLoadSettings();
    handleSetThemeOnStart();
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