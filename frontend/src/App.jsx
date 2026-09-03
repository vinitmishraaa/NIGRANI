import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import ChainExplorer from "./components/ChainExplorer.jsx";
import { loadVisionModels } from "./faceEngine.js";

const API_BASE = import.meta.env.VITE_API_BASE || "https://nigrani-backend-8bfx.onrender.com";

function getDeviceId() {
  const key = "nigrani-device-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
}

export default function App() {
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState("");
  const [result, setResult] = useState(null);
  const [chainRefresh, setChainRefresh] = useState(0);
  const [deviceId] = useState(() => getDeviceId());

  useEffect(() => {
    let active = true;
    loadVisionModels()
      .then(() => { if (active) setModelsReady(true); })
      .catch((error) => { if (active) setModelError(error?.message || "Vision models could not be loaded."); });
    return () => { active = false; };
  }, []);

  return (
    <div className="app">
      <Header />
      <div className="notice">
        <strong>Pipeline:</strong> human face or animal detected locally → public web image search → exact/relevant sources captured → evidence fingerprinted → blockchain re-verified.
      </div>
      {modelError && <div className="config-warning">Vision model error: {modelError}</div>}
      <section className="hero-section">
        <div className="section-head"><span className="section-num">01</span><h2>Web image search &amp; evidence</h2></div>
        <p className="section-desc">Upload a human or supported animal image. Nigrani first detects a visible human face or supported animal locally. Only those two subject types are allowed to proceed to public web image search; unrelated objects are rejected.</p>
        <SearchPanel apiBase={API_BASE} modelsReady={modelsReady} deviceId={deviceId} onComplete={(data) => {
          if (data?.matched && data?.evidence?.length && data?.recordHash) {
            setResult(data);
            setChainRefresh(n => n + 1);
          } else {
            setResult(null);
          }
        }} />
      </section>
      {result && (
        <section className="section">
          <div className="section-head"><span className="section-num">02</span><h2>Evidence fingerprint</h2></div>
          <p className="section-desc">Only a successful web match creates an evidence record, SHA-256 fingerprint, and blockchain block. A no-match search is never shown as verified.</p>
          <EvidenceVerification apiBase={API_BASE} result={result} deviceId={deviceId} />
        </section>
      )}
      <section className="section">
        <div className="section-head"><span className="section-num">03</span><h2>Blockchain explorer</h2></div>
        <p className="section-desc">This panel shows the evidence blocks for this browser/device. The latest 10 records are shown first; older records stay collapsed until expanded.</p>
        <ChainExplorer apiBase={API_BASE} refreshKey={chainRefresh} deviceId={deviceId} />
      </section>
      <Footer />
    </div>
  );
}

function EvidenceVerification({ apiBase, result, deviceId }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    fetch(`${apiBase}/api/verify-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
      body: JSON.stringify({ recordHash: result.recordHash, evidence: result.evidence }),
    })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "verification failed"); return d; })
      .then(d => setState({ loading: false, ...d }))
      .catch(e => setState({ loading: false, error: e.message }));
  }, [apiBase, result, deviceId]);
  if (state.loading) return <div className="panel">Re-verifying evidence fingerprint…</div>;
  if (state.error) return <div className="panel status-line error">{state.error}</div>;
  return <div className={`panel verification-panel ${state.verified ? "verified" : "failed"}`}>
    <div className="verification-badge">{state.verified ? "VERIFIED" : "FAILED"}</div>
    <dl className="kv">
      <dt>Record fingerprint</dt><dd>{result.recordHash}</dd>
      <dt>Fingerprint match</dt><dd>{state.fingerprintMatches ? "yes" : "no"}</dd>
      <dt>Evidence unchanged</dt><dd>{state.evidenceMatches ? "yes" : "no"}</dd>
      <dt>Chain integrity</dt><dd>{state.chainValid?.valid ? "valid" : `broken at #${state.chainValid?.brokenAt}`}</dd>
      <dt>Block</dt><dd>#{state.block?.index} · {state.block?.hash}</dd>
      {result.onchain?.txHash && <><dt>Testnet transaction</dt><dd>{result.onchain.txHash}</dd></>}
    </dl>
  </div>;
}
