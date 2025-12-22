import { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { useTimerStore } from '../stores/timerStore';
import { useDistractionStore } from '../stores/distractionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useWebcamStore } from '../stores/webcamStore';
import { sendPushoverNotification, notifications as pushoverNotifications } from '../lib/pushover';

const ABSENCE_THRESHOLD_MS = 10000; // 10 seconds = distraction
const LOOKING_AWAY_THRESHOLD_MS = 10000; // 10 seconds looking away = distraction
const REPEAT_LOG_INTERVAL_MS = 30000; // Log again every 30 seconds

// Iris landmark indices for MediaPipe Face Mesh
// Left eye: 468-477, Right eye: 473-477 (iris centers at 468 and 473)
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_LEFT = 33;    // Left corner of left eye
const LEFT_EYE_RIGHT = 133;  // Right corner of left eye
const RIGHT_EYE_LEFT = 362;  // Left corner of right eye  
const RIGHT_EYE_RIGHT = 263; // Right corner of right eye
const NOSE_TIP = 1;

export function WebcamDetector() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lastFocusedTimeRef = useRef<number>(Date.now());
    const lastDistractionLogTimeRef = useRef<number>(0);
    const distractionCountRef = useRef<number>(0);
    const animationIdRef = useRef<number | null>(null);

    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focusStatus, setFocusStatus] = useState<'focused' | 'looking_away' | 'absent'>('focused');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [detectorReady, setDetectorReady] = useState(false);
    const [gazeDirection, setGazeDirection] = useState<string>('center');

    const timerState = useTimerStore((s) => s.state);
    const currentTaskId = useTimerStore((s) => s.currentTaskId);
    const logDistraction = useDistractionStore((s) => s.logDistraction);
    const distractions = useDistractionStore((s) => s.distractions);

    // Webcam store - sync state to shared store
    const { setReady, setFaceDetected, setEnabled } = useWebcamStore();

    // Get Pushover settings
    const { pushoverUserKey, pushoverAppToken, enablePushover } = useSettingsStore();

    // Sync enabled state to store
    useEffect(() => {
        setEnabled(isEnabled);
    }, [isEnabled, setEnabled]);

    // Sync detector ready state to store
    useEffect(() => {
        setReady(detectorReady && isEnabled);
    }, [detectorReady, isEnabled, setReady]);

    // Sync face detection state to store
    useEffect(() => {
        setFaceDetected(focusStatus === 'focused');
    }, [focusStatus, setFaceDetected]);

    // Helper to send push notification
    const sendDistractionAlert = useCallback((count: number) => {
        console.log('📲 Push check:', {
            enablePushover,
            hasUserKey: !!pushoverUserKey,
            hasAppToken: !!pushoverAppToken,
            count
        });

        if (!enablePushover) {
            console.log('📲 Push disabled in settings');
            return;
        }
        if (!pushoverUserKey || !pushoverAppToken) {
            console.log('📲 Push keys not configured');
            return;
        }

        console.log('📲 Sending push notification...');
        sendPushoverNotification(
            pushoverUserKey,
            pushoverAppToken,
            pushoverNotifications.distraction(count)
        ).then(success => {
            console.log('📲 Push result:', success ? 'SUCCESS' : 'FAILED');
        }).catch(err => {
            console.error('📲 Push error:', err);
        });
    }, [pushoverUserKey, pushoverAppToken, enablePushover]);

    // Analyze gaze direction from iris landmarks AND head position
    const analyzeGaze = (keypoints: faceLandmarksDetection.Keypoint[], videoHeight: number) => {
        if (keypoints.length < 478) {
            return { isFocused: true, gazeDirection: 'unknown', reason: 'no iris data' };
        }

        // Get key landmarks
        const leftIris = keypoints[LEFT_IRIS_CENTER];
        const rightIris = keypoints[RIGHT_IRIS_CENTER];
        const leftEyeLeft = keypoints[LEFT_EYE_LEFT];
        const leftEyeRight = keypoints[LEFT_EYE_RIGHT];
        const rightEyeLeft = keypoints[RIGHT_EYE_LEFT];
        const rightEyeRight = keypoints[RIGHT_EYE_RIGHT];
        const noseTip = keypoints[NOSE_TIP];
        const forehead = keypoints[10]; // Top of forehead
        const chin = keypoints[152]; // Bottom of chin

        // === HEAD POSITION DETECTION ===
        // Check if head is tilted down by comparing forehead-to-nose vs nose-to-chin ratio
        const foreheadToNose = noseTip.y - forehead.y;
        const noseToChin = chin.y - noseTip.y;
        const headTiltRatio = foreheadToNose / noseToChin;
        // When looking down at phone, head tilts down so forehead appears CLOSER relative to chin
        // Your logs show: Normal ~1.5, Looking down at phone ~2.2 to 3.2
        const isHeadTiltedDown = headTiltRatio > 2.0; // High ratio = looking down

        // Also check if nose is in bottom half of frame (head pointing down)
        const noseInLowerHalf = noseTip.y > videoHeight * 0.6;

        // === EYE GAZE DETECTION ===
        const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
        const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
        const leftEyeCenter = (leftEyeLeft.x + leftEyeRight.x) / 2;
        const rightEyeCenter = (rightEyeLeft.x + rightEyeRight.x) / 2;

        const leftIrisOffset = (leftIris.x - leftEyeCenter) / (leftEyeWidth / 2);
        const rightIrisOffset = (rightIris.x - rightEyeCenter) / (rightEyeWidth / 2);
        const avgHorizontalOffset = (leftIrisOffset + rightIrisOffset) / 2;

        // Vertical eye position
        const leftEyeTop = Math.min(keypoints[159].y, keypoints[145].y);
        const leftEyeBottom = Math.max(keypoints[159].y, keypoints[145].y);
        const leftEyeHeight = leftEyeBottom - leftEyeTop;
        const leftEyeVertCenter = (leftEyeTop + leftEyeBottom) / 2;
        const leftIrisVertOffset = (leftIris.y - leftEyeVertCenter) / (leftEyeHeight / 2);

        const rightEyeTop = Math.min(keypoints[386].y, keypoints[374].y);
        const rightEyeBottom = Math.max(keypoints[386].y, keypoints[374].y);
        const rightEyeHeight = rightEyeBottom - rightEyeTop;
        const rightEyeVertCenter = (rightEyeTop + rightEyeBottom) / 2;
        const rightIrisVertOffset = (rightIris.y - rightEyeVertCenter) / (rightEyeHeight / 2);

        const avgVerticalOffset = (leftIrisVertOffset + rightIrisVertOffset) / 2;

        // === DETERMINE FOCUS STATUS ===
        let gazeDirection = 'center';
        let reason = 'focused';
        let isFocused = true;

        // Priority 1: Head tilted down (checking phone with head)
        if (isHeadTiltedDown || noseInLowerHalf) {
            gazeDirection = 'down';
            reason = 'head looking down';
            isFocused = false;
        }
        // Priority 2: Eyes looking away from screen
        // Your baseline is around -0.10 (slightly above center), so:
        // - Looking DOWN at phone = positive values (> 0.15)
        // - Extreme up/away = very negative (< -0.25)
        else if (avgVerticalOffset > 0.15) {
            gazeDirection = 'down';
            reason = 'eyes looking down at phone';
            isFocused = false;
        }
        else if (avgVerticalOffset < -0.25) {
            gazeDirection = 'up';
            reason = 'eyes looking away';
            isFocused = false;
        }
        // Priority 3: Looking left/right
        else if (Math.abs(avgHorizontalOffset) > 0.25) {
            gazeDirection = avgHorizontalOffset < 0 ? 'left' : 'right';
            reason = `looking ${avgHorizontalOffset < 0 ? 'left' : 'right'}`;
            isFocused = false;
        }

        // Debug logging
        console.log(`👁️ Head tilt: ${headTiltRatio.toFixed(2)}, Nose Y: ${(noseTip.y / videoHeight * 100).toFixed(0)}%, Eyes V: ${avgVerticalOffset.toFixed(2)}, H: ${avgHorizontalOffset.toFixed(2)} → ${reason}`);

        return {
            isFocused,
            gazeDirection,
            reason,
            horizontalOffset: avgHorizontalOffset,
            verticalOffset: avgVerticalOffset,
            headTiltRatio,
        };
    };

    // Start camera
    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setCameraError(null);
        setStatus('Requesting camera...');
        setDetectorReady(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });

            streamRef.current = stream;
            setStatus('Camera acquired...');

            const video = videoRef.current;
            if (!video) throw new Error('Video element not found');

            video.srcObject = stream;
            video.load();

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, 5000);
                video.oncanplay = () => { clearTimeout(timeout); resolve(); };
            });

            await video.play();
            setStatus(`Video: ${video.videoWidth}x${video.videoHeight}`);
            setIsEnabled(true);

            // Initialize TensorFlow with Face Mesh (includes iris tracking)
            setTimeout(async () => {
                try {
                    await tf.setBackend('webgl');
                    await tf.ready();
                    setStatus('Loading face mesh with iris...');

                    // Use MediaPipe Face Mesh for detailed landmarks including iris
                    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
                    detectorRef.current = await faceLandmarksDetection.createDetector(model, {
                        runtime: 'tfjs',
                        refineLandmarks: true, // Enable iris detection (478 landmarks)
                        maxFaces: 1,
                    });

                    setDetectorReady(true);
                    setStatus('Ready! Tracking eyes & gaze...');
                    lastFocusedTimeRef.current = Date.now();
                } catch (error) {
                    console.error('TensorFlow error:', error);
                    setStatus('Error loading model');
                }
            }, 100);

        } catch (error) {
            console.error('Camera error:', error);
            setCameraError(error instanceof Error ? error.message : 'Camera access failed');
            setIsEnabled(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        detectorRef.current = null;
        setIsEnabled(false);
        setFocusStatus('focused');
        setDetectorReady(false);
        setStatus('');
    }, []);

    // Detection loop with gaze analysis
    useEffect(() => {
        if (!isEnabled || !detectorReady || !detectorRef.current || !videoRef.current) return;
        if (timerState !== 'focus') {
            setStatus('⏸ Start focus session to enable');
            return;
        }

        let isRunning = true;

        const detectFace = async () => {
            if (!isRunning || !detectorRef.current || !videoRef.current) return;

            const video = videoRef.current;
            if (video.readyState < 2 || video.videoWidth === 0) {
                animationIdRef.current = requestAnimationFrame(detectFace);
                return;
            }

            try {
                const faces = await detectorRef.current.estimateFaces(video);
                const now = Date.now();

                if (faces.length === 0) {
                    setFocusStatus('absent');
                    const absenceTime = now - lastFocusedTimeRef.current;
                    const timeSinceLastLog = now - lastDistractionLogTimeRef.current;
                    const isFirstLog = lastDistractionLogTimeRef.current === 0;

                    // Only log if timer is in focus state (not paused or idle)
                    const shouldLog = timerState === 'focus' &&
                        absenceTime >= ABSENCE_THRESHOLD_MS &&
                        (isFirstLog || timeSinceLastLog >= REPEAT_LOG_INTERVAL_MS);

                    setStatus(`👤 Face not visible (${Math.floor(absenceTime / 1000)}s)`);
                    setGazeDirection('absent');

                    if (shouldLog) {
                        distractionCountRef.current++;
                        const totalToday = distractions.filter(d => {
                            const today = new Date().toDateString();
                            return new Date(d.timestamp).toDateString() === today;
                        }).length + 1;

                        logDistraction('phone', currentTaskId || undefined);
                        lastDistractionLogTimeRef.current = now;
                        setStatus(`📸 Distraction #${distractionCountRef.current}: Face absent`);

                        // Send push notification
                        sendDistractionAlert(totalToday);
                    }
                } else {
                    const face = faces[0];
                    const gazeAnalysis = analyzeGaze(face.keypoints, video.videoHeight);
                    setGazeDirection(gazeAnalysis.gazeDirection);

                    if (gazeAnalysis.isFocused) {
                        setFocusStatus('focused');
                        lastFocusedTimeRef.current = now;
                        setStatus(`✅ Focused (gaze: ${gazeAnalysis.gazeDirection})`);
                    } else {
                        setFocusStatus('looking_away');
                        const awayTime = now - lastFocusedTimeRef.current;
                        const timeSinceLastLog = now - lastDistractionLogTimeRef.current;
                        const isFirstLog = lastDistractionLogTimeRef.current === 0;

                        setStatus(`⚠️ ${gazeAnalysis.reason} (${Math.floor(awayTime / 1000)}s)`);

                        // Only log if timer is in focus state (not paused or idle)
                        const shouldLog = timerState === 'focus' &&
                            awayTime >= LOOKING_AWAY_THRESHOLD_MS &&
                            (isFirstLog || timeSinceLastLog >= REPEAT_LOG_INTERVAL_MS);

                        if (shouldLog) {
                            distractionCountRef.current++;
                            const totalToday = distractions.filter(d => {
                                const today = new Date().toDateString();
                                return new Date(d.timestamp).toDateString() === today;
                            }).length + 1;

                            logDistraction('phone', currentTaskId || undefined);
                            lastDistractionLogTimeRef.current = now;
                            setStatus(`📸 Distraction #${distractionCountRef.current}: ${gazeAnalysis.reason}`);

                            // Send push notification
                            sendDistractionAlert(totalToday);
                        }
                    }

                    // Draw visualization
                    if (canvasRef.current && face.keypoints.length >= 478) {
                        const ctx = canvasRef.current.getContext('2d');
                        if (ctx) {
                            const scaleX = 160 / video.videoWidth;
                            const scaleY = 120 / video.videoHeight;
                            ctx.clearRect(0, 0, 160, 120);

                            // Draw iris points (left: 468-472, right: 473-477)
                            ctx.fillStyle = gazeAnalysis.isFocused ? '#22c55e' : '#ef4444';
                            for (let i = 468; i < 478; i++) {
                                const kp = face.keypoints[i];
                                ctx.beginPath();
                                ctx.arc(kp.x * scaleX, kp.y * scaleY, 2, 0, 2 * Math.PI);
                                ctx.fill();
                            }

                            // Draw eye outline
                            ctx.strokeStyle = '#666';
                            ctx.lineWidth = 1;
                            // Draw simplified eye shapes
                            [LEFT_EYE_LEFT, LEFT_EYE_RIGHT, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT].forEach(idx => {
                                const kp = face.keypoints[idx];
                                ctx.beginPath();
                                ctx.arc(kp.x * scaleX, kp.y * scaleY, 3, 0, 2 * Math.PI);
                                ctx.stroke();
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Detection error:', error);
            }

            if (isRunning) {
                setTimeout(() => {
                    if (isRunning) {
                        animationIdRef.current = requestAnimationFrame(detectFace);
                    }
                }, 150);
            }
        };

        detectFace();

        return () => {
            isRunning = false;
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        };
    }, [isEnabled, detectorReady, timerState, currentTaskId, logDistraction]);

    // Auto-PiP on window blur/focus (more reliable for desktop apps)
    useEffect(() => {
        const handleBlur = async () => {
            const video = videoRef.current;
            if (!video || !isEnabled) return;

            try {
                // Enter PiP when window loses focus
                if (video.readyState >= 1 && !document.pictureInPictureElement) {
                    console.log('🖼️ Entering PiP mode...');
                    await video.requestPictureInPicture();
                }
            } catch (err) {
                console.log('PiP Error (blur):', err);
            }
        };

        const handleFocus = async () => {
            try {
                // Exit PiP when window gains focus
                if (document.pictureInPictureElement) {
                    console.log('🖼️ Exiting PiP mode...');
                    await document.exitPictureInPicture();
                }
            } catch (err) {
                console.log('PiP Error (focus):', err);
            }
        };

        const handleVisibilityChange = async () => {
            const video = videoRef.current;
            if (!video || !isEnabled) return;

            try {
                if (document.visibilityState === 'hidden') {
                    if (video.readyState >= 1 && !document.pictureInPictureElement) {
                        console.log('🖼️ Entering PiP mode (visibility)...');
                        await video.requestPictureInPicture();
                    }
                } else {
                    if (document.pictureInPictureElement) {
                        console.log('🖼️ Exiting PiP mode (visibility)...');
                        await document.exitPictureInPicture();
                    }
                }
            } catch (err) {
                console.log('PiP Error (visibility):', err);
            }
        };

        // Add all event listeners for maximum coverage
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isEnabled]);

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    const getStatusColor = () => {
        switch (focusStatus) {
            case 'focused': return 'bg-green-500';
            case 'looking_away': return 'bg-yellow-500 animate-pulse';
            case 'absent': return 'bg-red-500 animate-pulse';
        }
    };

    const getGazeEmoji = () => {
        switch (gazeDirection) {
            case 'up': return '👆';
            case 'down': return '👇';
            case 'left': return '👈';
            case 'right': return '👉';
            case 'center': return '👁️';
            default: return '❓';
        }
    };

    return (
        <div className="w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    👁️ Eye Tracking Detection
                </h3>
                <button
                    onClick={isEnabled ? stopCamera : startCamera}
                    disabled={isLoading}
                    className={`text-xs px-3 py-1 rounded font-medium ${isEnabled
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                        } disabled:bg-gray-400`}
                >
                    {isLoading ? '⏳ Loading...' : isEnabled ? '⏹ Stop' : '▶ Start'}
                </button>
            </div>

            {cameraError && (
                <p className="text-xs text-red-500 mb-2">❌ {cameraError}</p>
            )}

            <div className="relative inline-block" style={{ minHeight: isEnabled ? 240 : 0 }}>
                <video
                    ref={videoRef}
                    width={320}
                    height={240}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        display: isEnabled ? 'block' : 'none',
                        background: '#1a1a2e',
                        borderRadius: '12px',
                        transform: 'scaleX(-1)',
                    }}
                />
                {isEnabled && (
                    <>
                        <canvas
                            ref={canvasRef}
                            width={320}
                            height={240}
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full ${getStatusColor()}`} />
                        <div className="absolute top-3 left-3 text-xl">{getGazeEmoji()}</div>
                    </>
                )}
            </div>

            <p className="text-xs text-gray-400 mt-2">
                {status || (isEnabled ? 'Camera active' : 'Click Start to enable')}
            </p>

            {isEnabled && detectorReady && timerState === 'focus' && (
                <p className="text-xs text-gray-500 mt-1">
                    🎯 Now detecting: eye gaze direction, looking down at phone
                </p>
            )}
        </div>
    );
}
