import { Page } from '@playwright/test';

export interface PurposeAllocation {
  name: string;
  categoryIds: string[];
  dailyAmounts: number[];
}

export class SpendingPlanHelper {
  constructor(private page: Page) {}

  generateAllocations(
    purposeCount: number,
    dayCount: number,
    totalAmount: number
  ): PurposeAllocation[] {
    const amountPerPurpose = totalAmount / purposeCount;
    const amountPerDay = Math.floor((amountPerPurpose / dayCount) * 100) / 100;

    return Array.from({ length: purposeCount }, (_, i) => ({
      name: `Purpose ${i + 1}`,
      categoryIds: [],
      dailyAmounts: Array.from({ length: dayCount }, (_, d) => {
        if (d === dayCount - 1) {
          const sum = amountPerDay * (dayCount - 1);
          return Math.round((totalAmount / purposeCount - sum) * 100) / 100;
        }
        return amountPerDay;
      }),
    }));
  }

  async fillAllocationGrid(purposes: PurposeAllocation[]) {
    for (let p = 0; p < purposes.length; p++) {
      const purpose = purposes[p];

      const nameInput = this.page.locator(`[data-testid="purpose-name-${p}"]`);
      if (await nameInput.isVisible()) {
        await nameInput.fill(purpose.name);
      }

      for (let d = 0; d < purpose.dailyAmounts.length; d++) {
        const amount = purpose.dailyAmounts[d];
        const input = this.page.locator(
          `[data-testid="allocation-${p}-${d}"]`
        );
        if (await input.isVisible()) {
          await input.fill(amount.toString());
        }
      }
    }
  }

  async getPlanStatus(): Promise<string> {
    const badge = this.page.locator('[data-testid="status-badge"]');
    if (await badge.isVisible()) {
      return (await badge.textContent()) || '';
    }
    return '';
  }

  async selectWallet(walletName: string) {
    const checkbox = this.page.locator(`[data-testid="wallet-checkbox-${walletName}"]`);
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
  }

  async addPurpose() {
    const addBtn = this.page.locator('button:has-text("Add Purpose")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
    }
  }

  async selectCategory(purposeIndex: number, categoryName: string) {
    const checkbox = this.page.locator(
      `[data-testid="category-checkbox-${purposeIndex}-${categoryName}"]`
    );
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
