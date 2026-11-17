"use client";

export interface RearCameraOption {
  deviceId: string;
  rawLabel: string;
  shortLabel: string;
  score: number;
  index: number;
}

export const PREFERRED_CAMERA_STORAGE_KEY = "trackflow_preferred_rear_camera_id";
const PRIMARY_MAIN_CAMERA_CACHE_KEY = "trackflow_primary_main_camera_id";

/**
 * Camera switcher option disabled — always uses Primary Main 1x camera automatically.
 */
export const SHOW_CAMERA_SWITCHER_OPTION = false;

/**
 * Scores a videoinput device to identify the phone's Primary Main 1x Photo Camera
 * across all Android (Samsung, Xiaomi, Redmi, Oppo, Vivo, OnePlus, Pixel, Realme, Motorola)
 * and iOS (iPhone) models, while penalizing Ultra-Wide (0.5x), Macro, Depth, Telephoto, or Front cameras.
 */
export function scoreRearCameraDevice(
  device: MediaDeviceInfo,
  rearIndex: number
): { isFront: boolean; score: number; shortLabel: string } {
  const label = (device.label || "").trim();
  const lower = label.toLowerCase();

  // Identify front/selfie cameras
  const isFront =
    /\b(front|user|selfie|facetime)\b/i.test(lower) ||
    /camera2?\s*\d+\s*,\s*facing\s*front/i.test(lower) ||
    /\bfacing\s*front\b/i.test(lower);

  if (isFront) {
    return { isFront: true, score: -999, shortLabel: "Front" };
  }

  let score = 0;
  let kindTag = "Main 1x";

  // 1. Android Camera2 API convention: "camera2 0, facing back" or "0, facing back" is ALWAYS the primary 1x normal photo camera
  if (/(?:camera2?\s*)?\b0\s*,\s*facing\s*(back|environment)/i.test(lower)) {
    score += 180;
    kindTag = "Main 1x";
  }

  // 2. iOS / Standard exact primary rear camera names
  if (
    lower === "back camera" ||
    lower === "rear camera" ||
    lower === "back normal camera" ||
    lower === "main camera" ||
    lower === "back wide camera"
  ) {
    score += 160;
    kindTag = "Main 1x";
  } else if (/\b(main|primary|normal|standard)\b/i.test(lower)) {
    score += 100;
    kindTag = "Main 1x";
  }

  // 3. Generic rear indicator
  if (/\b(back|rear|environment)\b/i.test(lower)) {
    score += 35;
  }

  // 4. Strongly penalize Ultra-Wide (0.5x/0.6x), Wide-Angle auxiliary, Macro, Depth, Telephoto, and Multi-lens virtual cameras
  if (
    /\b(ultra[\s-]*wide|ultrawide|super[\s-]*wide|0\.5x?|0\.6x?|wide[\s-]*angle|fisheye)\b/i.test(
      lower
    )
  ) {
    score -= 220;
    kindTag = "Ultra-Wide";
  } else if (/\b(macro|depth|bokeh|mono|monochrome|ir|infrared|tof)\b/i.test(lower)) {
    score -= 240;
    kindTag = "Macro/Aux";
  } else if (/\b(tele|telephoto|periscope|zoom)\b/i.test(lower)) {
    score -= 140;
    kindTag = "Telephoto";
  } else if (/\b(dual|triple|quad|multi|logical|virtual)\b/i.test(lower)) {
    score -= 60;
    kindTag = "Multi-Lens";
  }

  // 5. Penalize higher camera2 sensor numbers ("camera2 2, facing back", "camera2 3, facing back", etc.)
  const camNumMatch = lower.match(/camera2?\s*(\d+)\s*,\s*facing\s*(back|environment)/i);
  if (camNumMatch) {
    const sensorNum = parseInt(camNumMatch[1], 10);
    if (sensorNum > 0) {
      score -= sensorNum * 45;
    }
  }

  // 6. First rear sensor in hardware enumeration order (rearIndex === 0) is the primary main sensor on mobile OSes
  score += Math.max(0, 45 - rearIndex * 20);

  const shortLabel = `${kindTag} (#${rearIndex + 1})`;
  return { isFront: false, score, shortLabel };
}

/**
 * Enumerates all rear videoinput devices and identifies the single best Primary Main 1x Camera.
 */
export async function discoverRearCameras(): Promise<{
  cameras: RearCameraOption[];
  bestNormalCamera: RearCameraOption | null;
}> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== "function"
  ) {
    return { cameras: [], bestNormalCamera: null };
  }

  try {
    const enumeratePromise = navigator.mediaDevices.enumerateDevices();
    const timeoutPromise = new Promise<MediaDeviceInfo[]>((resolve) =>
      setTimeout(() => resolve([]), 1200)
    );
    const allDevices = await Promise.race([enumeratePromise, timeoutPromise]);
    const videoInputs = allDevices.filter((d) => d.kind === "videoinput" && d.deviceId);
    if (videoInputs.length === 0) {
      return { cameras: [], bestNormalCamera: null };
    }

    const scored: RearCameraOption[] = [];
    let rearIdx = 0;

    for (const dev of videoInputs) {
      const info = scoreRearCameraDevice(dev, rearIdx);
      if (!info.isFront) {
        scored.push({
          deviceId: dev.deviceId,
          rawLabel: dev.label || `Camera ${rearIdx + 1}`,
          shortLabel: info.shortLabel,
          score: info.score,
          index: rearIdx,
        });
        rearIdx++;
      }
    }

    if (scored.length === 0) {
      videoInputs.forEach((dev, idx) => {
        scored.push({
          deviceId: dev.deviceId,
          rawLabel: dev.label || `Camera ${idx + 1}`,
          shortLabel: `Cam #${idx + 1}`,
          score: 10 - idx,
          index: idx,
        });
      });
    }

    const sortedByBest = [...scored].sort((a, b) => b.score - a.score);
    return {
      cameras: scored,
      bestNormalCamera: sortedByBest[0] || null,
    };
  } catch {
    return { cameras: [], bestNormalCamera: null };
  }
}

/**
 * Checks whether a MediaStreamTrack supports continuous autofocus.
 */
export function inspectTrackFocusAndZoom(videoTrack: MediaStreamTrack | undefined): {
  hasContinuousFocus: boolean;
  hasZoom: boolean;
  minZoom: number;
  maxZoom: number;
} {
  if (!videoTrack || typeof videoTrack.getCapabilities !== "function") {
    return { hasContinuousFocus: true, hasZoom: false, minZoom: 1, maxZoom: 1 };
  }
  try {
    const caps = videoTrack.getCapabilities() as Record<string, unknown>;
    const focusModes = Array.isArray(caps.focusMode)
      ? (caps.focusMode as string[])
      : [];
    const hasContinuousFocus =
      focusModes.length === 0 ||
      focusModes.includes("continuous") ||
      focusModes.includes("single-shot");

    return { hasContinuousFocus, hasZoom: false, minZoom: 1, maxZoom: 1 };
  } catch {
    return { hasContinuousFocus: true, hasZoom: false, minZoom: 1, maxZoom: 1 };
  }
}

/**
 * Applies continuous autofocus to a video track non-blockingly with a strict timeout guard
 * so mobile browsers never hang waiting for applyConstraints.
 */
export async function applyContinuousFocusToTrack(
  videoTrack: MediaStreamTrack | undefined
): Promise<void> {
  if (!videoTrack || typeof videoTrack.getCapabilities !== "function") return;
  try {
    const caps = videoTrack.getCapabilities() as Record<string, unknown>;
    if (!Array.isArray(caps.focusMode)) return;

    let desiredFocusMode = "";
    if (caps.focusMode.includes("continuous")) {
      desiredFocusMode = "continuous";
    } else if (caps.focusMode.includes("single-shot")) {
      desiredFocusMode = "single-shot";
    }

    if (desiredFocusMode && typeof videoTrack.applyConstraints === "function") {
      await Promise.race([
        videoTrack.applyConstraints({
          advanced: [{ focusMode: desiredFocusMode } as unknown as MediaTrackConstraintSet],
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 350)),
      ]);
    }
  } catch {
    // Ignore unsupported constraint errors on specific devices
  }
}

/**
 * Triggers a hardware re-focus nudge when the user taps the camera viewfinder.
 */
export async function triggerTapToFocusOnTrack(
  videoTrack: MediaStreamTrack | undefined
): Promise<void> {
  if (!videoTrack || typeof videoTrack.getCapabilities !== "function") return;
  try {
    const caps = videoTrack.getCapabilities() as Record<string, unknown>;
    if (!Array.isArray(caps.focusMode)) return;

    if (caps.focusMode.includes("single-shot")) {
      videoTrack
        .applyConstraints({
          advanced: [{ focusMode: "single-shot" } as unknown as MediaTrackConstraintSet],
        })
        .catch(() => {});
    }

    if (caps.focusMode.includes("continuous")) {
      setTimeout(() => {
        videoTrack
          .applyConstraints({
            advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
          })
          .catch(() => {});
      }, 260);
    }
  } catch {
    // ignore
  }
}

/**
 * Always opens the phone's default Primary Main 1x Photo Camera automatically on any phone model.
 * Caches the verified primary sensor ID in sessionStorage so subsequent opens require only a single
 * getUserMedia call, and waits briefly after track.stop() when switching so Android Camera2 HAL never hangs.
 */
export async function openNormalPhotoCameraStream(): Promise<{
  stream: MediaStream;
  activeDeviceId: string;
  rearCameras: RearCameraOption[];
}> {
  let targetId: string | null = null;

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PREFERRED_CAMERA_STORAGE_KEY);
      targetId = sessionStorage.getItem(PRIMARY_MAIN_CAMERA_CACHE_KEY);
    } catch {}
  }

  // 1. Pre-discover if camera permission was already granted earlier
  if (!targetId) {
    const preDiscovery = await discoverRearCameras();
    const hasRealLabels = preDiscovery.cameras.some((c) =>
      Boolean(c.rawLabel && !/^Camera \d+$/i.test(c.rawLabel.trim()))
    );
    if (hasRealLabels && preDiscovery.bestNormalCamera) {
      targetId = preDiscovery.bestNormalCamera.deviceId;
      try {
        sessionStorage.setItem(PRIMARY_MAIN_CAMERA_CACHE_KEY, targetId);
      } catch {}
    }
  }

  const openStreamForDevice = async (devId: string | null): Promise<MediaStream | null> => {
    const attempts: MediaStreamConstraints[] = devId
      ? [
          {
            video: {
              deviceId: { exact: devId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: { deviceId: { exact: devId } },
            audio: false,
          },
        ]
      : [
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: { facingMode: "environment" },
            audio: false,
          },
          {
            video: true,
            audio: false,
          },
        ];

    for (const c of attempts) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c);
        if (s) return s;
      } catch {
        // try next
      }
    }
    return null;
  };

  let stream = await openStreamForDevice(targetId);
  if (!stream && targetId) {
    try {
      sessionStorage.removeItem(PRIMARY_MAIN_CAMERA_CACHE_KEY);
    } catch {}
    targetId = null;
    stream = await openStreamForDevice(null);
  }
  if (!stream) {
    throw new Error("Unable to start camera stream");
  }

  // 2. Verify the opened lens is the Primary Main 1x camera
  const postDiscovery = await discoverRearCameras();
  const rearCameras = postDiscovery.cameras;
  const bestNormal = postDiscovery.bestNormalCamera;

  const currentTrack = stream.getVideoTracks()[0];
  const currentSettings =
    currentTrack && typeof currentTrack.getSettings === "function"
      ? currentTrack.getSettings()
      : {};
  let activeDeviceId = currentSettings.deviceId || targetId || "";

  if (bestNormal && rearCameras.length > 1 && activeDeviceId !== bestNormal.deviceId) {
    const currentCamOption = rearCameras.find((c) => c.deviceId === activeDeviceId);
    const currentCaps = inspectTrackFocusAndZoom(currentTrack);
    const shouldSwitchToPrimary =
      !currentCamOption ||
      currentCamOption.score < bestNormal.score ||
      !currentCaps.hasContinuousFocus;

    if (shouldSwitchToPrimary) {
      // Stop current stream FIRST and wait 80ms so Android Camera2 HAL cleanly releases the lens before opening primary
      stream.getTracks().forEach((t) => t.stop());
      await new Promise<void>((resolve) => setTimeout(resolve, 80));

      const primaryStream = await openStreamForDevice(bestNormal.deviceId);
      if (primaryStream) {
        stream = primaryStream;
        activeDeviceId = bestNormal.deviceId;
      } else {
        const fallbackStream = await openStreamForDevice(null);
        if (fallbackStream) {
          stream = fallbackStream;
        }
      }
    }
  }

  if (!activeDeviceId && bestNormal) {
    activeDeviceId = bestNormal.deviceId;
  }

  if (activeDeviceId) {
    try {
      sessionStorage.setItem(PRIMARY_MAIN_CAMERA_CACHE_KEY, activeDeviceId);
    } catch {}
  }

  return {
    stream,
    activeDeviceId,
    rearCameras,
  };
}
