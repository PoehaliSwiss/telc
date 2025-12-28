export const initGA = (measurementId: string) => {
    if (typeof window === 'undefined') return;

    // Prevent multiple injections
    const existingScript = document.getElementById('ga-init-script');
    if (existingScript) return;

    const script = document.createElement('script');
    script.id = 'ga-init-script';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];

    // Define gtag function
    function gtag(...args: any[]) {
        window.dataLayer.push(args);
    }

    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {
        send_page_view: false // We will handle page views manually for SPA
    });
};

export const sendPageView = (path: string, measurementId?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
        // Determine config options
        const options: Record<string, any> = {
            page_path: path
        };

        // If specific ID is needed (for multiple trackers), usually just updating config is enough
        if (measurementId) {
            window.gtag('config', measurementId, options);
        } else {
            // Fallback or generic update (GA4 usually requires ID for config command)
            // But if we only have one, we can assume it was the initialized one.
            // However, looking at standard docs: gtag('config', 'MEASUREMENT_ID', {page_path: '/home'});
            // We might need to store the ID?
            // Let's just assume we update 'default' or pass it if we have it.
        }
    }
};

// We need a way to store the ID if we want to use it for page updates reliably
let currentMeasurementId: string | null = null;

export const initializeAndTrack = (measurementId: string) => {
    currentMeasurementId = measurementId;
    initGA(measurementId);
}

export const logPageView = (path: string) => {
    if (window.gtag && currentMeasurementId) {
        window.gtag('config', currentMeasurementId, {
            page_path: path
        });
    }
}

declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}
