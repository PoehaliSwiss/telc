import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void; // Optional for alert
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isProcessing?: boolean;
    variant?: 'confirm' | 'alert'; // New prop
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isProcessing = false,
    variant = 'confirm',
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={clsx(
                            "p-2 rounded-lg",
                            variant === 'alert'
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        )}>
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex justify-end gap-3">
                        {variant === 'confirm' && (
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            onClick={variant === 'alert' ? onClose : onConfirm}
                            disabled={isProcessing}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50",
                                variant === 'alert'
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-purple-600 text-white hover:bg-purple-700"
                            )}
                        >
                            {isProcessing && <Loader2 size={16} className="animate-spin" />}
                            {variant === 'alert' ? 'OK' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import clsx from 'clsx';
