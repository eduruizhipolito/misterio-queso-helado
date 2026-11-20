# 🧀 El Misterio del Queso Helado

Taller práctico de Stellar/Soroban para Web3 Sessions - Stellar en la U. La Salle (Arequipa).
Despliegas tu primer contrato inteligente, lees pistas, interrogas sospechosos y acusas al culpable,
todo en la blockchain de Stellar.

> **Todo pasa en TESTNET**, la red de práctica de Stellar. El XLM que usamos es de juguete, lo regala
> Friendbot y no vale dinero. Ningún comando de este repo puede apuntar a la red real (mainnet).

👉 La guía paso a paso está en [docs/guia-asistente.md](docs/guia-asistente.md).

## La historia

La noche del viernes, a las 11:40 pm, alguien entró al **Restaurante Doña Nieves** y se llevó el cuaderno
con la **receta secreta del queso helado**, justo antes de la feria del sábado. Doña Nieves contrató a los
mejores detectives de la ciudad: ustedes.

| ID | Sospechoso | Por qué es sospechoso |
|---|---|---|
| `rocoto` | Don Rocoto | Cocinero rival, siempre quiso la receta |
| `chicha` | La Tía Chicha | Vecina, vende chicha de jora al lado, siempre está mirando |
| `adobo` | El Loco Adobo | Ayudante nuevo, llegó hace una semana |
| `nevado` | Señor Nevado | Heladero ambulante, competencia directa |
| `ocopa` | La Niña Ocopa | Heredera del restaurante, ¿celos familiares? |

## Lo que vas a aprender

| Idea | Dónde la ves |
|---|---|
| **Leer es gratis** | `pnpm caso:pistas` simula la llamada en un nodo RPC: no firmas ni pagas fee |
| **Escribir cuesta** | `pnpm caso:interrogar` firma una transacción, paga fee, cambia el estado y queda registrada para siempre |
| **El contrato aplica sus reglas solo** | Máximo 3 interrogatorios y 2 acusaciones. Nadie vigila: el código lo impide |
| **Todo lo que guarda un contrato es público** | El culpable no se guarda en texto plano, sino como un hash. ¿Es suficiente? 🤔 |

## ¿Nuevo en Stellar?

| Palabra | Qué significa aquí |
|---|---|
| **Blockchain** | Un registro público que comparten muchas computadoras y que nadie puede editar a escondidas |
| **Testnet** | La red de práctica de Stellar. Funciona igual que la real, pero el dinero es de juguete |
| **Cuenta** | Un par de llaves. La **pública** (`G…`) es tu dirección; la **secreta** firma tus acciones y nunca se comparte |
| **XLM / fee** | XLM es la moneda de Stellar. Cada escritura paga un fee (comisión) muy pequeño |
| **Friendbot** | Un servicio que regala XLM de testnet para que puedas practicar |
| **Soroban** | Los contratos inteligentes de Stellar: programas en Rust que viven en la red |
| **`CONTRACT_ID`** | La dirección de un contrato desplegado (`C…`) |
| **Simular vs. enviar** | Simular pregunta "¿qué pasaría?" sin costo ni cambios. Enviar firma una transacción y la guarda en un ledger |
| **Ledger** | Cada "página" del registro. En Stellar se cierra uno cada ~5 segundos |
| **Evento** | Un aviso que publica un contrato. Cualquiera lo puede escuchar |
| **Stellar RPC** | El servicio con el que hablamos con la red. Lo usa la Stellar CLI por debajo |

## Antes de empezar: 4 reglas de oro

1. **Un comando a la vez.** Copia un comando, pégalo en la terminal, presiona **Enter** y **espera** a que
   termine (vuelve a aparecer el símbolo `$`). Recién ahí escribe el siguiente. Si pegas varios juntos, se mezclan.
2. **Copia los comandos tal cual.** `pnpm caso:pistas` lleva un espacio después de `pnpm` y dos puntos en medio.
3. **Cambia lo que va entre `< >`.** Donde veas `<id>`, escribe el ID del sospechoso **sin** los signos:
   `pnpm caso:interrogar adobo` ✅ y no `pnpm caso:interrogar <adobo>` ❌.
4. **Lee lo que te responde la terminal.** Cada comando te explica qué pasó y cuál es el siguiente paso.
   Los links (por ejemplo, del explorador) se abren con **Ctrl + clic** (en Mac, **Cmd + clic**).

## Cómo empezar (GitHub Codespaces)

No necesitas instalar nada: todo corre en la nube. Solo necesitas una cuenta de GitHub.

1. Inicia sesión en [github.com](https://github.com) y, en esta página, haz clic en **Fork** (arriba a la
   derecha) y luego en **Create fork**. Ahora tienes tu propia copia del repo.
2. En **tu** fork (verás tu usuario arriba a la izquierda): botón verde **Code** → pestaña **Codespaces** →
   **Create codespace on main**.
3. Se abre un editor en el navegador. **Espera** a que termine de preparar todo: la primera vez tarda unos
   minutos porque compila Rust. Abajo verás una **terminal**. Si no la ves, abre el menú ☰ → **Terminal** →
   **New Terminal**.
4. En la terminal, escribe y presiona Enter:

```bash
pnpm check
```

Debes ver todo con ✔ y una sola línea con ⏳ en **Cuenta de testnet**. Es normal: la creas en el paso 2 de abajo.
Si ves algún ✖ en rojo, mira [Si algo falla](#si-algo-falla).

<details>
<summary><strong>¿Prefieres tu laptop?</strong> (Linux, macOS o WSL2)</summary>

Necesitas Node 20+ con pnpm, Rust con el target `wasm32v1-none` y la Stellar CLI 30.0.1 o superior.

```bash
rustup target add wasm32v1-none
cargo install --locked stellar-cli --version 30.0.1   # o descarga el binario desde GitHub releases
git clone https://github.com/<tu-usuario>/misterio-queso-helado.git
cd misterio-queso-helado
pnpm install
pnpm check
```

En Windows recomendamos WSL2 o, más fácil, Codespaces.
</details>

## El taller, paso a paso

¿Quieres más detalle y preguntas para pensar? Está todo en la [guía del asistente](docs/guia-asistente.md).

### Paso 1 · Revisa tu entorno

```bash
pnpm check
```

**Qué vas a ver:** una lista con ✔ y un ⏳ en "Cuenta de testnet".
**Concepto:** tu Codespace ya tiene todo lo necesario: Rust, la Stellar CLI y conexión a la red de prueba.

### Paso 2 · Crea tu cuenta

```bash
pnpm setup:account
```

**Qué vas a ver:** `✔ Cuenta lista`, con un nombre (por ejemplo `detective-x7k2`) y tu **dirección**, que empieza con `G`.
**Concepto:** una cuenta es un par de llaves. La **pública** (tu dirección) la puede ver cualquiera. La
**secreta** sirve para **firmar** y se guarda en tu Codespace, nunca en el repo. Friendbot te regaló XLM de
prueba para pagar los fees.

### Paso 3 · Personaliza tu contrato

1. A la izquierda está el **explorador de archivos** (si no lo ves, haz clic en el ícono de las dos hojas).
   Abre `contracts` → `detective` → `src` → **`lib.rs`**. Puede que ya esté abierto.
2. Busca las 3 líneas que dicen `// TODO` y cambia **solo el texto entre comillas**:

```rust
pub const NOMBRE: &str = "Detective Sin Nombre";   // ← tu nombre de detective (sale en el ranking)
pub const PLACA: &str = "AQP-000";                 // ← tu placa, por ejemplo "AQP-054"
pub const GRITO: &str = "¡Subí al Misti y volví con hambre de queso helado!";  // ← tu grito
```

3. Guarda con **Ctrl + S** (en Mac, **Cmd + S**).

No borres las comillas ni el `;` del final. El nombre puede tener hasta 32 caracteres (las tildes y la ñ cuentan doble).
**Concepto:** un contrato inteligente es código. Lo que escribes aquí va a vivir en la blockchain.

### Paso 4 · Despliega tu contrato

```bash
pnpm detective:ship
```

Tarda un poco, y no es necesario que lo entiendas todo. Fíjate en los 5 pasos que va mostrando:

| Paso | Qué hace | ¿Lectura o escritura? |
|---|---|---|
| 1/5 | Prueba tu contrato en tu Codespace | Ninguna: no toca la red |
| 2/5 | Lo **despliega** en testnet y te da tu `CONTRACT_ID` | ✍️ Escritura |
| 3/5 | Lee tu ficha con `ficha()` | 📖 Lectura |
| 4/5 | Firma el libro de la Cumbre del Misti | ✍️ Escritura |
| 5/5 | Te registra en la Escena del Crimen | ✍️ Escritura |

**Qué vas a ver al final:** `✔ Registrado como <tu nombre>`.
**Concepto:** compara los mensajes 📖 LECTURA ("no firmaste, no pagaste fee") con los ✍️ ESCRITURA ("firmaste,
pagaste X XLM de fee, ledger N"). Esa es la diferencia más importante del taller.

### Paso 5 · Lee las pistas

```bash
pnpm caso:pistas
```

Para leer una sola pista: `pnpm caso:pista 2`.
**Concepto:** leer es **gratis**. Léelas todas las veces que quieras.

### Paso 6 · Interroga a los sospechosos (máximo 3)

```bash
pnpm caso:interrogar adobo
```

Cambia `adobo` por el ID que quieras: `rocoto`, `chicha`, `adobo`, `nevado` u `ocopa`. Elige bien: solo tienes 3.
Para ver cuántos te quedan: `pnpm caso:estado`.
**Concepto:** cada interrogatorio es una **escritura**. Firmas, pagas fee, el contrato cuenta tus intentos y emite
un **evento**. Si intentas un cuarto, el contrato lo rechaza: la regla está en el código.

### Paso 7 · Acusa al culpable (máximo 2 intentos)

```bash
pnpm caso:acusar <id>
```

Cambia `<id>` por el ID de tu sospechoso, sin los signos `< >`. La terminal te pregunta si estás seguro: escribe
**`s`** y presiona Enter. Si escribes otra cosa, se cancela y no se envía nada.
**Concepto:** el contrato no guarda el nombre del culpable, sino un **hash**. Si fallas, la transacción igual se
confirma y el intento queda registrado.

### Paso 8 · Mira el ranking

```bash
pnpm caso:ranking
```

**Concepto:** el ranking es **estado público** del contrato. Cualquiera puede leerlo, gratis.

### Otros comandos útiles

| Comando | Qué hace |
|---|---|
| `pnpm caso:sospechosos` | Lista de sospechosos con su ID |
| `pnpm caso:estado` | Tu expediente: interrogatorios y acusaciones usadas |
| `pnpm caso:registrar` | Te registra en la escena (lo hace `detective:ship`; úsalo si falló) |
| `pnpm detective:ficha` | Lee la ficha de tu contrato (lectura) |
| `pnpm detective:cumbre` | Firma otra vez el libro de la Cumbre del Misti (escritura) |
| `pnpm detective:test` | Solo corre los tests de tu contrato |
| `pnpm tablero` | Abre el tablero web del ranking en el puerto 5173 (solo lectura) |

Lo único que editas: [`contracts/detective/src/lib.rs`](contracts/detective/src/lib.rs).

### Reglas del juego

- Te registras una sola vez, con tu cuenta y tu contrato Detective.
- **Pistas:** ilimitadas y gratis.
- **Interrogatorios:** máximo 3. El contrato los cuenta por tu dirección y exige tu firma.
- **Acusación:** máximo 2 intentos. Acertar en el primero te pone por encima de quien acertó en el segundo.
- **Ranking:** primero por intento, después por el ledger en que se confirmó tu acierto. Los 3 primeros ganan premio.

### ¿Cuánto cuesta?

En nuestra prueba en testnet: firmar la cumbre costó ~0.0004 XLM, registrarte ~0.005 XLM,
interrogar ~0.0005 XLM y acusar entre 0.0004 y 0.002 XLM. Friendbot te da 10.000 XLM de juguete:
te sobra.

## Cómo está armado

```
.devcontainer/              Rust + wasm32v1-none + Stellar CLI 30.0.1 + Node 22 + pnpm
contracts/detective/        TU contrato (único archivo a editar: src/lib.rs)
contracts/escena_crimen/    contrato central del facilitador
scripts/                    los comandos pnpm (Node, sin dependencias, usan la Stellar CLI)
config/caso.json            CONTRACT_ID de la Escena del Crimen publicada
config/caso.data.json       pistas y testimonios que carga el facilitador
frontend/index.html         tablero de ranking (solo lectura)
docs/guia-asistente.md      la guía paso a paso
docs/guia-facilitador.md    cómo desplegar, cargar, reutilizar y cerrar el caso
```

Versiones: `soroban-sdk` 29.0.1, Stellar CLI 30.0.1, Rust target `wasm32v1-none`, testnet en protocolo 30.

Facilitador: los comandos `admin:*` solo funcionan con la cuenta que desplegó la escena (el contrato
rechaza cualquier otra firma). Todo está en [docs/guia-facilitador.md](docs/guia-facilitador.md).

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| **`No encontré el comando "stellar"`** (o `rustc`) recién abierto el Codespace | Todavía se está preparando. Espera 1 o 2 minutos y vuelve a correr `pnpm check` |
| **`command not found`** | Revisa que copiaste bien: `pnpm caso:pistas` (con espacio después de `pnpm`, sin `:` pegado a `pnpm`) |
| **"Dime a quién"** o **"no es un ID válido"** | Te faltó el ID o escribiste los signos `< >`. Ejemplo correcto: `pnpm caso:interrogar adobo` |
| **"Ese sospechoso no existe"** | Mira los IDs con `pnpm caso:sospechosos`. Van en minúsculas y sin tildes |
| **"Cancelado. Nada se envió."** al acusar | No escribiste `s`. Vuelve a correr el comando y responde `s` |
| **Friendbot caído** (`setup:account` no fondea, o "Account not found") | Espera un minuto y vuelve a correr `pnpm setup:account`. Tu llave ya quedó creada; solo falta el XLM. Si sigue fallando, abre `https://friendbot.stellar.org/?addr=TU_DIRECCION` en el navegador |
| **"No pude hablar con el nodo RPC"** / `client error (Connect)` | Fue un corte de conexión. Vuelve a correr el mismo comando. Las lecturas no gastan nada; una escritura que falló no se cobró |
| **Codespace lento** o se quedó "Building" | La primera vez compila Rust y tarda. Si pasan más de 10 minutos, recarga la pestaña. Si `pnpm detective:ship` va lento, es la compilación: ten paciencia la primera vez |
| **Error de firma / auth** ("Falta la firma correcta") | Estás usando una cuenta que no es dueña. Corre `pnpm check` para ver tu cuenta y no edites `.caso/local.json` a mano |
| **"Ese contrato Detective tiene otro dueño"** | Desplegaste con otra cuenta. Corre `pnpm detective:ship` de nuevo con tu cuenta actual |
| **"Ya estás registrado"** | No pasa nada: cada cuenta se registra una vez. Sigue con `pnpm caso:pistas` |
| **El nombre no cambió en el ranking** | La escena guarda el nombre de tu primer registro. Lo que cambies después no afecta el caso |
| **`pnpm: command not found`** | Fuera de Codespaces, instala pnpm con `npm install -g pnpm` |
| **Error de compilación en `lib.rs`** | Revisa que tus textos estén entre comillas dobles y que cada línea termine en `;` |

Para ver el error completo de la CLI: `CASO_DEBUG=1 pnpm caso:interrogar adobo`.
