// ============================================================================
// FOLDERFORGE SYNC - ADD DEVICE COMPONENT
// Shows device token for desktop agent setup
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Laptop, 
  Smartphone,
  Copy, 
  Check, 
  X, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useDevices } from './hooks';

// Platform detection
const detectPlatform = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
};

// Glass card component
const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

// Download links for each platform
const DOWNLOAD_LINKS = {
  windows: {
    name: 'Windows',
    icon: Monitor,
    installer: 'https://github.com/your-repo/releases/latest/download/FolderForge-Sync-Setup.exe',
    portable: 'https://github.com/your-repo/releases/latest/download/FolderForge-Sync-portable.exe',
  },
  macos: {
    name: 'macOS',
    icon: Laptop,
    installer: 'https://github.com/your-repo/releases/latest/download/FolderForge-Sync.dmg',
  },
  linux: {
    name: 'Linux',
    icon: Monitor,
    installer: 'https://github.com/your-repo/releases/latest/download/FolderForge-Sync.AppImage',
    deb: 'https://github.com/your-repo/releases/latest/download/FolderForge-Sync.deb',
    rpm: 'https://github.com/your-repo/releases/latest/download/FolderForge-Sync.rpm',
  },
};

// Step indicator
const StepIndicator = ({ step, currentStep, title }) => (
  <div className="flex items-center gap-3">
    <div className={`
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
      ${currentStep > step ? 'bg-emerald-500 text-white' : 
        currentStep === step ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500' : 
        'bg-white/5 text-zinc-500'}
    `}>
      {currentStep > step ? <Check size={16} /> : step}
    </div>
    <span className={currentStep >= step ? 'text-white' : 'text-zinc-500'}>{title}</span>
  </div>
);

// Main Add Device Modal
export function AddDeviceModal({ isOpen, onClose, supabaseUrl, supabaseKey }) {
  const { registerDevice } = useDevices();
  const [step, setStep] = useState(1);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('desktop');
  const [platform, setPlatform] = useState(detectPlatform());
  const [defaultPath, setDefaultPath] = useState('');
  const [deviceToken, setDeviceToken] = useState(null);
  const [copied, setCopied] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDeviceName('');
      setDeviceToken(null);
      setError('');
      setPlatform(detectPlatform());
    }
  }, [isOpen]);

  // Generate device name suggestion
  useEffect(() => {
    if (!deviceName && platform !== 'unknown') {
      const names = {
        windows: 'Windows PC',
        macos: 'MacBook',
        linux: 'Linux Machine',
      };
      setDeviceName(names[platform] || 'My Computer');
    }
  }, [platform, deviceName]);

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const device = await registerDevice({
        name: deviceName.trim(),
        device_type: deviceType,
        platform: platform,
        default_path: defaultPath || undefined,
      });

      setDeviceToken(device.device_token);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <GlassCard 
        className="w-full max-w-lg p-6 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Add Desktop Device</h2>
            <p className="text-zinc-400 text-sm mt-1">Connect your computer for real-time sync</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <StepIndicator step={1} currentStep={step} title="Download" />
          <div className="flex-1 h-px bg-white/10 mx-4" />
          <StepIndicator step={2} currentStep={step} title="Configure" />
          <div className="flex-1 h-px bg-white/10 mx-4" />
          <StepIndicator step={3} currentStep={step} title="Connect" />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Step 1: Download */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-zinc-300 text-sm">
              Download and install the FolderForge Sync desktop agent for your platform:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(DOWNLOAD_LINKS).map(([key, info]) => {
                const Icon = info.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setPlatform(key)}
                    className={`
                      p-4 rounded-xl border transition-all text-center
                      ${platform === key 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'}
                    `}
                  >
                    <Icon size={24} className="mx-auto mb-2" />
                    <span className="text-sm">{info.name}</span>
                  </button>
                );
              })}
            </div>

            {platform && platform !== 'unknown' && (
              <div className="space-y-2 pt-4">
                <a
                  href={DOWNLOAD_LINKS[platform].installer}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download for {DOWNLOAD_LINKS[platform].name}
                </a>
                
                {DOWNLOAD_LINKS[platform].portable && (
                  <a
                    href={DOWNLOAD_LINKS[platform].portable}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Download Portable Version
                  </a>
                )}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
              >
                I've installed it →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My Workstation"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Device Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'desktop', icon: Monitor, label: 'Desktop' },
                  { id: 'laptop', icon: Laptop, label: 'Laptop' },
                  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setDeviceType(id)}
                    className={`
                      p-3 rounded-xl border transition-all flex items-center justify-center gap-2
                      ${deviceType === id 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}
                    `}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Default Folder Path (optional)</label>
              <input
                type="text"
                value={defaultPath}
                onChange={(e) => setDefaultPath(e.target.value)}
                placeholder={platform === 'windows' ? 'C:\\Projects' : '/Users/you/Projects'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                You can change this in the desktop agent settings later
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleRegister}
                disabled={loading || !deviceName.trim()}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Generate Token →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Connect */}
        {step === 3 && deviceToken && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Check size={18} />
                <span className="font-medium">Device registered!</span>
              </div>
              <p className="text-sm text-zinc-300">
                Copy the credentials below into your desktop agent settings.
              </p>
            </div>

            <div className="space-y-3">
              {/* Supabase URL */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">
                  Supabase URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={supabaseUrl || 'Configure in environment'}
                    readOnly
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(supabaseUrl, 'url')}
                    className={`px-3 rounded-lg transition-all ${
                      copied.url ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {copied.url ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Supabase Key */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">
                  Supabase Anon Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={supabaseKey ? supabaseKey.slice(0, 20) + '...' : 'Configure in environment'}
                    readOnly
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(supabaseKey, 'key')}
                    className={`px-3 rounded-lg transition-all ${
                      copied.key ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {copied.key ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Device Token */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">
                  Device Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deviceToken}
                    readOnly
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(deviceToken, 'token')}
                    className={`px-3 rounded-lg transition-all ${
                      copied.token ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {copied.token ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <h4 className="text-sm font-medium text-white mb-2">Next Steps:</h4>
              <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
                <li>Open the FolderForge Sync desktop agent</li>
                <li>Click the tray icon and select "Settings"</li>
                <li>Paste these credentials and click "Save & Connect"</li>
              </ol>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default AddDeviceModal;
