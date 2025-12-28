import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Settings as SettingsIcon, ChevronDown, Search, Check, Plus, Trash2, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { useSettings, type LanguageSettings } from '../../context/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface VoiceSelectorProps {
    label?: string;
    value: string;
    onChange: (val: string) => void;
    voices: SpeechSynthesisVoice[];
    disabled?: boolean;
    previewText: string;
    onPreviewTextChange: (text: string) => void;
    onPlayPreview: () => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
    label,
    value,
    onChange,
    voices,
    disabled,
    previewText,
    onPreviewTextChange,
    onPlayPreview
}) => (
    <div className="space-y-2">
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
        <div className="flex gap-2">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={disabled}
            >
                <option value="">Default Voice</option>
                {voices.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                ))}
            </select>
        </div>

        {/* Inline Preview */}
        <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
                type="text"
                value={previewText}
                onChange={(e) => onPreviewTextChange(e.target.value)}
                placeholder="Preview text..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
                onClick={onPlayPreview}
                disabled={!value || !previewText.trim()}
                className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Play preview"
            >
                <Play size={16} />
            </button>
        </div>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { languageSettings, updateLanguageSettings } = useSettings();
    const [localSettings, setLocalSettings] = useState<LanguageSettings>(languageSettings);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [availableLangs, setAvailableLangs] = useState<string[]>([]);

    // Language dropdown states
    const [isLearningLangOpen, setIsLearningLangOpen] = useState(false);
    const [isTransLangOpen, setIsTransLangOpen] = useState(false);
    const [learningLangSearch, setLearningLangSearch] = useState('');
    const [transLangSearch, setTransLangSearch] = useState('');

    const learningLangRef = useRef<HTMLDivElement>(null);
    const transLangRef = useRef<HTMLDivElement>(null);


    // Preview text state map
    const [previewTexts, setPreviewTexts] = useState<{ [key: string]: string }>({
        learning: 'Hello, how are you?',
        translation: 'Hello, how are you?',
    });

    const getPreviewText = (key: string) => previewTexts[key] || '';

    const updatePreviewText = (key: string, text: string) => {
        setPreviewTexts(prev => ({ ...prev, [key]: text }));
    };

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);

            // Start with a static list of common languages to ensure the UI is usable
            // even if speech synthesis is not ready or supported
            const commonLangs = [
                'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-AU', 'en-GB', 'en-US',
                'es-ES', 'es-MX', 'fi-FI', 'fr-CA', 'fr-FR', 'he-IL', 'hi-IN', 'hu-HU',
                'id-ID', 'it-IT', 'ja-JP', 'ko-KR', 'nl-NL', 'nb-NO', 'pl-PL', 'pt-BR',
                'pt-PT', 'ro-RO', 'ru-RU', 'sk-SK', 'sv-SE', 'th-TH', 'tr-TR', 'uk-UA',
                'vi-VN', 'zh-CN', 'zh-TW'
            ];

            const synthLangs = voices.map(v => v.lang);
            const allLangs = Array.from(new Set([...commonLangs, ...synthLangs])).sort();

            setAvailableLangs(allLangs);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    useEffect(() => {
        setLocalSettings(languageSettings);
    }, [languageSettings, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (learningLangRef.current && !learningLangRef.current.contains(event.target as Node)) {
                setIsLearningLangOpen(false);
            }
            if (transLangRef.current && !transLangRef.current.contains(event.target as Node)) {
                setIsTransLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSave = () => {
        updateLanguageSettings(localSettings);
        onClose();
    };

    const priorityLangs = ['de-DE', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'it-IT', 'ru-RU', 'zh-CN', 'ja-JP', 'pt-BR'];

    const getFilteredLangs = (search: string) => {
        const searchLower = search.toLowerCase();
        const top = priorityLangs.filter(l => availableLangs.includes(l) && l.toLowerCase().includes(searchLower));
        const other = availableLangs.filter(l => !top.includes(l) && l.toLowerCase().includes(searchLower));
        return { top, other };
    };

    const normalizeLang = (lang: string) => lang.replace('_', '-');

    const learningVoices = availableVoices.filter(v => {
        const normalizedVoiceLang = normalizeLang(v.lang);
        const normalizedLang = normalizeLang(localSettings.learningLang);
        return normalizedVoiceLang === normalizedLang || normalizedVoiceLang.startsWith(normalizedLang);
    });

    const translationVoices = availableVoices.filter(v => {
        const normalizedVoiceLang = normalizeLang(v.lang);
        const normalizedLang = normalizeLang(localSettings.translationLang);
        return normalizedVoiceLang === normalizedLang || normalizedVoiceLang.startsWith(normalizedLang);
    });

    const addAdditionalVoice = () => {
        setLocalSettings(prev => ({
            ...prev,
            learningVoices: {
                ...prev.learningVoices,
                additional: [...(prev.learningVoices.additional || []), '']
            }
        }));
    };

    const removeAdditionalVoice = (index: number) => {
        setLocalSettings(prev => ({
            ...prev,
            learningVoices: {
                ...prev.learningVoices,
                additional: prev.learningVoices.additional?.filter((_, i) => i !== index)
            }
        }));
    };

    const updateAdditionalVoice = (index: number, value: string) => {
        setLocalSettings(prev => ({
            ...prev,
            learningVoices: {
                ...prev.learningVoices,
                additional: prev.learningVoices.additional?.map((v, i) => i === index ? value : v)
            }
        }));
    };

    const playVoicePreview = (voiceName: string, lang: string, textKey: string) => {
        const text = getPreviewText(textKey);
        if (!text.trim()) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;

        if (voiceName) {
            const voice = availableVoices.find(v => v.name === voiceName);
            if (voice) utterance.voice = voice;
        }

        window.speechSynthesis.speak(utterance);
    };



    const renderLanguageDropdown = (
        label: string,
        value: string,
        isOpen: boolean,
        setIsOpen: (open: boolean) => void,
        search: string,
        setSearch: (search: string) => void,
        onChange: (lang: string) => void,
        dropdownRef: React.RefObject<HTMLDivElement | null>
    ) => {
        const { top, other } = getFilteredLangs(search);

        return (
            <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <div
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer flex items-center justify-between"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) setSearch('');
                    }}
                >
                    <span className={!value ? "text-gray-400" : ""}>{value || "Select language..."}</span>
                    <ChevronDown size={16} className="text-gray-500" />
                </div>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Search..."
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {top.length > 0 && (
                                <>
                                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-50 dark:bg-gray-900/50 uppercase tracking-wider">
                                        Popular
                                    </div>
                                    {top.map(l => (
                                        <div
                                            key={`top-${l}`}
                                            className={clsx("px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between", value === l && "bg-blue-50 dark:bg-blue-900/20 text-blue-600")}
                                            onClick={() => {
                                                onChange(l);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <span>{l}</span>
                                            {value === l && <Check size={14} />}
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                </>
                            )}

                            {other.map(l => (
                                <div
                                    key={l}
                                    className={clsx("px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between", value === l && "bg-blue-50 dark:bg-blue-900/20 text-blue-600")}
                                    onClick={() => {
                                        onChange(l);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span>{l}</span>
                                    {value === l && <Check size={14} />}
                                </div>
                            ))}

                            {top.length === 0 && other.length === 0 && (
                                <div className="px-3 py-4 text-center text-sm text-gray-500">
                                    No languages found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col max-w-2xl w-full max-h-[90vh] m-4">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <SettingsIcon className="text-blue-600" size={20} />
                        Global Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Learning Language Section */}
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Learning Language
                        </h3>

                        {renderLanguageDropdown(
                            "Language",
                            localSettings.learningLang,
                            isLearningLangOpen,
                            setIsLearningLangOpen,
                            learningLangSearch,
                            setLearningLangSearch,
                            (lang) => setLocalSettings(prev => ({ ...prev, learningLang: lang })),
                            learningLangRef
                        )}

                        <div>
                            <VoiceSelector
                                label="Primary Voice"
                                value={localSettings.learningVoices.primary}
                                onChange={(val) => setLocalSettings(prev => ({
                                    ...prev,
                                    learningVoices: { ...prev.learningVoices, primary: val }
                                }))}
                                voices={learningVoices}
                                disabled={!localSettings.learningLang}
                                previewText={getPreviewText('learning')}
                                onPreviewTextChange={(text) => updatePreviewText('learning', text)}
                                onPlayPreview={() => playVoicePreview(localSettings.learningVoices.primary, localSettings.learningLang, 'learning')}
                            />
                        </div>

                        <div>
                            <VoiceSelector
                                label="Secondary Voice (Optional)"
                                value={localSettings.learningVoices.secondary || ''}
                                onChange={(val) => setLocalSettings(prev => ({
                                    ...prev,
                                    learningVoices: { ...prev.learningVoices, secondary: val }
                                }))}
                                voices={learningVoices}
                                disabled={!localSettings.learningLang}
                                previewText={getPreviewText('learning')}
                                onPreviewTextChange={(text) => updatePreviewText('learning', text)}
                                onPlayPreview={() => playVoicePreview(localSettings.learningVoices.secondary || '', localSettings.learningLang, 'learning')}
                            />
                        </div>

                        {/* Additional Voices */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Additional Voices (Optional)</label>
                                <button
                                    onClick={addAdditionalVoice}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    disabled={!localSettings.learningLang}
                                >
                                    <Plus size={16} /> Add Voice
                                </button>
                            </div>
                            {localSettings.learningVoices.additional?.map((voice, index) => (
                                <div key={index} className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 relative group">
                                    <button
                                        onClick={() => removeAdditionalVoice(index)}
                                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remove voice"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="pr-8">
                                        <VoiceSelector
                                            value={voice}
                                            onChange={(val) => updateAdditionalVoice(index, val)}
                                            voices={learningVoices}
                                            previewText={getPreviewText('learning')}
                                            onPreviewTextChange={(text) => updatePreviewText('learning', text)}
                                            onPlayPreview={() => playVoicePreview(voice, localSettings.learningLang, 'learning')}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Old Voice Preview removed */}
                    </div>

                    {/* Translation Language Section */}
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Translation Language
                        </h3>

                        {renderLanguageDropdown(
                            "Language",
                            localSettings.translationLang,
                            isTransLangOpen,
                            setIsTransLangOpen,
                            transLangSearch,
                            setTransLangSearch,
                            (lang) => setLocalSettings(prev => ({ ...prev, translationLang: lang })),
                            transLangRef
                        )}

                        <div>
                            <VoiceSelector
                                label="Primary Voice"
                                value={localSettings.translationVoice}
                                onChange={(val) => setLocalSettings(prev => ({ ...prev, translationVoice: val }))}
                                voices={translationVoices}
                                disabled={!localSettings.translationLang}
                                previewText={getPreviewText('translation')}
                                onPreviewTextChange={(text) => updatePreviewText('translation', text)}
                                onPlayPreview={() => playVoicePreview(localSettings.translationVoice, localSettings.translationLang, 'translation')}
                            />
                        </div>

                        {/* Old Translation Voice Preview removed */}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Save size={18} />
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
