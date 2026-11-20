// El Misterio del Queso Helado: comandos del detective.
//   pnpm caso:registrar          te registra leyendo la ficha de tu contrato Detective
//   pnpm caso:sospechosos        lista de sospechosos            (LECTURA)
//   pnpm caso:pistas             todas las pistas                (LECTURA)
//   pnpm caso:pista <n>          una pista                       (LECTURA)
//   pnpm caso:interrogar <id>    interroga a un sospechoso       (ESCRITURA, máx. 3)
//   pnpm caso:acusar <id>        acusa al culpable               (ESCRITURA, máx. 2)
//   pnpm caso:estado             tu expediente                   (LECTURA)
//   pnpm caso:ranking            el ranking de detectives        (LECTURA)
import { pathToFileURL } from "node:url";
import {
  args,
  c,
  confirm,
  corto,
  escribir,
  explicarEscritura,
  explicarLectura,
  fail,
  leer,
  local,
  requireAccount,
  requireCaso,
  step,
} from "./lib.mjs";

const PERSONAJES = {
  rocoto: "Don Rocoto",
  chicha: "La Tía Chicha",
  adobo: "El Cholo Adobo",
  nevado: "Misti Nevado",
  ocopa: "La Sobrina Ocopa",
};
const nombreDe = (id) => PERSONAJES[id] ?? id;

const MAX_INTERROGATORIOS = 3;
const MAX_ACUSACIONES = 2;

function contexto(cuenta) {
  const { account, address } = cuenta ? { account: cuenta } : requireAccount();
  const { contractId } = requireCaso();
  return { account, address, contractId };
}

function idSospechoso() {
  const id = (args[0] ?? "").toLowerCase().trim();
  if (!id) fail("Dime a quién.", `Ejemplo: pnpm ${process.env.npm_lifecycle_event ?? "caso:interrogar"} adobo   (lista: pnpm caso:sospechosos)`);
  if (!/^[a-z0-9_]{1,32}$/.test(id)) fail(`"${id}" no es un ID válido.`, "Mira la lista con: pnpm caso:sospechosos");
  return id;
}

export async function registrar(prefijo = "") {
  const { account, address, contractId } = contexto();
  const { detectiveId } = local.read();
  if (!detectiveId) fail("Primero despliega tu contrato Detective.", "Corre: pnpm detective:ship");

  step(`${prefijo}Registrándote en la Escena del Crimen (la escena va a leer ficha() de TU contrato)…`);
  const res = await escribir(contractId, account, "registrar", { detective: address, contrato: detectiveId });
  if (!res.ok) {
    if (/Ya estás registrado/.test(res.error)) {
      console.log(`\n  ${c.green("✔")} Ya estabas registrado. ${c.dim("Si cambiaste tu nombre, la escena conserva el de tu primer registro.")}`);
      return;
    }
    fail(res.error);
  }
  const e = res.value;
  console.log(`\n  ${c.green("✔")} Registrado como ${c.bold(e.nombre)} ${c.dim(`(placa ${e.placa})`)}`);
  console.log(`  ${c.dim("La escena hizo una LLAMADA ENTRE CONTRATOS: le preguntó a tu contrato su ficha y copió tu nombre.")}`);
  explicarEscritura(res.tx, { evento: "registro" });
  console.log(`\n  Siguiente paso: ${c.bold("pnpm caso:pistas")}\n`);
}

async function sospechosos() {
  const { account, contractId } = contexto();
  step("Leyendo la lista de sospechosos…");
  const res = leer(contractId, account, "ver_sospechosos");
  if (!res.ok) fail(res.error);
  console.log();
  for (const id of res.value) console.log(`  ${c.bold(id.padEnd(8))} ${nombreDe(id)}`);
  explicarLectura();
}

async function pistas() {
  const { account, contractId } = contexto();
  step("Leyendo todas las pistas de la escena…");
  const res = leer(contractId, account, "ver_pistas");
  if (!res.ok) fail(res.error);
  if (!res.value.length) console.log(c.yellow("\n  El facilitador aún no cargó las pistas."));
  res.value.forEach((t, i) => console.log(`\n  ${c.yellow(`🔎 Pista ${i + 1}`)}\n  ${t}`));
  explicarLectura();
  console.log(`  ${c.dim("Puedes leerlas todas las veces que quieras: leer es gratis.")}\n`);
}

async function pista() {
  const { account, contractId } = contexto();
  const n = Number(args[0]);
  if (!Number.isInteger(n) || n < 1) fail("Dime qué número de pista.", "Ejemplo: pnpm caso:pista 2");
  step(`Leyendo la pista ${n}…`);
  const res = leer(contractId, account, "ver_pista", { n });
  if (!res.ok) fail(res.error);
  console.log(`\n  ${c.yellow(`🔎 Pista ${n}`)}\n  ${res.value}`);
  explicarLectura();
}

async function interrogar() {
  const { account, address, contractId } = contexto();
  const id = idSospechoso();
  step(`Interrogando a ${nombreDe(id)}… (firmas con tu cuenta)`);
  const res = await escribir(contractId, account, "interrogar", { detective: address, sospechoso: id });
  if (!res.ok) fail(res.error);
  console.log(`\n  🗣️  ${c.bold(nombreDe(id))}: ${c.cyan(`"${res.value}"`)}`);
  const exp = leer(contractId, account, "ver_expediente", { detective: address });
  const usados = exp.ok && exp.value ? exp.value.interrogatorios : null;
  if (usados !== null) {
    const quedan = MAX_INTERROGATORIOS - usados;
    console.log(`\n  ${quedan ? c.yellow(`Te quedan ${quedan} interrogatorio(s).`) : c.red("Ya no te quedan interrogatorios.")} ${c.dim("El contrato lleva la cuenta por tu dirección.")}`);
  }
  explicarEscritura(res.tx, { evento: "interrogatorio" });
}

async function acusar() {
  const { account, address, contractId } = contexto();
  const id = idSospechoso();
  const exp = leer(contractId, account, "ver_expediente", { detective: address });
  const usadas = exp.ok && exp.value ? exp.value.acusaciones : 0;
  const ok = await confirm(
    `\n  Vas a acusar a ${c.bold(nombreDe(id))}. Es tu intento ${usadas + 1} de ${MAX_ACUSACIONES} y no se puede deshacer. ¿Seguro?`,
  );
  if (!ok) return console.log(c.dim("\n  Cancelado. Nada se envió.\n"));

  step(`Acusando a ${nombreDe(id)}… (firmas con tu cuenta)`);
  const res = await escribir(contractId, account, "acusar", { detective: address, sospechoso: id });
  if (!res.ok) fail(res.error);

  if (res.value === true) {
    console.log(`\n  🎉 ${c.green(c.bold(`¡CASO RESUELTO! ${nombreDe(id)} se llevó la receta del queso helado.`))}`);
    console.log(`  Doña Nieves te debe un queso helado. Mira tu puesto con: ${c.bold("pnpm caso:ranking")}`);
  } else {
    const quedan = MAX_ACUSACIONES - (usadas + 1);
    console.log(`\n  ❌ ${c.red(`${nombreDe(id)} es inocente.`)} ${quedan ? c.yellow(`Te queda ${quedan} acusación.`) : c.red("Ya no te quedan acusaciones.")}`);
    console.log(`  ${c.dim("Ojo: fallar NO es un error de la transacción. Se confirmó igual y el intento quedó registrado.")}`);
  }
  console.log(`  ${c.dim("El contrato comparó sha256(acusado + sal) con el hash guardado: nunca guardó el nombre del culpable.")}`);
  explicarEscritura(res.tx, { evento: "acusación" });
}

async function estado() {
  const { account, address, contractId } = contexto();
  step("Leyendo tu expediente en la escena…");
  const res = leer(contractId, account, "ver_expediente", { detective: address });
  if (!res.ok) fail(res.error);
  if (!res.value) {
    console.log(c.yellow("\n  Aún no estás registrado. Corre: pnpm caso:registrar"));
  } else {
    const e = res.value;
    console.log(`
  🕵️  ${c.bold(e.nombre)} ${c.dim(`placa ${e.placa}`)}
      Interrogatorios: ${e.interrogatorios}/${MAX_INTERROGATORIOS}
      Acusaciones:     ${e.acusaciones}/${MAX_ACUSACIONES}
      Caso resuelto:   ${e.resuelto ? c.green("sí") : "no"}`);
  }
  explicarLectura();
}

export async function ranking(cuenta) {
  const { account, contractId } = contexto(cuenta);
  step("Leyendo el ranking de detectives…");
  const res = leer(contractId, account, "ranking");
  if (!res.ok) fail(res.error);
  const lista = res.value ?? [];
  const medallas = ["🥇", "🥈", "🥉"];
  console.log();
  if (!lista.length) console.log(c.dim("  Nadie resolvió el caso todavía. ¿Serás tú?"));
  lista.forEach(([addr, nombre, ledger, intento], i) => {
    const puesto = medallas[i] ?? `${String(i + 1).padStart(2)}.`;
    console.log(
      `  ${puesto} ${c.bold(String(nombre).padEnd(24))} ${intento === 1 ? c.green("1er intento") : c.yellow("2do intento")}  ${c.dim(`ledger ${ledger}  ${corto(addr)}`)}`,
    );
  });
  const rev = leer(contractId, account, "culpable_revelado");
  if (rev.ok && rev.value) console.log(`\n  🔓 Caso cerrado. Culpable: ${c.bold(nombreDe(rev.value))}`);
  console.log(`\n  ${c.dim("Orden: primero quienes acertaron al 1er intento, después al 2do; dentro de cada grupo, por ledger.")}`);
  explicarLectura();
}

const commands = { registrar: () => registrar(), sospechosos, pistas, pista, interrogar, acusar, estado, ranking: () => ranking() };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd] = process.argv.slice(2);
  process.argv.splice(2, 1);
  args.shift();
  if (!commands[cmd]) fail(`Comando desconocido: ${cmd ?? "(ninguno)"}`, `Usa uno de: ${Object.keys(commands).join(", ")}`);
  await commands[cmd]();
}
