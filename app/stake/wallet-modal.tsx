"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Connector } from "wagmi";

export function WalletModal({ connectors, errorMessage, pendingConnectorUid, onClose, onSelect }: {
  connectors: readonly Connector[];
  errorMessage?: string;
  pendingConnectorUid?: string;
  onClose: () => void;
  onSelect: (connector: Connector) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="wallet-modal" aria-labelledby="wallet-modal-title" onCancel={(event) => {
      if (pendingConnectorUid) event.preventDefault();
    }} onClose={onClose}>
      <header>
        <div><span>WALLET CONNECTION</span><h2 id="wallet-modal-title">Choose a wallet</h2></div>
        <button type="button" aria-label="Close wallet selection" title="Close" disabled={Boolean(pendingConnectorUid)} onClick={() => dialogRef.current?.close()}>×</button>
      </header>
      <p>Select a browser wallet to continue. The wallet extension will ask you to approve the connection.</p>
      {connectors.length ? (
        <div className="wallet-options">
          {connectors.map((connector) => {
            const pending = connector.uid === pendingConnectorUid;
            return (
              <button key={connector.uid} type="button" onClick={() => onSelect(connector)} disabled={Boolean(pendingConnectorUid)}>
                {connector.icon ? <Image src={connector.icon} alt="" width={42} height={42} unoptimized /> : <span aria-hidden="true">{connector.name.slice(0, 1).toUpperCase()}</span>}
                <b>{connector.name}</b>
                <small>{pending ? "Opening..." : "Browser extension"}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="wallet-modal-empty"><b>No compatible wallets found</b><p>Install an EIP-6963 compatible browser wallet, then refresh this page.</p></div>
      )}
      {errorMessage && <output className="wallet-modal-error" role="alert">{errorMessage}</output>}
    </dialog>
  );
}
