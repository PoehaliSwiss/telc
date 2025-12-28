import { useEffect, useState } from 'react';
import { X, Save, Key, Globe, Cpu, RefreshCw } from 'lucide-react';

interface AIConfig {
    provider: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    hasKey: boolean;
}

interface AISettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
    const [config, setConfig] = useState<AIConfig>({
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        model: '',
        hasKey: false
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [fetchingModels, setFetchingModels] = useState(false);

    const fetchModels = async () => {
        setFetchingModels(true);
        try {
            const res = await fetch('/api/ai/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                const models = await res.json();
                setAvailableModels(models);
                if (models.length === 0) {
                    alert("No models found for this provider.");
                } else {
                    // Optional: Toast or small feedback. "Fetched X models"
                    // For now, let's just rely on the UI updating. 
                    // But if the list is identical, user sees nothing.
                    // Let's prevent 'silent' success if user says "nothing happens".
                    // Maybe just a small log or if debug needed.
                    // But user explicit request implies they want confirmation.
                    // Let's show alert only if 0, or if explicitly requested.
                    // Actually, user said "nothing happens".
                    // If I force the dropdown to open? No.
                    // I will alert "Fetched X models."
                    alert(`Fetched ${models.length} models.`);
                }
            } else {
                let msg = "Failed to fetch models.";
                try {
                    const err = await res.json();
                    if (err.Message) msg += " " + err.Message;
                    if (err.Error) msg += " " + err.Error;
                } catch (e) { }
                alert(msg);
            }
        } catch (e) {
            console.error(e);
            alert("Error fetching models.");
        } finally {
            setFetchingModels(false);
        }
    };

    // ... existing code ...

    <button
        onClick={fetchModels}
        disabled={fetchingModels || (!config.apiKey && !config.hasKey)}
        className={`px-3 py-2 rounded-lg transition-colors flex flex-shrink-0 items-center gap-1 ${(fetchingModels || (!config.apiKey && !config.hasKey))
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        title="Fetch available models from API"
    >
        <RefreshCw size={18} className={fetchingModels ? "animate-spin" : ""} />
    </button>

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai/config');
            if (res.ok) {
                const data = await res.json();
                setConfig(prev => ({
                    ...prev,
                    provider: data.provider || 'openai',
                    baseUrl: data.baseUrl || '',
                    model: data.model || '',
                    hasKey: data.hasKey,
                    apiKey: '' // specific security: don't load the key back
                }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/ai/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                onClose();
            } else {
                alert('Failed to save settings');
            }
        } catch (e) {
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Cpu size={20} className="text-blue-500" />
                        AI Configuration
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="text-center py-8">Loading settings...</div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                                <select
                                    value={config.provider}
                                    onChange={e => {
                                        const p = e.target.value;
                                        let baseUrl = config.baseUrl;
                                        let model = config.model;

                                        // Presets
                                        if (p === 'openai') { baseUrl = 'https://api.openai.com/v1'; model = 'gpt-4o'; }
                                        else if (p === 'anthropic') { baseUrl = 'https://api.anthropic.com'; model = 'claude-3-opus-20240229'; }
                                        else if (p === 'deepseek') { baseUrl = 'https://api.deepseek.com'; model = 'deepseek-chat'; }
                                        else if (p === 'qwen') { baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'; model = 'qwen-plus'; }
                                        else if (p === 'gemini') { baseUrl = 'https://generativelanguage.googleapis.com'; model = 'gemini-1.5-flash'; }
                                        else if (p === 'grok') { baseUrl = 'https://api.x.ai/v1'; model = 'grok-beta'; }

                                        setConfig({ ...config, provider: p, baseUrl, model });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic (Claude)</option>
                                    <option value="deepseek">DeepSeek</option>
                                    <option value="qwen">Qwen (Alibaba)</option>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="grok">xAI (Grok)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={config.apiKey}
                                        onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                                        placeholder={config.hasKey ? "Key set (leave empty to keep)" : "Enter API Key"}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={config.baseUrl}
                                        onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <Globe size={16} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Override for proxies or specific endpoints.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model Name</label>
                                <div className="flex gap-2">
                                    {availableModels.length > 0 ? (
                                        <select
                                            value={config.model}
                                            onChange={e => setConfig({ ...config, model: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select a model...</option>
                                            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={config.model}
                                            onChange={e => setConfig({ ...config, model: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="e.g. gpt-4o"
                                        />
                                    )}

                                    <button
                                        onClick={fetchModels}
                                        disabled={fetchingModels || !config.apiKey}
                                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex flex-shrink-0 items-center gap-1"
                                        title="Fetch available models from API"
                                    >
                                        <RefreshCw size={18} className={fetchingModels ? "animate-spin" : ""} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
