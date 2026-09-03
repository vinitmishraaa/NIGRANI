import * as faceModule from "@vladmandic/face-api";
import * as cocoModule from "@tensorflow-models/coco-ssd";

const faceapi = faceModule.default || faceModule;
const cocoSsd = cocoModule.default || cocoModule;
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

let loaded = false;
let loadingPromise = null;
let objectModel = null;
let faceModelsReady = false;

const LIVING_CLASSES = new Set([
  "person",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "potted plant",
]);

export function loadVisionModels() {
  if (loaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (typeof cocoSsd?.load !== "function") {
      throw new Error("Living-object detection could not be initialized.");
    }

    // The living-object detector is the required model. Face models load separately
    // so a face-model problem can never block animal/living-subject searches.
    objectModel = await cocoSsd.load();

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      faceModelsReady = true;
    } catch (error) {
      console.warn("Optional face models could not be loaded:", error);
      faceModelsReady = false;
    }

    loaded = true;
  })().catch((error) => {
    loadingPromise = null;
    throw new Error(error?.message || String(error));
  });

  return loadingPromise;
}

export async function detectLivingSubject(mediaEl) {
  if (!objectModel) throw new Error("Living-subject model is unavailable. Please refresh and try again.");

  const predictions = await objectModel.detect(mediaEl);
  const living = predictions
    .filter((item) => LIVING_CLASSES.has(item.class) && item.score >= 0.45)
    .sort((a, b) => b.score - a.score);

  if (!living.length) return null;
  return { label: living[0].class, score: living[0].score };
}

export async function getFaceDescriptor(mediaEl) {
  if (!faceModelsReady) return null;

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
