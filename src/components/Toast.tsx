import React, { useEffect } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
    duration?: number;
}

const icons = {
    success: Check,
    error: X,
    info: Info,
    warning: AlertTriangle,
};

const colors = {
    success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
};

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose, duration = 3000 }) => {
    const Icon = icons[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm w-full pointer-events-auto',
                colors[type]
            )}
        >
            <div className={clsx("p-1 rounded-full shrink-0",
                type === 'success' ? 'bg-green-100 dark:bg-green-800' :
                    type === 'error' ? 'bg-red-100 dark:bg-red-800' :
                        type === 'info' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-yellow-100 dark:bg-yellow-800'
            )}>
                <Icon size={16} />
            </div>
            <p className="text-sm font-medium">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="ml-auto p-1 hover:bg-black/5 rounded-full transition-colors"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
};
