// Utilidades compartidas por los scripts del taller. Sin dependencias: solo Node.
// Todo pasa por la Stellar CLI, que habla con un nodo Stellar RPC. Nada de Horizon.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WASM_DIR = join(ROOT, "target", "wasm32v1-none", "release");

// ─── Solo TESTNET ───────────────────────────────────────────────────────────
// Estos valores están fijos a propósito: ningún script de este repo puede apuntar a mainnet.
export const TESTNET = Object.freeze({
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
});
const RED = ["--rpc-url", TESTNET.rpcUrl, "--network-passphrase", TESTNET.networkPassphrase];

const LOCAL_FILE = resolve(ROOT, process.env.CASO_LOCAL ?? join(".caso", "local.json"));
export const CASO_FILE = join(ROOT, "config", "caso.json");
export const DATA_FILE = join(ROOT, "config", "caso.data.json");
export const SECRETO_FILE = join(ROOT, ".caso", "secreto.json");

// ─── Consola ────────────────────────────────────────────────────────────────

const paint = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;
export const c = {
  bold: paint(1),
  dim: paint(2),
  red: paint(31),
  green: paint(32),
  yellow: paint(33),
  blue: paint(34),
  magenta: paint(35),
  cyan: paint(36),
};

export function step(msg) {
  console.log(`\n${c.cyan("▶")} ${c.bold(msg)}`);
}

export function fail(msg, hint) {
  console.error(`\n${c.red("✖")} ${msg}`);
  if (hint) console.error(`  ${c.dim(hint)}`);
  process.exit(1);
}

export const explorer = {
  contract: (id) => `https://stellar.expert/explorer/testnet/contract/${id}`,
  account: (addr) => `https://stellar.expert/explorer/testnet/account/${addr}`,
  tx: (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
};

export async function ask(question, fallback) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question}${fallback ? c.dim(` (${fallback})`) : ""}: `)).trim();
  rl.close();
  return answer || fallback;
}

/** Pide confirmación solo si hay alguien en la terminal. `--si` la salta. */
export async function confirm(question) {
  if (process.argv.includes("--si") || !process.stdin.isTTY) return true;
  const a = (await ask(`${question} [s/N]`, "")).toLowerCase();
  return a === "s" || a === "si" || a === "sí" || a === "y";
}

/** Argumentos posicionales (sin flags como --si). */
export const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// ─── Lo que aprendes en cada paso ───────────────────────────────────────────

export function explicarLectura() {
  console.log(
    `\n  ${c.blue("📖 Esto fue una LECTURA:")} se simuló en un nodo RPC. ${c.bold("No firmaste, no pagaste fee")} y nada cambió en la blockchain.`,
  );
}

export function explicarEscritura(tx, { evento } = {}) {
  const fee = tx?.feeXlm ? `pagaste ${c.bold(tx.feeXlm + " XLM")} de fee` : "pagaste un fee";
  const ledger = tx?.ledger ? ` en el ledger ${c.bold(tx.ledger)}` : "";
  console.log(
    `\n  ${c.magenta("✍️  Esto fue una ESCRITURA:")} ${c.bold("firmaste")} con tu llave secreta, ${fee} y quedó registrado para siempre${ledger}.`,
  );
  if (evento) console.log(`  ${c.magenta("📣")} El contrato además emitió un ${c.bold("EVENTO")} (${evento}) que cualquiera puede escuchar.`);
  if (tx?.hash) console.log(`  ${c.dim("Mírala en el explorador:")} ${explorer.tx(tx.hash)}`);
}

// ─── Procesos ───────────────────────────────────────────────────────────────

// Si alguien tiene variables de entorno de la CLI apuntando a otra red, las ignoramos.
const ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^(STELLAR|SOROBAN)_(NETWORK|RPC_URL|NETWORK_PASSPHRASE|ACCOUNT)/.test(k)),
);

/**
 * Corre un comando. Con `capture` devuelve stdout/stderr en vez de mostrarlos.
 * Por defecto aborta si el comando falla.
 */
export function run(cmd, args, { capture = false, allowFail = false } = {}) {
  if (!capture) console.log(c.dim(`$ ${cmd} ${args.join(" ")}`));
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    env: ENV,
    encoding: "utf8",
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
  });
  if (res.error?.code === "ENOENT") {
    if (allowFail) return { ok: false, stdout: "", stderr: `No encontré el comando "${cmd}".` };
    fail(`No encontré el comando "${cmd}".`, "Revisa tu instalación con: pnpm check");
  }
  const out = { ok: res.status === 0, stdout: (res.stdout ?? "").trim(), stderr: (res.stderr ?? "").trim() };
  if (!out.ok && !allowFail) {
    if (capture && out.stderr) console.error(out.stderr);
    fail(`Falló: ${cmd} ${args.join(" ")}`);
  }
  return out;
}

// ─── Stellar CLI ────────────────────────────────────────────────────────────

const CONTRACT_ID = /\bC[A-Z2-7]{55}\b/;
const TX_HASH = /\b[0-9a-f]{64}\b/;

export function accountAddress(name) {
  const res = run("stellar", ["keys", "address", name], { capture: true, allowFail: true });
  return res.ok ? res.stdout : null;
}

export function fundAccount(name) {
  return run("stellar", ["keys", "fund", name, ...RED], { capture: true, allowFail: true });
}

export function createAccount(name) {
  return run("stellar", ["keys", "generate", name, ...RED, "--fund"], { capture: true, allowFail: true });
}

export function deploy(wasmName, source, ctorArgs = {}) {
  const wasm = join(WASM_DIR, `${wasmName}.wasm`);
  if (!existsSync(wasm)) fail(`No existe ${wasm}`, "Compila primero.");
  const args = ["contract", "deploy", "--wasm", wasm, "--source-account", source, ...RED];
  const ctor = Object.entries(ctorArgs).flatMap(([k, v]) => [`--${k}`, String(v)]);
  if (ctor.length) args.push("--", ...ctor);
  const res = run("stellar", args, { capture: true, allowFail: true });
  const id = res.stdout.match(CONTRACT_ID)?.[0];
  if (!res.ok || !id) {
    console.error(c.dim(res.stderr));
    fail(`No se pudo desplegar ${wasmName}.wasm`, explainError(res.stderr));
  }
  return { id, tx: res.stderr.match(TX_HASH)?.[0] };
}

/**
 * LECTURA: simula la llamada en el RPC y devuelve el resultado. Nunca envía transacción
 * (`--send=no`), así que no se firma nada ni se paga fee.
 */
export function leer(contractId, source, fn, fnArgs = {}) {
  return invoke(contractId, source, fn, fnArgs, false);
}

/**
 * ESCRITURA: simula, firma con la llave de `source` y envía la transacción.
 * Devuelve el resultado y los datos de la transacción (hash, ledger y fee).
 */
export async function escribir(contractId, source, fn, fnArgs = {}) {
  const res = invoke(contractId, source, fn, fnArgs, true);
  if (res.ok && res.hash) res.tx = await datosTx(res.hash);
  return res;
}

function invoke(contractId, source, fn, fnArgs, send) {
  const args = ["contract", "invoke", "--contract-id", contractId, "--source-account", source, ...RED];
  args.push(`--send=${send ? "yes" : "no"}`, "--", fn);
  for (const [k, v] of Object.entries(fnArgs)) args.push(`--${k}`, String(v));
  const res = run("stellar", args, { capture: true, allowFail: true });
  if (process.env.CASO_DEBUG) console.error(c.dim(res.stderr));
  if (!res.ok) return { ok: false, error: explainError(res.stderr), raw: res.stderr };
  return { ok: true, value: parseJson(res.stdout), hash: send ? res.stderr.match(TX_HASH)?.[0] : undefined };
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.replace(/^"|"$/g, "");
  }
}

/** Pregunta al RPC por una transacción ya enviada: en qué ledger quedó y cuánto fee cobró. */
export async function datosTx(hash) {
  try {
    for (let i = 0; i < 10; i++) {
      const r = await rpc("getTransaction", { hash });
      if (r?.status === "SUCCESS") {
        // TransactionResult empieza con feeCharged (int64, en stroops). 1 XLM = 10.000.000 stroops.
        const fee = Buffer.from(r.resultXdr, "base64").readBigInt64BE(0);
        return { hash, ledger: r.ledger, feeXlm: (Number(fee) / 1e7).toFixed(7).replace(/0+$/, "").replace(/\.$/, "") };
      }
      if (r?.status === "FAILED") return { hash };
      await new Promise((ok) => setTimeout(ok, 1000));
    }
  } catch {
    // Si el RPC no responde, no pasa nada: la transacción igual se confirmó.
  }
  return { hash };
}

export async function rpc(method, params) {
  const res = await fetch(TESTNET.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// Códigos de `Error` en contracts/escena_crimen/src/lib.rs
const ESCENA_ERRORS = {
  1: "Ya estás registrado en la escena. (Cada detective se registra una sola vez.)",
  2: "Todavía no estás registrado en la escena. Corre: pnpm caso:registrar",
  3: "Ya usaste tus 3 interrogatorios. El contrato no te deja hacer más: ahora a pensar y acusar.",
  4: "Ya usaste tus 2 acusaciones. El contrato no acepta más intentos de esta cuenta.",
  5: "¡Ya resolviste el caso! No necesitas acusar de nuevo.",
  6: "Ese sospechoso no existe. Mira la lista con: pnpm caso:sospechosos",
  7: "Esa pista no existe. Mira todas con: pnpm caso:pistas",
  8: "Ese contrato Detective tiene otro dueño: solo puedes registrarte con el tuyo.",
  9: "El NOMBRE de tu ficha debe tener entre 1 y 32 bytes. Cámbialo en contracts/detective/src/lib.rs",
  10: "El caso ya se cerró: el facilitador reveló al culpable.",
  11: "Ese no es el culpable guardado en el hash.",
  12: "Ese contrato no responde como un Detective (¿desplegaste el correcto?).",
  13: "Esa acción es solo para la cuenta del facilitador (admin) que desplegó la escena.",
};

export function explainError(stderr = "") {
  const code = stderr.match(/Error\(Contract, #(\d+)\)/)?.[1];
  if (code && ESCENA_ERRORS[code]) return ESCENA_ERRORS[code];
  if (/client error|\(Connect\)|timed out|connection refused|dns error|error sending request/i.test(stderr)) {
    return "No pude hablar con el nodo RPC de testnet (corte de conexión). Espera unos segundos y vuelve a correr el mismo comando.";
  }
  if (/Auth/.test(stderr) && /InvalidAction|NotAuthorized|not authorized/i.test(stderr)) {
    return "Falta la firma correcta: el contrato exige que firme la cuenta dueña (require_auth).";
  }
  if (/insufficient|underfunded|tx_insufficient_balance|Account not found|account.*not.*exist/i.test(stderr)) {
    return "Tu cuenta no existe en testnet o no tiene XLM. Corre: pnpm setup:account";
  }
  if (/friendbot/i.test(stderr)) return "Friendbot no respondió. Espera un minuto y vuelve a intentar.";
  const last = stderr.split("\n").filter(Boolean).pop() ?? "Error desconocido";
  return last.replace(/^❌\s*/, "");
}

// ─── Archivos de configuración ──────────────────────────────────────────────

export function readJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

export function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

/** Datos de ESTA computadora: tu cuenta y tu contrato Detective (no se suben a git). */
export const local = {
  read: () => readJson(LOCAL_FILE) ?? {},
  update: (patch) => {
    const next = { ...local.read(), ...patch };
    writeJson(LOCAL_FILE, next);
    return next;
  },
};

/** La Escena del Crimen oficial: la publica el facilitador en config/caso.json. */
export const casoConfig = {
  read: () => readJson(CASO_FILE),
  write: (data) => writeJson(CASO_FILE, data),
};

export function requireAccount() {
  const { account } = local.read();
  if (!account) fail("Todavía no tienes cuenta.", "Corre: pnpm setup:account");
  const address = accountAddress(account);
  if (!address) fail(`La cuenta "${account}" no existe en la Stellar CLI.`, "Corre: pnpm setup:account");
  return { account, address };
}

export function requireCaso() {
  const cfg = casoConfig.read();
  if (!cfg?.contractId) {
    fail("No hay Escena del Crimen en config/caso.json.", "El facilitador debe correr pnpm admin:deploy y compartir el archivo.");
  }
  if (cfg.networkPassphrase && cfg.networkPassphrase !== TESTNET.networkPassphrase) {
    fail("config/caso.json no es de testnet. Este taller solo funciona en testnet.");
  }
  return cfg;
}

export const corto = (s) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : "");
