import { expect, test, type Page } from "@playwright/test";

const password = "ExamioE2E2026!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  const callback = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/callback/credentials") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ingresar" }).click();
  expect((await callback).status()).toBe(200);
  await page.goto("/");
}

test("una ruta protegida redirige al login", async ({ page }) => {
  await page.goto("/profesor/reportes");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

for (const account of [
  { email: "admin@cervantes.edu.ar", path: "/admin" },
  { email: "docente@cervantes.edu.ar", path: "/profesor" },
  { email: "alumno@cervantes.edu.ar", path: "/alumno" },
]) {
  test(`login ${account.email} conserva cookie y RBAC`, async ({ page, context }) => {
    await login(page, account.email);
    await expect(page).toHaveURL(new RegExp(`${account.path}$`));

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name.includes("next-auth.session-token"));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);

    await page.goto(account.path === "/admin" ? "/profesor" : "/admin");
    await expect(page).toHaveURL(new RegExp(`${account.path}$`));
  });
}

test("credenciales inválidas permanecen en login con mensaje funcional", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("docente@cervantes.edu.ar");
  await page.getByLabel("Contraseña").fill("Incorrecta2026!");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/login$/);
  const error = page.getByText("El correo o la contraseña son incorrectos.");
  await expect(error).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Contraseña")).toHaveAttribute("aria-describedby", "login-form-error");
});

test("el docente abre reportes mediante sesión y BFF reales", async ({ page }) => {
  await login(page, "docente@cervantes.edu.ar");
  await expect(page).toHaveURL(/\/profesor$/);
  await page.goto("/profesor/reportes?reporte=evaluaciones");

  await expect(page.getByRole("heading", { name: "Rendimiento por evaluación" })).toBeVisible();
  await expect(page.getByText("No hay resultados para los filtros seleccionados.")).toBeVisible();
});

test("el alumno responde dentro del examen sin exponer credenciales", async ({ page }) => {
  await login(page, "alumno@cervantes.edu.ar");
  await expect(page).toHaveURL(/\/alumno$/);
  expect(await page.evaluate(() => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(false);
  await page.evaluate(() => {
    sessionStorage.setItem("examio_deadline_73", String(Date.now() + 30 * 60_000));
  });

  await page.goto("/alumno/examen/73/actividad/1");
  await expect(page.getByRole("heading", { name: "Pregunta 1 de 1" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar e Ingresar" }).click();
  await expect(page.getByRole("button", { name: "Confirmar e Ingresar" })).toBeHidden();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(true);
  await page.getByText("Opción persistida").click();
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();

  const completedFocusEvent = page.waitForRequest(
    (request) =>
      /\/api\/examio\/telemetria\/intentos\/73\/incidentes\/[0-9a-f-]+$/i.test(request.url()) &&
      request.method() === "PUT" &&
      Boolean(request.postDataJSON().FechaFinCliente),
  );
  let finalizedByFocusLoss = false;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/examio/intentos/73/finalizar")) {
      finalizedByFocusLoss = true;
    }
  });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await completedFocusEvent;
  expect(finalizedByFocusLoss).toBe(false);

  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(storage.local.some((key) => key.includes("token"))).toBe(false);
  expect(storage.session.some((key) => key.includes("token"))).toBe(false);
});

test("el docente abre un intento y corrige una respuesta abierta", async ({ page }) => {
  await login(page, "docente@cervantes.edu.ar");
  await expect(page).toHaveURL(/\/profesor$/);
  await page.goto("/profesor/intento/73");

  await expect(page.getByRole("heading", { name: "E2E, Alumno" })).toBeVisible();
  await expect(page.getByText("Respuesta del alumno").last()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actividad fuera del examen" })).toBeVisible();
  const correction = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/examio/intentos/73/preguntas/502/corregir") &&
      response.request().method() === "PUT",
  );
  await page.getByLabel("Puntaje obtenido").fill("1.5");
  await page.getByLabel(/Devolución del docente/).fill("Respuesta parcial");
  await page.getByRole("button", { name: "Guardar corrección" }).click();
  expect((await correction).status()).toBe(200);
  await expect(page.getByText(/La nota del intento fue recalculada/)).toBeVisible();
});

test("el docente elige el intento que cuenta como resultado académico", async ({ page }) => {
  await login(page, "docente@cervantes.edu.ar");
  await page.goto("/profesor/examen/47");

  await page.getByRole("button", { name: "Gestionar intentos" }).click();
  await expect(
    page.getByRole("heading", { name: "Intentos de E2E, Alumno" }),
  ).toBeVisible();

  const changeRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(
        "/api/examio/evaluaciones/publicaciones/47/alumnos/30001/intento-valido",
      ) && request.method() === "PUT",
  );
  await page.getByRole("button", { name: "Elegir como resultado" }).click();
  await page.getByRole("button", { name: "Confirmar selección" }).click();

  expect((await changeRequest).postDataJSON()).toEqual({ IdIntento: 72 });
  await expect(
    page.getByText("El intento elegido se usará como resultado académico."),
  ).toBeVisible();
});

test("el alumno consulta su historial filtrable con el intento académico visible", async ({ page }) => {
  await login(page, "alumno@cervantes.edu.ar");
  await page.goto("/alumno/resultados?resultado=aprobado");

  await expect(
    page.getByRole("heading", { name: "Mi historial de actividades" }),
  ).toBeVisible();
  await expect(page.getByText("Evaluación E2E")).toBeVisible();
  await expect(page.getByText("8.00 / 10")).toBeVisible();
  await expect(page.getByText("Resultado académico")).toBeVisible();
  await expect(page.getByText("2 intentos encontrados")).toBeVisible();
});

test("el docente guarda contenido individual, importa del banco y publica transaccionalmente", async ({ page }) => {
  await login(page, "docente@cervantes.edu.ar");
  await expect(page).toHaveURL(/\/profesor$/);
  await page.goto("/profesor/crear-examen");

  await page.getByLabel("Título", { exact: true }).fill("Evaluación banco E2E");
  await page.getByLabel("Asignar a comisión").selectOption("12");
  await page.getByPlaceholder("Título del grupo 1").fill("Protocolos");
  await page.getByLabel("Tipo de variante 1").selectOption("abierta");
  await page.getByLabel("Enunciado de variante 1").fill("Explicá TCP");

  const saveQuestion = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/examio/banco-preguntas/preguntas") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Guardar en banco" }).click();
  expect((await saveQuestion).status()).toBe(201);
  await expect(page.getByText("En banco", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Agregar desde mi banco" }).click();
  await page.getByRole("checkbox", { name: /Pregunta disponible E2E/ }).check();
  await page.getByRole("button", { name: "Agregar selección" }).click();
  await expect(page.getByText("Pregunta disponible E2E", { exact: true })).toBeVisible();

  const saveDraft = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/examio/evaluaciones/guardar-completo") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  const draftRequest = await saveDraft;
  const draftBody = draftRequest.postDataJSON();
  expect(draftBody.Estado).toBe("borrador");
  expect(draftBody).toMatchObject({
    EscalaCalificacion: 10,
    NotaAprobacion: 4,
    ModoPuntaje: "iguales",
    MostrarPuntajePorPregunta: false,
    CorreccionAutomaticaCerradas: true,
  });
  expect(draftBody.ImportacionesBanco).toEqual([
    {
      Tipo: "pregunta",
      IdPregunta: 601,
      RevisionEsperada: 2,
      TituloReferencia: "Pregunta disponible E2E",
    },
  ]);
  expect(draftRequest.headers()["idempotency-key"]).toBeTruthy();

  await expect(page).toHaveURL(/\/profesor\/examen\/77\/editar$/);
  await page.getByRole("button", { name: "Publicar evaluación" }).click();
  const saveAll = page.getByRole("checkbox", {
    name: /Guardar todas las preguntas en mi banco/,
  });
  await expect(saveAll).not.toBeChecked();
  await saveAll.check();

  const publishRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/examio/evaluaciones/70/publicar-completo") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Confirmar publicación" }).click();
  const publishRequest = await publishRequestPromise;
  expect(publishRequest.postDataJSON().GuardarTodoEnBanco).toBe(true);
  expect(publishRequest.headers()["idempotency-key"]).toBeTruthy();
  await expect(page).toHaveURL(/\/profesor\/examen\/77\/detalle$/);
});
