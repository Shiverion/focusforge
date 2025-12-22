// Pushover API integration for phone notifications
// https://pushover.net/api

const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

export interface PushoverMessage {
    title: string;
    message: string;
    priority?: -2 | -1 | 0 | 1 | 2; // -2 lowest, 2 emergency
    sound?: string;
    url?: string;
    url_title?: string;
}

export async function sendPushoverNotification(
    userKey: string,
    appToken: string,
    notification: PushoverMessage
): Promise<boolean> {
    if (!userKey || !appToken) {
        console.warn('Pushover keys not configured');
        return false;
    }

    try {
        const response = await fetch(PUSHOVER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                token: appToken,
                user: userKey,
                title: notification.title,
                message: notification.message,
                priority: String(notification.priority ?? 0),
                sound: notification.sound ?? 'pushover',
                ...(notification.url && { url: notification.url }),
                ...(notification.url_title && { url_title: notification.url_title }),
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Pushover error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Pushover request failed:', error);
        return false;
    }
}

// Pre-defined notification templates
export const notifications = {
    focusComplete: (task: string): PushoverMessage => ({
        title: '🍅 Focus Session Complete!',
        message: `Great work on "${task}"! Time for a break.`,
        priority: 0,
        sound: 'magic',
    }),

    breakOver: (): PushoverMessage => ({
        title: '⏰ Break Over',
        message: 'Ready for another focus session?',
        priority: 0,
        sound: 'bike',
    }),

    distraction: (count: number): PushoverMessage => ({
        title: '📱 Distraction Alert',
        message: `You've been distracted ${count} times today. Stay focused!`,
        priority: 1,
        sound: 'falling',
    }),

    dailySummary: (focusTime: number, sessions: number): PushoverMessage => ({
        title: '📊 Daily Summary',
        message: `Today: ${Math.round(focusTime / 60)} min focus time, ${sessions} sessions completed.`,
        priority: -1,
        sound: 'none',
    }),
};
