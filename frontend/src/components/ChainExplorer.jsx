import { useEffect, useState } from "react";

export default function ChainExplorer({ apiBase, refreshKey, deviceId }) {
  const [chain, setChain] = useState([]), [validity, setValidity] = useState(null), [onchainConfigured, setOnchainConfigured] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/api/chain`)
      .then(r => r.json())
      .then(d => {
        const all = d.chain || [];
        const filtered = deviceId
          ? all.filter(block => block.data?.type === "genesis" || block.data?.deviceId === deviceId || block.data?.descriptorHash?.startsWith(`${deviceId}:`))
          : all;
        setChain(filtered);
        setValidity(d.validity || null);
        setOnchainConfigured(Boolean(d.onchainConfigured));
      })
      .catch(() => {});
  }, [apiBase, refreshKey, deviceId]);

  const records = chain.filter(block => block.data?.type !== "genesis");
  const visibleRecords = expanded ? records : records.slice(-10);
  const displayChain = [{ index: 0, hash: chain.find(block => block.data?.type === "genesis")?.hash || "", timestamp: new Date(0).toISOString(), data: { type: "genesis" } }, ...visibleRecords];

  return <div>
    <div className="chain-status">
      <span>{records.length} record{records.length === 1 ? "" : "s"} on this device</span>
      <span>Local integrity <b className={validity?.valid ? "ok-text" : "error-text"}>{validity ? (validity.valid ? "VALID" : `BROKEN #${validity.brokenAt}`) : "CHECKING"}</b></span>
      <span>Public anchor <b>{onchainConfigured ? "ON" : "LOCAL ONLY"}</b></span>
    </div>
    <div className="chain-list">
      {displayChain.slice().reverse().map((block, i) => <div className="block-row" key={block.hash || `genesis-${i}`}>
        <span className="block-index">#{block.data?.type === "genesis" ? 0 : block.index}</span>
        <div className="block-meta"><div className="block-type">{block.data?.type === "genesis" ? "Genesis" : "Web evidence record"}</div><div className="block-hash">{block.hash}</div></div>
        <div className="block-time">{block.data?.type === "genesis" ? "Chain start" : new Date(block.timestamp).toLocaleString()}</div>
      </div>)}
    </div>
    {records.length > 10 && <button className="chain-more" type="button" onClick={() => setExpanded(v => !v)}>{expanded ? "Show latest 10" : `Show all ${records.length} records ↓`}</button>}
  </div>;
}
