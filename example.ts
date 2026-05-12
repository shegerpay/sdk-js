/**
 * === ShegerPay TypeScript SDK Examples ===
 * Verify Ethiopian bank payments with just a few lines of code
 */

import { ShegerPay } from '@shegerpay/sdk';
import { readFileSync } from 'fs';

const client = new ShegerPay('sk_live_YOUR_API_KEY');

// =====================================================
// Example 1: Basic verify — amount is optional for lookup
// =====================================================

const result = await client.verify({ transactionId: 'FT26062K7WMY' });
console.log(result.verified, result.status);

// =====================================================
// Example 2: With amount for stricter verification
// =====================================================

const strictResult = await client.verify({
  transactionId: 'FT26062K7WMY',
  amount: 1000,
  provider: 'cbe',
});
console.log('Strict verify:', strictResult.verified, strictResult.amount);

// =====================================================
// Example 3: Image verification (receipt screenshot)
// =====================================================

const imageBase64 = readFileSync('receipt.jpg').toString('base64');
const imageResult = await client.verifyImage(imageBase64, { provider: 'cbe' });
console.log('Image verify:', imageResult.verified, imageResult.confidence);

// =====================================================
// Example 4: Create payment link
// =====================================================

const link = await client.createPaymentLink({
  title: 'Order #1234',
  amount: 1500,
  currency: 'ETB',
  enableCbe: true,
  enableTelebirr: true,
});
console.log('Payment link:', link.url);

// =====================================================
// Example 5: List & delete payment links
// =====================================================

const links = await client.listPaymentLinks({ limit: 10 });
for (const l of links) {
  console.log(l.id, l.url, l.status);
}

await client.deletePaymentLink(link.id);

// =====================================================
// Example 6: Webhook management
// =====================================================

const webhook = await client.createWebhook({
  url: 'https://your-site.com/webhooks/shegerpay',
  events: ['payment.verified', 'payment.failed'],
});

const webhooks = await client.listWebhooks();
await client.testWebhook(webhook.id);
await client.deleteWebhook(webhook.id);

// =====================================================
// Example 7: Webhook signature verification
// In your Express/Next.js webhook handler:
// =====================================================

// import { IncomingMessage, ServerResponse } from 'http';
// function webhookHandler(req: IncomingMessage, res: ServerResponse) {
//   const rawPayload = /* read raw body as string */;
//   const isValid = ShegerPay.verifyWebhookSignature(
//     rawPayload,
//     req.headers['x-shegerpay-signature'] as string,
//     'YOUR_WEBHOOK_SECRET'
//   );
//   if (!isValid) { res.writeHead(401); res.end(); return; }
//   const event = JSON.parse(rawPayload);
//   console.log('Event type:', event.type);
//   res.writeHead(200); res.end('OK');
// }

// =====================================================
// Example 8: List supported providers
// =====================================================

const providers = await client.getProviders();
for (const p of providers) {
  console.log(p.name, p.status); // e.g. "cbe" "active"
}

// =====================================================
// Example 9: Transaction history
// =====================================================

const history = await client.getHistory({ limit: 10 });
for (const tx of history) {
  console.log(tx.transactionId, tx.amount, tx.status);
}
