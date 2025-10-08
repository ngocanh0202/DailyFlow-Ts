import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '~/ui/store/hooks';
import { removeAllCartTasks } from '~/ui/store/task/taskCartSlice';

const Settings = () => {
  const dispatch = useAppDispatch();
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [breakTime, setBreakTime] = useState(300);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const breakTimeOptions = [
    { label: '5 Minutes', value: 300 },
    { label: '10 Minutes', value: 600 },
    { label: '15 Minutes', value: 900 },
    { label: '30 Minutes', value: 1800 },
    { label: '60 Minutes', value: 3600 }
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getSettings) {
          const settings = await window.electronAPI.getSettings();
          console.log(settings);
          setStartWithWindows(settings.startWithWindows ?? false);
          setBreakTime(settings.breakTime ?? 300);
        } else {
          const savedStartWithWindows = localStorage.getItem('startWithWindows');
          const savedBreakTime = localStorage.getItem('breakTime');
          if (savedStartWithWindows !== null) setStartWithWindows(savedStartWithWindows === 'true');
          if (savedBreakTime !== null) setBreakTime(parseInt(savedBreakTime));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  // NOTE: do NOT auto-save on every change. User must click Save.

  const handleSaveSettings = async () => {
    try {
      const settings: AppSettings = {
        startWithWindows,
        breakTime
      };

      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings(settings);
      }
      
      localStorage.setItem('startWithWindows', String(settings.startWithWindows));
      localStorage.setItem('breakTime', String(settings.breakTime));

    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleDeleteData = async () => {
    try {
      if (window.electronAPI && window.electronAPI.deleteAllData) {
        await window.electronAPI.deleteAllData();
      } else {
        localStorage.removeItem('startWithWindows');
        localStorage.removeItem('breakTime');
      }

      setStartWithWindows(false);
      setBreakTime(300);
      setShowDeleteModal(false);
      dispatch(removeAllCartTasks());
      console.log('All data deleted');
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  return (
    <div className="p-8 current-background" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-highlight">Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure your application preferences
          </p>
        </div>

        <div className="card space-y-6">
          <div className="setting-item">
            <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Start with Windows</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Launch the application automatically when Windows starts
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={startWithWindows}
                  onChange={(e) => setStartWithWindows(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Break Time */}
          <div className="setting-item">
            <div className="py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-1">Break Time Duration</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Set how long your break periods should last
              </p>
              <select
                value={breakTime}
                onChange={(e) => setBreakTime(parseInt(e.target.value))}
                className="w-full p-3 rounded-lg border-2 transition-all focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                {breakTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={async () => {
                setIsSaving(true);
                await handleSaveSettings();
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="btn-primary w-full py-3 text-lg save-btn"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

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
              className="btn-secondary rounded-lg ml-4 px-6 py-2"
              style={{
                borderColor: '#e53e3e',
                color: '#e53e3e'
              }}
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
          <div
            className="card max-w-md w-full mx-4 animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Delete All Data?</h3>
              <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
                This will permanently delete all your settings and data. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary rounded-lg flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                className="flex-1 py-3 !rounded-lg font-semibold text-white"
                style={{
                  background: '#e53e3e',
                  border: 'none'
                }}
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