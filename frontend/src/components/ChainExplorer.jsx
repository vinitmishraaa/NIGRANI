import { useEffect, useState } from "react";
export default function ChainExplorer({ apiBase, refreshKey }) {
  const [chain, setChain] = useState([]), [validity, setValidity] = useState(null), [onchainConfigured, setOnchainConfigured] = useState(false);
  useEffect(() => { fetch(`${apiBase}/api/chain`).then(r => r.json()).then(d => { setChain(d.chain || []); setValidity(d.validity || null); setOnchainConfigured(Boolean(d.onchainConfigured)); }).catch(() => {}); }, [apiBase, refreshKey]);
  return <div>
    <div className="chain-status"><span>{chain.length} block{chain.length === 1 ? "" : "s"}</span><span>Local integrity <b className={validity?.valid ? "ok-text" : "error-text"}>{validity ? (validity.valid ? "VALID" : `BROKEN #${validity.brokenAt}`) : "CHECKING"}</b></span><span>Public anchor <b>{onchainConfigured ? "ON" : "LOCAL ONLY"}</b></span></div>
    <div className="chain-list">{chain.slice().reverse().map(block => <div className="block-row" key={block.hash}><span className="block-index">#{block.index}</span><div className="block-meta"><div className="block-type">{block.data?.type === "genesis" ? "Genesis" : "Web evidence record"}</div><div className="block-hash">{block.hash}</div></div><div className="block-time">{new Date(block.timestamp).toLocaleString()}</div></div>)}</div>
  </div>;
}
