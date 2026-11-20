// pnpm tablero - sirve el tablero de ranking (solo lectura) en http://localhost:5173
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { c, CASO_FILE, ROOT } from "./lib.mjs";

const PORT = Number(process.env.PORT ?? 5173);

createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/config/caso.json")) {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(await readFile(CASO_FILE));
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(join(ROOT, "frontend", "index.html")));
  } catch {
    res.writeHead(404).end("No encontrado");
  }
}).listen(PORT, () => {
  console.log(`\n  ${c.green("✔")} Tablero en ${c.bold(`http://localhost:${PORT}`)}`);
  console.log(c.dim("  Solo LEE el ranking (simulación en el RPC de testnet): no firma nada ni paga fee. Ctrl+C para salir.\n"));
});
