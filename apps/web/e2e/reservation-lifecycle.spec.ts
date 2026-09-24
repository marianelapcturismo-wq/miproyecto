import { test, expect } from '@playwright/test';

/**
 * Camino crítico de punta a punta: login → crear reserva → check-in →
 * registrar pago → check-out. Usa fechas bien en el futuro para no chocar
 * con los datos de prueba que carga el seed, con un offset aleatorio para
 * no chocar tampoco con la reserva de una corrida anterior de este mismo
 * test contra la misma base (la reserva que crea queda persistida).
 *
 * Requiere la API, la base de datos (con el seed cargado) y el frontend
 * corriendo — ver README.md, sección "Cómo correrlo" — antes de ejecutar
 * `npm run test:e2e` en apps/web.
 */

function isoDate(daysFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

test('ciclo completo de una reserva: crear, check-in, pago y check-out', async ({ page }) => {
  const offset = 200 + Math.floor(Math.random() * 1000);
  const checkIn = isoDate(offset);
  const checkOut = isoDate(offset + 2);

  await test.step('login como recepción', async () => {
    await page.goto('/login');
    await page.fill('input[type=email]', 'recepcion@hotellosalerces.com');
    await page.fill('input[type=password]', 'Demo1234!');
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
  });

  await test.step('crear una nueva reserva confirmada', async () => {
    await page.click('text=Reservas');
    await page.click('text=+ Nueva reserva');

    await page.fill('input[type=date] >> nth=0', checkIn);
    await page.fill('input[type=date] >> nth=1', checkOut);

    await page.getByLabel('Tipo de habitación').selectOption({ label: 'Individual (cap. 1)' });
    const roomButton = page.locator('button', { hasText: /^1\d{2}$/ }).first();
    await expect(roomButton).toBeVisible();
    await roomButton.click();

    await page.getByPlaceholder('Buscar huésped por nombre o documento...').fill('Pérez');
    await page.getByRole('button', { name: /Pérez, Juan/ }).click();

    await page.click('button:has-text("Crear reserva")');
    await page.waitForURL(/\/reservations\/[a-z0-9]+/);
  });

  await test.step('la reserva arranca confirmada y se puede hacer check-in', async () => {
    await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
    await page.click('button:has-text("Realizar check-in")');
    await expect(page.getByText('Check-in', { exact: true })).toBeVisible();
  });

  await test.step('registrar el pago total deja el saldo en $0', async () => {
    await page.click('button:has-text("Registrar pago")');
    await page.click('.fixed button[type=submit]');
    await expect(page.getByText('Realizar check-out')).toBeVisible();
    await expect(page.getByTestId('reservation-balance')).toContainText('$ 0');
  });

  await test.step('el check-out cierra la reserva', async () => {
    await page.click('button:has-text("Realizar check-out")');
    await expect(page.getByText('Check-out', { exact: true })).toBeVisible();
    await expect(page.getByText('Realizar check-out')).not.toBeVisible();
  });
});
