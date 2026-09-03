import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const CHAIN_FILE = new URL("./chain-data.json", import.meta.url);
const DIFFICULTY = 3;
const DEFAULT_DEVICE = "default";

function sha256(input) { return createHash("sha256").update(input).digest("hex"); }
function computeHash({ index, timestamp, data, previousHash, nonce }) {
  return sha256(`${index}|${timestamp}|${JSON.stringify(data)}|${previousHash}|${nonce}`);
}
function mineBlock(block) {
  let nonce = 0;
  let hash = computeHash({ ...block, nonce });
  while (!hash.startsWith("0".repeat(DIFFICULTY))) { nonce += 1; hash = computeHash({ ...block, nonce }); }
  return { ...block, nonce, hash };
}
function genesisBlock() {
  return mineBlock({ index: 0, timestamp: new Date(0).toISOString(), data: { type: "genesis", note: "NIGRANI evidence chain genesis" }, previousHash: "0" });
}
function saveStore(store) { writeFileSync(CHAIN_FILE, JSON.stringify(store, null, 2)); }
function loadStore() {
  if (existsSync(CHAIN_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(CHAIN_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length) return { [DEFAULT_DEVICE]: parsed };
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  const store = {};
  saveStore(store);
  return store;
}
const store = loadStore();
function keyFromData(data) {
  const explicit = data?.deviceId;
  if (explicit) return String(explicit).slice(0, 120);
  const marker = typeof data?.descriptorHash === "string" ? data.descriptorHash.split(":", 1)[0] : "";
  return marker || DEFAULT_DEVICE;
}
function ensureChain(deviceId) {
  const key = String(deviceId || DEFAULT_DEVICE).trim() || DEFAULT_DEVICE;
  if (!Array.isArray(store[key]) || !store[key].length) { store[key] = [genesisBlock()]; saveStore(store); }
  return store[key];
}
function allChains() { return Object.entries(store).flatMap(([deviceId, chain]) => (Array.isArray(chain) ? chain.map(block => ({ ...block, data: { ...block.data, deviceId: block.data?.type === "genesis" ? deviceId : block.data?.deviceId || deviceId } })) : [])); }

export function getChain(deviceId = null) { return deviceId ? ensureChain(deviceId) : allChains(); }
export function addBlock(data, deviceId = null) {
  const chain = ensureChain(deviceId || keyFromData(data));
  const previous = chain[chain.length - 1];
  const block = mineBlock({ index: previous.index + 1, timestamp: new Date().toISOString(), data, previousHash: previous.hash });
  chain.push(block); saveStore(store); return block;
}
function validateChain(chain) {
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i], previous = chain[i - 1];
    if (computeHash(current) !== current.hash) return { valid: false, brokenAt: i, reason: "hash mismatch" };
    if (current.previousHash !== previous.hash) return { valid: false, brokenAt: i, reason: "previousHash mismatch" };
    if (!current.hash.startsWith("0".repeat(DIFFICULTY))) return { valid: false, brokenAt: i, reason: "proof-of-work not satisfied" };
  }
  return { valid: true };
}
export function isChainValid(deviceId = null) {
  if (deviceId) return validateChain(ensureChain(deviceId));
  const entries = Object.entries(store);
  const broken = entries.map(([id, chain]) => ({ id, check: validateChain(chain) })).find(item => !item.check.valid);
  return broken ? { valid: false, brokenAt: broken.check.brokenAt, reason: `${broken.id}: ${broken.check.reason}` } : { valid: true };
}
export function findBlockByRecordHash(recordHash, deviceId = null) {
  if (deviceId) return ensureChain(deviceId).find(b => b.data?.recordHash === recordHash) || null;
  return allChains().find(b => b.data?.recordHash === recordHash) || null;
}
export function hashRecord(record) {
  const { recordHash: _ignored, ...canonical } = record;
  return sha256(JSON.stringify(canonical));
}
