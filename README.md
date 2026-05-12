<p align="center"><img src="logo.png" alt="ShegerPay" width="200" /></p>

# ShegerPay JavaScript / TypeScript SDK

Official JS/TS SDK for ShegerPay — verify Ethiopian bank payments in Node.js or the browser.

[![Version](https://img.shields.io/badge/version-2.2.0-blue)](https://www.npmjs.com/package/@shegerpay/sdk)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Install

```bash
npm install @shegerpay/sdk
```

## Quick Start

```typescript
import { ShegerPay } from '@shegerpay/sdk';

const client = new ShegerPay('sk_live_YOUR_API_KEY');

// Verify a payment
const result = await client.verify({ transactionId: 'FT26062K7WMY', amount: 1000, provider: 'cbe' });
console.log(result.verified);

// Verify from receipt screenshot
const result2 = await client.verifyImage({ screenshot: imageBlob, provider: 'telebirr' });

// Create payment link
const link = await client.createPaymentLink({ title: 'Order #1234', amount: 1500, currency: 'ETB' });
console.log(link.url);

// Webhook verification
const valid = ShegerPay.verifyWebhookSignature(payload, signature, secret);
```

## Supported Providers

`cbe` · `telebirr` · `boa` · `awash` · `ebirr_kaafi` · `ebirr_coop`

## Docs

- Full docs: https://shegerpay.com/docs
- Support: support@shegerpay.com | https://t.me/shegerpay_0
