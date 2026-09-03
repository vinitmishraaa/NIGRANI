import "dotenv/config";
import express from "express";
import cors from "cors";
import { createHash } from "crypto";
import { addBlock, getChain, isChainValid, findBlockByRecordHash, hashRecord } from "./blockchain.js";
import { isOnchainConfigured, anchorHashOnChain, verifyHashOnChain } from "./onchain.js";
import { reverseSearchImage } from "./search.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl || "");
  if (!match) throw new Error("imageData must be a base64 data URL for JPG, PNG, or WebP");
  return { mimeType: match[1].toLowerCase().replace("image/jpg", "image/jpeg"), buffer: Buffer.from(match[2], "base64") };
}

function normalizeEvidence(result) {
  return {
    title: result.title,
    link: result.link,
    source: result.source,
    thumbnail: result.thumbnail,
    snippet: result.snippet,
    date: result.date,
    exactMatch: result.exactMatch,
    matchType: result.matchType || (result.exactMatch ? "Exact match" : "Relevant visual match"),
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    searchConfigured: Boolean(process.env.SERPAPI_API_KEY),
    onchainConfigured: isOnchainConfigured(),
  });
});

app.post("/api/search", async (req, res) => {
  try {
    const { imageData, subjectType, faceDetected, descriptorHash } = req.body;
    if (!imageData) return res.status(400).json({ error: "imageData is required" });

    // Face detection is a hard gate. The server must never perform a reverse-image
    // search for an image that was not confirmed to contain a visible face locally.
    if (!faceDetected) return res.status(400).json({ error: "No face detected" });

    const { mimeType, buffer } = parseDataUrl(imageData);
    if (buffer.length === 0) return res.status(400).json({ error: "Empty image" });

    const imageHash = sha256(buffer);
    const search = await reverseSearchImage(buffer, mimeType);

    const evidence = search.results.slice(0, 3).map(normalizeEvidence);
    const record = {
      type: "web-evidence",
      imageHash,
      subjectType: subjectType || "person",
      faceDetected: true,
      descriptorHash: descriptorHash || null,
      searchProvider: search.provider,
      searchId: search.searchId,
      exactMatchCount: search.exactMatchCount || 0,
      resultCount: evidence.length,
      evidence,
      capturedAt: new Date().toISOString(),
    };

    const recordHash = hashRecord(record);
    record.recordHash = recordHash;
    const block = addBlock(record);

    let onchain = null;
    if (isOnchainConfigured()) {
      try {
        onchain = await anchorHashOnChain(recordHash);
      } catch (e) {
        onchain = { error: e.message };
      }
    }

    res.json({
      success: true,
      faceDetected: true,
      livingDetected: true,
      subjectType: subjectType || "person",
      imageHash,
      search: { provider: search.provider, searchId: search.searchId, exactMatchCount: search.exactMatchCount || 0, results: evidence },
      evidence,
      recordHash,
      block: { index: block.index, hash: block.hash, previousHash: block.previousHash, timestamp: block.timestamp },
      onchain,
    });
  } catch (err) {
    console.error(err);
    const status = /SERPAPI_API_KEY|configured|500 KB/i.test(err.message) ? 400 : 502;
    res.status(status).json({ error: err.message });
  }
});

app.post("/api/verify-evidence", async (req, res) => {
  try {
    const { recordHash, evidence } = req.body;
    if (!recordHash || !Array.isArray(evidence)) {
      return res.status(400).json({ error: "recordHash and evidence[] are required" });
    }

    const block = findBlockByRecordHash(recordHash);
    if (!block) return res.status(404).json({ verified: false, error: "Record not found on local chain" });

    const storedRecordHash = block.data?.recordHash || null;
    const reconstructed = hashRecord(block.data);
    const canonicalMatches = reconstructed === recordHash;
    const storedHashMatches = storedRecordHash === recordHash;
    const fingerprintMatches = storedHashMatches && (canonicalMatches || reconstructed === storedRecordHash);
    const chainValid = isChainValid();
    const evidenceMatches = JSON.stringify(block.data.evidence || []) === JSON.stringify(evidence || []);

    let onchainCheck = null;
    const chainAnchor = block.data.onchain?.txHash;
    if (chainAnchor) {
      try { onchainCheck = await verifyHashOnChain(chainAnchor); } catch (e) { onchainCheck = { error: e.message }; }
    }

    res.json({
      verified: fingerprintMatches && chainValid.valid && evidenceMatches,
      fingerprintMatches,
      storedHashMatches,
      canonicalMatches,
      evidenceMatches,
      chainValid,
      block: { index: block.index, hash: block.hash, timestamp: block.timestamp },
      onchainCheck,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Evidence verification failed", details: err.message });
  }
});

app.get("/api/chain", (req, res) => {
  res.json({ chain: getChain(), validity: isChainValid(), onchainConfigured: isOnchainConfigured() });
});

app.listen(PORT, () => {
  console.log(`NIGRANI backend listening on http://localhost:${PORT}`);
  console.log(`Web search configured: ${Boolean(process.env.SERPAPI_API_KEY)}`);
  console.log(`On-chain testnet anchoring configured: ${isOnchainConfigured()}`);
});
