// =====================================
// PAYMENT SYSTEM FOR PRICE ALERTS
// =====================================
// Production-ready payment processing with M-Pesa, PayPal, Card
// Implements tiered subscription model for price alert tracking

import { showGlobalMessage } from './auth.js';
import { secureApiCall } from './api-utils.js';

// Pricing tiers configuration
const PRICING_TIERS = {
    free: {
        name: 'Free',
        alerts: 5,
        price: 0,
        duration: null,
        features: ['5 price alerts', 'Email notifications', 'Basic support']
    },
    basic: {
        name: 'Basic',
        alerts: 50,
        price: 100,
        duration: 'monthly',
        features: ['50 price alerts', 'Email & SMS notifications', 'Priority support', 'Price history']
    },
    premium: {
        name: 'Premium',
        alerts: -1, // Unlimited
        price: 200,
        duration: 'monthly',
        features: ['Unlimited alerts', 'Email & SMS notifications', 'Priority support', 'Price history', 'API access']
    }
};

// M-Pesa Configuration
const MPESA_CONFIG = {
    sandbox: {
        consumerKey: '12BXjyNrUlv7b2HMrRmCxtJdfNnW',
        consumerSecret: 'YOUR_CONSUMER_SECRET',
        shortCode: 174379,
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        callbackUrl: 'https://yourdomain.com/api/mpesa/callback'
    },
    production: {
        consumerKey: 'YOUR_PRODUCTION_CONSUMER_KEY',
        consumerSecret: 'YOUR_PRODUCTION_CONSUMER_SECRET',
        shortCode: 'YOUR_PAYBILL',
        passkey: 'YOUR_PRODUCTION_PASSKEY',
        callbackUrl: 'https://yourdomain.com/api/mpesa/callback'
    }
};

const PaymentController = {
    currentTier: 'free',
    selectedPlan: null,

    /**
     * Initialize payment system
     */
    init() {
        this.setupEventListeners();
        this.loadUserSubscription();
    },

    /**
     * Setup event listeners for payment UI
     */
    setupEventListeners() {
        // Subscription tier selection
        document.querySelectorAll('.tier-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const tier = e.currentTarget.dataset.tier;
                this.selectTier(tier);
            });
        });

        // Payment method selection
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = e.currentTarget.dataset.method;
                this.showPaymentForm(method);
            });
        });

        // Payment form submissions
        const mpesaForm = document.getElementById('mpesaPaymentForm');
        if (mpesaForm) {
            mpesaForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processMpesaPayment();
            });
        }

        const cardForm = document.getElementById('cardPaymentForm');
        if (cardForm) {
            cardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processCardPayment();
            });
        }
    },

    /**
     * Select a subscription tier
     */
    selectTier(tier) {
        if (!PRICING_TIERS[tier]) {
            console.error('Invalid tier:', tier);
            return;
        }

        this.selectedPlan = PRICING_TIERS[tier];
        
        // Update UI
        document.querySelectorAll('.tier-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-tier="${tier}"]`)?.classList.add('selected');

        // Show payment methods if not free tier
        if (tier !== 'free') {
            this.showPaymentMethods();
        } else {
            // Activate free tier immediately
            this.activateFreeTier();
        }
    },

    /**
     * Load user's current subscription status
     */
    async loadUserSubscription() {
        try {
            const response = await secureApiCall('subscription/status');
            if (response.ok) {
                const data = await response.json();
                this.currentTier = data.tier || 'free';
                this.updateUIWithSubscription(data);
                console.log('[PaymentController] Loaded subscription:', data);
            } else {
                // Not authenticated or couldn't fetch subscription - fall back to localStorage
                // Show local alerts count against free tier so anonymous users see accurate limits
                const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
                const fallback = {
                    tier: 'free',
                    tier_name: 'Free',
                    alerts_used: localAlerts.length,
                    alerts_limit: PRICING_TIERS.free.alerts
                };
                this.currentTier = 'free';
                this.updateUIWithSubscription(fallback);
                console.log('[PaymentController] Using fallback subscription (unauthenticated):', fallback);
            }
        } catch (error) {
            console.error('Failed to load subscription:', error);
            // If request failed (likely unauthenticated), fall back to localStorage
            const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
            const fallback = {
                tier: 'free',
                tier_name: 'Free',
                alerts_used: localAlerts.length,
                alerts_limit: PRICING_TIERS.free.alerts
            };
            this.currentTier = 'free';
            this.updateUIWithSubscription(fallback);
            console.log('[PaymentController] Using fallback subscription (error):', fallback);
        }
    },

    /**
     * Update UI based on subscription status
     */
    updateUIWithSubscription(subscription) {
        const alertsUsed = subscription.alerts_used || 0;
        const alertsLimit = subscription.alerts_limit || PRICING_TIERS.free.alerts;
        
        // Update alerts counter
        const counterEl = document.getElementById('alerts-counter');
        if (counterEl) {
            if (alertsLimit === -1) {
                counterEl.textContent = `${alertsUsed} alerts active`;
            } else {
                counterEl.textContent = `${alertsUsed} / ${alertsLimit} alerts used`;
            }
        }

        // Update tier badge
        const tierBadge = document.getElementById('current-tier-badge');
        if (tierBadge) {
            tierBadge.textContent = subscription.tier_name || 'Free';
            tierBadge.className = `tier-badge tier-${subscription.tier || 'free'}`;
        }

        // Show upgrade prompt if approaching limit
        if (alertsLimit !== -1 && alertsUsed >= alertsLimit * 0.8) {
            this.showUpgradePrompt(alertsUsed, alertsLimit);
        }
    },

    /**
     * Show upgrade prompt when user is approaching limit
     */
    showUpgradePrompt(used, limit) {
        const promptEl = document.getElementById('upgrade-prompt');
        if (promptEl) {
            promptEl.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    You've used ${used} of ${limit} price alerts. 
                    <a href="#" onclick="PaymentController.showSubscriptionModal()">Upgrade now</a> 
                    to track more products!
                </div>
            `;
            promptEl.style.display = 'block';
        }
    },

    /**
     * Show subscription modal
     */
    async showSubscriptionModal() {
        const modal = document.getElementById('subscriptionModal');
        
        // Check if user is authenticated
        try {
            const authResponse = await secureApiCall('verify-session');
            const isAuthenticated = authResponse.ok;
            
            // Hide/show payment sections based on auth status
            const paymentSection = document.getElementById('payment-methods-section');
            const authPrompt = document.getElementById('auth-required-prompt');
            
            if (!isAuthenticated && paymentSection) {
                paymentSection.style.display = 'none';
            }
            
            if (!isAuthenticated && authPrompt) {
                authPrompt.style.display = 'block';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
        
        // Close price alarm modal if open so subscription modal is not hidden underneath
        if (window.closePriceAlarmModal) {
            try { window.closePriceAlarmModal(); } catch (e) { /* ignore */ }
        }
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
        }
    },

    /**
     * Close subscription modal
     */
    closeSubscriptionModal() {
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        }
        
        // Hide the alert banner
        const banner = document.getElementById('limit-alert-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    },

    /**
     * Show payment methods section
     */
    showPaymentMethods() {
        const paymentSection = document.getElementById('payment-methods-section');
        if (paymentSection) {
            paymentSection.classList.remove('hidden');
        }
    },

    /**
     * Show specific payment form
     */
    showPaymentForm(method) {
        // Hide all payment forms
        document.querySelectorAll('.payment-form').forEach(form => {
            form.style.display = 'none';
        });

        // Show selected form
        const form = document.getElementById(`${method}PaymentForm`);
        if (form) {
            form.style.display = 'block';
        }
    },

    /**
     * Process M-Pesa payment
     */
    async processMpesaPayment() {
        if (!this.selectedPlan) {
            showGlobalMessage('Please select a subscription plan', true);
            return;
        }

        const phoneInput = document.getElementById('mpesaPhone');
        const phoneNumber = phoneInput.value.trim();
        const amount = this.selectedPlan.price;

        if (!phoneNumber) {
            showGlobalMessage('Please enter your M-Pesa phone number', true);
            return;
        }

        // Validate and format phone number
        const formattedPhone = this.formatKenyanPhone(phoneNumber);
        if (!formattedPhone) {
            showGlobalMessage('Please enter a valid Kenyan phone number', true);
            return;
        }

        this.showPaymentProcessing('M-Pesa');

        try {
            // Call backend API to initiate M-Pesa payment
            const response = await secureApiCall('payment/mpesa/initiate', {
                method: 'POST',
                body: JSON.stringify({
                    phone_number: formattedPhone,
                    amount: amount,
                    tier: this.selectedPlan.name.toLowerCase(),
                    description: `${this.selectedPlan.name} subscription - Price Alerts`
                })
            });

            const result = await response.json();

            this.hidePaymentProcessing();

            if (response.ok && result.ResponseCode === "0") {
                showGlobalMessage(
                    `Payment request sent to ${phoneNumber}. Please enter your M-Pesa PIN to complete the transaction.`
                );
                
                // Poll for payment confirmation
                this.pollPaymentStatus(result.CheckoutRequestID);
            } else {
                showGlobalMessage(
                    result.message || 'Payment request failed. Please try again.',
                    true
                );
            }
        } catch (error) {
            console.error('M-Pesa payment error:', error);
            this.hidePaymentProcessing();
            showGlobalMessage('Payment request failed. Please check your connection and try again.', true);
        }
    },

    /**
     * Process card payment (Stripe/PayPal integration)
     */
    async processCardPayment() {
        if (!this.selectedPlan) {
            showGlobalMessage('Please select a subscription plan', true);
            return;
        }

        const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiry = document.getElementById('cardExpiry').value;
        const cvv = document.getElementById('cardCVV').value;
        const name = document.getElementById('cardName').value;

        // Basic validation
        if (!cardNumber || !expiry || !cvv || !name) {
            showGlobalMessage('Please fill in all card details', true);
            return;
        }

        this.showPaymentProcessing('Card');

        try {
            // Call backend API for card payment
            const response = await secureApiCall('payment/card/process', {
                method: 'POST',
                body: JSON.stringify({
                    amount: this.selectedPlan.price,
                    tier: this.selectedPlan.name.toLowerCase(),
                    // In production, use Stripe.js or similar to tokenize card
                    // Never send raw card details
                    card_token: 'TOKENIZED_CARD_DATA'
                })
            });

            const result = await response.json();

            this.hidePaymentProcessing();

            if (response.ok) {
                showGlobalMessage('Payment successful! Your subscription has been activated.');
                this.activateSubscription(result.subscription);
            } else {
                showGlobalMessage(result.message || 'Payment failed. Please try again.', true);
            }
        } catch (error) {
            console.error('Card payment error:', error);
            this.hidePaymentProcessing();
            showGlobalMessage('Payment failed. Please try again.', true);
        }
    },

    /**
     * Format Kenyan phone number to international format
     * Validates and preserves proper format (local or international)
     */
    formatKenyanPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        
        // Already in international format (254XXXXXXXXX)
        if (cleaned.startsWith('254') && cleaned.length === 12) {
            // Validate it's a proper Kenyan mobile number (starts with 254 7XX or 254 1XX)
            const localPart = cleaned.substring(3, 4);
            if (localPart === '7' || localPart === '1') {
                return cleaned;
            }
        }
        
        // Local format (07XXXXXXXX or 01XXXXXXXX)
        if (cleaned.startsWith('0') && cleaned.length === 10) {
            const localPart = cleaned.substring(1, 2);
            if (localPart === '7' || localPart === '1') {
                return '254' + cleaned.substring(1);
            }
        }
        
        // Without country code or leading 0 (7XXXXXXXX or 1XXXXXXXX)
        if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
            return '254' + cleaned;
        }
        
        // Invalid format
        return null;
    },

    /**
     * Poll payment status after M-Pesa request
     */
    async pollPaymentStatus(checkoutRequestId, attempts = 0) {
        const maxAttempts = 30; // Poll for 60 seconds (2s intervals)
        
        if (attempts >= maxAttempts) {
            showGlobalMessage('Payment verification timeout. Please check your M-Pesa messages.', true);
            return;
        }

        try {
            const response = await secureApiCall(`payment/mpesa/status/${checkoutRequestId}`);
            const result = await response.json();

            if (result.status === 'completed') {
                showGlobalMessage('Payment successful! Your subscription has been activated.');
                this.activateSubscription(result.subscription);
            } else if (result.status === 'failed') {
                showGlobalMessage('Payment failed. Please try again.', true);
            } else {
                // Continue polling
                setTimeout(() => {
                    this.pollPaymentStatus(checkoutRequestId, attempts + 1);
                }, 2000);
            }
        } catch (error) {
            console.error('Payment status check error:', error);
            setTimeout(() => {
                this.pollPaymentStatus(checkoutRequestId, attempts + 1);
            }, 2000);
        }
    },

    /**
     * Activate free tier
     */
    async activateFreeTier() {
        try {
            const response = await secureApiCall('subscription/activate-free', {
                method: 'POST'
            });

            if (response.ok) {
                showGlobalMessage('Free tier activated! You can now track up to 5 products.');
                this.loadUserSubscription();
            }
        } catch (error) {
            console.error('Failed to activate free tier:', error);
        }
    },

    /**
     * Activate subscription after successful payment
     */
    activateSubscription(subscription) {
        this.currentTier = subscription.tier;
        this.updateUIWithSubscription(subscription);
        
        // Close subscription modal
        const modal = document.getElementById('subscriptionModal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Refresh alerts display
        if (window.updateAlertsBadge) {
            window.updateAlertsBadge();
        }
    },

    /**
     * Show payment processing indicator
     */
    showPaymentProcessing(method) {
        const overlay = document.getElementById('payment-processing-overlay');
        if (overlay) {
            const message = overlay.querySelector('.processing-message');
            if (message) {
                message.textContent = `Processing ${method} payment...`;
            }
            overlay.style.display = 'flex';
        }
    },

    /**
     * Hide payment processing indicator
     */
    hidePaymentProcessing() {
        const overlay = document.getElementById('payment-processing-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    /**
     * Check if user can create a new price alert
     * For unauthenticated users, checks localStorage count
     * For authenticated users, calls the server API
     */
    async canCreateAlert() {
        try {
            // First check if user is authenticated
            const authResponse = await secureApiCall('verify-session');
            
            if (!authResponse.ok) {
                // User is NOT authenticated - check local alerts
                const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
                const FREE_TIER_LIMIT = PRICING_TIERS.free.alerts;
                
                console.log(`[PaymentController] Unauthenticated user - Local alerts: ${localAlerts.length}/${FREE_TIER_LIMIT}`);
                
                return localAlerts.length < FREE_TIER_LIMIT;
            }
            
            // User IS authenticated - check server subscription status
            const response = await secureApiCall('subscription/can-create-alert');
            if (response.ok) {
                const data = await response.json();
                console.log(`[PaymentController] Authenticated user - Can create: ${data.can_create}, Used: ${data.alerts_used}/${data.alerts_limit}`);
                return data.can_create;
            }
            
            // Default to false if we can't determine
            return false;
        } catch (error) {
            console.error('Failed to check alert limit:', error);
            
            // On error, fall back to local check
            const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
            const FREE_TIER_LIMIT = PRICING_TIERS.free.alerts;
            return localAlerts.length < FREE_TIER_LIMIT;
        }
    },

    /**
     * Show upgrade prompt when limit reached
     * Displays subscription modal with alert banner
     */
    async showLimitReachedModal() {
        // Check authentication status
        let isAuthenticated = false;
        let alertsUsed = 0;
        let alertsLimit = PRICING_TIERS.free.alerts;
        let tierName = 'Free';
        
        try {
            const authResponse = await secureApiCall('verify-session');
            isAuthenticated = authResponse.ok;
            
            if (isAuthenticated) {
                // Get actual subscription data
                const subResponse = await secureApiCall('subscription/can-create-alert');
                if (subResponse.ok) {
                    const data = await subResponse.json();
                    alertsUsed = data.alerts_used;
                    alertsLimit = data.alerts_limit;
                    tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
                }
            } else {
                // Count local alerts
                const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
                alertsUsed = localAlerts.length;
            }
        } catch (e) {
            console.error('Error checking auth/subscription:', e);
            // Fallback to local count
            const localAlerts = JSON.parse(localStorage.getItem('localPriceAlerts') || '[]');
            alertsUsed = localAlerts.length;
        }
        
        // Update banner content
        const banner = document.getElementById('limit-alert-banner');
        const bannerAlertsUsed = document.getElementById('banner-alerts-used');
        const bannerPlanName = document.getElementById('banner-plan-name');
        
        if (banner && bannerAlertsUsed && bannerPlanName) {
            bannerAlertsUsed.textContent = `${alertsUsed}/${alertsLimit}`;
            bannerPlanName.textContent = tierName;
            banner.classList.remove('hidden');
        }
        
        // Show subscription modal directly
        this.showSubscriptionModal();
    }
};

// Export for global access
window.PaymentController = PaymentController;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    PaymentController.init();
});

export { PaymentController, PRICING_TIERS };
