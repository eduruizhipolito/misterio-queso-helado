// pnpm check - revisa que tengas todo lo necesario para el taller.
import { accountAddress, c, casoConfig, local, rpc, run, TESTNET } from "./lib.mjs";

const checks = [];
const check = (label, ok, hint) => checks.push({ label, ok, hint });
const version = (cmd, args) => {
  const res = run(cmd, args, { capture: true, allowFail: true });
  return res.ok ? res.stdout.split("\n")[0] : null;
};

const [major] = process.versions.node.split(".").map(Number);
check(`Node ${process.versions.node}`, major >= 20, "Instala Node 20 o superior: https://nodejs.org");

const rustc = version("rustc", ["--version"]);
check(rustc ?? "Rust", !!rustc, "Instala Rust: https://rustup.rs");

const targets = run("rustup", ["target", "list", "--installed"], { capture: true, allowFail: true });
check(
  "Target wasm32v1-none (para compilar contratos)",
  targets.ok && targets.stdout.includes("wasm32v1-none"),
  "Corre: rustup target add wasm32v1-none",
);

const stellar = version("stellar", ["--version"]);
const stellarMajor = Number(stellar?.match(/stellar (\d+)/)?.[1] ?? 0);
check(
  stellar ?? "Stellar CLI",
  stellarMajor >= 30,
  stellar
    ? "Tu Stellar CLI es antigua: instala la 30.0.1 o superior"
    : "Instala la CLI: https://developers.stellar.org/docs/tools/cli/install-cli",
);

let red = null;
try {
  red = await rpc("getNetwork");
} catch {}
check(
  red ? `Stellar RPC testnet (protocolo ${red.protocolVersion})` : "Stellar RPC testnet",
  red?.passphrase === TESTNET.networkPassphrase,
  "No pude conectarme a https://soroban-testnet.stellar.org. Revisa tu internet.",
);

const { account, detectiveId } = local.read();
const address = account && stellar ? accountAddress(account) : null;
check(account ? `Cuenta "${account}"` : "Cuenta de testnet", !!address, "Corre: pnpm setup:account");

const caso = casoConfig.read();
check(
  caso?.contractId ? `Escena del Crimen ${caso.contractId.slice(0, 8)}…` : "Escena del Crimen configurada",
  !!caso?.contractId,
  "Falta el CONTRACT_ID en config/caso.json: el facilitador lo publica antes del taller",
);

console.log();
for (const { label, ok, hint } of checks) {
  console.log(`  ${ok ? c.green("✔") : c.red("✖")} ${label}${ok ? "" : `\n      ${c.dim(hint)}`}`);
}
if (detectiveId) console.log(`  ${c.green("✔")} Contrato Detective ${detectiveId.slice(0, 8)}…`);

const failed = checks.filter((x) => !x.ok).length;
console.log(
  failed
    ? `\n  ${c.yellow(`${failed} cosa(s) por arreglar.`)}\n`
    : `\n  ${c.green("¡Todo listo, detective! Doña Nieves cuenta contigo.")}\n`,
);
console.log(c.dim("  Este taller funciona SOLO en testnet: el XLM es de juguete y no vale dinero.\n"));
process.exit(failed ? 1 : 0);
