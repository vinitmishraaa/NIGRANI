import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const CHAIN_FILE = new URL("./chain-data.json", import.meta.url);
const DIFFICULTY = 3;

function sha256(input) { return createHash("sha256").update(input).digest("hex"); }
function computeHash({ index, timestamp, data, previousHash, nonce }) {
  return sha256(`${index}|${timestamp}|${JSON.stringify(data)}|${previousHash}|${nonce}`);
}
function mineBlock(block) {
  let nonce = 0;
  let hash = computeHash({ ...block, nonce });
  while (!hash.startsWith("0".repeat(DIFFICULTY))) {
    nonce += 1;
    hash = computeHash({ ...block, nonce });
  }
  return { ...block, nonce, hash };
}
function genesisBlock() {
  return mineBlock({ index: 0, timestamp: new Date(0).toISOString(), data: { type: "genesis", note: "Proofmark evidence chain genesis" }, previousHash: "0" });
}
function saveChain(chain) { writeFileSync(CHAIN_FILE, JSON.stringify(chain, null, 2)); }
function loadChain() {
  if (existsSync(CHAIN_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(CHAIN_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
  }
  const chain = [genesisBlock()];
  saveChain(chain);
  return chain;
}

let chain = loadChain();
export function getChain() { return chain; }
export function addBlock(data) {
  const previous = chain[chain.length - 1];
  const block = mineBlock({ index: previous.index + 1, timestamp: new Date().toISOString(), data, previousHash: previous.hash });
  chain.push(block);
  saveChain(chain);
  return block;
}
export function isChainValid() {
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i], previous = chain[i - 1];
    if (computeHash(current) !== current.hash) return { valid: false, brokenAt: i, reason: "hash mismatch" };
    if (current.previousHash !== previous.hash) return { valid: false, brokenAt: i, reason: "previousHash mismatch" };
    if (!current.hash.startsWith("0".repeat(DIFFICULTY))) return { valid: false, brokenAt: i, reason: "proof-of-work not satisfied" };
  }
  return { valid: true };
}
export function findBlockByRecordHash(recordHash) {
  return chain.find((b) => b.data?.recordHash === recordHash) || null;
}
export function hashRecord(record) {
  const { recordHash: _ignored, ...canonical } = record;
  return sha256(JSON.stringify(canonical));
}
