# Proofmark — HH Goa 2026 Task 3

Proofmark is an end-to-end prototype for **face verification + public-web evidence discovery + blockchain verification**.

### Demo pipeline

`Input photo → local face detection/encoding → genuine reverse-image search → top 3 web/social sources → evidence fingerprint → blockchain record → tamper re-verification`

## Important scope

The app does not maintain a people registry and does not return an identity/name for a person from an arbitrary face. The supplied image is used as the search object, and the search layer returns indexed pages/images that visually or exactly match that image. This keeps the prototype focused on provenance/evidence discovery rather than stranger identification.

## Stack

- React + Vite + face-api.js for local face detection and descriptor extraction.
- Node.js + Express backend.
- SerpApi Image API + Google Lens for genuine reverse-image search. SerpApi supports uploading JPG/JPEG/PNG/WebP files up to 500 KB and then using the returned temporary image ID in Google Lens. The frontend automatically compresses larger camera/gallery images before upload. citeturn483180search0turn483180search1
- Local SHA-256 hash chain with simple proof-of-work.
- Optional EVM testnet anchoring through ethers.js.

## Setup

### Backend

```bash
cd backend
cp .env
# Put your SerpApi key into SERPAPI_API_KEY
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Task 3 demo

1. Upload a clear face photo or use the camera. The browser compresses large camera/gallery images automatically for the search provider.
2. Click `RUN FACE → WEB → CHAIN`.
3. The browser detects/encodes the face.
4. The backend uploads the image to the search provider and performs a real Google Lens reverse-image search.
5. The UI shows up to three discovered source cards with the source URL.
6. The backend hashes the evidence record and stores it in a tamper-evident block.
7. The UI recomputes the fingerprint and chain state via `/api/verify-evidence`.
8. If `RPC_URL` + `PRIVATE_KEY` are configured, the same record hash is optionally anchored in a real EVM testnet transaction.

## Blockchain record

```text
recordHash = SHA256(JSON(record))
blockHash  = SHA256(index | timestamp | JSON(data) | previousHash | nonce)
```

The evidence record stores the input image hash, descriptor hash, search provider/search ID, and the selected discovered source metadata. Re-verification recomputes the record hash and checks the linked block chain.

## Known limitations

- Reverse-image results depend on the search provider's indexed web coverage; a result is not proof that a person owns or authored a page.
- face-api.js is suitable for a prototype, not forensic identification.
- The local chain is a demo chain. Public-chain anchoring is optional.
- Search-provider uploads are temporary; SerpApi documents a 10-minute lifetime for uploaded image IDs. citeturn483180search0
- Social-media pages can be blocked, login-gated, or absent from search indexes.
