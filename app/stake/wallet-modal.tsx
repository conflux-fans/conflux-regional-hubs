"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Connector } from "wagmi";
import { stakeCopy, type StakeLocale } from "../lib/staking/copy";

export function WalletModal({ connectors, errorMessage, pendingConnectorUid, locale = "en", onClose, onSelect }: {
  connectors: readonly Connector[];
  errorMessage?: string;
  pendingConnectorUid?: string;
  locale?: StakeLocale;
  onClose: () => void;
  onSelect: (connector: Connector) => void;
}) {
  const copy = stakeCopy(locale).modal;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog ref={dialogRef} className="wallet-modal" aria-labelledby="wallet-modal-title" onCancel={(event) => {
      if (pendingConnectorUid) event.preventDefault();
    }} onClose={onClose}>
      <header>
        <div><span>{copy.kicker}</span><h2 id="wallet-modal-title">{copy.title}</h2></div>
        <button type="button" aria-label={copy.closeLabel} title={copy.closeTitle} disabled={Boolean(pendingConnectorUid)} onClick={() => dialogRef.current?.close()}>×</button>
      </header>
      <p>{copy.intro}</p>
      {connectors.length ? (
        <div className="wallet-options">
          {connectors.map((connector) => {
            const pending = connector.uid === pendingConnectorUid;
            return (
              <button key={connector.uid} type="button" onClick={() => onSelect(connector)} disabled={Boolean(pendingConnectorUid)}>
                {connector.icon ? <Image src={connector.icon} alt="" width={42} height={42} unoptimized /> : <span aria-hidden="true">{connector.name.slice(0, 1).toUpperCase()}</span>}
                <b>{connector.name}</b>
                <small>{pending ? copy.opening : copy.extension}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="wallet-modal-empty"><b>{copy.emptyTitle}</b><p>{copy.emptyBody}</p></div>
      )}
      {errorMessage && <output className="wallet-modal-error" role="alert">{errorMessage}</output>}
    </dialog>
  );
}
