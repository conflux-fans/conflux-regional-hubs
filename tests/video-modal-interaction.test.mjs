import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const projectRequire = createRequire(new URL("../package.json", import.meta.url));
const React = projectRequire("react");
const ts = projectRequire("typescript");
const videoModalPath = fileURLToPath(new URL("../app/studio/video-modal.tsx", import.meta.url));

// The jsdom globals must exist before react-dom loads, otherwise React falls
// back to its legacy attachEvent input polyfill and controlled inputs never fire.
const dom = new JSDOM("<!doctype html><html><body><main id=app></main></body></html>", {
  url: "http://localhost/studio",
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  HTMLDialogElement: dom.window.HTMLDialogElement,
  HTMLInputElement: dom.window.HTMLInputElement,
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
const { createRoot } = projectRequire("react-dom/client");

const compilerOptions = {
  compilerOptions: {
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
};

function loadModule(filePath) {
  const compiled = ts.transpileModule(readFileSync(filePath, "utf8"), compilerOptions).outputText;
  const moduleInstance = { exports: {} };
  const localRequire = (id) => {
    if (id === "react") return React;
    if (id === "react-player") return { __esModule: true, default: (props) => React.createElement("div", props) };
    if (id.startsWith(".")) {
      for (const suffix of [".tsx", ".ts"]) {
        const candidate = path.resolve(path.dirname(filePath), id + suffix);
        if (existsSync(candidate)) return loadModule(candidate);
      }
      return loadModule(path.resolve(path.dirname(filePath), id));
    }
    return projectRequire(id);
  };
  new Function("require", "module", "exports", compiled)(localRequire, moduleInstance, moduleInstance.exports);
  return moduleInstance.exports;
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

let videoModal;
function Harness({ onInsert }) {
  const [open, setOpen] = React.useState(false);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { type: "button", onClick: () => setOpen(true) }, "Add video"),
    open && React.createElement(
      (videoModal ??= loadModule(videoModalPath).VideoModal),
      { onClose: () => setOpen(false), onInsert },
    ),
  );
}

test("video modal gates Insert on a whitelisted link and inserts the trimmed URL", async () => {
  const inserted = [];
  const root = createRoot(document.querySelector("#app"));
  try {
    await React.act(async () => {
      root.render(React.createElement(Harness, { onInsert: (url) => inserted.push(url) }));
    });
    await React.act(async () => {
      document.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const dialog = document.querySelector("dialog");
    assert.equal(dialog?.open, true);

    const input = dialog.querySelector(".setup-field input");
    const insertButton = () => dialog.querySelector(".video-modal-actions .v2-button");

    await React.act(async () => setInputValue(input, "https://example.com/watch"));
    assert.equal(insertButton().disabled, true, "Insert stays disabled for a non-whitelisted link");
    assert.ok(dialog.querySelector(".video-modal-status.error"), "shows the unsupported-link hint");
    assert.equal(dialog.querySelector(".video-modal-preview"), null, "no preview for an unsupported link");

    await React.act(async () => setInputValue(input, "  https://youtu.be/dQw4w9WgXcQ  "));
    assert.equal(insertButton().disabled, false, "Insert enables once the link is whitelisted");
    assert.match(dialog.querySelector(".video-modal-status.ok").textContent, /YouTube/);
    assert.ok(dialog.querySelector(".video-modal-preview .video-embed"), "renders the live preview player");

    await React.act(async () => {
      insertButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.deepEqual(inserted, ["https://youtu.be/dQw4w9WgXcQ"], "inserts the trimmed, validated URL");
    assert.equal(document.querySelector("dialog"), null, "modal closes after inserting");
  } finally {
    await React.act(async () => root.unmount());
  }
});

test("video modal closes without inserting when cancelled", async () => {
  const inserted = [];
  const root = createRoot(document.querySelector("#app"));
  try {
    await React.act(async () => {
      root.render(React.createElement(Harness, { onInsert: (url) => inserted.push(url) }));
    });
    await React.act(async () => {
      document.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const dialog = document.querySelector("dialog");
    assert.equal(dialog?.open, true);

    await React.act(async () => {
      dialog.querySelector(".video-modal-actions > button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.deepEqual(inserted, [], "cancel does not insert anything");
    assert.equal(document.querySelector("dialog"), null, "modal closes on cancel");
  } finally {
    await React.act(async () => root.unmount());
  }
});
