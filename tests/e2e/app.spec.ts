import { test, expect } from '@playwright/test';

test.describe('FinDash Application', () => {
  test('should load auth page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Авторизация');
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should navigate to dashboard after login', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/confirm', { timeout: 5000 });
    await expect(page).toHaveURL(/\/confirm/);
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/confirm', { timeout: 5000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('.layout-nav')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/confirm', { timeout: 5000 });
    await page.waitForTimeout(3000);
    
    await page.click('button:has-text("Отслеживание")');
    await expect(page).toHaveURL(/\/tracking/);
    
    await page.click('button:has-text("Отчёты")');
    await expect(page).toHaveURL(/\/reports/);
  });

  test('should logout and redirect to auth', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/confirm', { timeout: 5000 });
    await page.waitForTimeout(3000);
    
    await page.click('button:has-text("Выйти")');
    await expect(page).toHaveURL('/');
  });
});

