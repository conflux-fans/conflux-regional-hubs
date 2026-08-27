"use client";

import { useState } from "react";

export function ConnectWallet() {
  const [open, setOpen] = useState(false);
  return (
    <div className="wallet-module">
      <button type="button" className="v2-button v2-button-accent" onClick={() => setOpen(true)}>Connect wallet <span>↗</span></button>
      {open && <div className="wallet-notice" role="status"><div><strong>Wallet module</strong><p>The regional template is ready for the centrally maintained staking integration. No demo transaction is connected in V2.</p></div><button type="button" aria-label="Close message" onClick={() => setOpen(false)}>×</button></div>}
    </div>
  );
}
