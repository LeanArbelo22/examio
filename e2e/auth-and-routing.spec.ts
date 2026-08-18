import { expect, test, type Page } from "@playwright/test";

const password = "ExamioE2E2026!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
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
  await expect(page.getByText("Respuesta del alumno")).toBeVisible();
  const correction = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/examio/intentos/73/preguntas/502/corregir") &&
      response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: /Correcta$/ }).click();
  expect((await correction).status()).toBe(200);
});
