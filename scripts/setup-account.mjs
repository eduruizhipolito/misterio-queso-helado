// pnpm setup:account [nombre]
// Crea (o reutiliza) tu cuenta de Stellar Testnet y la llena de XLM de prueba con Friendbot.
import { accountAddress, args, ask, c, createAccount, explorer, fail, fundAccount, local, step } from "./lib.mjs";

const saved = local.read().account;
const suggestion = saved ?? `detective-${Math.random().toString(36).slice(2, 6)}`;
const name = args[0] ?? (process.stdin.isTTY ? await ask("Nombre para tu cuenta", suggestion) : suggestion);

if (!/^[a-z0-9_-]{1,32}$/i.test(name)) {
  fail("Usa solo letras sin tilde, números, - y _ (máximo 32).");
}

let address = accountAddress(name);
if (address) {
  step(`La cuenta "${name}" ya existe en esta computadora. Me aseguro de que tenga fondos…`);
  // Friendbot responde error si ya estaba fondeada: no pasa nada.
  fundAccount(name);
} else {
  step(`Creando la cuenta "${name}" y pidiéndole XLM de prueba a Friendbot…`);
  const res = createAccount(name);
  address = accountAddress(name);
  if (!address) fail("No se pudo crear la cuenta.", res.stderr.split("\n").pop());
  if (!res.ok) {
    console.log(c.yellow("  Friendbot no respondió. Tu llave ya existe; reintenta en un minuto con: pnpm setup:account"));
  }
}

local.update({ account: name, address });

console.log(`
${c.green("✔")} Cuenta lista

  Nombre:    ${c.bold(name)}
  Dirección: ${c.bold(address)}
  Explorer:  ${explorer.account(address)}

  ${c.dim("Qué pasó: se generó un par de llaves. La PÚBLICA (G…) es tu dirección y la puede ver cualquiera.")}
  ${c.dim("La SECRETA vive en la config de la Stellar CLI (nunca en este repo) y sirve para FIRMAR.")}
  ${c.dim("Friendbot te regaló XLM de testnet para pagar los fees. Es dinero de juguete.")}

  Siguiente paso: edita ${c.bold("contracts/detective/src/lib.rs")} (los 3 TODO) y corre ${c.bold("pnpm detective:ship")}
`);
