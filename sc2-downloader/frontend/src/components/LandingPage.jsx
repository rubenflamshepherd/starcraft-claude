import { useState, useEffect } from 'react';

import recommendedSetup from '../data/recommendedSetup.json';

const HOOK_TO_FOLDER = {
  SessionStart: 'start',
  UserPromptSubmit: 'userpromptsubmit',
  Stop: 'done',
  PreCompact: 'precompact',
  PermissionPrompt: 'permission',
  Question: 'question',
};

function StatusIndicator({ label, tooltip, dotClassName }) {
  return (
    <div
      className="group relative flex items-center gap-2 focus-within:z-10"
      tabIndex={0}
      aria-label={`${label}. ${tooltip}`}
    >
      <div className={`w-3 h-3 rounded-full ${dotClassName}`} />
      <span className="text-sm text-gray-400">{label}</span>
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs text-gray-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {tooltip}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [listenerStatus, setListenerStatus] = useState(null);
  const [hooksStatus, setHooksStatus] = useState(null);
  const [soundsStatus, setSoundsStatus] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [setupResult, setSetupResult] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [notificationHooks, setNotificationHooks] = useState({
    permissionPrompt: false,
    question: false,
    stop: false,
  });
  const [togglingNotificationHook, setTogglingNotificationHook] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  const refreshStatus = async () => {
    try {
      const [listenerResult, hooksResult, soundsResult, notificationHooksResult, notificationsMasterResult] = await Promise.allSettled([
        fetch('http://localhost:3001/api/listener-status'),
        fetch('http://localhost:3001/api/hooks-status'),
        fetch('http://localhost:3001/api/sounds-info'),
        fetch('http://localhost:3001/api/system-notification-hooks-status'),
        fetch('http://localhost:3001/api/notification-status'),
      ]);

      if (listenerResult.status === 'fulfilled' && listenerResult.value.ok) {
        setListenerStatus(await listenerResult.value.json());
      }

      if (hooksResult.status === 'fulfilled' && hooksResult.value.ok) {
        setHooksStatus(await hooksResult.value.json());
      }

      if (soundsResult.status === 'fulfilled' && soundsResult.value.ok) {
        const soundsInfo = await soundsResult.value.json();
        // Check if all required sound folders exist
        const allFoldersExist = soundsInfo.folders?.every(f => f.exists);
        setSoundsStatus({ configured: Boolean(allFoldersExist) });
      }

      if (notificationHooksResult.status === 'fulfilled' && notificationHooksResult.value.ok) {
        const hooksInfo = await notificationHooksResult.value.json();
        setNotificationHooks({
          permissionPrompt: Boolean(hooksInfo.permissionPrompt),
          question: Boolean(hooksInfo.question),
          stop: Boolean(hooksInfo.stop),
        });
      }

      if (notificationsMasterResult.status === 'fulfilled' && notificationsMasterResult.value.ok) {
        const masterInfo = await notificationsMasterResult.value.json();
        setNotificationsEnabled(masterInfo.enabled !== false);
      }
    } catch {
      // Ignore errors
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleToggleSounds = async () => {
    setIsToggling(true);
    try {
      await fetch('http://localhost:3001/api/toggle-sounds', { method: 'POST' });
      await refreshStatus();
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleNotificationHook = async (hook) => {
    setTogglingNotificationHook(hook);
    try {
      const response = await fetch('http://localhost:3001/api/toggle-system-notification-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook }),
      });
      if (!response.ok) {
        throw new Error('Failed to toggle notifications');
      }
      const data = await response.json();
      setNotificationHooks(prev => ({
        ...prev,
        [hook]: Boolean(data.enabled),
      }));
    } catch (error) {
      console.error('Notifications toggle failed:', error);
    } finally {
      setTogglingNotificationHook(null);
    }
  };

  const handleToggleNotificationsMaster = async () => {
    setIsTogglingNotifications(true);
    try {
      const response = await fetch('http://localhost:3001/api/toggle-notifications', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to toggle notifications');
      }
      await response.json();
      await refreshStatus();
    } catch (error) {
      console.error('Master notifications toggle failed:', error);
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  const handleOneClickSetup = async () => {
    setIsSettingUp(true);
    setSetupResult(null);

    try {
      // Step 1: Setup hooks
      setCurrentStep('hooks');
      await fetch('http://localhost:3001/api/setup-hooks', { method: 'POST' });

      // Step 2: Download sounds
      setCurrentStep('sounds');
      const quotes = [];
      for (const hook of recommendedSetup.hooks) {
        const folderName = HOOK_TO_FOLDER[hook.name] || hook.name.toLowerCase();
        for (const rec of hook.recommendations) {
          const urlMatch = rec.audioUrl.match(/\/([^/]+)\.ogg\//);
          const baseFilename = urlMatch ? urlMatch[1] : `audio_${quotes.length}`;
          const filename = `${baseFilename} - ${rec.text.replace(/[/\\:*?"<>|]/g, '')}.mp3`;
          quotes.push({
            audioUrl: rec.audioUrl,
            filename,
            folder: folderName,
          });
        }
      }
      await fetch('http://localhost:3001/api/save-to-sounds-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes }),
      });

      // Step 3: Setup listener
      setCurrentStep('listener');
      await fetch('http://localhost:3001/api/setup-listener', { method: 'POST' });

      // Refresh all status
      await refreshStatus();

      setSetupResult({
        success: true,
        message: 'Setup complete! Restart your terminal to activate the sound listener.'
      });
    } catch (error) {
      setSetupResult({ error: error.message });
    } finally {
      setIsSettingUp(false);
      setCurrentStep(null);
    }
  };

  const features = [
    {
      title: 'Browse by Faction',
      description: 'Explore hundreds of iconic voice lines organized by faction. Search by unit name or quote text.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      title: 'Preview & Play',
      description: 'Listen to any quote before downloading. Click the play button to hear exactly what you\'ll get.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-500/20 text-green-400',
    },
    {
      title: 'Download Quotes',
      description: 'Download individual quotes as MP3 files. Audio is automatically converted from the original format.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      color: 'bg-amber-500/20 text-amber-400',
    },
    {
      title: 'Batch Download ZIP',
      description: 'Select multiple quotes and download them all as a ZIP file, organized by unit and category.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      color: 'bg-purple-500/20 text-purple-400',
    },
    {
      title: 'Recommended Setup',
      description: 'Curated picks for each Claude Code hook. Drag to reorder, move between hooks, or add your own.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      color: 'bg-amber-500/20 text-amber-400',
    },
    {
      title: 'Save to .claude',
      description: 'One-click save directly to ~/.claude/sounds/. Files are placed in the correct hook folders automatically.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-500/20 text-green-400',
    },
  ];

  const hooksTooltip = `Hooks status: ${hooksStatus?.allConfigured ? 'configured' : 'not configured'}. Checks whether Claude Code hooks are installed in ~/.claude/settings.json.`;
  const soundsTooltip = `Sounds status: ${soundsStatus?.configured ? 'configured' : 'not configured'}. Checks whether required sound folders exist in ~/.claude/sounds/.`;
  const listenerTooltip = `Listener status: ${listenerStatus?.scriptInstalled ? 'installed' : 'not installed'}. Checks whether the local watcher script is installed.`;
  const shellConfigName =
    listenerStatus?.shellConfigs?.zshrc ? '.zshrc' :
    listenerStatus?.shellConfigs?.bashrc ? '.bashrc' :
    listenerStatus?.shellConfigs?.bash_profile ? '.bash_profile' :
    'Shell Config';
  const shellConfigTooltip = `${shellConfigName} status: ${listenerStatus?.inShellConfig ? 'configured' : 'not configured'}. Checks whether your shell config sources the listener script.`;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Game Sounds for Claude Code
        </h1>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Add iconic game quotes to your Claude Code sessions. Browse hundreds of voice lines, preview them, and connect them directly to your Claude Code.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={handleOneClickSetup}
            disabled={isSettingUp}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-lg font-medium disabled:opacity-50"
          >
            {isSettingUp ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {currentStep === 'hooks' && 'Setting up hooks...'}
                {currentStep === 'sounds' && 'Downloading sounds...'}
                {currentStep === 'listener' && 'Setting up listener...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                One-Click Setup
              </>
            )}
          </button>
        </div>

        {/* Status + Toggles */}
        <div className="mt-6 mx-auto max-w-4xl space-y-3">
          <div className="flex items-center justify-center gap-6 flex-wrap rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3">
            <StatusIndicator
              label="Hooks"
              tooltip={hooksTooltip}
              dotClassName={
                currentStep === 'hooks'
                  ? 'bg-amber-400 animate-pulse'
                  : hooksStatus?.allConfigured
                    ? 'bg-green-400'
                    : 'bg-gray-600'
              }
            />
            <StatusIndicator
              label="Sounds"
              tooltip={soundsTooltip}
              dotClassName={
                currentStep === 'sounds'
                  ? 'bg-amber-400 animate-pulse'
                  : soundsStatus?.configured
                    ? 'bg-green-400'
                    : 'bg-gray-600'
              }
            />
            <StatusIndicator
              label="Listener"
              tooltip={listenerTooltip}
              dotClassName={
                currentStep === 'listener'
                  ? 'bg-amber-400 animate-pulse'
                  : listenerStatus?.scriptInstalled
                    ? 'bg-green-400'
                    : 'bg-gray-600'
              }
            />
            <StatusIndicator
              label={shellConfigName}
              tooltip={shellConfigTooltip}
              dotClassName={listenerStatus?.inShellConfig ? 'bg-green-400' : 'bg-gray-600'}
            />
          </div>

          <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3">
            <span className="text-sm text-gray-400">Sounds</span>
            <button
              onClick={handleToggleSounds}
              disabled={isToggling || !listenerStatus?.scriptInstalled}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                listenerStatus?.running ? 'bg-green-500' : 'bg-gray-600'
              } ${isToggling || !listenerStatus?.scriptInstalled ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                  listenerStatus?.running ? 'left-6' : 'left-1'
                }`}
              />
            </button>
            <span className="min-w-[78px] whitespace-nowrap text-sm text-gray-400 text-left">
              {!listenerStatus?.scriptInstalled ? 'Not Installed' : isToggling ? 'Toggling...' : listenerStatus?.running ? 'On' : 'Off'}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">System Notifications</span>
              <button
                onClick={handleToggleNotificationsMaster}
                disabled={isTogglingNotifications}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-green-500' : 'bg-gray-600'
                } ${isTogglingNotifications ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                    notificationsEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className={`h-5 w-px bg-gray-700 ${notificationsEnabled ? '' : 'opacity-50'}`} />

            {[
              { key: 'permissionPrompt', label: 'Permission' },
              { key: 'question', label: 'Question' },
              { key: 'stop', label: 'Stop' },
            ].map(({ key, label }) => {
              const savedEnabled = notificationHooks[key];
              const displayEnabled = notificationsEnabled && savedEnabled;

              return (
                <div key={key} className="flex items-center gap-2">
                  <span className={`text-sm whitespace-nowrap ${notificationsEnabled ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
                  <button
                    onClick={() => handleToggleNotificationHook(key)}
                    disabled={!notificationsEnabled || togglingNotificationHook === key}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      displayEnabled ? 'bg-green-500' : 'bg-gray-600'
                    } ${togglingNotificationHook === key ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                        displayEnabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {setupResult && (
          <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${
            setupResult.success ? 'bg-green-800/50 text-green-200' : 'bg-red-800/50 text-red-200'
          }`}>
            {setupResult.message || setupResult.error}
          </div>
        )}
      </div>

      {/* Feature Cards Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-colors"
          >
            <div className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center mb-4`}>
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
