// Sound notification utilities using Web Audio API
// No external sound files needed - generates tones programmatically

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

// Play a pleasant chime sound
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    try {
        const ctx = getAudioContext();

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

// Focus session completed - triumphant chime
export function playFocusCompleteSound() {
    // Initialize audio context (required for Web Audio API)
    getAudioContext();

    // Play a chord progression
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)

    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.4, 'sine'), i * 100);
    });

    // Final high note
    setTimeout(() => playTone(1046.50, 0.6, 'sine'), 350); // C6
}

// Break completed - gentle reminder
export function playBreakOverSound() {
    // Initialize audio context
    getAudioContext();

    // Two gentle tones
    playTone(440, 0.3, 'sine'); // A4
    setTimeout(() => playTone(523.25, 0.4, 'sine'), 200); // C5
}

// Generic notification sound
export function playNotificationSound() {
    playTone(880, 0.2, 'sine'); // A5
}

// Test sound (for settings preview)
export function playTestSound() {
    playFocusCompleteSound();
}
