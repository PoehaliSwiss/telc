import React, { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { slugify } from '../../utils/slugify';

interface CreateItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    label: string;
    confirmLabel?: string;
    onConfirm: (title: string, slug: string) => Promise<void>;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
    isOpen,
    onClose,
    title,
    label,
    confirmLabel = 'Create',
    onConfirm
}) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setSlug('');
            setIsSlugManuallyEdited(false);
            setError(null);
            setIsSubmitting(false);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (!isSlugManuallyEdited) {
            setSlug(slugify(newName));
        }
        if (error) setError(null);
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlug(e.target.value);
        setIsSlugManuallyEdited(true);
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && slug.trim()) {
            setIsSubmitting(true);
            setError(null);
            try {
                await onConfirm(name.trim(), slug.trim());
                onClose();
            } catch (err: any) {
                setError(err.message || "Failed to create item");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col max-w-sm w-full m-4">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {label}
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={handleNameChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                            placeholder="Enter title..."
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Filename (Slug)
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={handleSlugChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-gray-600 dark:text-gray-300 font-mono text-sm"
                            placeholder="auto-generated-slug"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            This will be used for the file path.
                        </p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || !slug.trim() || isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                                <Save size={18} />
                            )}
                            {confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
