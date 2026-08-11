import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    await this.page.locator('input[type="email"], input[name="email"]').fill(email);
    await this.page.locator('input[type="password"], input[name="password"]').fill(password);

    await this.page.locator('button[type="submit"]').click();

    await this.page.waitForURL('**/(dashboard)**', {
      timeout: 10000,
    });
  }

  async logout() {
    await this.page.context().clearCookies();
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async isAuthenticated() {
    const url = this.page.url();
    return !url.includes('/login') && !url.includes('/register');
  }
}
