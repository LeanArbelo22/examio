import { execFileSync } from "node:child_process";
import http from "node:http";
import https from "node:https";

const FRONTEND_URL = process.env.EXAMIO_FRONTEND_URL ?? "http://localhost:3000";
const BACKEND_URL = process.env.EXAMIO_BACKEND_URL ?? "http://localhost:55803/api";
const backend = new URL(BACKEND_URL);
const backendPort = Number(backend.port || (backend.protocol === "https:" ? 443 : 80));

function request(url, method = "GET") {
  return new Promise((resolve) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, { method, timeout: 3500 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ reachable: true, status: response.statusCode ?? 0, body: body.slice(0, 500) }));
    });
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", (error) => resolve({ reachable: false, error: error.message }));
    request.end();
  });
}

function getWindowsProcess(port) {
  try {
    const netstat = execFileSync("netstat.exe", ["-ano", "-p", "tcp"], { encoding: "utf8", timeout: 5000 });
    const line = netstat.split(/\r?\n/).find((entry) => entry.includes(`:${port}`) && entry.toUpperCase().includes("LISTENING"));
    const pid = Number(line?.trim().split(/\s+/).at(-1));
    if (!pid) return null;

    let name;
    let commandLine;
    try {
      const task = execFileSync("tasklist.exe", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8", timeout: 5000 }).trim();
      name = task.match(/^"([^"]+)"/)?.[1];
    } catch {
      // El PID sigue siendo útil aunque Windows restrinja los detalles del proceso.
    }
    try {
      const script = `(Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\" -ErrorAction Stop).CommandLine`;
      commandLine = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", timeout: 5000 }).trim() || undefined;
    } catch {
      // Algunos entornos restringen WMI/CIM para procesos de otros usuarios.
    }
    return { pid, name, commandLine };
  } catch {
    return null;
  }
}

function getUnixProcess(port) {
  try {
    const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpc"], { encoding: "utf8", timeout: 5000 });
    const pid = output.match(/^p(\d+)/m)?.[1];
    const command = output.match(/^c(.+)/m)?.[1];
    return pid ? { pid: Number(pid), name: command, commandLine: command } : null;
  } catch {
    return null;
  }
}

function getListeningProcess(port) {
  return process.platform === "win32" ? getWindowsProcess(port) : getUnixProcess(port);
}

function isSuspiciousTestProcess(processInfo) {
  if (!processInfo) return false;
  const description = `${processInfo.name ?? ""} ${processInfo.commandLine ?? ""}`.toLowerCase();
  return description.includes("jest") || description.includes("ts-jest") || description.includes("vitest");
}

console.log("Examio · verificación del entorno de desarrollo");
console.log(`Frontend esperado: ${FRONTEND_URL}`);
console.log(`API esperada:      ${BACKEND_URL}`);
console.log("");

const processInfo = getListeningProcess(backendPort);
const loginProbeUrl = new URL(`${backend.pathname.replace(/\/$/, "")}/auth/login`, backend.origin);
const healthProbeUrl = new URL(`${backend.pathname.replace(/\/$/, "")}/health`, backend.origin);
const loginProbe = await request(loginProbeUrl, "OPTIONS");
const healthProbe = await request(healthProbeUrl);
let healthPayload;
try {
  healthPayload = healthProbe.body ? JSON.parse(healthProbe.body) : undefined;
} catch {
  healthPayload = undefined;
}
const isExamioApi = healthPayload?.data?.service === "examio-api";

if (!loginProbe.reachable) {
  console.error(`ERROR: no se puede acceder a la API en el puerto ${backendPort}: ${loginProbe.error}`);
  process.exitCode = 1;
} else {
  console.log(`Puerto ${backendPort}: abierto (OPTIONS /auth/login → HTTP ${loginProbe.status})`);
}

if (processInfo) {
  console.log(`Proceso: PID ${processInfo.pid} · ${processInfo.name ?? "desconocido"}`);
  if (processInfo.commandLine) console.log(`Comando: ${processInfo.commandLine}`);
  else console.warn("ADVERTENCIA: Windows no permitió leer la línea de comando; verificá manualmente el PID antes de confiar en el proceso.");
} else if (loginProbe.reachable) {
  console.warn("ADVERTENCIA: no fue posible identificar el proceso que ocupa el puerto.");
}

if (isSuspiciousTestProcess(processInfo)) {
  console.error("ERROR: el puerto de la API está ocupado por un proceso de tests (Jest/Vitest). No inicies el frontend contra este proceso.");
  process.exitCode = 2;
}

if (isExamioApi) {
  console.log(`Identidad backend: examio-api (HTTP ${healthProbe.status}).`);
  console.log(`Ambiente backend:  ${healthPayload.data.environment ?? "desconocido"}`);
  console.log(`Estado SQL Server: ${healthPayload.data.database ?? "desconocido"}`);
  if (healthProbe.status === 503 || healthPayload.data.database !== "reachable") {
    console.error("ERROR: el proceso es Examio API, pero SQL Server no está disponible.");
    process.exitCode = 3;
  }
} else if (loginProbe.reachable && !isSuspiciousTestProcess(processInfo)) {
  console.error("ERROR: el puerto responde, pero el health check no identifica al proceso como examio-api.");
  process.exitCode = 4;
}

if (!process.exitCode) {
  console.log("Resultado: entorno utilizable, con las advertencias indicadas.");
}
