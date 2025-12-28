import React from 'react';
import { useProgress } from '../../context/ProgressContext';
import { ProgressBar } from './ProgressBar';

interface LessonProgressProps {
    lessonPath: string;
    totalExercises: number;
    className?: string;
    showLabel?: boolean;
}

export const LessonProgress: React.FC<LessonProgressProps> = ({
    lessonPath,
    totalExercises,
    className,
    showLabel = true
}) => {
    const { getLessonProgressData } = useProgress();
    const progressData = getLessonProgressData(lessonPath, totalExercises);

    if (totalExercises === 0) return null;

    return (
        <div className={className}>
            <ProgressBar
                progress={progressData.percentage}
                showLabel={showLabel}
                height="h-1.5"
            />
        </div>
    );
};
