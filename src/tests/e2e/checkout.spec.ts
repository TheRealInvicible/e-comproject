import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should complete checkout successfully', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/test-product');
    await page.click('button:text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Start checkout
    await page.click('button:text("Checkout")');

    // Fill shipping information
    await page.fill('input[name="street"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'Test State');
    await page.fill('input[name="postalCode"]', '12345');
    await page.click('button:text("Continue to Payment")');

    // Select payment method
    await page.click('input[value="CARD"]');
    await page.click('button:text("Pay Now")');

    // Mock payment provider page
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="expiry"]', '12/25');
    await page.fill('input[name="cvv"]', '123');
    await page.click('button:text("Pay")');

    // Verify success
    await page.waitForURL(/\/order\/success/);
    await expect(page.locator('h1')).toContainText('Order Confirmed');
  });

  test('should show error for invalid card', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/test-product');
    await page.click('button:text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Start checkout
    await page.click('button:text("Checkout")');

    // Fill shipping information
    await page.fill('input[name="street"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="state"]', 'Test State');
    await page.fill('input[name="postalCode"]', '12345');
    await page.click('button:text("Continue to Payment")');

    // Select payment method
    await page.click('input[value="CARD"]');
    await page.click('button:text("Pay Now")');

    // Mock payment provider page with invalid card
    await page.fill('input[name="cardNumber"]', '4242424242424241');
    await page.fill('input[name="expiry"]', '12/25');
    await page.fill('input[name="cvv"]', '123');
    await page.click('button:text("Pay")');

    // Verify error message
    await expect(page.locator('.error-message')).toContainText('Card declined');
  });

  test('should apply discount code', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/test-product');
    await page.click('button:text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Apply discount code
    await page.fill('input[name="couponCode"]', 'TEST10');
    await page.click('button:text("Apply")');

    // Verify discount applied
    await expect(page.locator('[data-testid="discount-amount"]')).toContainText('-$10.00');
  });

  test('should show out of stock message', async ({ page }) => {
    // Try to add out of stock item
    await page.goto('/products/out-of-stock-product');
    await expect(page.locator('button:text("Add to Cart")')).toBeDisabled();
    await expect(page.locator('.stock-status')).toContainText('Out of Stock');
  });

  test('should calculate shipping based on location', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/test-product');
    await page.click('button:text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Start checkout
    await page.click('button:text("Checkout")');

    // Fill shipping information for Lagos
    await page.fill('input[name="street"]', '123 Test St');
    await page.fill('input[name="city"]', 'Lagos');
    await page.fill('input[name="state"]', 'Lagos');
    await page.fill('input[name="postalCode"]', '12345');

    // Verify shipping cost for Lagos
    await expect(page.locator('[data-testid="shipping-cost"]')).toContainText('₦1,500.00');
  });
});