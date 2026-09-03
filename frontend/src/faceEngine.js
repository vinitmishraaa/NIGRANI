import * as faceModule from "@vladmandic/face-api";

const faceapi = faceModule.default || faceModule;
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

let loaded = false;
let loadingPromise = null;

export function loadVisionModels() {
  if (loaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (typeof faceapi?.nets?.tinyFaceDetector?.loadFromUri !== "function") {
      throw new Error("Face detection could not be initialized.");
    }

    // Face detection is REQUIRED. NIGRANI must never send an image to web search
    // unless a visible human face has been detected locally first.
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    loaded = true;
  })().catch((error) => {
    loadingPromise = null;
    throw new Error(error?.message || String(error));
  });

  return loadingPromise;
}

export async function detectLivingSubject(mediaEl) {
  if (!loaded) throw new Error("Face detection models are unavailable. Please refresh and try again.");

  const detection = await faceapi.detectSingleFace(
    mediaEl,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
  );

  if (!detection) return null;
  return { label: "person", score: detection.score };
}

export async function getFaceDescriptor(mediaEl) {
  if (!loaded) return null;

  const detection = await faceapi
    .detectSingleFace(mediaEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? Array.from(detection.descriptor) : null;
}

export async function descriptorHash(descriptor) {
  const text = JSON.stringify(descriptor);
  const input = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle?.digest) {
    const hash = await globalThis.crypto.subtle.digest("SHA-256", input);
    return toHex(new Uint8Array(hash));
  }
  return simpleHash(text);
}

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function simpleHash(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x5bd1e995);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}${a}${b}`;
}
