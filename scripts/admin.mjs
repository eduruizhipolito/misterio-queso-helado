// Comandos del facilitador (solo funcionan con la cuenta admin que desplegó la escena):
//   pnpm admin:deploy <culpable> [--sal=texto]   despliega la Escena del Crimen y escribe config/caso.json
//   pnpm admin:cargar                            carga pistas y testimonios desde config/caso.data.json
//   pnpm admin:revelar                           cierra el caso, muestra el ranking y el "hackeo" de la sal
import { createHash, randomBytes } from "node:crypto";
import {
  accountAddress,
  args,
  c,
  casoConfig,
  corto,
  createAccount,
  DATA_FILE,
  deploy,
  escribir,
  explorer,
  fail,
  fundAccount,
  leer,
  readJson,
  requireCaso,
  run,
  SECRETO_FILE,
  step,
  TESTNET,
  writeJson,
} from "./lib.mjs";
import { ranking } from "./caso.mjs";

const ADMIN = process.env.CASO_ADMIN ?? "facilitador";
const [cmd, ...rest] = args;
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const sha256 = (txt) => createHash("sha256").update(txt, "utf8").digest("hex");

function datos() {
  const d = readJson(DATA_FILE);
  if (!d?.pistas?.length || !d?.testimonios) fail(`Falta ${DATA_FILE} con "pistas" y "testimonios".`);
  return d;
}

function adminAddress() {
  let address = accountAddress(ADMIN);
  if (!address) {
    step(`Creando la cuenta del facilitador "${ADMIN}" con Friendbot…`);
    const r = createAccount(ADMIN);
    address = accountAddress(ADMIN);
    if (!address) fail("No se pudo crear la cuenta del facilitador.");
    if (!r.ok) fail("Friendbot no fondeó la cuenta del facilitador.", "Espera un minuto y vuelve a correr el mismo comando.");
  } else {
    fundAccount(ADMIN);
  }
  return address;
}

const commands = {
  async deploy() {
    const d = datos();
    const sospechosos = Object.keys(d.testimonios);
    const culpable = (rest[0] ?? process.env.CASO_CULPABLE ?? "").toLowerCase();
    if (!sospechosos.includes(culpable)) {
      fail(
        "Dime quién es el culpable (no se guarda en el repo).",
        `Uso: pnpm admin:deploy <culpable>   Opciones: ${sospechosos.join(", ")}`,
      );
    }
    const sal = flag("sal") ?? `queso-${randomBytes(6).toString("hex")}`;
    const hash = sha256(culpable + sal);
    const admin = adminAddress();

    step("Compilando la Escena del Crimen…");
    run("stellar", ["contract", "build", "--package", "escena_crimen"]);

    step("Desplegando en testnet con sha256(culpable + sal)…");
    const { id } = deploy("escena_crimen", ADMIN, { admin, hash_culpable: hash, sal });

    casoConfig.write({
      ...TESTNET,
      contractId: id,
      admin,
      deployedAt: new Date().toISOString(),
    });
    writeJson(SECRETO_FILE, { contractId: id, culpable, sal, hash });

    console.log(`
${c.green("✔")} Escena del Crimen desplegada

  CONTRACT_ID: ${c.bold(id)}
  Admin:       ${admin}
  Hash:        ${c.dim(hash)}
  Sal:         ${c.dim(sal)}
  Explorer:    ${explorer.contract(id)}

  Escribí ${c.bold("config/caso.json")} (súbelo a git para que los forks lo tengan)
  y ${c.bold(".caso/secreto.json")} (NO se sube: tiene el culpable en texto plano).

  Siguiente paso: ${c.bold("pnpm admin:cargar")}
`);
  },

  async cargar() {
    const { contractId } = requireCaso();
    const admin = accountAddress(ADMIN) ?? fail(`No existe la cuenta "${ADMIN}".`);
    const d = datos();

    for (const [i, texto] of d.pistas.entries()) {
      step(`Pista ${i + 1}/${d.pistas.length}`);
      const r = await escribir(contractId, ADMIN, "cargar_pista", { admin, n: i + 1, texto });
      if (!r.ok) fail(r.error);
      console.log(c.dim(`  ${texto.slice(0, 70)}…  ${r.hash ? corto(r.hash) : ""}`));
    }
    for (const [sospechoso, texto] of Object.entries(d.testimonios)) {
      step(`Testimonio de ${sospechoso}`);
      const r = await escribir(contractId, ADMIN, "cargar_testimonio", { admin, sospechoso, texto });
      if (!r.ok) fail(r.error);
    }

    const s = leer(contractId, ADMIN, "ver_sospechosos");
    console.log(`\n${c.green("✔")} Caso cargado: ${d.pistas.length} pistas, sospechosos: ${s.value?.join(", ")}\n`);
  },

  async revelar() {
    const { contractId } = requireCaso();
    const admin = accountAddress(ADMIN) ?? fail(`No existe la cuenta "${ADMIN}".`);
    const secreto = readJson(SECRETO_FILE);
    const culpable = rest[0] ?? (secreto?.contractId === contractId ? secreto.culpable : null);
    if (!culpable) fail("No encontré el culpable en .caso/secreto.json.", "Uso: pnpm admin:revelar <culpable>");

    // 1. El "hackeo": lo que podía hacer cualquiera leyendo el storage público.
    step("🔓 Lo que podía hacer un Detective Hacker: leer el storage del contrato…");
    const storage = leerInstancia(contractId);
    if (storage) {
      console.log(`  HashCulpable = ${c.dim(storage.hash)}`);
      console.log(`  Sal          = ${c.bold(storage.sal)}   ${c.yellow("← está a la vista de todos")}`);
      const sospechosos = leer(contractId, ADMIN, "ver_sospechosos").value ?? [];
      console.log(`\n  Probamos sha256(sospechoso + sal) con los ${sospechosos.length} sospechosos:`);
      for (const s of sospechosos) {
        const h = sha256(s + storage.sal);
        const ok = h === storage.hash;
        console.log(`    ${ok ? c.green("✔") : c.dim("·")} ${s.padEnd(8)} ${c.dim(h.slice(0, 24) + "…")} ${ok ? c.green(c.bold("¡COINCIDE!")) : ""}`);
      }
      console.log(c.dim("\n  Con 5 opciones y la sal pública, el hash no esconde nada. Por eso los secretos on-chain"));
      console.log(c.dim("  usan commit-reveal (se publica la sal DESPUÉS) o quedan fuera de la cadena.\n"));
    }

    // 2. Cerrar el caso on-chain.
    step(`Cerrando el caso: revelar(${culpable})…`);
    const r = await escribir(contractId, ADMIN, "revelar", { admin, culpable });
    if (!r.ok && !/caso ya se cerró/.test(r.error)) fail(r.error);
    if (r.hash) console.log(c.dim(`  ${explorer.tx(r.hash)}`));

    // 3. Ranking final.
    await ranking(ADMIN);
  },
};

/** Lee la instancia del contrato (su storage "instance") con la CLI, igual que lo haría cualquiera. */
function leerInstancia(contractId) {
  const res = run(
    "stellar",
    ["contract", "read", "--contract-id", contractId, "--durability", "persistent", "--output", "json",
      "--rpc-url", TESTNET.rpcUrl, "--network-passphrase", TESTNET.networkPassphrase],
    { capture: true, allowFail: true },
  );
  if (!res.ok) {
    console.log(c.yellow(`  No pude leer el storage: ${res.stderr.split("\n").pop()}`));
    return null;
  }
  // La salida es CSV: "clave","{json con comillas dobladas}"
  try {
    const txt = res.stdout;
    const json = JSON.parse(txt.slice(txt.indexOf(',"{') + 2, txt.lastIndexOf("}") + 1).replaceAll('""', '"'));
    const valor = (nombre) => json.contract_instance.storage.find((e) => e.key?.vec?.[0]?.symbol === nombre)?.val;
    return { hash: valor("HashCulpable").bytes, sal: valor("Sal").string };
  } catch {
    console.log(c.yellow("  No pude interpretar el storage leído."));
    return null;
  }
}

if (!commands[cmd]) fail(`Comando desconocido: ${cmd ?? "(ninguno)"}`, `Usa uno de: ${Object.keys(commands).join(", ")}`);
await commands[cmd]();
