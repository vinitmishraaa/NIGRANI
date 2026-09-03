import * as faceModule from "@vladmandic/face-api";
import * as cocoModule from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

const faceapi = faceModule.default || faceModule;
const cocoSsd = cocoModule.default || cocoModule;
const FACE_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

const ANIMAL_CLASSES = new Set([
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
]);

const ANIMAL_SCORE_THRESHOLD = 0.60;

let loaded = false;
let loadingPromise = null;
let animalModel = null;
let faceModelsReady = false;

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
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
        ]);
      })(),
    ]);

    if (animalResult.status !== "fulfilled") {
      throw new Error("Animal detection could not be initialized.");
    }

    animalModel = animalResult.value;
    faceModelsReady = faceResult.status === "fulfilled";
    loaded = true;
  })().catch((error) => {
    loadingPromise = null;
    loaded = false;
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

export async function detectLivingSubject(mediaEl) {
  if (!loaded || !animalModel) {
    throw new Error("Vision models are unavailable. Please refresh and try again.");
  }

  // Humans: require an actual visible human face.
  if (faceModelsReady) {
    try {
      const face = await faceapi.detectSingleFace(
        mediaEl,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
      );
      if (face) {
        return { label: "person", score: face.score, kind: "human", faceDetected: true };
      }
    } catch (_) {
      // Continue to the animal-only path.
    }
  }

  // Animals: require the same supported animal class to be detected confidently
  // in both the original image and a horizontally flipped copy. This reduces
  // single-frame false positives such as a black-hole/landscape being labeled as cat.
  const originalPredictions = await animalModel.detect(mediaEl, 20, 0.20);
  const originalAnimal = getBestAnimal(originalPredictions);
  if (!originalAnimal) return null;

  const flippedCanvas = createFlippedCanvas(mediaEl);
  const flippedPredictions = await animalModel.detect(flippedCanvas, 20, 0.20);
  const flippedAnimal = getBestAnimal(flippedPredictions);

  if (!flippedAnimal || flippedAnimal.class !== originalAnimal.class) return null;

  const combinedScore = (Number(originalAnimal.score) + Number(flippedAnimal.score)) / 2;
  if (combinedScore < 0.65) return null;

  return {
    label: originalAnimal.class,
    score: combinedScore,
    kind: "animal",
    faceDetected: false,
  };
}

export async function getFaceDescriptor(mediaEl) {
  if (!faceModelsReady) return null;

  try {
    const detection = await faceapi
      .detectSingleFace(mediaEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
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
