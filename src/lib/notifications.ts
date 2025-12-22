// Desktop notification utilities using the Web Notifications API
// Works in browser for now, will integrate with Tauri notifications later

export interface DesktopNotification {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
}

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
    }

    if (Notification.permission === 'granted') {
        permissionGranted = true;
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        permissionGranted = permission === 'granted';
        return permissionGranted;
    }

    return false;
}

export function showDesktopNotification(notification: DesktopNotification): void {
    if (!permissionGranted) {
        requestNotificationPermission().then((granted) => {
            if (granted) {
                createNotification(notification);
            }
        });
        return;
    }

    createNotification(notification);
}

function createNotification(notification: DesktopNotification): void {
    const n = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon ?? '/favicon.ico',
        tag: notification.tag,
    });

    if (notification.onClick) {
        n.onclick = () => {
            window.focus();
            notification.onClick?.();
            n.close();
        };
    }

    // Auto-close after 5 seconds
    setTimeout(() => n.close(), 5000);
}

// Pre-defined desktop notifications
export const desktopNotifications = {
    focusComplete: (task: string) => ({
        title: '🍅 Focus Session Complete!',
        body: `Great work on "${task}"! Take a break.`,
        tag: 'focus-complete',
    }),

    breakOver: () => ({
        title: '⏰ Break Time Over',
        body: 'Ready to focus again?',
        tag: 'break-over',
    }),

    midSessionCheck: (remaining: number) => ({
        title: '💪 Halfway There!',
        body: `${remaining} minutes left. Keep going!`,
        tag: 'mid-session',
    }),

    distraction: () => ({
        title: '🎯 Stay Focused!',
        body: 'Get back to your task.',
        tag: 'distraction',
    }),
};
