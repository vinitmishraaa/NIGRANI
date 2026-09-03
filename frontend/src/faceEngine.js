import * as faceapi from "face-api.js";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
let loaded = false;
let loadingPromise = null;
let objectModel = null;

// COCO-SSD classes that represent living subjects. This lets NIGRANI search
// animals and people without requiring a face to be visible.
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
  loadingPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    cocoSsd.load().then(model => { objectModel = model; }),
  ]).then(() => {
    loaded = true;
  });
  return loadingPromise;
}

export async function detectLivingSubject(mediaEl) {
  if (!objectModel) throw new Error("Living-subject detection model is still loading.");
  const predictions = await objectModel.detect(mediaEl);
  const living = predictions
    .filter(item => LIVING_CLASSES.has(item.class) && item.score >= 0.45)
    .sort((a, b) => b.score - a.score);
  if (!living.length) return null;
  return {
    label: living[0].class,
    score: living[0].score,
  };
}

export async function getFaceDescriptor(mediaEl) {
  const detection = await faceapi
    .detectSingleFace(mediaEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? Array.from(detection.descriptor) : null;
}

export async function descriptorHash(descriptor) {
  const input = new TextEncoder().encode(JSON.stringify(descriptor));
  if (globalThis.crypto?.subtle?.digest) {
    const hash = await globalThis.crypto.subtle.digest("SHA-256", input);
    return toHex(new Uint8Array(hash));
  }
  return sha256(input);
}

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function sha256(bytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5e5dba, 0x3956c25, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1,
    0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c6f, 0x2748774c, 0x34a7484f, 0x5cb0a9dc, 0x7a5bc9df,
    0x923f82a4, 0xab1c5ed5, 0xc76c51a3, 0xd192e819, 0xf40e3585, 0x106aa070, 0x1e3763f9, 0x7484a9d8,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b38, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x7f4a7d94, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xb00327c8,
    0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x106aa070, 0x2748774c, 0x34b0bcb3, 0x4ed8aa4a, 0x5b9cca4f,
    0x682e6ff3, 0x748e3a9d, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2, 0x3d5a9d9a,
  ];

  // Keep the existing compact SHA-256 fallback implementation behavior.
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9) + 63) >> 6) << 6;
  const msg = new Uint8Array(paddedLength);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < msg.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((value, i) => outView.setUint32(i * 4, value));
  return toHex(out);
}
