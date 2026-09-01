import { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import ChainExplorer from "./components/ChainExplorer.jsx";
import { loadFaceModels } from "./faceEngine.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function App() {
  const [modelsReady, setModelsReady] = useState(false);
  const [result, setResult] = useState(null);
  const [chainRefresh, setChainRefresh] = useState(0);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true)).catch(console.error);
  }, []);

  return (
    <div className="app">
      <Header />
      <div className="notice">
        <strong>Pipeline:</strong> face detected → image searched on the public web → top matching sources captured → evidence fingerprinted → blockchain re-verified.
      </div>

      <section className="hero-section">
        <div className="section-head"><span className="section-num">01</span><h2>Face verification & web evidence</h2></div>
        <p className="section-desc">Choose a face photo or take one with the camera. Nigrani detects one face locally, performs a genuine reverse-image search, shows up to three public matches, and records the discovered evidence.</p>
        <SearchPanel apiBase={API_BASE} modelsReady={modelsReady} onComplete={(data) => { setResult(data); setChainRefresh(n => n + 1); }} />
      </section>

      {result && (
        <section className="section">
          <div className="section-head"><span className="section-num">02</span><h2>Evidence fingerprint</h2></div>
          <p className="section-desc">Each discovered source is turned into an evidence record, fingerprinted with SHA-256, and written to the tamper-evident chain. Optional EVM testnet anchoring can store the same fingerprint in a public transaction.</p>
          <EvidenceVerification apiBase={API_BASE} result={result} />
        </section>
      )}

      <section className="section">
        <div className="section-head"><span className="section-num">03</span><h2>Blockchain explorer</h2></div>
        <p className="section-desc">This panel shows the evidence blocks created by the demo and whether the local chain is still intact.</p>
        <ChainExplorer apiBase={API_BASE} refreshKey={chainRefresh} />
      </section>
      <Footer />
    </div>
  );
}

function EvidenceVerification({ apiBase, result }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    fetch(`${apiBase}/api/verify-evidence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordHash: result.recordHash, evidence: result.evidence }) })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "verification failed"); return d; })
      .then(d => setState({ loading: false, ...d })).catch(e => setState({ loading: false, error: e.message }));
  }, [apiBase, result]);
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
