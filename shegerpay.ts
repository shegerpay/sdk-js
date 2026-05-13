/**
 * ShegerPay TypeScript SDK
 * Official TypeScript/JavaScript SDK for ShegerPay Payment Verification Gateway
 * 
 * @example
 * import { ShegerPay } from '@shegerpay/sdk';
 * 
 * const client = new ShegerPay('sk_test_xxx');
 * const result = await client.verify({ transactionId: 'FT123456', amount: 100, provider: 'cbe' });
 */

// ============================================
// Types & Interfaces
// ============================================

export interface ShegerPayConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface VerifyParams {
  transactionId: string;
  amount: number;
  provider?: 'cbe' | 'telebirr' | 'awash' | 'boa' | 'ebirr_kaafi' | 'ebirr_coop';
  merchantName?: string;
  senderAccount?: string;
}

export interface QuickVerifyOptions {
  expectedProvider?: 'cbe' | 'telebirr' | 'awash' | 'boa' | 'ebirr_kaafi' | 'ebirr_coop';
  senderAccount?: string;
}

export interface VerificationResult {
  verified: boolean;
  valid: boolean;
  status: 'verified' | 'failed' | 'pending' | 'processing' | 'error';
  provider?: string;
  transactionId?: string;
  amount?: number;
  payer?: string;
  receiver?: string;
  mode: 'test' | 'live';
  requestId?: string;
  referenceId?: string;
  saved?: boolean;
  errorCode?: string;
  message?: string;
  suggestion?: string;
}

export interface PaymentLinkParams {
  title: string;
  amount: number;
  currency?: 'ETB' | 'USD';
  description?: string;
  amountMode?: 'fixed' | 'preset_options' | 'customer_decides' | 'minimum';
  amountOptions?: number[];
  minAmount?: number;
  maxAmount?: number;
  promoCodeIds?: string[];
  paymentMethodLayout?: 'list' | 'icon_grid' | 'two_column_grid' | 'compact_scroll';
  allowQuantity?: boolean;
  maxQuantity?: number;
  redirectUrl?: string;
  webhookUrl?: string;
  businessName?: string;
  merchantLogoUrl?: string;
  themeColor?: string;
  hideBranding?: boolean;
  enableCbe?: boolean;
  enableTelebirr?: boolean;
  enableCrypto?: boolean;
  expiresInHours?: number;
}

export interface PaymentLink {
  id: string;
  shortCode: string;
  url: string;
  qrCode: string;
  title: string;
  amount: number;
  currency: string;
  status: 'active' | 'inactive' | 'expired';
}

export interface PaymentLinkOrderStatus {
  status: string;
  order_id: string;
  checkout_session_id: string;
  short_code: string;
  amount: number;
  gross_amount?: number;
  discount_amount?: number;
  currency: string;
  provider?: string;
  promo_code?: string;
  transaction_id?: string;
  verified_at?: string;
  paid_at?: string;
  redirect_url?: string;
  signature?: string;
}

export interface PaymentLinkSubmissionParams {
  shortCode: string;
  paymentMethod: string;
  transactionId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PromoCodeParams {
  code: string;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountPercent?: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active?: boolean;
  appliesToLinkIds?: string[] | null;
  allowedProviders?: string[] | null;
  metadata?: Record<string, any> | null;
}

export interface PromoCodeValidateParams {
  code: string;
  amount: number;
  linkId?: string;
  provider?: string;
  customerIdentifier?: string;
}

export interface PromoCodeRedeemParams extends PromoCodeValidateParams {
  transactionId: string;
  orderId?: string;
  idempotencyKey?: string;
}

export interface WebhookParams {
  url: string;
  events: string[];
  secret?: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: string;
}

export interface CryptoPaymentParams {
  amountUsd: number;
  currency: 'USDT' | 'BTC' | 'ETH' | 'TRX';
  walletAddress: string;
  chain?: 'TRON' | 'ETH' | 'BSC' | 'BTC';
}

export interface PayPalOrderParams {
  amount: number;
  currency?: string;
  description?: string;
}

export interface PayPalPayoutParams {
  amount: number;
  currency?: string;
  recipientEmail: string;
  note?: string;
}

export interface CryptoPayment {
  referenceId: string;
  paymentAmount: string;
  currency: string;
  walletAddress: string;
  qrCode: string;
  expiresAt: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  notifyOnPayment?: boolean;
  notifyOnSecurity?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: Record<string, string>;
  providers: Record<string, string>;
  encryption: {
    atRest: string;
    inTransit: string;
    apiKeys: string;
  };
}

export interface ProviderStatus {
  overallStatus: 'operational' | 'partial_outage' | 'major_outage';
  providersOnline: string;
  updatedAt: string;
  providers: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline';
    avgResponseMs: number;
    successRate: number;
    lastSuccess: string;
  }>;
}

// ============================================
// Error Classes
// ============================================

export class ShegerPayError extends Error {
  statusCode: number;
  errorCode?: string;
  suggestion?: string;

  constructor(message: string, statusCode: number = 400, errorCode?: string, suggestion?: string) {
    super(message);
    this.name = 'ShegerPayError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.suggestion = suggestion;
  }
}

export class AuthenticationError extends ShegerPayError {
  constructor(message: string = 'Invalid API key') {
    super(message, 401, 'AUTH_002');
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ShegerPayError {
  constructor(message: string) {
    super(message, 400, 'VAL_001');
    this.name = 'ValidationError';
  }
}

// ============================================
// Main Client
// ============================================

export class ShegerPay {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  readonly mode: 'test' | 'live';

  constructor(apiKey: string, config?: Partial<ShegerPayConfig>) {
    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }
    
    if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
      throw new AuthenticationError('Invalid API key format. Must start with sk_test_ or sk_live_');
    }

    this.apiKey = apiKey;
    this.baseUrl = (config?.baseUrl || 'https://api.shegerpay.com').replace(/\/$/, '');
    this.timeout = config?.timeout || 30000;
    this.mode = apiKey.startsWith('sk_test_') ? 'test' : 'live';
  }

  // ============================================
  // Ethiopian Payment Verification
  // ============================================

  /**
   * Verify a payment transaction
   */
  async verify(params: VerifyParams): Promise<VerificationResult> {
    const { transactionId, amount, provider, merchantName, senderAccount } = params;
    
    if (!transactionId) throw new ValidationError('transactionId is required');
    if (!amount) throw new ValidationError('amount is required');
    
    const detectedProvider = provider || (
      transactionId.toLowerCase().includes('cs.bankofabyssinia.com/slip/?trx=')
        ? 'boa'
        : null
    );

    if (!detectedProvider) {
      throw new ValidationError('provider is required for ambiguous transaction references. Pass provider explicitly or use quickVerify().');
    }
    
    return this.request<VerificationResult>('POST', '/api/v1/verify', {
      provider: detectedProvider,
      transaction_id: transactionId,
      amount,
      merchant_name: merchantName || 'ShegerPay Verification',
      sender_account: senderAccount
    });
  }

  /**
   * Quick verification with auto-detected provider
   */
  async quickVerify(transactionId: string, amount: number, options: QuickVerifyOptions = {}): Promise<VerificationResult> {
    return this.request<VerificationResult>('POST', '/api/v1/quick-verify', {
      transaction_id: transactionId,
      amount,
      expected_provider: options.expectedProvider,
      sender_account: options.senderAccount
    });
  }

  /**
   * Verify a receipt image or PDF using OCR.
   */
  async verifyImage(params: {
    screenshot: Blob | File;
    amount?: number;
    provider?: string;
    merchantName?: string;
    transactionId?: string;
    phoneNumber?: string;
    senderAccount?: string;
  }): Promise<VerificationResult> {
    if (!params.screenshot) throw new ValidationError('screenshot is required');

    const form = new FormData();
    form.append('screenshot', params.screenshot);
    if (params.amount !== undefined) form.append('amount', String(params.amount));
    if (params.provider) form.append('provider', params.provider);
    if (params.merchantName) form.append('merchant_name', params.merchantName);
    if (params.transactionId) form.append('transaction_id', params.transactionId);
    if (params.phoneNumber) form.append('phone_number', params.phoneNumber);
    if (params.senderAccount) form.append('sender_account', params.senderAccount);

    return this.request<VerificationResult>('POST', '/api/v1/verify-image', form);
  }

  // ============================================
  // Payment Links
  // ============================================

  /**
   * Create a payment link
   */
  async createPaymentLink(params: PaymentLinkParams): Promise<PaymentLink> {
    const { title, amount, currency, description, enableCbe, enableTelebirr, enableCrypto, expiresInHours } = params;
    
    if (!title) throw new ValidationError('title is required');
    if (!amount) throw new ValidationError('amount is required');
    
    return this.request<PaymentLink>('POST', '/api/v1/payment-links/', {
      title,
      amount,
      currency: currency || 'ETB',
      description,
      amount_mode: params.amountMode,
      amount_options: params.amountOptions,
      min_amount: params.minAmount,
      max_amount: params.maxAmount,
      promo_code_ids: params.promoCodeIds,
      payment_method_layout: params.paymentMethodLayout,
      allow_quantity: params.allowQuantity,
      max_quantity: params.maxQuantity,
      redirect_url: params.redirectUrl,
      webhook_url: params.webhookUrl,
      business_name: params.businessName,
      merchant_logo_url: params.merchantLogoUrl,
      theme_color: params.themeColor,
      hide_branding: params.hideBranding,
      enable_cbe: enableCbe !== false,
      enable_telebirr: enableTelebirr !== false,
      enable_crypto: enableCrypto || false,
      expires_in_hours: expiresInHours || 24
    });
  }

  // ============================================
  // Promo Codes
  // ============================================

  async createPromoCode(params: PromoCodeParams): Promise<Record<string, any>> {
    if (!params.code) throw new ValidationError('code is required');
    return this.request('POST', '/api/v1/promo-codes/', this.normalizePromoCodeParams(params));
  }

  async listPromoCodes(): Promise<Record<string, any>[]> {
    return this.request('GET', '/api/v1/promo-codes/');
  }

  async updatePromoCode(codeId: string, params: Partial<PromoCodeParams>): Promise<Record<string, any>> {
    if (!codeId) throw new ValidationError('codeId is required');
    return this.request('PATCH', `/api/v1/promo-codes/${codeId}`, this.normalizePromoCodeParams(params));
  }

  async deletePromoCode(codeId: string): Promise<void> {
    if (!codeId) throw new ValidationError('codeId is required');
    return this.request('DELETE', `/api/v1/promo-codes/${codeId}`);
  }

  async validatePromoCode(params: PromoCodeValidateParams): Promise<Record<string, any>> {
    if (!params.code) throw new ValidationError('code is required');
    if (!params.amount) throw new ValidationError('amount is required');
    return this.request('POST', '/api/v1/promo-codes/validate', {
      code: params.code,
      amount: params.amount,
      link_id: params.linkId,
      provider: params.provider,
      customer_identifier: params.customerIdentifier
    });
  }

  async redeemPromoCode(params: PromoCodeRedeemParams): Promise<Record<string, any>> {
    if (!params.transactionId) throw new ValidationError('transactionId is required');
    return this.request('POST', '/api/v1/promo-codes/redeem', {
      code: params.code,
      amount: params.amount,
      link_id: params.linkId,
      provider: params.provider,
      customer_identifier: params.customerIdentifier,
      transaction_id: params.transactionId,
      order_id: params.orderId,
      idempotency_key: params.idempotencyKey
    });
  }

  async applyPaymentLinkCoupon(shortCode: string, code: string, options: { amount?: number; quantity?: number; provider?: string; customerIdentifier?: string } = {}): Promise<Record<string, any>> {
    if (!shortCode) throw new ValidationError('shortCode is required');
    if (!code) throw new ValidationError('code is required');
    return this.request('POST', `/api/v1/payment-links/${shortCode}/apply-coupon`, {
      code,
      amount: options.amount,
      quantity: options.quantity || 1,
      provider: options.provider,
      customer_identifier: options.customerIdentifier
    });
  }

  /**
   * List all payment links
   */
  async listPaymentLinks(): Promise<PaymentLink[]> {
    const response = await this.request<{ links: PaymentLink[] }>('GET', '/api/v1/payment-links/');
    return response.links || [];
  }

  /**
   * Get public payment link details by short code.
   */
  async getPaymentLink(shortCode: string): Promise<PaymentLink> {
    if (!shortCode) throw new ValidationError('shortCode is required');
    return this.request('GET', `/api/v1/payment-links/${shortCode}`);
  }

  /**
   * Check payment link status by short code.
   */
  async getPaymentLinkStatus(shortCode: string, orderId?: string): Promise<Record<string, any>> {
    if (!shortCode) throw new ValidationError('shortCode is required');
    const qs = orderId ? `?order_id=${encodeURIComponent(orderId)}` : '';
    return this.request('GET', `/api/v1/payment-links/${shortCode}/status${qs}`);
  }

  /**
   * Get the source-of-truth status for one checkout order.
   */
  async getPaymentLinkOrderStatus(shortCode: string, orderId: string): Promise<PaymentLinkOrderStatus> {
    if (!shortCode) throw new ValidationError('shortCode is required');
    if (!orderId) throw new ValidationError('orderId is required');
    return this.request('GET', `/api/v1/payment-links/${shortCode}/orders/${orderId}/status`);
  }

  /**
   * Submit customer payment proof for a payment link.
   */
  async submitPaymentLink(params: PaymentLinkSubmissionParams): Promise<Record<string, any>> {
    const { shortCode, paymentMethod, transactionId, customerName, customerEmail, customerPhone } = params;
    if (!shortCode) throw new ValidationError('shortCode is required');
    if (!paymentMethod) throw new ValidationError('paymentMethod is required');
    if (!transactionId) throw new ValidationError('transactionId is required');

    return this.request('POST', `/api/v1/payment-links/${shortCode}/submit`, {
      payment_method: paymentMethod,
      transaction_id: transactionId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone
    });
  }

  /**
   * Verify a submitted payment link payment.
   */
  async verifyPaymentLink(shortCode: string, transactionId: string): Promise<VerificationResult> {
    if (!shortCode) throw new ValidationError('shortCode is required');
    if (!transactionId) throw new ValidationError('transactionId is required');
    return this.request('POST', `/api/v1/payment-links/${shortCode}/verify`, { transaction_id: transactionId });
  }

  /**
   * Delete a payment link
   */
  async deletePaymentLink(linkId: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/v1/payment-links/${linkId}`);
  }

  // ============================================
  // Webhooks
  // ============================================

  /**
   * Create a webhook endpoint
   */
  async createWebhook(params: WebhookParams): Promise<Webhook> {
    const { url, events } = params;
    
    if (!url) throw new ValidationError('url is required');
    if (!events || events.length === 0) throw new ValidationError('events are required');
    
    return this.request<Webhook>('POST', '/api/v1/webhooks/', { url, events });
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<Webhook[]> {
    return this.request<Webhook[]>('GET', '/api/v1/webhooks/');
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/v1/webhooks/${webhookId}`);
  }

  /**
   * Test a webhook
   */
  async testWebhook(webhookId: string, eventType: string = 'payment_link.order.verified'): Promise<{ success: boolean; statusCode: number }> {
    const params = new URLSearchParams({ webhook_id: webhookId, event_type: eventType });
    return this.request('POST', `/api/v1/webhooks/test?${params.toString()}`);
  }

  async getWebhookEvents(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/webhooks/events');
  }

  async getWebhookLogs(params: { webhookId?: string; status?: string; limit?: number } = {}): Promise<{ logs: any[] }> {
    const query = new URLSearchParams();
    if (params.webhookId) query.set('webhook_id', params.webhookId);
    if (params.status) query.set('status', params.status);
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request('GET', `/api/v1/webhooks/logs${suffix}`);
  }

  // ============================================
  // Crypto Payments
  // ============================================

  /**
   * Get crypto prices
   */
  async getCryptoPrices(symbol?: string): Promise<Record<string, number>> {
    if (symbol) {
      return this.request('GET', `/api/v1/crypto/rate/${symbol.toUpperCase()}`);
    }
    return this.request('GET', '/api/v1/crypto/rates');
  }

  /**
   * Create a crypto payment intent
   */
  async createCryptoPayment(params: CryptoPaymentParams): Promise<CryptoPayment> {
    const { amountUsd, currency, walletAddress, chain } = params;
    
    if (!amountUsd) throw new ValidationError('amountUsd is required');
    if (!currency) throw new ValidationError('currency is required');
    if (!walletAddress) throw new ValidationError('walletAddress is required');
    
    return this.request<CryptoPayment>('POST', '/api/v1/crypto/generate-intent', {
      amount_usd: amountUsd,
      currency: currency.toUpperCase(),
      wallet_address: walletAddress,
      chain: chain || 'TRON'
    });
  }

  /**
   * Verify a crypto payment
   */
  async verifyCryptoPayment(referenceId: string, transactionHash?: string): Promise<VerificationResult> {
    if (!referenceId) throw new ValidationError('referenceId is required');
    
    return this.request<VerificationResult>('POST', '/api/v1/crypto/verify-reference', {
      reference_id: referenceId,
      transaction_hash: transactionHash
    });
  }

  // ============================================
  // PayPal
  // ============================================

  async paypalStatus(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/paypal/status');
  }

  async createPayPalOrder(params: PayPalOrderParams): Promise<Record<string, any>> {
    if (!params.amount) throw new ValidationError('amount is required');
    return this.request('POST', '/api/v1/paypal/create-order', {
      amount: params.amount,
      currency: params.currency || 'USD',
      description: params.description
    });
  }

  async capturePayPalOrder(orderId: string): Promise<Record<string, any>> {
    if (!orderId) throw new ValidationError('orderId is required');
    return this.request('POST', '/api/v1/paypal/capture-order', { order_id: orderId });
  }

  async getPayPalOrder(orderId: string): Promise<Record<string, any>> {
    if (!orderId) throw new ValidationError('orderId is required');
    return this.request('GET', `/api/v1/paypal/order/${orderId}`);
  }

  async getPayPalWalletBalance(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/paypal/wallet/balance');
  }

  async requestPayPalPayout(params: PayPalPayoutParams): Promise<Record<string, any>> {
    if (!params.amount) throw new ValidationError('amount is required');
    if (!params.recipientEmail) throw new ValidationError('recipientEmail is required');
    return this.request('POST', '/api/v1/paypal/payouts/request', {
      amount: params.amount,
      currency: params.currency || 'USD',
      recipient_email: params.recipientEmail,
      note: params.note
    });
  }

  // ============================================
  // Monitoring & Health
  // ============================================

  /**
   * Get detailed API health status
   */
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('GET', '/api/v1/monitoring/health');
  }

  /**
   * Get provider status and uptime
   */
  async getProviderStatus(): Promise<ProviderStatus> {
    return this.request<ProviderStatus>('GET', '/api/v1/monitoring/providers');
  }

  /**
   * Get API usage metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/monitoring/metrics');
  }

  /**
   * Get system uptime data
   */
  async getUptime(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/monitoring/uptime');
  }

  // ============================================
  // Notifications
  // ============================================

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/notifications/settings');
  }

  /**
   * Configure Telegram notifications
   */
  async configureTelegram(config: TelegramConfig): Promise<{ success: boolean; testSent: boolean }> {
    const { botToken, chatId, notifyOnPayment, notifyOnSecurity } = config;
    
    if (!botToken) throw new ValidationError('botToken is required');
    if (!chatId) throw new ValidationError('chatId is required');
    
    return this.request('POST', '/api/v1/notifications/telegram/configure', {
      bot_token: botToken,
      chat_id: chatId,
      notify_on_payment: notifyOnPayment !== false,
      notify_on_security: notifyOnSecurity !== false
    });
  }

  /**
   * Send test Telegram notification
   */
  async testTelegram(): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/api/v1/notifications/telegram/test', {});
  }

  /**
   * Disable Telegram notifications
   */
  async disableTelegram(): Promise<{ success: boolean }> {
    return this.request('DELETE', '/api/v1/notifications/telegram');
  }

  // ============================================
  // Wallet & Transactions
  // ============================================

  /**
   * Get wallet balances
   */
  async listTransactions(filters?: { status?: string; provider?: string; limit?: number }): Promise<any[]> {
    const params = new URLSearchParams(filters as any).toString();
    return this.request('GET', `/api/v1/transactions/history${params ? '?' + params : ''}`);
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/subscriptions/status');
  }

  /**
   * Get API usage stats
   */
  async getUsage(): Promise<Record<string, any>> {
    return this.request('GET', '/api/v1/analytics/api-usage');
  }

  private normalizePromoCodeParams(params: Partial<PromoCodeParams>): Record<string, any> {
    return {
      code: params.code,
      discount_type: params.discountType,
      discount_value: params.discountValue ?? params.discountPercent,
      discount_percent: params.discountPercent,
      max_discount_amount: params.maxDiscountAmount,
      min_order_amount: params.minOrderAmount,
      max_uses: params.maxUses,
      max_uses_per_customer: params.maxUsesPerCustomer,
      starts_at: params.startsAt,
      expires_at: params.expiresAt,
      active: params.active,
      applies_to_link_ids: params.appliesToLinkIds,
      allowed_providers: params.allowedProviders,
      metadata: params.metadata
    };
  }

  // ============================================
  // Internal Request Method
  // ============================================

  private async request<T>(method: string, path: string, body?: Record<string, any> | FormData): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'User-Agent': 'ShegerPay-TypeScript-SDK/2.2.0'
    };

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options: RequestInit = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new AuthenticationError('Invalid API key');
      }

      if (response.status === 400) {
        const error = await response.json();
        throw new ValidationError(error.detail || error.message || 'Validation error');
      }

      if ([402, 403, 429, 503].includes(response.status) || response.status >= 500) {
        let message = 'Request failed';
        try {
          const error = await response.json();
          message = error.detail || error.message || message;
        } catch {
          message = response.status >= 500 ? 'Server error' : message;
        }
        throw new ShegerPayError(message, response.status, 'GEN_001');
      }

      if (response.status === 204) {
        return undefined as T;
      }
      return response.json() as Promise<T>;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new ShegerPayError('Request timed out', 408, 'GEN_002');
      }
      if (error instanceof ShegerPayError) {
        throw error;
      }
      throw new ShegerPayError(`Request failed: ${error.message}`, 500);
    }
  }
}

// ============================================
// Webhook Verification Helper
// ============================================

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Node.js environment
  if (typeof require !== 'undefined') {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return `sha256=${expected}` === signature;
  }

  // Browser with Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `sha256=${expected}` === signature;
}

export interface RedirectSignatureParams {
  checkoutSessionId: string;
  orderId: string;
  shortCode: string;
  amount: number | string;
  currency?: string;
  status?: string;
}

/**
 * Verify signed payment-link redirect parameters.
 *
 * Redirect is buyer UX only. Always confirm payment server-side with the
 * order status API or the signed webhook before fulfilling an order.
 */
export async function verifyRedirectSignature(
  params: RedirectSignatureParams,
  signature: string,
  secret: string
): Promise<boolean> {
  const amount = typeof params.amount === 'number'
    ? params.amount.toFixed(2)
    : Number(params.amount).toFixed(2);
  const payload = [
    params.checkoutSessionId,
    params.orderId,
    params.shortCode,
    amount,
    params.currency || 'ETB',
    params.status || 'paid',
  ].join('|');

  if (typeof require !== 'undefined') {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return expected === signature || `sha256=${expected}` === signature;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature || `sha256=${expected}` === signature;
}

// ============================================
// Exports
// ============================================

export default ShegerPay;
