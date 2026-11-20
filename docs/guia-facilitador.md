# 🧑‍🏫 Guía del facilitador: El Misterio del Queso Helado

Esta guía es para quien dirige el taller. Los comandos `admin:*` solo funcionan con la cuenta que desplegó la
Escena del Crimen: el contrato rechaza cualquier otra firma (error `NoEsAdmin`), así que no hace falta esconderlos.

> Esta guía **no** dice quién es el culpable. La solución, los caminos de deducción y el guion detallado de la
> revelación viven en archivos que **no se suben a git**: `docs/diseno-caso.md`, `docs/privado/` y `.caso/secreto.json`.

## Antes del taller

### 1. Requisitos

Los mismos del asistente (`pnpm check` en verde), con la Stellar CLI **30.0.1 o superior**. Puedes hacerlo
desde tu laptop o desde un Codespace propio. La cuenta admin se crea sola con el nombre `facilitador`
(cámbialo con la variable `CASO_ADMIN`).

### 2. Desplegar la Escena del Crimen

```bash
pnpm admin:deploy <culpable>
```

- `<culpable>` es uno de los IDs de `config/caso.data.json` (`rocoto`, `chicha`, `adobo`, `nevado`, `ocopa`).
  No se guarda en ningún archivo del repo.
- Se genera una **sal** aleatoria (o pasa la tuya con `--sal=texto`) y se despliega con
  `hash_culpable = sha256(culpable + sal)`, en UTF-8.
- Escribe `config/caso.json` (el `CONTRACT_ID`, **sí** se sube) y `.caso/secreto.json` (culpable y sal,
  **no** se sube; lo usa `admin:revelar`).

### 3. Cargar pistas y testimonios

```bash
pnpm admin:cargar
```

Lee `config/caso.data.json` y envía una transacción por cada pista y testimonio (9 en total, ~1-2 minutos).
Cada testimonio nuevo agrega su ID a la lista de sospechosos. Volver a correrlo reemplaza los textos.

### 4. Publicar el `CONTRACT_ID`

```bash
git add config/caso.json
git commit -m "Escena del Crimen para el taller"
git push
```

Hazlo **antes** de que los asistentes hagan fork. Si alguien ya hizo fork, que use **Sync fork** en GitHub o que
copie el `contractId` en su `config/caso.json`.

### 5. Ensayo rápido (recomendado)

Con una cuenta desechable: `pnpm setup:account prueba`, `pnpm detective:ship`, `pnpm caso:pistas`,
`pnpm caso:interrogar adobo`. **No acuses** con la cuenta de prueba si no quieres aparecer en el ranking real.

## Durante el taller (60 minutos)

| Minuto | Actividad | Tú |
|---|---|---|
| 0-10 | Fork, Codespaces, `pnpm check`, `pnpm setup:account` | Ayuda con Codespaces: la primera carga compila Rust y tarda |
| 10-22 | Cumbre del Misti: 3 `TODO` en `lib.rs` y `pnpm detective:ship` | Explica lectura vs. escritura con la salida del paso 3/5 y 4/5. Abre un link del explorador y muestra el evento |
| 22-50 | El misterio | Proyecta el tablero (`pnpm tablero`). Pregunta al público: "¿por qué la pista es gratis y el interrogatorio no?" |
| 50-60 | Revelación y premios | `pnpm admin:revelar` |

### El tablero

```bash
pnpm tablero
```

Abre `http://localhost:5173` (en Codespaces, la pestaña **Ports** → puerto 5173). Simula `ranking()` cada
5 segundos: solo lectura, sin firmas.

## El hueco de la sal (premio "Detective Hacker")

Es **intencional**. No lo menciones en la guía del asistente.

- El contrato guarda `HashCulpable` y `Sal` en su storage de instancia. Todo storage es público.
- Hay solo 5 sospechosos. Quien lea la sal puede calcular los 5 hashes y ver cuál coincide, sin interrogar a nadie.

Cómo lo haría alguien:

```bash
stellar contract read --contract-id <CONTRACT_ID> --network testnet --output json
# busca "HashCulpable" (bytes) y "Sal" (string) en la salida
node -e "const c=require('crypto');for(const s of ['rocoto','chicha','adobo','nevado','ocopa'])console.log(s,c.createHash('sha256').update(s+'LA_SAL').digest('hex'))"
```

Si alguien lo logra: premio **Detective Hacker**, y la conversación vale oro:

- En una blockchain no hay secretos guardados: hashear no basta si el espacio de respuestas es pequeño y la sal es pública.
- Soluciones reales: **commit-reveal** (publicas el hash y revelas la sal después), o dejar el secreto fuera de la cadena.
- Lo mismo con los testimonios: están en el storage. El límite de 3 interrogatorios es una regla del juego, no un secreto.
  Pregunta al público: "si cualquiera puede leer los testimonios, ¿para qué sirve el límite?"

`pnpm admin:revelar` muestra exactamente este ataque en pantalla antes de cerrar el caso.

## La revelación (min 50-60)

```bash
pnpm admin:revelar
```

Hace tres cosas, en este orden:

1. **El hackeo en vivo:** lee el storage del contrato con la Stellar CLI, muestra la sal y prueba los 5 hashes.
   Es el momento para hablar de "todo es público".
2. **Cierra el caso on-chain:** llama a `revelar(admin, culpable)`. El contrato verifica que el culpable coincida
   con el hash (si te equivocas, responde `HashIncorrecto`) y desde ese momento rechaza nuevas acusaciones.
3. **Ranking final:** los 3 primeros ganan premio.

### Guion sugerido

1. **Suspenso (1 min):** "Doña Nieves está aquí. Antes de decir el nombre, veamos qué sabía la blockchain."
2. **El hackeo (2 min):** corre `pnpm admin:revelar` y detente en la parte de los hashes. "Cualquiera de ustedes
   pudo hacer esto en el minuto 1. ¿Alguien lo hizo?" (premio Detective Hacker).
3. **La deducción (3 min):** recorre con el público qué pista elimina a quién y qué testimonio no cuadra. El
   detalle está en tu guion privado (`docs/privado/guion-revelacion.md`).
4. **Ranking y premios (2 min):** podio en el tablero. Explica por qué el 1er intento rankea arriba.
5. **Una transacción ganadora (2 min):** abre en Stellar Expert (testnet) la acusación del primer lugar:
   la firma, el fee, el ledger y el evento `acusacion` con `acierto: true`.

## Reutilizar el caso en otro evento

Cada despliegue crea un contrato **nuevo**; el anterior sigue en testnet sin molestar.

1. **Mismo caso, otro culpable o nueva sal:** `pnpm admin:deploy <otro_id>` y `pnpm admin:cargar`. Ajusta las pistas
   y testimonios para que la deducción tenga sentido.
2. **Cambiar pistas o testimonios:** edita `config/caso.data.json`.
   - `pistas`: lista en orden; la primera es la pista 1.
   - `testimonios`: `{ "id": "texto" }`. El ID es el que escriben los asistentes: minúsculas, números o `_`, máximo 32.
3. **Cambiar sospechosos:** además de `caso.data.json`, actualiza los nombres para mostrar en `PERSONAJES`
   (`scripts/caso.mjs`) y `NOMBRES` (`frontend/index.html`), y la tabla del README y de la guía del asistente.
4. Publica el nuevo `config/caso.json` con git antes del evento.

Los datos del contrato viven ~30 días en testnet (cada escritura renueva el plazo). Testnet se reinicia de vez en
cuando: si el contrato desaparece, vuelve a desplegar.

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `admin:deploy` dice "Friendbot no fondeó" | Espera un minuto y repite. La llave `facilitador` ya quedó creada |
| `admin:cargar` se corta a la mitad | Vuelve a correrlo: reemplaza lo ya cargado, no duplica |
| "Esa acción es solo para la cuenta del facilitador" | Estás usando otra cuenta. Revisa `CASO_ADMIN` o la llave `facilitador` (`stellar keys ls`) |
| Muchos "client error (Connect)" | El RPC público de testnet tuvo un corte. Espera y repite; nada se cobra si falla |
| Un asistente perdió su Codespace | Su llave se perdió con él. Que haga `pnpm setup:account` y `pnpm detective:ship` de nuevo: será otra cuenta, con 3 interrogatorios nuevos |

Para ver errores completos de la CLI: `CASO_DEBUG=1 pnpm admin:cargar`.
