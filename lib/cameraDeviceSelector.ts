"use client";

export interface RearCameraOption {
  deviceId: string;
  rawLabel: string;
  shortLabel: string;
  score: number;
  index: number;
}

export const PREFERRED_CAMERA_STORAGE_KEY = "trackflow_preferred_rear_camera_id";

/**
 * Easy one-line toggle to hide the Camera Switcher button once confirmed.
 */
export const SHOW_CAMERA_SWITCHER_OPTION = true;

/**
 * Scores a videoinput device to identify the phone's primary Normal 1x Photo Camera
 * and penalize Ultra-Wide (0.5x), Macro, Depth, Telephoto, or Front cameras.
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
    /camera2?\s*1\s*,\s*facing\s*front/i.test(lower);

  if (isFront) {
    return { isFront: true, score: -999, shortLabel: "Front" };
  }

  let score = 0;
  let kindTag = "Normal 1x";

  // 1. Android Camera2 API convention: "camera2 0, facing back" is ALWAYS the primary 1x normal photo camera
  if (/camera2?\s*0\s*,\s*facing\s*(back|environment)/i.test(lower)) {
    score += 140;
    kindTag = "Main 1x";
  }

  // 2. iOS / Standard exact normal rear camera names
  if (
    lower === "back camera" ||
    lower === "rear camera" ||
    lower === "back normal camera" ||
    lower === "main camera"
  ) {
    score += 130;
    kindTag = "Main 1x";
  } else if (/\b(main|primary|normal|standard)\b/i.test(lower)) {
    score += 80;
    kindTag = "Main 1x";
  }

  // 3. Generic rear indicator
  if (/\b(back|rear|environment)\b/i.test(lower)) {
    score += 30;
  }

  // 4. Strongly penalize Ultra-Wide (0.5x), Macro, Depth, Telephoto, Dual/Triple virtual lenses
  if (
    /\b(ultra[\s-]*wide|ultrawide|0\.5x?|0\.6x?|wide[\s-]*angle|fisheye)\b/i.test(
      lower
    )
  ) {
    score -= 160;
    kindTag = "Ultra-Wide";
  } else if (/\b(macro|depth|bokeh|mono|monochrome|ir|infrared)\b/i.test(lower)) {
    score -= 180;
    kindTag = "Macro/Aux";
  } else if (/\b(tele|telephoto|periscope|zoom)\b/i.test(lower)) {
    score -= 90;
    kindTag = "Telephoto";
  } else if (/\b(dual|triple|multi|logical|virtual)\b/i.test(lower)) {
    score -= 45;
    kindTag = "Multi-Lens";
  }

  // 5. On Android devices with generic labels or multiple back sensors, index 0 is the primary 1x sensor,
  // whereas higher indices (camera2 2, camera2 3) are secondary wide/macro sensors.
  score += Math.max(0, 25 - rearIndex * 10);

  const shortLabel = `${kindTag} (#${rearIndex + 1})`;
  return { isFront: false, score, shortLabel };
}

/**
 * Enumerates all rear videoinput devices (falling back to all videoinputs if none are labeled front/back)
 * and sorts them so index 0 in the returned list is the best Normal 1x Photo Camera,
 * while preserving physical sensor order in `index`.
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
    const allDevices = await navigator.mediaDevices.enumerateDevices();
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

    // Fallback if all cameras were filtered out (e.g. desktop webcam labeled "FaceTime HD Camera")
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
 * Checks whether a MediaStreamTrack supports continuous autofocus (which primary 1x photo sensors support,
 * whereas many cheap ultra-wide 0.5x sensors are fixed-focus).
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

    let hasZoom = false;
    let minZoom = 1;
    let maxZoom = 1;
    if (caps.zoom && typeof caps.zoom === "object") {
      const z = caps.zoom as { min?: number; max?: number };
      minZoom = z.min ?? 1;
      maxZoom = Math.min(z.max ?? 3, 3);
      hasZoom = maxZoom > 1.05;
    }

    return { hasContinuousFocus, hasZoom, minZoom, maxZoom };
  } catch {
    return { hasContinuousFocus: true, hasZoom: false, minZoom: 1, maxZoom: 1 };
  }
}

/**
 * Applies continuous autofocus (and optional hardware zoom) to a video track.
 */
export async function applyContinuousFocusToTrack(
  videoTrack: MediaStreamTrack | undefined,
  zoomLevel?: number
): Promise<void> {
  if (!videoTrack || typeof videoTrack.getCapabilities !== "function") return;
  try {
    const caps = videoTrack.getCapabilities() as Record<string, unknown>;
    const advancedObj: Record<string, unknown> = {};

    if (Array.isArray(caps.focusMode)) {
      if (caps.focusMode.includes("continuous")) {
        advancedObj.focusMode = "continuous";
      } else if (caps.focusMode.includes("single-shot")) {
        advancedObj.focusMode = "single-shot";
      }
    }

    if (
      typeof zoomLevel === "number" &&
      caps.zoom &&
      typeof caps.zoom === "object"
    ) {
      const z = caps.zoom as { min?: number; max?: number };
      const minZ = z.min ?? 1;
      const maxZ = Math.min(z.max ?? 3, 3);
      advancedObj.zoom = Math.max(minZ, Math.min(maxZ, zoomLevel));
    }

    if (Object.keys(advancedObj).length > 0) {
      await videoTrack.applyConstraints({
        advanced: [advancedObj as unknown as MediaTrackConstraintSet],
      });
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
      await videoTrack
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
      }, 320);
    }
  } catch {
    // ignore
  }
}

/**
 * Opens a MediaStream guaranteed to prefer:
 * 1) Any explicit targetDeviceId (or user's saved preferred camera in localStorage)
 * 2) Otherwise the highest-ranked Normal 1x Photo Camera (with continuous autofocus verification)
 */
export async function openNormalPhotoCameraStream(
  explicitDeviceId?: string | null
): Promise<{
  stream: MediaStream;
  activeDeviceId: string;
  rearCameras: RearCameraOption[];
}> {
  let targetId = explicitDeviceId || null;
  if (!targetId && typeof window !== "undefined") {
    try {
      targetId = localStorage.getItem(PREFERRED_CAMERA_STORAGE_KEY);
    } catch {}
  }

  // Pre-discover if permission was already granted earlier
  const preDiscovery = await discoverRearCameras();
  if (
    !targetId &&
    preDiscovery.bestNormalCamera &&
    preDiscovery.cameras.some((c) => Boolean(c.rawLabel && !c.rawLabel.startsWith("Camera ")))
  ) {
    targetId = preDiscovery.bestNormalCamera.deviceId;
  }

  const openStreamForDevice = async (devId: string | null): Promise<MediaStream | null> => {
    const attempts: MediaStreamConstraints[] = devId
      ? [
          {
            video: {
              deviceId: { exact: devId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
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
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
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
    // Saved deviceId might be stale; clear and open environment camera
    stream = await openStreamForDevice(null);
  }
  if (!stream) {
    throw new Error("Unable to start camera stream");
  }

  // Now that permission is granted, enumerate full rear camera list with hardware labels
  const postDiscovery = await discoverRearCameras();
  const rearCameras = postDiscovery.cameras;
  const bestNormal = postDiscovery.bestNormalCamera;

  const currentTrack = stream.getVideoTracks()[0];
  const currentSettings =
    currentTrack && typeof currentTrack.getSettings === "function"
      ? currentTrack.getSettings()
      : {};
  let activeDeviceId = currentSettings.deviceId || targetId || "";

  // If the user didn't explicitly pick a camera yet, verify the browser didn't open an Ultra-Wide / Fixed-Focus lens
  if (!explicitDeviceId && !targetId && rearCameras.length > 1 && bestNormal) {
    const currentCamOption = rearCameras.find((c) => c.deviceId === activeDeviceId);
    const currentCaps = inspectTrackFocusAndZoom(currentTrack);

    const openedWrongLens =
      (currentCamOption && currentCamOption.deviceId !== bestNormal.deviceId && currentCamOption.score < bestNormal.score) ||
      !currentCaps.hasContinuousFocus;

    if (openedWrongLens) {
      // Switch immediately to the highest-scored Normal 1x Photo Camera
      const candidateOrder = [...rearCameras].sort((a, b) => b.score - a.score);
      for (const candidate of candidateOrder) {
        if (candidate.deviceId === activeDeviceId && currentCaps.hasContinuousFocus) {
          break;
        }
        const replacementStream = await openStreamForDevice(candidate.deviceId);
        if (replacementStream) {
          const repTrack = replacementStream.getVideoTracks()[0];
          const repCaps = inspectTrackFocusAndZoom(repTrack);
          if (repCaps.hasContinuousFocus || candidate.deviceId === bestNormal.deviceId) {
            stream.getTracks().forEach((t) => t.stop());
            stream = replacementStream;
            activeDeviceId = candidate.deviceId;
            try {
              localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, activeDeviceId);
            } catch {}
            break;
          } else {
            replacementStream.getTracks().forEach((t) => t.stop());
          }
        }
      }
    } else if (activeDeviceId) {
      try {
        localStorage.setItem(PREFERRED_CAMERA_STORAGE_KEY, activeDeviceId);
      } catch {}
    }
  }

  // Ensure activeDeviceId matches one of rearCameras if available
  if (!activeDeviceId && rearCameras.length > 0) {
    activeDeviceId = (bestNormal || rearCameras[0]).deviceId;
  }

  return {
    stream,
    activeDeviceId,
    rearCameras,
  };
}
