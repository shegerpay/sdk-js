/**
 * ShegerPay JavaScript SDK
 * Official JavaScript/Node.js SDK for ShegerPay Payment Verification Gateway
 */

class ShegerPayError extends Error {
    constructor(message, statusCode = null) {
        super(message);
        this.name = 'ShegerPayError';
        this.statusCode = statusCode;
    }
}

class AuthenticationError extends ShegerPayError {
    constructor(message) {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

class ValidationError extends ShegerPayError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

class ShegerPay {
    /**
     * Create a ShegerPay client
     * @param {string} apiKey - Your secret API key (sk_test_xxx or sk_live_xxx)
     * @param {Object} options - Optional configuration
     * @param {string} options.baseUrl - Custom API base URL
     * @param {number} options.timeout - Request timeout in milliseconds
     */
    constructor(apiKey, options = {}) {
        if (!apiKey) {
            throw new AuthenticationError('API key is required');
        }
        
        if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
            throw new AuthenticationError('Invalid API key format. Must start with sk_test_ or sk_live_');
        }
        
        this.apiKey = apiKey;
        this.baseUrl = (options.baseUrl || 'https://api.shegerpay.com').replace(/\/$/, '');
        this.timeout = options.timeout || 30000;
        this.mode = apiKey.startsWith('sk_test_') ? 'test' : 'live';
    }
    
    /**
     * Verify a payment transaction
     * @param {Object} params - Verification parameters
     * @param {string} params.transactionId - Bank transaction reference
     * @param {number} params.amount - Expected amount in ETB
     * @param {string} [params.provider] - Payment provider (cbe, telebirr). Auto-detected if not provided.
     * @param {string} [params.merchantName] - Your registered bank account name
     * @returns {Promise<Object>} Verification result
     * 
     * @example
     * const result = await client.verify({
     *     transactionId: 'FT24352648751234',
     *     amount: 100,
     *     provider: 'cbe'
     * });
     */
    async verify(params) {
        const { transactionId, amount, provider, merchantName, subProvider, senderAccount } = params;
        
        if (!transactionId) {
            throw new ValidationError('transactionId is required');
        }
        if (!amount) {
            throw new ValidationError('amount is required');
        }
        
        let detectedProvider = provider;
        if (!detectedProvider) {
            detectedProvider = transactionId.toLowerCase().includes('cs.bankofabyssinia.com/slip/?trx=') ? 'boa' : null;
        }
        if (!detectedProvider) {
            throw new ValidationError('provider is required for ambiguous transaction references. Pass provider explicitly or use quickVerify().');
        }
        
        const data = new URLSearchParams();
        data.append('provider', detectedProvider);
        data.append('transaction_id', transactionId);
        data.append('amount', amount.toString());
        data.append('merchant_name', merchantName || 'ShegerPay Verification');
        
        if (subProvider) {
            data.append('sub_provider', subProvider);
        }
        if (senderAccount) {
            data.append('sender_account', senderAccount);
        }
        
        return this._request('POST', '/api/v1/verify', data);
    }
    
    /**
     * Quick verification with auto-detected provider
     * @param {string} transactionId - Bank transaction reference
     * @param {number} amount - Expected amount
     * @returns {Promise<Object>} Verification result
     */
    async quickVerify(transactionId, amount, options = {}) {
        const data = new URLSearchParams();
        data.append('transaction_id', transactionId);
        data.append('amount', amount.toString());
        if (options.expectedProvider) {
            data.append('expected_provider', options.expectedProvider);
        }
        if (options.senderAccount) {
            data.append('sender_account', options.senderAccount);
        }
        
        return this._request('POST', '/api/v1/quick-verify', data);
    }

    /**
     * Verify a receipt image/PDF using OCR. Pass a browser File/Blob or Node.js FormData-compatible value.
     */
    async verifyImage(params) {
        const { screenshot, amount, provider, merchantName, transactionId, phoneNumber, senderAccount } = params;
        if (!screenshot) throw new ValidationError('screenshot is required');

        const form = new FormData();
        form.append('screenshot', screenshot);
        if (amount !== undefined && amount !== null) form.append('amount', amount.toString());
        if (provider) form.append('provider', provider);
        if (merchantName) form.append('merchant_name', merchantName);
        if (transactionId) form.append('transaction_id', transactionId);
        if (phoneNumber) form.append('phone_number', phoneNumber);
        if (senderAccount) form.append('sender_account', senderAccount);

        return this._request('POST', '/api/v1/verify-image', form, false);
    }
    
    /**
     * Get transaction history
     * @param {number} [limit=50] - Maximum number of transactions
     * @returns {Promise<Array>} List of transactions
     */
    async getHistory(limit = 50) {
        return this._request('GET', '/api/v1/history');
    }
    
    /**
     * Create a webhook endpoint
     * @param {Object} params - Webhook parameters
     * @param {string} params.url - Webhook URL
     * @param {Array<string>} params.events - Events to subscribe to
     * @returns {Promise<Object>} Created webhook with secret
     */
    async createWebhook(params) {
        const { url, events } = params;
        
        if (!url) {
            throw new ValidationError('url is required');
        }
        if (!events || events.length === 0) {
            throw new ValidationError('events are required');
        }
        
        return this._request('POST', '/api/v1/webhooks/', {
            url,
            events
        }, true);
    }
    
    /**
     * List all webhooks
     * @returns {Promise<Array>} List of webhooks
     */
    async listWebhooks() {
        return this._request('GET', '/api/v1/webhooks/');
    }
    
    /**
     * Delete a webhook
     * @param {string} webhookId - Webhook ID to delete
     * @returns {Promise<Object>} Deletion result
     */
    async deleteWebhook(webhookId) {
        return this._request('DELETE', `/api/v1/webhooks/${webhookId}`);
    }
    
    // ============================================
    // 🪙 CRYPTO METHODS
    // ============================================
    
    /**
     * Get live crypto prices
     * @param {string} [symbol] - Specific crypto symbol (BTC, ETH, USDT, etc.)
     * @returns {Promise<Object>} Price data
     * 
     * @example
     * // Get all prices
     * const prices = await client.getCryptoPrices();
     * 
     * // Get specific price
     * const btcPrice = await client.getCryptoPrices('BTC');
     */
    async getCryptoPrices(symbol = null) {
        if (symbol) {
            return this._request('GET', `/api/v1/crypto/rate/${symbol.toUpperCase()}`);
        }
        return this._request('GET', '/api/v1/crypto/rates');
    }
    
    /**
     * Create a crypto payment intent
     * @param {Object} params - Payment parameters
     * @param {number} params.amountUsd - Amount in USD
     * @param {string} params.currency - Crypto currency (USDT, BTC, ETH, etc.)
     * @param {string} params.walletAddress - Your receiving wallet address
     * @param {string} [params.chain] - Blockchain (TRON, ETH, BSC, BTC, LTC)
     * @returns {Promise<Object>} Payment intent with QR code
     * 
     * @example
     * const payment = await client.createCryptoPayment({
     *     amountUsd: 50,
     *     currency: 'USDT',
     *     walletAddress: 'TJCnKsPa7y5okkXvQAidZBzqx3QyQ6sxMW',
     *     chain: 'TRON'
     * });
     * 
     * console.log(payment.reference_id);     // SHGR-TRO-ABC123-XYZ789
     * console.log(payment.payment_amount);   // 50.00003456 (unique amount)
     * console.log(payment.qr_code);          // data:image/png;base64,...
     */
    async createCryptoPayment(params) {
        const { amountUsd, currency, walletAddress, chain } = params;
        
        if (!amountUsd) {
            throw new ValidationError('amountUsd is required');
        }
        if (!currency) {
            throw new ValidationError('currency is required');
        }
        if (!walletAddress) {
            throw new ValidationError('walletAddress is required');
        }
        
        return this._request('POST', '/api/v1/crypto/generate-intent', {
            amount_usd: amountUsd,
            currency: currency.toUpperCase(),
            wallet_address: walletAddress,
            chain: chain || 'TRON'
        }, true);
    }
    
    /**
     * Verify a crypto payment by reference ID
     * @param {string} referenceId - The reference ID from createCryptoPayment
     * @param {string} [transactionHash] - Optional blockchain transaction hash
     * @returns {Promise<Object>} Verification result
     * 
     * @example
     * const result = await client.verifyCryptoPayment('SHGR-TRO-ABC123-XYZ789');
     * 
     * if (result.verified) {
     *     console.log('Payment confirmed!');
     * } else if (result.status === 'pending') {
     *     console.log('Waiting for blockchain confirmation...');
     * }
     */
    async verifyCryptoPayment(referenceId, transactionHash = null) {
        if (!referenceId) {
            throw new ValidationError('referenceId is required');
        }
        
        return this._request('POST', '/api/v1/crypto/verify-reference', {
            reference_id: referenceId,
            transaction_hash: transactionHash
        }, true);
    }
    
    /**
     * Get crypto service status
     * @returns {Promise<Object>} Service status and supported chains
     */
    async getCryptoStatus() {
        return this._request('GET', '/api/v1/crypto/status');
    }
    
    // ============================================
    // 💳 PAYPAL / CREDIT CARD METHODS
    // ============================================
    
    /**
     * Create a PayPal order for credit card or PayPal payment
     * @param {Object} params - Order parameters
     * @param {number} params.amount - Payment amount
     * @param {string} [params.currency] - Currency code (USD, EUR, etc.)
     * @param {string} [params.description] - Order description
     * @param {boolean} [params.vaultOnApproval] - Save card for future use
     * @returns {Promise<Object>} Order with ID and approval links
     * 
     * @example
     * const order = await client.paypalCreateOrder({ amount: 100, currency: 'USD' });
     * console.log(order.id);  // Use this to capture payment
     */
    async paypalCreateOrder(params) {
        const { amount, currency, description, vaultOnApproval } = params;
        
        if (!amount) {
            throw new ValidationError('amount is required');
        }
        
        return this._request('POST', '/api/v1/paypal/create-order', {
            amount,
            currency: currency || 'USD',
            description,
            vault_on_approval: vaultOnApproval
        }, true);
    }
    
    /**
     * Capture payment for an approved order
     * @param {string} orderId - PayPal order ID from createOrder
     * @returns {Promise<Object>} Capture result with status and payment details
     * 
     * @example
     * const result = await client.paypalCaptureOrder('ORDER_ID');
     * if (result.status === 'COMPLETED') {
     *     console.log('Payment successful!');
     * }
     */
    async paypalCaptureOrder(orderId) {
        if (!orderId) {
            throw new ValidationError('orderId is required');
        }
        
        return this._request('POST', '/api/v1/paypal/capture-order', {
            order_id: orderId
        }, true);
    }
    
    /**
     * Get order details by ID
     * @param {string} orderId - PayPal order ID
     * @returns {Promise<Object>} Order details
     */
    async paypalGetOrder(orderId) {
        return this._request('GET', `/api/v1/paypal/order/${orderId}`);
    }
    
    /**
     * Create a setup token to vault (save) a card without charging
     * @returns {Promise<Object>} Setup token for card vaulting
     */
    async paypalCreateSetupToken() {
        return this._request('POST', '/api/v1/paypal/vault/setup-token', {}, true);
    }
    
    /**
     * List all saved payment methods
     * @returns {Promise<Object>} List of saved cards/payment tokens
     */
    async paypalListSavedCards() {
        return this._request('GET', '/api/v1/paypal/vault/payment-tokens');
    }
    
    /**
     * Charge a saved card (one-click payment)
     * @param {Object} params - Payment parameters
     * @param {string} params.paymentTokenId - Vaulted card token ID
     * @param {number} params.amount - Payment amount
     * @param {string} [params.currency] - Currency code
     * @param {string} [params.description] - Payment description
     * @returns {Promise<Object>} Capture result
     * 
     * @example
     * const result = await client.paypalChargeSavedCard({
     *     paymentTokenId: 'TOKEN_ID',
     *     amount: 50.00
     * });
     */
    async paypalChargeSavedCard(params) {
        const { paymentTokenId, amount, currency, description } = params;
        
        if (!paymentTokenId) {
            throw new ValidationError('paymentTokenId is required');
        }
        if (!amount) {
            throw new ValidationError('amount is required');
        }
        
        return this._request('POST', '/api/v1/paypal/vault/charge', {
            payment_token_id: paymentTokenId,
            amount,
            currency: currency || 'USD',
            description
        }, true);
    }
    
    /**
     * Delete a saved payment method
     * @param {string} tokenId - Payment token ID to delete
     * @returns {Promise<Object>} Deletion confirmation
     */
    async paypalDeleteSavedCard(tokenId) {
        return this._request('DELETE', `/api/v1/paypal/vault/payment-token/${tokenId}`);
    }
    
    /**
     * Create a subscription
     * @param {Object} params - Subscription parameters
     * @param {string} params.planId - PayPal billing plan ID
     * @param {string} [params.subscriberEmail] - Customer email
     * @param {string} [params.subscriberName] - Customer name
     * @param {string} [params.customId] - Your internal subscription ID
     * @returns {Promise<Object>} Subscription with ID and approval link
     * 
     * @example
     * const sub = await client.paypalCreateSubscription({
     *     planId: 'P-PLAN123',
     *     subscriberEmail: 'user@example.com'
     * });
     */
    async paypalCreateSubscription(params) {
        const { planId, subscriberEmail, subscriberName, customId } = params;
        
        if (!planId) {
            throw new ValidationError('planId is required');
        }
        
        return this._request('POST', '/api/v1/paypal/subscriptions', {
            plan_id: planId,
            subscriber_email: subscriberEmail,
            subscriber_name: subscriberName,
            custom_id: customId
        }, true);
    }
    
    /**
     * Get subscription details
     * @param {string} subscriptionId - PayPal subscription ID
     * @returns {Promise<Object>} Subscription details
     */
    async paypalGetSubscription(subscriptionId) {
        return this._request('GET', `/api/v1/paypal/subscriptions/${subscriptionId}`);
    }
    
    /**
     * Cancel a subscription
     * @param {string} subscriptionId - PayPal subscription ID
     * @param {string} [reason] - Cancellation reason
     * @returns {Promise<Object>} Cancellation confirmation
     */
    async paypalCancelSubscription(subscriptionId, reason = 'Customer requested') {
        return this._request('POST', `/api/v1/paypal/subscriptions/${subscriptionId}/cancel`, {
            reason
        }, true);
    }
    
    /**
     * Refund a captured payment
     * @param {Object} params - Refund parameters
     * @param {string} params.captureId - Capture ID from order capture
     * @param {number} [params.amount] - Refund amount (null = full refund)
     * @param {string} [params.currency] - Currency code
     * @param {string} [params.note] - Note to payer
     * @returns {Promise<Object>} Refund details
     * 
     * @example
     * // Full refund
     * const refund = await client.paypalRefund({ captureId: 'CAPTURE_ID' });
     * 
     * // Partial refund
     * const refund = await client.paypalRefund({ captureId: 'CAPTURE_ID', amount: 25.00 });
     */
    async paypalRefund(params) {
        const { captureId, amount, currency, note } = params;
        
        if (!captureId) {
            throw new ValidationError('captureId is required');
        }
        
        return this._request('POST', '/api/v1/paypal/refund', {
            capture_id: captureId,
            amount,
            currency: currency || 'USD',
            note
        }, true);
    }
    
    /**
     * Get PayPal service status
     * @returns {Promise<Object>} Service status, mode (sandbox/live), and feature availability
     */
    async paypalStatus() {
        return this._request('GET', '/api/v1/paypal/status');
    }

    async paypalGetWalletBalance() {
        return this._request('GET', '/api/v1/paypal/wallet/balance');
    }

    async paypalListWalletTransactions(limit = 50) {
        return this._request('GET', `/api/v1/paypal/wallet/transactions?limit=${limit}`);
    }

    async paypalRequestPayout(params) {
        const { amount, currency, recipientEmail, note } = params;
        if (!amount) throw new ValidationError('amount is required');
        if (!recipientEmail) throw new ValidationError('recipientEmail is required');
        return this._request('POST', '/api/v1/paypal/payouts/request', {
            amount,
            currency: currency || 'USD',
            recipient_email: recipientEmail,
            note
        }, true);
    }

    async paypalListPayouts() {
        return this._request('GET', '/api/v1/paypal/payouts');
    }
    
    // ============================================
    // 🔗 PAYMENT LINKS
    // ============================================
    
    /**
     * Create a payment link
     * @param {Object} params - Payment link parameters
     * @param {string} params.title - Payment title
     * @param {number} params.amount - Amount to collect
     * @param {string} [params.currency] - Currency (ETB, USD)
     * @param {string} [params.description] - Optional description
     * @param {boolean} [params.enableCbe] - Enable CBE payment
     * @param {boolean} [params.enableTelebirr] - Enable Telebirr payment
     * @param {boolean} [params.enableCrypto] - Enable crypto payment
     * @returns {Promise<Object>} Payment link with URL and QR code
     */
    async createPaymentLink(params) {
        const { title, amount, currency, description, enableCbe, enableTelebirr, enableCrypto, expiresInHours } = params;
        
        if (!title) throw new ValidationError('title is required');
        if (!amount) throw new ValidationError('amount is required');
        
        return this._request('POST', '/api/v1/payment-links/', {
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
            business_name: params.businessName,
            merchant_logo_url: params.merchantLogoUrl,
            theme_color: params.themeColor,
            enable_cbe: enableCbe !== false,
            enable_telebirr: enableTelebirr !== false,
            enable_crypto: enableCrypto || false,
            expires_in_hours: expiresInHours || 24
        }, true);
    }

    _normalizePromoCodeParams(params) {
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

    async createPromoCode(params) {
        if (!params.code) throw new ValidationError('code is required');
        return this._request('POST', '/api/v1/promo-codes/', this._normalizePromoCodeParams(params), true);
    }

    async listPromoCodes() {
        return this._request('GET', '/api/v1/promo-codes/');
    }

    async updatePromoCode(codeId, params) {
        if (!codeId) throw new ValidationError('codeId is required');
        return this._request('PATCH', `/api/v1/promo-codes/${codeId}`, this._normalizePromoCodeParams(params), true);
    }

    async deletePromoCode(codeId) {
        if (!codeId) throw new ValidationError('codeId is required');
        return this._request('DELETE', `/api/v1/promo-codes/${codeId}`);
    }

    async validatePromoCode(params) {
        if (!params.code) throw new ValidationError('code is required');
        if (!params.amount) throw new ValidationError('amount is required');
        return this._request('POST', '/api/v1/promo-codes/validate', {
            code: params.code,
            amount: params.amount,
            link_id: params.linkId,
            provider: params.provider,
            customer_identifier: params.customerIdentifier
        }, true);
    }

    async redeemPromoCode(params) {
        if (!params.transactionId) throw new ValidationError('transactionId is required');
        return this._request('POST', '/api/v1/promo-codes/redeem', {
            code: params.code,
            amount: params.amount,
            link_id: params.linkId,
            provider: params.provider,
            customer_identifier: params.customerIdentifier,
            transaction_id: params.transactionId,
            order_id: params.orderId,
            idempotency_key: params.idempotencyKey
        }, true);
    }

    async applyPaymentLinkCoupon(shortCode, code, options = {}) {
        if (!shortCode) throw new ValidationError('shortCode is required');
        if (!code) throw new ValidationError('code is required');
        return this._request('POST', `/api/v1/payment-links/${shortCode}/apply-coupon`, {
            code,
            amount: options.amount,
            quantity: options.quantity || 1,
            provider: options.provider,
            customer_identifier: options.customerIdentifier
        }, true);
    }
    
    /**
     * List all payment links
     * @returns {Promise<Object>} List of payment links
     */
    async listPaymentLinks() {
        return this._request('GET', '/api/v1/payment-links/');
    }
    
    /**
     * Delete a payment link
     * @param {string} linkId - Payment link ID
     * @returns {Promise<Object>} Deletion result
     */
    async deletePaymentLink(linkId) {
        return this._request('DELETE', `/api/v1/payment-links/${linkId}`);
    }
    
    // ============================================
    // 💼 MULTI-CURRENCY WALLETS
    // ============================================
    
    /**
     * Get wallet balances
     * @returns {Promise<Object>} All currency balances
     */
    async getWalletBalance() {
        return this.paypalGetWalletBalance();
    }
    
    /**
     * Convert currency
     * @param {Object} params - Conversion parameters
     * @param {string} params.fromCurrency - Source currency
     * @param {string} params.toCurrency - Target currency
     * @param {number} params.amount - Amount to convert
     * @returns {Promise<Object>} Conversion result
     */
    async convertCurrency(params) {
        throw new ShegerPayError('Currency conversion is not part of the public SDK. Use PayPal wallet endpoints or contact support for assisted/private rails.', 400);
    }
    
    // ============================================
    // 💸 REFUNDS
    // ============================================
    
    /**
     * Request a refund
     * @param {Object} params - Refund parameters
     * @param {string} params.transactionId - Transaction ID to refund
     * @param {number} [params.amount] - Refund amount (optional for partial)
     * @param {string} [params.reason] - Reason for refund
     * @returns {Promise<Object>} Refund request
     */
    async createRefund(params) {
        const { transactionId, amount, reason } = params;
        if (!transactionId) throw new ValidationError('transactionId is required');
        
        return this._request('POST', '/api/v1/refunds', {
            transaction_id: transactionId,
            amount,
            reason
        }, true);
    }
    
    /**
     * List refunds
     * @param {string} [status] - Filter by status
     * @returns {Promise<Array>} List of refunds
     */
    async listRefunds(status = null) {
        const params = status ? `?status=${status}` : '';
        return this._request('GET', `/api/v1/refunds${params}`);
    }
    
    // ============================================
    // ⚖️ DISPUTES
    // ============================================
    
    /**
     * List disputes
     * @param {string} [status] - Filter by status
     * @returns {Promise<Array>} List of disputes
     */
    async listDisputes(status = null) {
        const params = status ? `?status=${status}` : '';
        return this._request('GET', `/api/v1/disputes${params}`);
    }
    
    /**
     * Respond to a dispute
     * @param {Object} params - Response parameters
     * @param {string} params.disputeId - Dispute ID
     * @param {string} params.message - Response message
     * @param {Array<string>} [params.evidenceUrls] - Evidence URLs
     * @returns {Promise<Object>} Response result
     */
    async respondToDispute(params) {
        const { disputeId, message, evidenceUrls } = params;
        if (!disputeId) throw new ValidationError('disputeId is required');
        if (!message) throw new ValidationError('message is required');
        
        return this._request('POST', `/api/v1/disputes/${disputeId}/respond`, {
            message,
            evidence_urls: evidenceUrls
        }, true);
    }
    
    // ============================================
    // 💰 PAYOUTS
    // ============================================
    
    /**
     * Request a payout
     * @param {Object} params - Payout parameters
     * @param {number} params.amount - Payout amount
     * @param {string} params.currency - Currency
     * @param {string} [params.method] - Payout method
     * @param {string} [params.destinationId] - Saved destination ID
     * @returns {Promise<Object>} Payout request
     */
    async requestPayout(params) {
        return this.paypalRequestPayout(params);
    }
    
    /**
     * List payouts
     * @param {string} [status] - Filter by status
     * @returns {Promise<Array>} List of payouts
     */
    async listPayouts(status = null) {
        return this.paypalListPayouts();
    }
    
    // ============================================
    // 🌍 INTERNATIONAL PAYMENTS
    // ============================================
    
    /**
     * Add a Wise account
     * @param {Object} params - Account parameters
     * @param {string} params.email - Wise account email
     * @param {string} [params.label] - Account label
     * @returns {Promise<Object>} Account details
     */
    async addWiseAccount(params) {
        throw new ShegerPayError('Wise account setup is private/assisted and is intentionally not exposed in the public SDK.', 400);
    }
    
    /**
     * Add a Payoneer account
     * @param {Object} params - Account parameters
     * @param {string} params.email - Payoneer account email
     * @param {string} [params.label] - Account label
     * @returns {Promise<Object>} Account details
     */
    async addPayoneerAccount(params) {
        throw new ShegerPayError('Payoneer account setup is private/assisted and is intentionally not exposed in the public SDK.', 400);
    }
    
    /**
     * Add a SWIFT/SEPA bank account
     * @param {Object} params - Bank account parameters
     * @returns {Promise<Object>} Account details
     */
    async addBankAccount(params) {
        throw new ShegerPayError('International bank account setup is private/assisted and is intentionally not exposed in the public SDK.', 400);
    }
    
    /**
     * Check Gmail forwarding status
     * @returns {Promise<Object>} Gmail bot status
     */
    async getGmailStatus() {
        return this._request('GET', '/api/v1/international/gmail/status');
    }
    
    // ============================================
    // 🔐 TWO-FACTOR AUTHENTICATION
    // ============================================
    
    /**
     * Setup 2FA
     * @returns {Promise<Object>} Setup data with QR code
     */
    async setup2FA() {
        return this._request('POST', '/api/v1/two-factor/setup', {}, true);
    }
    
    /**
     * Verify 2FA setup
     * @param {string} code - TOTP code
     * @returns {Promise<Object>} Verification result
     */
    async verify2FASetup(code) {
        if (!code) throw new ValidationError('code is required');
        return this._request('POST', '/api/v1/two-factor/verify-setup', { code }, true);
    }
    
    /**
     * Verify 2FA code on login
     * @param {string} code - TOTP code
     * @returns {Promise<Object>} Verification result
     */
    async verify2FA(code) {
        if (!code) throw new ValidationError('code is required');
        return this._request('POST', '/api/v1/two-factor/verify', { code }, true);
    }
    
    /**
     * Get 2FA status
     * @returns {Promise<Object>} 2FA status
     */
    async get2FAStatus() {
        return this._request('GET', '/api/v1/two-factor/status');
    }
    
    /**
     * Disable 2FA
     * @param {string} code - TOTP code for verification
     * @returns {Promise<Object>} Disable result
     */
    async disable2FA(code) {
        if (!code) throw new ValidationError('code is required');
        return this._request('POST', '/api/v1/two-factor/disable', { code }, true);
    }
    
    // ============================================
    // 🔑 PASSKEYS (WebAuthn)
    // ============================================
    
    /**
     * Get passkey registration options
     * @returns {Promise<Object>} Registration options
     */
    async getPasskeyRegistrationOptions() {
        return this._request('POST', '/api/v1/passkeys/registration-options', {}, true);
    }
    
    /**
     * Register a passkey
     * @param {Object} credential - WebAuthn credential
     * @returns {Promise<Object>} Registration result
     */
    async registerPasskey(credential) {
        return this._request('POST', '/api/v1/passkeys/register', { credential }, true);
    }
    
    /**
     * Get passkey authentication options
     * @returns {Promise<Object>} Authentication options
     */
    async getPasskeyAuthOptions() {
        return this._request('POST', '/api/v1/passkeys/authentication-options', {}, true);
    }
    
    /**
     * Authenticate with passkey
     * @param {Object} credential - WebAuthn credential
     * @returns {Promise<Object>} Authentication result
     */
    async authenticateWithPasskey(credential) {
        return this._request('POST', '/api/v1/passkeys/authenticate', { credential }, true);
    }
    
    /**
     * List registered passkeys
     * @returns {Promise<Array>} List of passkeys
     */
    async listPasskeys() {
        return this._request('GET', '/api/v1/passkeys');
    }
    
    /**
     * Delete a passkey
     * @param {string} passkeyId - Passkey ID
     * @returns {Promise<Object>} Deletion result
     */
    async deletePasskey(passkeyId) {
        return this._request('DELETE', `/api/v1/passkeys/${passkeyId}`);
    }
    
    // ============================================
    // 📊 TRANSACTIONS & SUBSCRIPTIONS
    // ============================================
    
    /**
     * List transactions
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Object>} Transaction list
     */
    async listTransactions(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this._request('GET', `/api/v1/transactions/history${params ? '?' + params : ''}`);
    }
    
    /**
     * Get current subscription
     * @returns {Promise<Object>} Subscription details
     */
    async getSubscription() {
        return this._request('GET', '/api/v1/subscriptions/status');
    }
    
    /**
     * Get usage stats
     * @returns {Promise<Object>} API usage statistics
     */
    async getUsage() {
        return this._request('GET', '/api/v1/analytics/api-usage');
    }
    
    // ============================================
    // 📊 MONITORING & HEALTH
    // ============================================
    
    /**
     * Get detailed health check
     * @returns {Promise<Object>} Service health status including database, providers, encryption
     */
    async getHealth() {
        return this._request('GET', '/api/v1/monitoring/health');
    }
    
    /**
     * Get provider status and uptime
     * @returns {Promise<Object>} Status of all payment providers (CBE, Telebirr, etc.)
     */
    async getProviderStatus() {
        return this._request('GET', '/api/v1/monitoring/providers');
    }
    
    /**
     * Get API usage metrics
     * @returns {Promise<Object>} Verification counts, rate limits, feature access
     */
    async getMetrics() {
        return this._request('GET', '/api/v1/monitoring/metrics');
    }
    
    /**
     * Get system uptime data
     * @returns {Promise<Object>} Historical uptime and last incident
     */
    async getUptime() {
        return this._request('GET', '/api/v1/monitoring/uptime');
    }
    
    // ============================================
    // 🔔 NOTIFICATIONS
    // ============================================
    
    /**
     * Get notification settings
     * @returns {Promise<Object>} Email and Telegram notification preferences
     */
    async getNotificationSettings() {
        return this._request('GET', '/api/v1/notifications/settings');
    }
    
    /**
     * Configure Telegram notifications
     * @param {Object} config - Telegram configuration
     * @param {string} config.botToken - Your Telegram bot token from @BotFather
     * @param {string} config.chatId - Chat ID to send notifications to
     * @returns {Promise<Object>} Configuration result
     */
    async configureTelegram(config) {
        const { botToken, chatId, notifyOnPayment, notifyOnSecurity } = config;
        
        if (!botToken) throw new ValidationError('botToken is required');
        if (!chatId) throw new ValidationError('chatId is required');
        
        return this._request('POST', '/api/v1/notifications/telegram/configure', {
            bot_token: botToken,
            chat_id: chatId,
            notify_on_payment: notifyOnPayment !== false,
            notify_on_security: notifyOnSecurity !== false
        }, true);
    }
    
    /**
     * Send test Telegram notification
     * @returns {Promise<Object>} Test result
     */
    async testTelegram() {
        return this._request('POST', '/api/v1/notifications/telegram/test', {}, true);
    }
    
    /**
     * Disable Telegram notifications
     * @returns {Promise<Object>} Disable result
     */
    async disableTelegram() {
        return this._request('DELETE', '/api/v1/notifications/telegram');
    }
    
    /**
     * Internal request method
     */
    async _request(method, path, data = null, isJson = false) {

        const url = `${this.baseUrl}${path}`;
        
        const headers = {
            'X-API-Key': this.apiKey,
            'User-Agent': 'ShegerPay-JavaScript-SDK/2.2.0'
        };
        
        const options = {
            method,
            headers
        };
        
        if (data) {
            if (typeof FormData !== 'undefined' && data instanceof FormData) {
                options.body = data;
            } else if (isJson) {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.body = data.toString();
            }
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
                throw new ValidationError(error.detail || 'Validation error');
            }
            
            if ([402, 403, 429, 503].includes(response.status) || response.status >= 500) {
                let message = 'Request failed';
                try {
                    const error = await response.json();
                    message = error.detail || error.message || message;
                } catch (_) {
                    message = response.status >= 500 ? 'Server error' : message;
                }
                throw new ShegerPayError(message, response.status);
            }
            
            if (response.status === 204) return {};
            return response.json();
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new ShegerPayError('Request timed out');
            }
            if (error instanceof ShegerPayError) {
                throw error;
            }
            throw new ShegerPayError(`Request failed: ${error.message}`);
        }
    }
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-ShegerPay-Signature header value
 * @param {string} secret - Your webhook secret
 * @returns {boolean} Whether signature is valid
 */
async function verifyWebhookSignature(payload, signature, secret) {
    // For Node.js
    if (typeof require !== 'undefined') {
        const crypto = require('crypto');
        const expected = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        return `sha256=${expected}` === signature;
    }
    
    // For browser with Web Crypto API
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

/**
 * Verify signed payment-link redirect parameters.
 * Webhooks/order status remain the source of truth for fulfillment.
 */
async function verifyRedirectSignature(params, signature, secret) {
    const amount = Number(params.amount).toFixed(2);
    const payload = [
        params.checkoutSessionId,
        params.orderId,
        params.shortCode,
        amount,
        params.currency || 'ETB',
        params.status || 'paid'
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

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = { ShegerPay, ShegerPayError, AuthenticationError, ValidationError, verifyWebhookSignature, verifyRedirectSignature };
} else if (typeof window !== 'undefined') {
    // Browser
    window.ShegerPay = ShegerPay;
    window.verifyWebhookSignature = verifyWebhookSignature;
    window.verifyRedirectSignature = verifyRedirectSignature;
}

// ES Modules
export { ShegerPay, ShegerPayError, AuthenticationError, ValidationError, verifyWebhookSignature, verifyRedirectSignature };
export default ShegerPay;
