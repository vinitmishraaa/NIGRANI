import * as faceModule from "@vladmandic/face-api";
import * as cocoModule from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const faceapi = faceModule.default || faceModule;
const cocoSsd = cocoModule.default || cocoModule;
const FACE_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

const ANIMAL_CLASSES = new Set([
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
]);

// Keep the animal gate conservative so visual false positives do not pass as living subjects.
const ANIMAL_SCORE_THRESHOLD = 0.72;

let loaded = false;
let loadingPromise = null;
let animalModel = null;
let faceDetectorReady = false;
let faceRecognitionReady = false;

export function loadVisionModels() {
  if (loaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const tf = await import("@tensorflow/tfjs");
    await tf.ready();

    const [animalResult, faceResult] = await Promise.allSettled([
      cocoSsd.load({ base: "lite_mobilenet_v2" }),
      (async () => {
        if (typeof faceapi?.nets?.tinyFaceDetector?.loadFromUri !== "function") {
          throw new Error("Face API unavailable");
        }

        // The tiny face detector is the only model required for subject gating.
        await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
        faceDetectorReady = true;

        // Recognition models are optional for detection. Their failure must not disable human-face detection.
        const [landmarkResult, recognitionResult] = await Promise.allSettled([
          faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
        ]);
        faceRecognitionReady = landmarkResult.status === "fulfilled" && recognitionResult.status === "fulfilled";
      })(),
    ]);

    if (animalResult.status !== "fulfilled") {
      throw new Error("Animal detection could not be initialized.");
    }

    animalModel = animalResult.value;
    if (faceResult.status !== "fulfilled") {
      faceDetectorReady = false;
      faceRecognitionReady = false;
    }
    loaded = true;
  })().catch((error) => {
    loadingPromise = null;
    loaded = false;
    faceDetectorReady = false;
    faceRecognitionReady = false;
    throw new Error(error?.message || String(error));
  });

  return loadingPromise;
}

function getBestAnimal(predictions) {
  return predictions
    .filter((item) => ANIMAL_CLASSES.has(item.class) && Number(item.score) >= ANIMAL_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)[0] || null;
}

function createFlippedCanvas(mediaEl) {
  const canvas = document.createElement("canvas");
  const width = mediaEl.naturalWidth || mediaEl.videoWidth || mediaEl.width;
  const height = mediaEl.naturalHeight || mediaEl.videoHeight || mediaEl.height;
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(mediaEl, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function mirroredGeometryConsistent(first, second, width, height) {
  if (!Array.isArray(first?.bbox) || !Array.isArray(second?.bbox)) return false;
  const [x1, y1, w1, h1] = first.bbox.map(Number);
  const [x2, y2, w2, h2] = second.bbox.map(Number);
  if (![x1, y1, w1, h1, x2, y2, w2, h2].every(Number.isFinite)) return false;

  const c1x = (x1 + w1 / 2) / width;
  const c1y = (y1 + h1 / 2) / height;
  const c2x = 1 - (x2 + w2 / 2) / width;
  const c2y = (y2 + h2 / 2) / height;
  const centerDistance = Math.hypot(c1x - c2x, c1y - c2y);
  const widthDelta = Math.abs(w1 - w2) / Math.max(width, 1);
  const heightDelta = Math.abs(h1 - h2) / Math.max(height, 1);

  return centerDistance <= 0.14 && widthDelta <= 0.20 && heightDelta <= 0.20;
}

export async function detectLivingSubject(mediaEl) {
  if (!loaded || !animalModel) {
    throw new Error("Vision models are unavailable. Please refresh and try again.");
  }

  // Humans: only a real visible human face can pass the gate.
  if (faceDetectorReady) {
    try {
      const face = await faceapi.detectSingleFace(
        mediaEl,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.35 }),
      );
      if (face) {
        return { label: "person", score: face.score, kind: "human", faceDetected: true };
      }
    } catch (_) {
      // Continue to the animal-only path.
    }
  }

  // Animals: require the same supported class and stable mirrored geometry in both views.
  const originalPredictions = await animalModel.detect(mediaEl, 20, 0.20);
  const originalAnimal = getBestAnimal(originalPredictions);
  if (!originalAnimal) return null;

  const flippedCanvas = createFlippedCanvas(mediaEl);
  const flippedPredictions = await animalModel.detect(flippedCanvas, 20, 0.20);
  const flippedAnimal = getBestAnimal(flippedPredictions);

  if (!flippedAnimal || flippedAnimal.class !== originalAnimal.class) return null;

  const width = mediaEl.naturalWidth || mediaEl.videoWidth || mediaEl.width || 1;
  const height = mediaEl.naturalHeight || mediaEl.videoHeight || mediaEl.height || 1;
  if (!mirroredGeometryConsistent(originalAnimal, flippedAnimal, width, height)) return null;

  const combinedScore = (Number(originalAnimal.score) + Number(flippedAnimal.score)) / 2;
  if (combinedScore < 0.75) return null;

  return {
    label: originalAnimal.class,
    score: combinedScore,
    kind: "animal",
    faceDetected: false,
  };
}

export async function getFaceDescriptor(mediaEl) {
  if (!faceRecognitionReady) return null;

  try {
    const detection = await faceapi
      .detectSingleFace(mediaEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.35 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection ? Array.from(detection.descriptor) : null;
  } catch (_) {
    return null;
  }
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
