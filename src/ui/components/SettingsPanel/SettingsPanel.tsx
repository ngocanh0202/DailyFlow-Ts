import { forwardRef, useContext, useEffect, useImperativeHandle, useState } from 'react';
import { IoVolumeHighOutline, IoVolumeLowOutline } from 'react-icons/io5';
import { ThemeContext } from '~/ui/App';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import SoundPlayer from '~/ui/helpers/utils/SoundPlayer';
import AppDropdown from '~/ui/components/AppDropdown/AppDropdown';
import './SettingsPanel.css';

const defaultSettings: AppSettings = {
  startWithWindows: false,
  breakTime: 300,
  soundEnabled: true,
  startupSoundEnabled: true,
  volume: 1.0,
};

const breakTimeOptions = [
  { label: '5 Seconds', value: 5 },
  { label: '5 Minutes', value: 300 },
  { label: '10 Minutes', value: 600 },
  { label: '15 Minutes', value: 900 },
  { label: '30 Minutes', value: 1800 },
  { label: '60 Minutes', value: 3600 },
];

const normalizeSettings = (settings: Partial<AppSettings> = {}): AppSettings => ({
  startWithWindows: settings.startWithWindows ?? defaultSettings.startWithWindows,
  breakTime: settings.breakTime ?? defaultSettings.breakTime,
  soundEnabled: settings.soundEnabled ?? defaultSettings.soundEnabled,
  startupSoundEnabled: settings.startupSoundEnabled ?? defaultSettings.startupSoundEnabled,
  volume: settings.volume ?? defaultSettings.volume,
});

export interface SettingsPanelHandle {
  saveSettings: () => Promise<void>;
}

interface SettingsPanelProps {
  hideStartWithWindows?: boolean;
  hideSaveButton?: boolean;
  showSuccessMessage?: boolean;
}

const SettingsPanel = forwardRef<SettingsPanelHandle, SettingsPanelProps>(({
  hideStartWithWindows = false,
  hideSaveButton = false,
  showSuccessMessage = true,
}, ref) => {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { success } = useAlert();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const soundPlayer = SoundPlayer.getInstance();
  const isBusy = isLoadingSettings || isSaving;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI?.getSettings) {
          setSettings(normalizeSettings(await window.electronAPI.getSettings()));
          return;
        }

        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
          setSettings(normalizeSettings(JSON.parse(savedSettings)));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    if (isBusy) return;

    try {
      setIsSaving(true);
      soundPlayer.setSoundEnabled(settings.soundEnabled);
      soundPlayer.setStartupSoundEnabled(settings.startupSoundEnabled);
      soundPlayer.setVolume(settings.volume);
      soundPlayer.saveSoundSettings();

      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(settings);
      }

      localStorage.setItem('settings', JSON.stringify(settings));
      if (showSuccessMessage) {
        await success('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ saveSettings }), [settings, isBusy]);

  return (
    <div className="card settings-panel space-y-6">
      {!hideStartWithWindows && (
        <div className="setting-item">
          <div className="settings-panel-row">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Start with Windows</h3>
              <p className="text-sm">Launch the application automatically when Windows starts</p>
            </div>
            <label className="settings-panel-toggle">
              <input
                type="checkbox"
                checked={settings.startWithWindows}
                onChange={(event) => setSettings((current) => ({ ...current, startWithWindows: event.target.checked }))}
                disabled={isBusy}
                className="sr-only peer"
              />
              <div className="click settings-panel-switch"></div>
            </label>
          </div>
        </div>
      )}

      <div className="setting-item">
        <div className="settings-panel-block">
          <h3 className="text-lg font-semibold mb-1">Break Time Duration</h3>
          <p className="text-sm mb-4">Set how long your break periods should last</p>
          <AppDropdown
            value={settings.breakTime}
            options={breakTimeOptions}
            onChange={(breakTime) => {
              if (!isBusy) {
                setSettings((current) => ({ ...current, breakTime }));
              }
            }}
          />
        </div>
      </div>

      <div className="setting-item">
        <div className="settings-panel-row">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Enable All Sounds</h3>
            <p className="text-sm">Turn on/off all sound effects in the application</p>
          </div>
          <label className="settings-panel-toggle">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => setSettings((current) => ({ ...current, soundEnabled: event.target.checked }))}
              disabled={isBusy}
              className="sr-only peer"
            />
            <div className="click settings-panel-switch"></div>
          </label>
        </div>
      </div>

      <div className="setting-item">
        <div className="settings-panel-row">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Startup Sound</h3>
            <p className="text-sm">Play sound when the application starts</p>
          </div>
          <label className="settings-panel-toggle">
            <input
              type="checkbox"
              checked={settings.startupSoundEnabled && settings.soundEnabled}
              onChange={(event) => setSettings((current) => ({ ...current, startupSoundEnabled: event.target.checked }))}
              disabled={!settings.soundEnabled || isBusy}
              className="sr-only peer"
            />
            <div className={`click settings-panel-switch ${settings.soundEnabled ? '' : 'disabled'}`}></div>
          </label>
        </div>
      </div>

      <div className="setting-item">
        <div className="settings-panel-block">
          <h3 className="text-lg font-semibold mb-1">Volume</h3>
          <p className="text-sm mb-4">Adjust the volume of sound effects ({Math.round(settings.volume * 100)}%)</p>
          <div className="settings-panel-volume">
            <IoVolumeLowOutline />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(event) => {
                if (isBusy) return;
                const volume = parseFloat(event.target.value);
                setSettings((current) => ({ ...current, volume }));
                if (!hideSaveButton) {
                  soundPlayer.setVolume(volume);
                }
              }}
              disabled={!settings.soundEnabled || isBusy}
              className={`click range flex-1 ${!settings.soundEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <IoVolumeHighOutline />
          </div>
        </div>
      </div>

      <div className="setting-item">
        <div className="settings-panel-row no-border">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Dark Theme</h3>
            <p className="text-sm">Switch between dark and light theme</p>
          </div>
          <label className="settings-panel-toggle">
            <input
              type="checkbox"
              checked={isDarkTheme}
              onChange={toggleTheme}
              disabled={isBusy}
              className="sr-only peer"
            />
            <div className="click settings-panel-switch"></div>
          </label>
        </div>
      </div>

      {!hideSaveButton && (
        <button
          onClick={saveSettings}
          disabled={isBusy}
          className="btn btn-primary w-full py-3 text-lg save-btn"
        >
          {isLoadingSettings ? 'Loading...' : isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      )}
      {isLoadingSettings && (
        <div className="async-inline-overlay no-drag" role="status">
          <div className="startup-spinner" />
          <span>Loading settings</span>
        </div>
      )}
      {isSaving && (
        <div className="async-inline-overlay no-drag" role="status">
          <div className="startup-spinner" />
          <span>Saving settings</span>
        </div>
      )}
    </div>
  );
});

SettingsPanel.displayName = 'SettingsPanel';

export default SettingsPanel;
