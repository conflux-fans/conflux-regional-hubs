import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { JSDOM } from "jsdom";

const projectRequire = createRequire(new URL("../package.json", import.meta.url));
const React = projectRequire("react");
const { createRoot } = projectRequire("react-dom/client");
const ts = projectRequire("typescript");

function loadWalletModal(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const walletModule = { exports: {} };
  const localRequire = (id) => {
    if (id === "next/image") {
      return { __esModule: true, default: (props) => React.createElement("img", props) };
    }
    return projectRequire(id);
  };
  new Function("require", "module", "exports", compiled)(localRequire, walletModule, walletModule.exports);
  return walletModule.exports.WalletModal;
}

test("wallet picker remains open after clicking Connect wallet in React StrictMode", async () => {
  const dom = new JSDOM("<!doctype html><html><body><main id=app></main></body></html>", {
    url: "http://localhost/stake",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLDialogElement: dom.window.HTMLDialogElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperties(dom.window.HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        if (this.open) throw new dom.window.DOMException("Dialog is already open", "InvalidStateError");
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value() {
        if (!this.open) return;
        this.open = false;
        this.dispatchEvent(new dom.window.Event("close"));
      },
    },
  });

  const source = await readFile(new URL("../app/stake/wallet-modal.tsx", import.meta.url), "utf8");
  const WalletModal = loadWalletModal(source);
  function Harness() {
    const [open, setOpen] = React.useState(false);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement("button", { type: "button", onClick: () => setOpen(true) }, "Connect wallet"),
      open && React.createElement(WalletModal, {
        connectors: [],
        onClose: () => setOpen(false),
        onSelect: () => {},
      }),
    );
  }

  const root = createRoot(document.querySelector("#app"));
  try {
    await React.act(async () => {
      root.render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
    });
    await React.act(async () => {
      document.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(document.querySelector("dialog")?.open, true);
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
  }
});
