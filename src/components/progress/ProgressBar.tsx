import React from 'react';
import { clsx } from 'clsx';

interface ProgressBarProps {
    progress: number; // 0 to 100
    className?: string;
    height?: string;
    color?: string;
    showLabel?: boolean;
    labelPosition?: 'right' | 'bottom' | 'inside';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    className,
    height = 'h-2',
    color = 'bg-blue-600',
    showLabel = false,
    labelPosition = 'right'
}) => {
    // Clamp progress between 0 and 100
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className={clsx("flex items-center gap-3", className)}>
            <div className={clsx("flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden", height)}>
                <div
                    className={clsx("h-full transition-all duration-500 ease-out rounded-full", color)}
                    style={{ width: `${clampedProgress}%` }}
                />
            </div>
            {showLabel && labelPosition === 'right' && (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3ch]">
                    {Math.round(clampedProgress)}%
                </span>
            )}
        </div>
    );
};
