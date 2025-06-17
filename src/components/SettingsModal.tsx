import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSetting, resetSettings } = useSettings();

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2>Game Settings</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-modal-content">
          {/* Appearance Settings */}
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => updateSetting('darkMode', e.target.checked)}
                />
                <span className="checkmark"></span>
                Dark Mode
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.colorBlindMode}
                  onChange={(e) => updateSetting('colorBlindMode', e.target.checked)}
                />
                <span className="checkmark"></span>
                Color Blind Support
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="cardSize">Card Size</label>
              <select
                id="cardSize"
                value={settings.cardSize}
                onChange={(e) => updateSetting('cardSize', e.target.value as 'small' | 'medium' | 'large')}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Analysis Settings */}
          <div className="settings-section">
            <h3>Hand Analysis</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showAdvancedAnalysis}
                  onChange={(e) => updateSetting('showAdvancedAnalysis', e.target.checked)}
                />
                <span className="checkmark"></span>
                Show Advanced Analysis by Default
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showCardCount}
                  onChange={(e) => updateSetting('showCardCount', e.target.checked)}
                />
                <span className="checkmark"></span>
                Show Card Counting
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="analysisDetail">Analysis Detail Level</label>
              <select
                id="analysisDetail"
                value={settings.analysisDetail}
                onChange={(e) => updateSetting('analysisDetail', e.target.value as 'simple' | 'detailed')}
              >
                <option value="simple">Simple</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>

          {/* Game Experience Settings */}
          <div className="settings-section">
            <h3>Game Experience</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.animationsEnabled}
                  onChange={(e) => updateSetting('animationsEnabled', e.target.checked)}
                />
                <span className="checkmark"></span>
                Enable Animations
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                />
                <span className="checkmark"></span>
                Enable Sound Effects
              </label>
            </div>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.confirmActions}
                  onChange={(e) => updateSetting('confirmActions', e.target.checked)}
                />
                <span className="checkmark"></span>
                Confirm Important Actions
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="autoFoldTimeout">Auto-Fold Timeout (seconds)</label>
              <input
                id="autoFoldTimeout"
                type="number"
                min="10"
                max="120"
                value={settings.autoFoldTimeout}
                onChange={(e) => updateSetting('autoFoldTimeout', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          <button className="reset-button" onClick={resetSettings}>
            Reset to Defaults
          </button>
          <button className="save-button" onClick={onClose}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;