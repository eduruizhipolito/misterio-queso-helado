// Calentamiento "Cumbre del Misti": tu propio contrato.
//   pnpm detective:ship     test, compila, despliega, firma la cumbre y te registra en el caso
//   pnpm detective:ficha    lee tu ficha (LECTURA, gratis)
//   pnpm detective:cumbre   firma otra vez el libro de la cumbre (ESCRITURA)
import {
  c,
  casoConfig,
  deploy,
  escribir,
  explicarEscritura,
  explicarLectura,
  explorer,
  fail,
  leer,
  local,
  requireAccount,
  run,
  step,
} from "./lib.mjs";
import { registrar } from "./caso.mjs";

const [cmd] = process.argv.slice(2);

const commands = {
  ship: async () => {
    step("1/5 Probando tu contrato (tests en tu computadora, sin blockchain)…");
    run("cargo", ["test", "-p", "detective", "--", "--nocapture"]);
    await desplegar();
    await ficha("3/5");
    await cumbre("4/5");
    if (casoConfig.read()?.contractId) {
      await registrar("5/5 ");
    } else {
      console.log(c.yellow("\n  La Escena del Crimen aún no está publicada. Cuando el facilitador la publique, corre: pnpm caso:registrar\n"));
    }
  },
  ficha: () => ficha(),
  cumbre: () => cumbre(),
};

if (!commands[cmd]) fail(`Comando desconocido: ${cmd ?? "(ninguno)"}`, `Usa uno de: ${Object.keys(commands).join(", ")}`);
await commands[cmd]();

function requireDetective() {
  const { detectiveId } = local.read();
  if (!detectiveId) fail("Todavía no desplegaste tu contrato Detective.", "Corre: pnpm detective:ship");
  return detectiveId;
}

async function desplegar() {
  const { account, address } = requireAccount();

  step("2/5 Compilando a WebAssembly y desplegando en testnet…");
  run("stellar", ["contract", "build", "--package", "detective"]);
  const { id } = deploy("detective", account, { dueno: address });
  local.update({ detectiveId: id });

  console.log(`
${c.green("✔")} Tu contrato vive en la blockchain

  CONTRACT_ID: ${c.bold(id)}
  Explorer:    ${explorer.contract(id)}

  ${c.dim("Desplegar es una ESCRITURA: subiste código a la red, firmaste y pagaste fee.")}
  ${c.dim("El constructor guardó tu dirección como dueña: solo tú podrás firmar la cumbre.")}`);
}

async function ficha(n = "") {
  const { account } = requireAccount();
  const id = requireDetective();
  step(`${n} Leyendo tu ficha con ficha()…`.trim());
  const res = leer(id, account, "ficha");
  if (!res.ok) fail(res.error);
  const f = res.value;
  console.log(`
  🕵️  ${c.bold(f.nombre)}  ${c.dim(`placa ${f.placa}`)}
      Grito:   "${f.grito}"
      Cumbres: ${f.cumbres}`);
  explicarLectura();
}

async function cumbre(n = "") {
  const { account } = requireAccount();
  const id = requireDetective();
  step(`${n} Firmando el libro de la Cumbre del Misti con firmar_cumbre()…`.trim());
  const res = await escribir(id, account, "firmar_cumbre");
  if (!res.ok) fail(res.error);
  console.log(`\n  ⛰️  ${c.green(`¡Cumbre número ${res.value}!`)}`);
  explicarEscritura(res.tx, { evento: "cumbre, con tu grito" });
}
