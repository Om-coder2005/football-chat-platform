/**
 * Format a UTC date string to local time (HH:MM).
 */
export const formatTime = (utcDate) => {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export const formatDateParam = (date) => {
    try {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    } catch (e) {
        return '';
    }
};

/**
 * Map a match status code to a short display label.
 */
export const getStatusLabel = (status) => {
    const map = {
        SCHEDULED: 'SCH',
        TIMED: 'SCH',
        IN_PLAY: 'LIVE',
        PAUSED: 'HT',
        FINISHED: 'FT',
        SUSPENDED: 'SUSP',
        POSTPONED: 'PPD',
        CANCELLED: 'CANC',
        AWARDED: 'AWD',
    };
    return map[status] || status || '';
};

/**
 * Map a match status code to CSS class names for styling.
 */
export const getStatusColor = (status) => {
    if (status === 'IN_PLAY' || status === 'PAUSED') return 'bg-red-500 text-white animate-pulse';
    if (status === 'FINISHED') return 'bg-black text-white';
    return 'bg-gray-300 text-black';
};
