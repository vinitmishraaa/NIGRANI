# NIGRANI

> **HH Goa 2026 — Task 3**
>
> **Web Image Search · Evidence Discovery · Blockchain Verification**

[![Live Demo](https://img.shields.io/badge/Live-Demo-ff3b30?style=flat-square)](https://nigrani-g05v.onrender.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-111111?style=flat-square&logo=github)](https://github.com/vinitmishraaa/NIGRANI)

## Overview

**NIGRANI** is an end-to-end prototype that combines local computer vision, genuine reverse-image search, public-web evidence discovery, and tamper-evident blockchain-style record verification in a single workflow.

The system is designed around a simple idea: when a user supplies an image of a supported living subject, NIGRANI first checks the image locally, searches the public web for an **exact image match** where available, falls back to **relevant visual matches** when an exact source is not found, and then fingerprints the discovered evidence so the record can be re-verified.

NIGRANI is focused on **image provenance and public-web evidence discovery**. It is not a people registry and does not return a person's name or identity from an arbitrary face.

## Live Demo

**Website:** https://nigrani-g05v.onrender.com/

**GitHub:** https://github.com/vinitmishraaa/NIGRANI

## Core Workflow

```text
Upload / Camera
      ↓
Direct image adjustment in the upload box
      ↓
Local living-subject detection
      ↓
Human face encoding when a visible face is available
      ↓
Genuine reverse-image search
      ↓
Exact public image match (priority)
      ↓
Relevant visual/public sources (fallback)
      ↓
Evidence record + SHA-256 fingerprint
      ↓
Tamper-evident blockchain-style block
      ↓
Re-verification of fingerprint + chain integrity
```

## Key Features

### 1. Direct image adjustment

The uploaded image stays inside the main image box. The user can adjust it directly without opening a separate crop editor.

- Drag to reposition the image.
- Pinch with two fingers on mobile to zoom.
- Use the mouse wheel on desktop to zoom.
- The full image remains available with black letterbox space when aspect ratios differ.
- The adjusted view is rendered into the actual image sent for detection/search.

### 2. Living-subject detection

NIGRANI does not require a human face for every search.

Supported living-subject categories currently include classes such as:

`person`, `bird`, `cat`, `dog`, `horse`, `sheep`, `cow`, `elephant`, `bear`, `zebra`, `giraffe`, and `potted plant`.

For a **person**, the system additionally attempts local face detection/encoding when a face is visible. For supported animal/living-object images, web discovery can proceed without face encoding.

A non-living object is rejected locally instead of being sent through the living-subject search flow.

### 3. Exact-match-first web discovery

NIGRANI uses a genuine reverse-image search backend. Results are prioritised so that exact public image matches are shown first whenever the search provider exposes them.

When an exact match is unavailable, the system falls back to visually relevant public-web sources.

The UI labels results as either:

- **exact image**
- **visual match**

Each displayed source includes the title, source, thumbnail when available, and a link to open the source page.

### 4. Evidence fingerprinting

For every search, NIGRANI creates an evidence record containing the image hash, subject information, search metadata, and selected source metadata.

The record is fingerprinted with SHA-256:

```text
recordHash = SHA256(JSON(record))
```

A block then links that record to the previous block through another SHA-256 hash and a simple proof-of-work requirement:

```text
blockHash = SHA256(index | timestamp | JSON(data) | previousHash | nonce)
```

### 5. Evidence re-verification

After a search completes, the application re-checks:

- stored record fingerprint,
- reconstructed/canonical fingerprint,
- evidence consistency,
- chain integrity.

A successful re-check is displayed as **VERIFIED**.

### 6. Device-specific blockchain explorer

The demo maintains separate explorer views for different browser/device identities instead of presenting every device's evidence in one shared UI.

The explorer is intentionally compact:

- latest **10 records** are shown first;
- older records can be expanded with **Show all**;
- the list can be collapsed back to the latest 10 records.

### 7. Optional public-chain anchoring

The project can optionally anchor the generated record fingerprint to an EVM-compatible testnet when the required environment variables are configured.

Without those credentials, the prototype continues to use its local tamper-evident chain.

## Architecture

```text
NIGRANI/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── faceEngine.js
│   │   ├── styles.css
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── Footer.jsx
│   │       ├── SearchPanel.jsx
│   │       └── ChainExplorer.jsx
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── nigrani-eye.svg
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── backend/
    ├── server.js
    ├── search.js
    ├── blockchain.js
    ├── onchain.js
    ├── package.json
    └── chain-data.json
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Living-subject detection | TensorFlow.js + COCO-SSD |
| Human face processing | face-api-compatible browser models |
| Backend | Node.js + Express |
| Reverse-image search | SerpApi Image API + Google Lens |
| Evidence hashing | SHA-256 |
| Chain mechanism | Local hash-linked blocks + proof of work |
| Optional blockchain | EVM testnet via ethers.js |
| Deployment | Render |

## Project Structure

### Frontend

`App.jsx` coordinates model loading, API communication, evidence verification, and the blockchain explorer.

`SearchPanel.jsx` handles image upload/camera capture, direct image manipulation, local living-subject detection, optional face encoding, reverse-image search requests, and result display.

`faceEngine.js` loads the browser vision models and exposes living-subject detection plus human face descriptor generation.

`ChainExplorer.jsx` displays the device-specific blockchain-style evidence records.

`styles.css` contains the red/black NIGRANI interface, responsive layout, image manipulation UI, and verification states.

### Backend

`server.js` exposes the API endpoints for search, evidence re-verification, health checks, and chain access.

`search.js` uploads the image and performs exact-match and visual-match reverse-image discovery.

`blockchain.js` manages device-scoped chains, block creation, SHA-256 hashing, proof-of-work, and chain validation.

`onchain.js` contains the optional EVM testnet anchoring layer.

## API Endpoints

### `GET /api/health`

Returns service status and whether search/on-chain configuration is available.

### `POST /api/search`

Accepts the prepared image plus detected subject metadata, performs reverse-image search, creates an evidence record, and appends a block to the device-scoped chain.

### `POST /api/verify-evidence`

Reconstructs the record fingerprint, compares the stored fingerprint, checks evidence consistency, and validates chain integrity.

### `GET /api/chain`

Returns the current device-scoped chain and chain validity information.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/vinitmishraaa/NIGRANI.git
cd NIGRANI
```

### 2. Start the backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
SERPAPI_API_KEY=your_serpapi_key
```

Optional EVM configuration:

```env
RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

Start the API:

```bash
npm run dev
```

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Usage

1. Upload an image or use **Click Photo**.
2. Adjust the image directly inside the image box when required.
3. Click **RUN FACE → WEB → CHAIN**.
4. NIGRANI checks whether a supported living subject is present.
5. Human images may receive face encoding when a visible face is available.
6. The backend performs a genuine reverse-image search.
7. Exact public image matches are prioritised; otherwise relevant visual matches are returned.
8. The selected evidence is fingerprinted and added to the device-specific chain.
9. The application re-verifies the evidence and displays the result.

## Deployment

The current demo deployment uses Render.

Frontend:

`https://nigrani-g05v.onrender.com/`

Backend:

`https://nigrani-backend-8bfx.onrender.com`

For production deployments, keep API secrets on the backend/server environment rather than exposing them in frontend code.

## Design

NIGRANI uses a minimal **black + red** visual language with:

- NIGRANI branding;
- red eye mark;
- responsive layout;
- mobile-friendly camera flow;
- direct image manipulation inside the upload area;
- compact evidence cards;
- blockchain-style evidence explorer;
- PWA/web-shortcut metadata using the NIGRANI name and eye icon.

## Limitations

- Reverse-image search quality depends on the search provider's indexed coverage. A public page existing online does not guarantee that it will be returned by the provider.
- Exact image matches are not guaranteed for every public social-media post.
- The local living-subject detector is limited to its configured model classes.
- Face encoding is a prototype capability and is not forensic identification.
- The prototype does not maintain a people registry and does not infer a person's name from an uploaded face.
- Social-media pages may be blocked, login-gated, deleted, private, or absent from public search indexes.
- The local chain is a demonstration chain. Optional EVM anchoring is required for public-chain persistence.

## Security Notes

- Keep `SERPAPI_API_KEY`, `RPC_URL`, and `PRIVATE_KEY` out of frontend source code.
- Do not commit `.env` files or private keys.
- Treat reverse-image matches as evidence sources, not as proof of authorship, ownership, or identity.

## Task Context

**HH Goa 2026 — Task 3** focuses on demonstrating a working pipeline for image/face processing, web evidence discovery, and blockchain-backed evidence verification.

NIGRANI implements that flow as a compact prototype with a real reverse-image search integration and a tamper-evident evidence record layer.

## Author

**B&D by Vinit Mishra**

GitHub: https://github.com/vinitmishraaa/NIGRANI
