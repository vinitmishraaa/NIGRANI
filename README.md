<div align="center">

# 👁️ NIGRANI

### Image In • Web Evidence Discovered • Integrity Verified

<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=111827" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/SerpApi-111827?style=for-the-badge" alt="SerpApi" />
  <img src="https://img.shields.io/badge/Google%20Lens-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Lens" />
  <img src="https://img.shields.io/badge/SHA--256-8B0000?style=for-the-badge" alt="SHA-256" />
  <img src="https://img.shields.io/badge/Blockchain-Evidence-111111?style=for-the-badge" alt="Blockchain Evidence" />
</p>

<i>A web-image evidence and verification prototype that combines local vision, reverse-image search, evidence fingerprinting and tamper-evident records.</i>

<p>
  <a href="https://nigrani-g05v.onrender.com/">🌐 Live Demo</a>
  &nbsp;•&nbsp;
  <a href="https://github.com/vinitmishraaa/NIGRANI">💻 GitHub</a>
</p>

</div>

---

## 🚀 About NIGRANI

**NIGRANI** is an image-evidence discovery and verification system built for **HH Goa 2026 — Task 3**.

The project takes a submitted image, validates that it contains a supported living subject, performs a genuine reverse-image search, prioritises exact public-image matches when available, collects relevant public-web evidence, and creates a tamper-evident record that can be verified later.

The goal is **provenance and evidence discovery**, not person identification.

NIGRANI does not maintain a people registry and does not attempt to infer or return a person's identity from an arbitrary face.

## 🌐 Live

| Resource | Link |
|---|---|
| 🌐 **Live Website** | https://nigrani-g05v.onrender.com/ |
| 💻 **GitHub Repository** | https://github.com/vinitmishraaa/NIGRANI |
| ⚙️ **Backend API** | https://nigrani-backend-8bfx.onrender.com |

## ✨ Key Features

| Feature | Description |
|---|---|
| 📷 **Upload / Camera Input** | Upload an image or capture one directly from the browser. |
| 🖼️ **Direct Image Adjustment** | Reposition and zoom the image inside the main upload box without a separate crop editor. |
| 🧠 **Living-Subject Detection** | Local computer vision checks for supported living subjects before web search. |
| 👤 **Optional Face Processing** | Human images can receive local face detection/encoding when a visible face is available. |
| 🔎 **Reverse Image Search** | Uses SerpApi + Google Lens for real public-web image discovery. |
| 🎯 **Exact-Match Priority** | Exact public image matches are surfaced before visual/relevant matches. |
| 🌐 **Visual Fallback** | Relevant visual sources are returned when an exact match is unavailable. |
| 🔐 **Evidence Fingerprinting** | Search evidence is hashed with SHA-256 to create a stable record fingerprint. |
| ⛓️ **Tamper-Evident Chain** | Records are stored in hash-linked blocks with proof of work and chain validation. |
| ✅ **Re-Verification** | Stored fingerprints and evidence integrity can be checked again after search. |
| 📱 **Device-Scoped Explorer** | The demo is designed to keep explorer records separated by browser/device identity. |
| ⛓️ **Optional EVM Anchor** | The generated fingerprint can optionally be anchored to an EVM-compatible testnet. |

## 🧩 How It Works

```text
📷 Upload / Camera
        ↓
🖼️ Direct image adjustment
        ↓
🧠 Living-subject detection
        ↓
👤 Face processing (human images, when available)
        ↓
🔎 Reverse-image search
        ↓
🎯 Exact public-image match
        ↓
🌐 Visual / relevant sources
        ↓
🔐 Evidence record + SHA-256 fingerprint
        ↓
⛓️ Hash-linked blockchain-style block
        ↓
✅ Re-verification
        ↓
📊 Evidence + integrity status
```

## 🎯 What NIGRANI Actually Verifies

NIGRANI works with the **image and its public-web evidence**.

It can answer questions such as:

```text
Was this image found publicly on the web?
        ↓
Where was the matching/relevant image indexed?
        ↓
Was an exact image match available?
        ↓
What evidence was recorded for this search?
        ↓
Has that stored evidence remained consistent?
```

It does **not** claim that a reverse-image result proves identity, ownership, authorship or authenticity by itself.

## 🔎 Reverse-Image Search Strategy

NIGRANI performs two search modes for each prepared image:

```text
                    Image Upload
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
       Exact Matches          Visual Matches
              ↓                     ↓
              └──────────┬──────────┘
                         ↓
                   Merge + Deduplicate
                         ↓
              Exact results first
                         ↓
               Visual fallback after
```

The result cards distinguish between:

- **Exact image** — the provider exposed the image as an exact match.
- **Visual match** — the provider found a visually relevant source.

The search provider's index determines what can be discovered. A public page existing online does not guarantee that it will appear in search results.

## 🧠 Local Vision Layer

The browser performs local validation before sending the image to the backend search pipeline.

The current detector is built around **TensorFlow.js + COCO-SSD** for supported living-subject classes.

Current supported categories include classes such as:

```text
person
bird
cat
 dog
horse
sheep
cow
elephant
bear
zebra
giraffe
potted plant
```

For human images, NIGRANI can additionally attempt face processing when a visible face is present.

This local gate prevents ordinary non-living objects from being treated as valid living-subject evidence submissions.

## 🔐 Evidence Fingerprinting

Every completed search produces a structured evidence record containing information such as:

```text
Image hash
Subject type
Face-processing status
Search metadata
Exact-match count
Result count
Selected evidence metadata
Timestamp
```

The record is then fingerprinted with SHA-256:

```text
recordHash = SHA256(JSON(record))
```

This gives the evidence record a deterministic integrity fingerprint.

## ⛓️ Tamper-Evident Blockchain-Style Chain

NIGRANI links evidence records into a simple local chain.

```text
Block N
   │
   ├── index
   ├── timestamp
   ├── evidence record
   ├── recordHash
   ├── previousHash
   └── nonce
          ↓
      blockHash
          ↓
        Block N+1
```

Block hashes are derived from the block contents and the previous block hash:

```text
blockHash = SHA256(index | timestamp | JSON(data) | previousHash | nonce)
```

A proof-of-work requirement is used to make block creation deterministic and to provide a simple tamper-evident chain demonstration.

## ✅ Evidence Re-Verification

NIGRANI can verify a previously created evidence record by checking:

```text
Stored record hash
        ↓
Reconstructed fingerprint
        ↓
Evidence consistency
        ↓
Chain integrity
        ↓
VERIFIED / FAILED
```

A successful verification means the stored record and its chain relationships remain consistent with the recorded fingerprint at verification time.

## 📊 Blockchain Explorer

The application includes a compact evidence explorer for the generated local records.

The intended UI behaviour is:

```text
Latest 10 records
       ↓
   Show all
       ↓
Older records
```

The explorer is kept separate from the web-search results so that **public evidence discovery** and **local integrity records** remain distinct parts of the workflow.

## 🏗️ Architecture

```text
                         ┌─────────────────────────┐
                         │      React + Vite       │
                         │       Frontend          │
                         └────────────┬────────────┘
                                      │
                               Image / Camera
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Local Vision Layer    │
                         │ TensorFlow.js + COCO    │
                         │        -SSD             │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      Express API        │
                         │       Backend           │
                         └────────────┬────────────┘
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                    Image Search   Evidence    Chain Logic
                         │          Record          │
                         ▼            │              ▼
                SerpApi / Lens      SHA-256   Hash-linked Blocks
                         │            │              │
                         └────────────┴──────────────┘
                                      │
                                      ▼
                              Verification Result
```

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Vision | TensorFlow.js + COCO-SSD |
| Human Face Processing | Face-api-compatible browser models |
| Backend | Node.js + Express |
| Reverse Image Search | SerpApi Image API + Google Lens |
| Evidence Hashing | SHA-256 |
| Chain | Local hash-linked blocks + proof of work |
| Optional Public Anchor | EVM-compatible testnet + ethers.js |
| Deployment | Render |

## 📁 Repository Structure

```text
NIGRANI/
├── frontend/
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── nigrani-eye.svg
│   ├── src/
│   │   ├── App.jsx
│   │   ├── faceEngine.js
│   │   ├── styles.css
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── Footer.jsx
│   │       ├── SearchPanel.jsx
│   │       └── ChainExplorer.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── backend/
    ├── server.js
    ├── search.js
    ├── blockchain.js
    ├── onchain.js
    ├── chain-data.json
    └── package.json
```

## ⚙️ Backend API

### `GET /api/health`

Returns backend health and configuration status.

### `POST /api/search`

Accepts the prepared image and local subject metadata, performs reverse-image search, creates an evidence record and appends it to the chain.

### `POST /api/verify-evidence`

Reconstructs the stored fingerprint, checks evidence consistency and validates the chain.

### `GET /api/chain`

Returns chain records and chain validation information for the explorer.

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- A SerpApi API key
- A modern browser with camera support when using **Click Photo**

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

Create `backend/.env`:

```env
SERPAPI_API_KEY=your_serpapi_api_key
```

Optional public-chain configuration:

```env
RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

Start the backend:

```bash
npm run dev
```

### 3. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## 🧪 Using the Demo

```text
1. Upload an image or click Photo
2. Adjust the image inside the upload box
3. Run the NIGRANI pipeline
4. Local vision validates the subject
5. Reverse-image search discovers public evidence
6. Exact matches are prioritised
7. Evidence is fingerprinted
8. A chain block is created
9. NIGRANI re-verifies the record
10. Explore the stored evidence in the chain section
```

## 🔐 Security Notes

Keep all credentials on the backend/server side.

Do not commit:

```text
.env
API keys
private keys
node_modules/
```

The reverse-image provider should be treated as an evidence-discovery service, not as an authority that automatically proves authenticity or identity.

## ⚠️ Limitations

- Search coverage depends on the provider's indexed web content.
- Exact matches are not guaranteed for every public image or social-media post.
- Private, deleted, login-gated or unindexed pages may not be discoverable.
- Local vision is limited to the classes supported by the configured model.
- Face processing is a prototype browser capability, not forensic identification.
- The local blockchain-style chain is a tamper-evident demonstration mechanism rather than a decentralised public blockchain by itself.
- Public EVM persistence requires separate testnet configuration and credentials.

## 🔮 Future Scope

NIGRANI can be extended with:

- 🌐 More search providers for cross-engine evidence comparison.
- 🧩 Stronger evidence clustering and source correlation.
- 📸 Perceptual hashes for near-duplicate image detection.
- 🕒 Historical source snapshots and timeline reconstruction.
- ⛓️ Public-chain anchoring for long-term integrity proofs.
- 📊 Confidence scoring across multiple independent evidence sources.
- 🧪 Automated evaluation datasets for reverse-image retrieval quality.
- ☁️ Persistent database-backed storage for production deployments.
- 🛡️ Stronger privacy controls and configurable retention policies.

### 🎯 Long-Term Vision

```text
Capture
  ↓
Detect
  ↓
Discover
  ↓
Correlate
  ↓
Fingerprint
  ↓
Verify
  ↓
Preserve Evidence
```

## 📌 Task Context

**HH Goa 2026 — Task 3**

NIGRANI demonstrates a compact end-to-end prototype connecting:

```text
Local Vision
     +
Reverse Image Search
     +
Public Web Evidence
     +
Cryptographic Fingerprinting
     +
Tamper-Evident Records
```

The project is intentionally focused on **image provenance and evidence verification**, with identity inference kept outside the system's scope.

---

<div align="center">

### 👁️ NIGRANI

<i>Observe • Discover • Fingerprint • Verify</i>

<p>
  <a href="https://nigrani-g05v.onrender.com/">🌐 Live Demo</a>
  &nbsp;•&nbsp;
  <a href="https://github.com/vinitmishraaa/NIGRANI">💻 GitHub</a>
</p>

**B&D by Vinit Mishra**

</div>
