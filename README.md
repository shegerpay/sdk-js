# ShegerPay TypeScript SDK

Official TypeScript SDK for ShegerPay Payment Verification Gateway.

## Installation

```bash
npm install @shegerpay/sdk
# or
yarn add @shegerpay/sdk
```

## Quick Start

```typescript
import { ShegerPay } from "@shegerpay/sdk";

// Initialize client
const client = new ShegerPay("sk_test_xxx");

// Verify a payment
const result = await client.verify({
  transactionId: "FT24352648751234",
  amount: 100,
  provider: "cbe",
});

if (result.valid) {
  console.log("Payment verified!");
}
```

## Features

- ✅ Full TypeScript support with complete type definitions
- ✅ Ethiopian banks (CBE, Telebirr, Awash, BoA, etc.)
- ✅ Safe provider detection for BOA receipt URLs
- ✅ Crypto payments (USDT, BTC, ETH)
- ✅ Receipt image/PDF OCR via `verifyImage`
- ✅ PayPal checkout, wallet balance, and payout requests
- ✅ Payment links with QR codes
- ✅ Reusable promo codes for payment links and custom API checkouts
- ✅ Webhooks
- ✅ Transaction history and monitoring

## API Reference

### Verification

```typescript
// Verify with an explicit provider
const result = await client.verify({
  transactionId: "FT24352648751234",
  amount: 100,
  provider: "cbe",
});

// Quick verify
const result = await client.quickVerify("FT24352648751234", 100);

// BOA receipt verification
const boaResult = await client.verify({
  transactionId: "FT26091B1X5152078", // also accepts full slip URL, SMS text, or image via verifyImage
  amount: 100,
  provider: "boa",
  senderAccount: "52078",
});

// OCR receipt image/PDF verification
const imageResult = await client.verifyImage({
  screenshot: file,
  amount: 500,
});
```

### Payment Links

```typescript
// Create payment link
const link = await client.createPaymentLink({
  title: "Order #123",
  amount: 500,
  currency: "ETB",
});
console.log(link.url); // https://pay.shegerpay.com/abc123
console.log(link.qrCode); // data:image/png;base64,...

// List links
const links = await client.listPaymentLinks();
```

### Promo Codes

```typescript
const code = await client.createPromoCode({
  code: "STARTUP20",
  discountType: "percent",
  discountValue: 20,
  maxUses: 100,
  maxUsesPerCustomer: 1,
  minOrderAmount: 100,
});

const preview = await client.validatePromoCode({
  code: "STARTUP20",
  amount: 500,
  provider: "cbe",
  customerIdentifier: "buyer@example.com",
});

// Customer must pay preview.discounted_amount exactly.
const verified = await client.verify({
  transactionId: "FT26112GCXZD05529667",
  amount: preview.discounted_amount,
  provider: "cbe",
});

if (verified.verified) {
  await client.redeemPromoCode({
    code: "STARTUP20",
    amount: 500,
    provider: "cbe",
    transactionId: verified.transactionId || "FT26112GCXZD05529667",
    orderId: "order_1001",
    customerIdentifier: "buyer@example.com",
  });
}
```

### Crypto Payments

```typescript
// Get prices
const prices = await client.getCryptoPrices();
console.log(prices.BTC);

// Create crypto payment
const payment = await client.createCryptoPayment({
  amountUsd: 50,
  currency: "USDT",
  walletAddress: "TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW",
});

// Verify crypto payment
const result = await client.verifyCryptoPayment(payment.referenceId);
```

### PayPal

```typescript
const order = await client.createPayPalOrder({
  amount: 25,
  currency: "USD",
  description: "Order #123",
});

await client.capturePayPalOrder(order.id);

const balance = await client.getPayPalWalletBalance();

await client.requestPayPalPayout({
  amount: 25,
  currency: "USD",
  recipientEmail: "merchant@example.com",
});
```

### Webhooks

```typescript
// Create webhook
const webhook = await client.createWebhook({
  url: "https://yoursite.com/webhook",
  events: ["payment.verified", "payment.failed"],
});
console.log(webhook.secret); // Save this!

// Verify signature (in your webhook handler)
import { verifyWebhookSignature } from "@shegerpay/sdk";

const isValid = await verifyWebhookSignature(
  rawBody,
  req.headers["x-shegerpay-signature"],
  webhookSecret
);
```

### Monitoring

```typescript
// Health check
const health = await client.getHealth();
console.log(health.status); // 'healthy'

// Provider status
const providers = await client.getProviderStatus();
console.log(providers.providersOnline); // '8/8'
```

### Telegram Notifications

```typescript
// Configure Telegram
await client.configureTelegram({
  botToken: "123456:ABC...",
  chatId: "-1001234567890",
});

// Test notification
await client.testTelegram();

// Disable
await client.disableTelegram();
```

## Error Handling

```typescript
import {
  ShegerPay,
  ShegerPayError,
  AuthenticationError,
  ValidationError,
} from "@shegerpay/sdk";

try {
  const result = await client.verify({ transactionId: "FT123", amount: 100, provider: "cbe" });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (error instanceof ValidationError) {
    console.log("Validation failed:", error.message);
  } else if (error instanceof ShegerPayError) {
    console.log("Error:", error.errorCode, error.message);
    console.log("Suggestion:", error.suggestion);
  }
}
```

## Test Mode

```typescript
// Test mode (sk_test_xxx) - simulates verification
const testClient = new ShegerPay("sk_test_xxx");
console.log(testClient.mode); // 'test'

// Live mode (sk_live_xxx) - real verification
const liveClient = new ShegerPay("sk_live_xxx");
console.log(liveClient.mode); // 'live'
```

## License

MIT
