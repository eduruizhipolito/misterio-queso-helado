# 🧀 El Misterio del Queso Helado

Taller práctico de Stellar/Soroban para Web3 Sessions - Stellar en la U. La Salle (Arequipa).
Despliegas tu primer contrato inteligente, lees pistas, interrogas sospechosos y acusas al culpable,
todo en la blockchain de Stellar.

> **Todo pasa en TESTNET**, la red de práctica de Stellar. El XLM que usamos es de juguete, lo regala
> Friendbot y no vale dinero. Ningún comando de este repo puede apuntar a la red real (mainnet).

👉 La guía paso a paso está en [docs/guia-asistente.md](docs/guia-asistente.md).

## La historia

La noche del viernes, a las 11:40 pm, alguien entró a la **Picantería Doña Nieves** y se llevó el cuaderno
con la **receta secreta del queso helado**, justo antes de la feria del sábado. Doña Nieves contrató a los
mejores detectives de Arequipa: ustedes.

| ID | Sospechoso | Por qué es sospechoso |
|---|---|---|
| `rocoto` | Don Rocoto | Cocinero rival, siempre quiso la receta |
| `chicha` | La Tía Chicha | Vecina, vende chicha de jora al lado, siempre está mirando |
| `adobo` | El Cholo Adobo | Ayudante nuevo, llegó hace una semana |
| `nevado` | Misti Nevado | Heladero ambulante, competencia directa |
| `ocopa` | La Sobrina Ocopa | Heredera de la picantería, ¿celos familiares? |

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

## Cómo empezar (GitHub Codespaces)

No necesitas instalar nada: todo corre en la nube.

1. Inicia sesión en GitHub y haz **Fork** de este repo (botón arriba a la derecha).
2. En **tu** fork: botón verde **Code** → pestaña **Codespaces** → **Create codespace on main**.
3. Espera a que termine de preparar el entorno (la primera vez tarda unos minutos: compila Rust).
4. En la terminal de abajo, corre:

```bash
pnpm check
```

Si todo sale con ✔, ¡listo! Sigue con los pasos de abajo o con la [guía del asistente](docs/guia-asistente.md).

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

| # | Comando | Qué pasa | Concepto |
|---|---|---|---|
| 1 | `pnpm check` | Revisa Rust, Stellar CLI, conexión al RPC y la escena del crimen | Entorno |
| 2 | `pnpm setup:account` | Crea tu cuenta y la llena de XLM de testnet con Friendbot | Cuenta, llave pública y secreta |
| 3 | Edita los 3 `TODO` de [`contracts/detective/src/lib.rs`](contracts/detective/src/lib.rs) | Tu nombre, placa y grito de cumbre | Un contrato es código |
| 4 | `pnpm detective:ship` | Tests, compila, **despliega** tu contrato, lee tu `ficha()`, **firma** la cumbre y te registra en el caso | Desplegar, leer vs. escribir, llamada entre contratos |
| 5 | `pnpm caso:pistas` / `pnpm caso:pista 2` | Lee las pistas | Lectura: gratis, sin firma |
| 6 | `pnpm caso:interrogar <id>` | Interroga a un sospechoso (máximo 3) | Escritura: firma, fee, evento |
| 7 | `pnpm caso:acusar <id>` | Acusa al culpable (máximo 2 intentos) | Reglas que aplica el contrato, hash |
| 8 | `pnpm caso:ranking` | Mira quién resolvió el caso primero | Estado público |

Otros comandos útiles:

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
