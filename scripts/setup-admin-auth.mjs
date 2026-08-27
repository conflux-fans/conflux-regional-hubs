import { randomBytes, webcrypto } from "node:crypto";
import { createInterface, emitKeypressEvents } from "node:readline";

const crypto = webcrypto;
const encoder = new TextEncoder();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 },
    material,
    256,
  );
  return `pbkdf2-sha256:210000:${base64Url(salt)}:${base64Url(new Uint8Array(bits))}`;
}

function ask(question) {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => input.question(question, (answer) => {
    input.close();
    resolve(answer.trim());
  }));
}

function askHidden(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal so the password can be entered without echoing.");
  }
  process.stdout.write(question);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("keypress", onKeypress);
      process.stdout.write("\n");
    }
    function onKeypress(character, key) {
      if (key?.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Cancelled."));
      } else if (key?.name === "return" || key?.name === "enter") {
        cleanup();
        resolve(value);
      } else if (key?.name === "backspace") {
        value = value.slice(0, -1);
      } else if (character && !key?.ctrl && !key?.meta) {
        value += character;
      }
    }
    process.stdin.on("keypress", onKeypress);
  });
}

try {
  const credentials = [];
  while (credentials.length < 20) {
    const email = (await ask(`Administrator ${credentials.length + 1} email: `)).toLowerCase();
    if (!emailPattern.test(email)) throw new Error("Enter a valid administrator email address.");
    if (credentials.some((credential) => credential.email === email)) throw new Error("Each administrator email must be unique.");

    const password = await askHidden("Password (at least 12 characters): ");
    if (password.length < 12) throw new Error("The password must contain at least 12 characters.");
    const confirmation = await askHidden("Confirm password: ");
    if (password !== confirmation) throw new Error("The passwords do not match.");
    credentials.push({ email, passwordHash: await hashPassword(password) });

    if (credentials.length === 20) break;
    const addAnother = (await ask("Add another administrator? [y/N]: ")).toLowerCase();
    if (addAnother !== "y" && addAnother !== "yes") break;
  }

  console.log("\nAdd these values to .env.local for development and to the hosting secret manager for production:\n");
  console.log(`ADMIN_CREDENTIALS_JSON='${JSON.stringify(credentials)}'`);
  console.log(`AUTH_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
