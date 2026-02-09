import { BADGES, Badge, useBadgeStore } from '../stores/badgeStore';

interface BadgeCardProps {
    badge: Badge;
    earned: boolean;
    earnedAt?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function BadgeCard({ badge, earned, earnedAt, size = 'md' }: BadgeCardProps) {
    const sizeClasses = {
        sm: 'w-10 h-10 text-lg',
        md: 'w-16 h-16 text-3xl',
        lg: 'w-24 h-24 text-4xl'
    };

    return (
        <div className={`relative group ${earned ? '' : 'opacity-40 grayscale'}`}>
            <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center 
                ${earned
                    ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 border-2 border-amber-300 dark:border-amber-600 shadow-lg shadow-amber-500/20'
                    : 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700'
                }`}
            >
                {earned ? (
                    <span>{badge.emoji}</span>
                ) : (
                    <span className="text-stone-300 dark:text-stone-600 text-2xl">🔒</span>
                )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                <div className="font-bold">{badge.name}</div>
                <div className="text-gray-300">{badge.description}</div>
                {earned && earnedAt && (
                    <div className="text-amber-400 mt-1">
                        ✓ Earned {new Date(earnedAt).toLocaleDateString()}
                    </div>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-700"></div>
            </div>
        </div>
    );
}

// Small showcase for main screen (shows earned badges only)
export function BadgeShowcase() {
    const earnedBadges = useBadgeStore((s) => s.earnedBadges);
    const getEarnedBadges = useBadgeStore((s) => s.getEarnedBadges);
    const badges = getEarnedBadges();

    if (badges.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {badges.slice(0, 5).map((badge) => {
                const earned = earnedBadges.find(e => e.badgeId === badge.id);
                return (
                    <BadgeCard
                        key={badge.id}
                        badge={badge}
                        earned={true}
                        earnedAt={earned?.earnedAt}
                        size="sm"
                    />
                );
            })}
            {badges.length > 5 && (
                <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 flex items-center justify-center text-xs font-bold text-stone-500">
                    +{badges.length - 5}
                </div>
            )}
        </div>
    );
}

// Full badges grid for Stats page
export function BadgesGrid() {
    const earnedBadges = useBadgeStore((s) => s.earnedBadges);

    const categories = [
        { key: 'streak', label: '🔥 Streak Badges' },
        { key: 'focus', label: '🎯 Focus Badges' },
        { key: 'milestone', label: '🏆 Milestone Badges' }
    ];

    return (
        <div className="space-y-6">
            {categories.map(({ key, label }) => {
                const categoryBadges = BADGES.filter(b => b.category === key);
                return (
                    <div key={key}>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-4 pl-1">{label}</h3>
                        <div className="flex flex-wrap gap-3">
                            {categoryBadges.map((badge) => {
                                const earned = earnedBadges.find(e => e.badgeId === badge.id);
                                return (
                                    <BadgeCard
                                        key={badge.id}
                                        badge={badge}
                                        earned={!!earned}
                                        earnedAt={earned?.earnedAt}
                                        size="lg"
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// New badge notification popup
export function NewBadgePopup({ badgeId, onClose }: { badgeId: string; onClose: () => void }) {
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-2xl animate-in zoom-in duration-300 max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="text-6xl mb-4 animate-bounce">{badge.emoji}</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Badge Unlocked!
                </h2>
                <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    {badge.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {badge.description}
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all"
                >
                    Awesome!
                </button>
            </div>
        </div>
    );
}
