# 🕵️ Guía del asistente: El Misterio del Queso Helado

Hoy vas a desplegar tu primer contrato inteligente en Stellar y a usarlo para resolver un crimen.
Todo pasa en **testnet**: el XLM es de juguete y no cuesta nada.

## El plan de hoy (60 minutos)

| Minuto | Qué hacemos |
|---|---|
| 0-10 | Fork, Codespaces, `pnpm check` y `pnpm setup:account` |
| 10-22 | Calentamiento "Cumbre del Misti": editas tu contrato y lo despliegas |
| 22-50 | El misterio: pistas, interrogatorios y acusación |
| 50-60 | Revelación, ranking y premios |

---

## 0 · Prepara tu entorno (min 0-10)

1. Haz **Fork** de este repo en GitHub.
2. En tu fork: **Code** → **Codespaces** → **Create codespace on main**.
3. Cuando termine de cargar, en la terminal corre:

```bash
pnpm check
```

Debes ver todo con ✔ y un ⏳ en "Cuenta de testnet". Eso lo arreglamos ahora:

```bash
pnpm setup:account
```

Le pone un nombre a tu cuenta automáticamente (por ejemplo `detective-x7k2`). Si quieres elegirlo tú:
`pnpm setup:account detective-ana`.

> 💡 Corre los comandos **de uno en uno**: espera a que termine cada uno antes de escribir el siguiente.

**Qué acaba de pasar:**

- Se creó un **par de llaves**. La **pública** (empieza con `G`) es tu dirección: la puede ver cualquiera.
  La **secreta** sirve para **firmar** y vive en la configuración de la Stellar CLI, nunca en el repo.
- **Friendbot** te regaló XLM de testnet. Lo vas a usar para pagar los **fees** de tus escrituras.

Corre `pnpm check` otra vez: ahora todo debería salir con ✔.

---

## 1 · Calentamiento: Cumbre del Misti (min 10-22)

Abre [`contracts/detective/src/lib.rs`](../contracts/detective/src/lib.rs) desde el explorador de archivos
de la izquierda (`contracts` → `detective` → `src` → `lib.rs`). Es **tu** contrato.
Solo cambia las 3 líneas marcadas con `// TODO`:

```rust
// TODO 1: tu nombre de detective
pub const NOMBRE: &str = "Detective Sin Nombre";

// TODO 2: tu placa de detective
pub const PLACA: &str = "AQP-000";

// TODO 3: tu grito de cumbre
pub const GRITO: &str = "¡Subí al Misti y volví con hambre de queso helado!";
```

Cambia **solo el texto entre comillas** (no borres las comillas ni el `;`) y guarda con **Ctrl + S**.
Tu `NOMBRE` es el que saldrá en el ranking: máximo 32 bytes (las tildes y la ñ cuentan doble).

Ahora, todo de una:

```bash
pnpm detective:ship
```

Ese comando hace 5 cosas. Mira lo que imprime en cada una:

| Paso | Qué hace | ¿Lectura o escritura? |
|---|---|---|
| 1/5 | Corre los tests de tu contrato en tu computadora | Ni una ni otra: no toca la red |
| 2/5 | Compila a WebAssembly y **despliega** tu contrato | ✍️ Escritura: subes código, firmas y pagas fee. Te da tu `CONTRACT_ID` |
| 3/5 | Llama a `ficha()` | 📖 Lectura: se simula, no firmas ni pagas |
| 4/5 | Llama a `firmar_cumbre()` | ✍️ Escritura: el contador sube a 1, pagas fee y se emite un **evento** con tu grito |
| 5/5 | Te registra en la Escena del Crimen | ✍️ Escritura: la escena **llama a tu contrato** para leer tu ficha |

**Para pensar:**

- ¿Por qué `ficha()` no te cobró nada y `firmar_cumbre()` sí?
- `firmar_cumbre()` tiene `dueno.require_auth()`. ¿Qué pasaría si otra persona intentara firmar tu cumbre?
- Abre el link del explorador que te dio el paso 4. Busca el evento con tu grito: **todo es público**.

¿Quieres verlo otra vez? `pnpm detective:cumbre` firma de nuevo (escritura) y `pnpm detective:ficha` lee (lectura).

---

## 2 · El misterio (min 22-50)

> La noche del viernes, a las 11:40 pm, alguien entró a la **Picantería Doña Nieves** y se llevó el
> cuaderno con la **receta secreta del queso helado**, justo antes de la feria del sábado.

### Los sospechosos

```bash
pnpm caso:sospechosos
```

| ID | Sospechoso | Por qué es sospechoso |
|---|---|---|
| `rocoto` | Don Rocoto | Cocinero rival, siempre quiso la receta |
| `chicha` | La Tía Chicha | Vecina, vende chicha de jora al lado, siempre está mirando |
| `adobo` | El Cholo Adobo | Ayudante nuevo, llegó hace una semana |
| `nevado` | Misti Nevado | Heladero ambulante, competencia directa |
| `ocopa` | La Sobrina Ocopa | Heredera de la picantería, ¿celos familiares? |

### Las pistas (gratis e ilimitadas)

```bash
pnpm caso:pistas
pnpm caso:pista 2
```

Son **lecturas**: léelas cuantas veces quieras. Fíjate en el mensaje 📖 del final.

### Los interrogatorios (máximo 3)

```bash
pnpm caso:interrogar adobo
```

Cada interrogatorio es una **escritura**: firmas, pagas fee, el contrato suma 1 a tu contador y emite
un evento. Al cuarto intento, el contrato te dice que no. Nadie lo está vigilando: **la regla está en el código**.

Elige bien a quién interrogar. Ojo: no todas las pistas dicen la verdad completa, y no todos los testimonios
tampoco. Busca lo que **no cuadra**.

Revisa cuántos te quedan con:

```bash
pnpm caso:estado
```

### La acusación (máximo 2 intentos)

```bash
pnpm caso:acusar <id>
```

Cambia `<id>` por el ID, sin los signos `< >`. Te pide confirmación porque no se puede deshacer: escribe **`s`** y Enter.

- Si aciertas, entras al ranking. Acertar al **primer** intento te pone por encima de quien acertó al segundo.
- Si fallas, la transacción **igual se confirma**: fallar no es un error, es un resultado. Tu intento queda registrado.

**Para pensar:** el contrato no guarda el nombre del culpable, guarda `sha256(culpable + sal)`.
Al acusar, calcula el hash de tu acusación y lo compara. ¿Por qué no guardar el nombre directamente?

### El ranking

```bash
pnpm caso:ranking
```

---

## 3 · Revelación (min 50-60)

El facilitador cierra el caso en la blockchain y muestra el ranking final. Después de eso, el contrato
ya no acepta acusaciones.

## Lo que aprendiste sin darte cuenta

| Concepto | Dónde lo usaste |
|---|---|
| Cuenta y llaves | `pnpm setup:account` |
| Desplegar un contrato | `pnpm detective:ship` (paso 2) |
| Constructor | Tu contrato guardó tu dirección como dueña al desplegarse |
| Leer = simular, gratis | `ficha()`, `caso:pistas`, `caso:ranking` |
| Escribir = firmar + fee + ledger | `firmar_cumbre()`, `interrogar`, `acusar` |
| `require_auth` | Solo tú firmas tu cumbre y tus interrogatorios |
| Reglas en el código | Límite de 3 interrogatorios y 2 acusaciones |
| Llamada entre contratos | La escena leyó la `ficha()` de tu contrato al registrarte |
| Eventos | Tu grito de cumbre, cada interrogatorio y cada acusación |
| Todo es público | Lo que guarda un contrato lo puede leer cualquiera |

## Si algo falla

Mira la tabla "Si algo falla" del [README](../README.md#si-algo-falla). Lo más común:

- **Friendbot no responde:** espera un minuto y repite `pnpm setup:account`.
- **Corte de conexión con el RPC:** vuelve a correr el mismo comando.
- **Error de compilación:** revisa comillas y `;` en tus 3 líneas de `lib.rs`.
