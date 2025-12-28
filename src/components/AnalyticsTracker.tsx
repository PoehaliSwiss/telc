import { useEffect, useState } from 'react';
import { initializeAndTrack, logPageView } from '../utils/analytics';
import { useLocation } from 'react-router-dom';

const ENV_MEASUREMENT_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
const IS_READER_MODE = import.meta.env.VITE_APP_MODE === 'reader';

interface AnalyticsTrackerProps {
    courseGaId?: string;
}

export const AnalyticsTracker = ({ courseGaId }: AnalyticsTrackerProps) => {
    const location = useLocation();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // Determine which ID to use
        // If Reader Mode: ONLY use the courseGaId
        // If Designer/Server: PRIORITIZE env var, fallback to courseGaId
        const targetId = IS_READER_MODE ? courseGaId : (ENV_MEASUREMENT_ID || courseGaId);

        if (targetId && !initialized) {
            if (!window.ga4Initialized) {
                initializeAndTrack(targetId);
                window.ga4Initialized = true;
                setInitialized(true);
                console.log(`[Analytics] Initialized with ID: ${targetId} (Mode: ${IS_READER_MODE ? 'Reader' : 'Designer'})`);
            } else {
                setInitialized(true);
            }
        }
    }, [courseGaId]);

    useEffect(() => {
        if (initialized) {
            logPageView(location.pathname + location.search);
        }
    }, [initialized, location]);

    return null;
};

declare global {
    interface Window {
        ga4Initialized?: boolean;
    }
}
