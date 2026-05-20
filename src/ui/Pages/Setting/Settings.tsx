import { useState } from 'react';
import { IoIosArrowBack } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import { PageType } from '~/enums/PageType.enum';
import SettingsPanel from '~/ui/components/SettingsPanel/SettingsPanel';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import SoundPlayer from '~/ui/helpers/utils/SoundPlayer';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useResizePage(PageType.SETTING);

  const handleDeleteData = async () => {
    try {
      if (window.electronAPI?.deleteAllData) {
        await window.electronAPI.deleteAllData();
      } else {
        localStorage.removeItem('settings');
      }

      setShowDeleteModal(false);

      const soundPlayer = SoundPlayer.getInstance();
      soundPlayer.setSoundEnabled(true);
      soundPlayer.setStartupSoundEnabled(true);
      soundPlayer.setVolume(1.0);
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  return (
    <div className="settings-page current-background">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <button className="btn btn-icon" onClick={() => navigate(-1)}>
              <IoIosArrowBack size={24} />
            </button>
            <h1 className="text-3xl font-bold mb-2 text-highlight">Settings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Configure your application preferences</p>
        </div>

        <SettingsPanel />

        <div className="card mt-6" style={{ borderColor: '#e53e3e', borderWidth: '2px' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#e53e3e' }}>
                Danger Zone
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Delete all application data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-secondary rounded-lg ml-4 px-6 py-2"
              style={{ borderColor: '#e53e3e', color: '#e53e3e' }}
            >
              Delete Data
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'var(--modal-bg)' }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="card max-w-md w-full mx-4 animate-pop" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">!</span>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Delete All Data?</h3>
              <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
                This will permanently delete all your settings and data. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary rounded-lg flex-1 py-3">
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                className="btn flex-1 py-3 !rounded-lg font-semibold text-white"
                style={{ background: '#e53e3e', border: 'none' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
