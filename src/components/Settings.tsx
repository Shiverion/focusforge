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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        ⚙️ Settings
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Gemini API */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Gemini 2.5 Flash API Key
                        </label>
                        <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 underline">Google AI Studio</a>
                        </p>
                    </div>

                    {/* Pushover Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                📲 Enable Push Notifications
                            </label>
                            <p className="text-xs text-gray-400">
                                Send alerts to your phone via Pushover
                            </p>
                        </div>
                        <button
                            onClick={() => settings.togglePushover()}
                            className={`relative w-12 h-6 rounded-full transition-colors ${settings.enablePushover ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enablePushover ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Sound Notifications Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                🔔 Sound Notifications
                            </label>
                            <p className="text-xs text-gray-400">
                                Play sounds when timer completes
                            </p>
                        </div>
                        <button
                            onClick={() => settings.toggleSounds()}
                            className={`relative w-12 h-6 rounded-full transition-colors ${settings.enableSounds ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableSounds ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Pushover */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pushover User Key
                        </label>
                        <input
                            type="password"
                            value={pushoverUser}
                            onChange={(e) => setPushoverUser(e.target.value)}
                            placeholder="Your Pushover user key"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pushover App Token
                        </label>
                        <input
                            type="password"
                            value={pushoverApp}
                            onChange={(e) => setPushoverApp(e.target.value)}
                            placeholder="Your Pushover app token"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Create an app at <a href="https://pushover.net/apps/build" target="_blank" className="text-blue-500 underline">pushover.net</a>
                        </p>
                    </div>

                    {/* Timer Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Focus (minutes)
                            </label>
                            <input
                                type="number"
                                value={settings.focusDuration}
                                onChange={(e) => settings.setDurations(parseInt(e.target.value) || 25, settings.breakDuration)}
                                min={1}
                                max={120}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Break (minutes)
                            </label>
                            <input
                                type="number"
                                value={settings.breakDuration}
                                onChange={(e) => settings.setDurations(settings.focusDuration, parseInt(e.target.value) || 5)}
                                min={1}
                                max={30}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
