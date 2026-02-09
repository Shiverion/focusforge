import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const settings = useSettingsStore();
    const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
    const [pushoverUser, setPushoverUser] = useState(settings.pushoverUserKey);
    const [pushoverApp, setPushoverApp] = useState(settings.pushoverAppToken);

    const handleSave = () => {
        settings.setGeminiApiKey(geminiKey);
        settings.setPushoverKeys(pushoverUser, pushoverApp);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl w-full max-w-lg animate-scale-in border border-stone-200 dark:border-stone-800">
                {/* Header */}
                <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <h2 className="text-lg font-display font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <span>⚙️</span> Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Gemini API */}
                    <div className="space-y-2">
                        <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300">
                            Gemini 3 Flash API Key
                        </label>
                        <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 outline-none transition-all"
                        />
                        <p className="text-xs text-stone-500">
                            Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-accent-500 hover:text-accent-600 underline">Google AI Studio</a>
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-stone-200 dark:border-stone-800" />

                    {/* Toggle Settings */}
                    <div className="space-y-4">
                        {/* Push Notifications Toggle */}
                        <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                            <div>
                                <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300">
                                    📲 Push Notifications
                                </label>
                                <p className="text-xs text-stone-500">
                                    Send alerts via Pushover
                                </p>
                            </div>
                            <button
                                onClick={() => settings.togglePushover()}
                                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${settings.enablePushover
                                    ? 'bg-gradient-to-r from-break to-break-dark shadow-lg shadow-break-glow'
                                    : 'bg-stone-300 dark:bg-stone-600'
                                    }`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.enablePushover ? 'translate-x-8' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Sound Notifications Toggle */}
                        <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                            <div>
                                <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300">
                                    🔔 Sound Notifications
                                </label>
                                <p className="text-xs text-stone-500">
                                    Play sounds when timer completes
                                </p>
                            </div>
                            <button
                                onClick={() => settings.toggleSounds()}
                                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${settings.enableSounds
                                    ? 'bg-gradient-to-r from-break to-break-dark shadow-lg shadow-break-glow'
                                    : 'bg-stone-300 dark:bg-stone-600'
                                    }`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.enableSounds ? 'translate-x-8' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Require Camera Toggle */}
                        <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                            <div>
                                <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300">
                                    📷 Require Camera for Focus
                                </label>
                                <p className="text-xs text-stone-500">
                                    Must enable webcam to start
                                </p>
                            </div>
                            <button
                                onClick={() => settings.toggleRequireCamera()}
                                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${settings.requireCamera
                                    ? 'bg-gradient-to-r from-break to-break-dark shadow-lg shadow-break-glow'
                                    : 'bg-stone-300 dark:bg-stone-600'
                                    }`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.requireCamera ? 'translate-x-8' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-stone-200 dark:border-stone-800" />

                    {/* Pushover Keys */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300">
                                Pushover User Key
                            </label>
                            <input
                                type="password"
                                value={pushoverUser}
                                onChange={(e) => setPushoverUser(e.target.value)}
                                placeholder="Your Pushover user key"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-display font-semibold text-stone-700 dark:text-stone-300">
                                Pushover App Token
                            </label>
                            <input
                                type="password"
                                value={pushoverApp}
                                onChange={(e) => setPushoverApp(e.target.value)}
                                placeholder="Your Pushover app token"
                                className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 outline-none transition-all"
                            />
                            <p className="text-xs text-stone-500">
                                Create an app at <a href="https://pushover.net/apps/build" target="_blank" className="text-accent-500 hover:text-accent-600 underline">pushover.net</a>
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-stone-200 dark:border-stone-800" />

                    {/* Timer Settings */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-display font-semibold text-stone-700 dark:text-stone-300">⏱️ Timer Durations</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-stone-500">
                                    Focus (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={settings.focusDuration}
                                    onChange={(e) => settings.setDurations(parseInt(e.target.value) || 25, settings.breakDuration)}
                                    min={1}
                                    max={120}
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 outline-none transition-all text-center font-display font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-stone-500">
                                    Break (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={settings.breakDuration}
                                    onChange={(e) => settings.setDurations(settings.focusDuration, parseInt(e.target.value) || 5)}
                                    min={1}
                                    max={30}
                                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-accent-500/30 focus:border-accent-400 outline-none transition-all text-center font-display font-semibold"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-display font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-display font-bold rounded-xl shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 transition-all duration-200 hover:-translate-y-0.5"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
