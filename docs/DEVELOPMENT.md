# Entorno de desarrollo de Examio

## Puertos esperados

| Servicio | URL | Puerto |
|---|---|---:|
| Frontend Next.js | `http://localhost:3000` | 3000 |
| API Node | `http://localhost:55803/api` | 55803 |

Antes de iniciar el frontend, ejecutar:

```bash
pnpm env:check
```

El comando muestra el ambiente, la URL efectiva usada para la comprobación, el estado HTTP y, cuando el sistema operativo lo permite, el PID y comando que ocupa el puerto de la API.

También se puede usar otra ubicación sin modificar archivos:

```powershell
$env:EXAMIO_BACKEND_URL="http://localhost:55803/api"
pnpm env:check
```

## Puerto ocupado por un proceso incorrecto

Un puerto abierto no garantiza que la API real esté ejecutándose. Un proceso residual de Jest puede iniciar la aplicación Express con la base de datos simulada y responder solicitudes en el mismo puerto.

Indicadores de un proceso incorrecto:

- El login devuelve `401` con usuarios existentes.
- La API real no registra la solicitud.
- El comando asociado al puerto contiene `jest`, `ts-jest` o `vitest`.
- Las respuestas contienen datos de prueba o no reflejan la base real.

En Windows, inspeccionar manualmente:

```powershell
Get-NetTCPConnection -LocalPort 55803 -State Listen
Get-CimInstance Win32_Process -Filter "ProcessId=<PID>" | Select-Object ProcessId, Name, CommandLine
```

Finalizar solamente el PID previamente verificado:

```powershell
Stop-Process -Id <PID>
```

No finalizar procesos por nombre porque puede afectar otras instancias de Node.js.

## Health check identificable

La API expone `GET /api/health` sin autenticación. La herramienta exige que la respuesta contenga `service: "examio-api"`; un puerto abierto o una respuesta de `/auth/login` ya no se consideran prueba suficiente de identidad.

Respuesta disponible:

```json
{
  "success": true,
  "data": {
    "service": "examio-api",
    "environment": "development",
    "database": "reachable"
  }
}
```

Cuando SQL Server no está disponible, la API conserva la misma identidad, informa `database: "unreachable"` y responde `503`. En ese caso `env:check` termina con error porque el backend no está listo para operar.

Códigos de salida del diagnóstico:

| Código | Significado |
|---:|---|
| 0 | Examio API identificada y SQL Server disponible |
| 1 | API inaccesible |
| 2 | Proceso de tests detectado en el puerto |
| 3 | Examio API identificada, SQL Server no disponible |
| 4 | El puerto responde, pero no se identifica como Examio API |

## Aislamiento de tests backend

El backend separa actualmente `src/app.ts` de `src/index.ts`: Supertest importa la aplicación Express sin ejecutar `listen()`. La suite fue verificada con `--detectOpenHandles` y finaliza sin servidores residuales.

Las garantías que deben conservarse son:

- Los tests de integración no escuchen en el puerto fijo 55803.
- Se utilice un puerto efímero (`listen(0)`) si un servidor real es indispensable.
- Supertest reciba la aplicación Express sin llamar `listen()` cuando sea posible.
- Todo servidor creado por un test se cierre en `afterAll`.
- Las conexiones y timers abiertos se liberen al finalizar.
- Jest termine sin `--forceExit` y sin handles abiertos.

Comandos útiles en el backend:

```bash
npx jest --detectOpenHandles
npx jest --runInBand
```

## Diagnóstico del login

El `POST /login 200` corresponde a la validación de la Server Action; no confirma autenticación. La autenticación real ocurre después en `POST /api/auth/callback/credentials` y en la llamada del `CredentialsProvider` a la API Node.

Ante un `401`:

1. Ejecutar `pnpm env:check`.
2. Confirmar el proceso que ocupa 55803.
3. Confirmar que la API real registra el intento.
4. Recién entonces revisar usuario y contraseña.

Actualmente `authorize()` convierte tanto credenciales inválidas como errores de conexión en `null`. La diferenciación de esos errores pertenece a la fase de estabilización de autenticación.
