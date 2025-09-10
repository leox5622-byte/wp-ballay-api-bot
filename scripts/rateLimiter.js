// Rate Limiter Module for WhatsApp Bot
// This module helps prevent 429 errors by limiting API requests

class RateLimiter {
    constructor(options = {}) {
        this.maxRequests = options.maxRequests || 30; // Max requests per window
        this.windowMs = options.windowMs || 60000; // 1 minute window
        this.minDelay = options.minDelay || 1000; // Minimum delay between requests (1 second)
        this.maxDelay = options.maxDelay || 5000; // Maximum delay for exponential backoff
        
        // Track requests per chat/user
        this.requestCounts = new Map();
        this.lastRequestTime = new Map();
        this.retryDelays = new Map();
        
        // Queue for managing requests
        this.requestQueue = [];
        this.isProcessing = false;
        
        // Cleanup old entries every 2 minutes for better memory management
        this.cleanupInterval = setInterval(() => this.cleanup(), 120000);
        
        // Maximum number of tracked identifiers to prevent memory leaks
        this.maxTrackedIdentifiers = 1000;
    }

    // Check if request is allowed (optimized)
    async canMakeRequest(identifier) {
        const now = Date.now();
        const key = identifier || 'global';
        
        // Prevent memory leaks by limiting tracked identifiers
        if (this.requestCounts.size >= this.maxTrackedIdentifiers && !this.requestCounts.has(key)) {
            // Remove oldest entry
            const firstKey = this.requestCounts.keys().next().value;
            this.requestCounts.delete(firstKey);
            this.lastRequestTime.delete(firstKey);
        }
        
        // Get current request count for this identifier
        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, { count: 0, resetTime: now + this.windowMs });
        }
        
        const requestData = this.requestCounts.get(key);
        
        // Reset count if window has passed
        if (now >= requestData.resetTime) {
            requestData.count = 0;
            requestData.resetTime = now + this.windowMs;
        }
        
        // Check if under limit
        if (requestData.count >= this.maxRequests) {
            return false;
        }
        
        // Check minimum delay between requests
        const lastRequest = this.lastRequestTime.get(key) || 0;
        const timeSinceLastRequest = now - lastRequest;
        
        if (timeSinceLastRequest < this.minDelay) {
            return false;
        }
        
        return true;
    }

    // Record a request
    recordRequest(identifier) {
        const now = Date.now();
        const key = identifier || 'global';
        
        // Update request count
        const requestData = this.requestCounts.get(key);
        if (requestData) {
            requestData.count++;
        }
        
        // Update last request time
        this.lastRequestTime.set(key, now);
        
        // Reset retry delay on successful request
        this.retryDelays.delete(key);
    }

    // Get delay time for rate limited requests
    getDelayTime(identifier) {
        const key = identifier || 'global';
        const requestData = this.requestCounts.get(key);
        
        if (!requestData) return this.minDelay;
        
        const now = Date.now();
        const timeUntilReset = requestData.resetTime - now;
        
        // If we're at the limit, wait until reset
        if (requestData.count >= this.maxRequests) {
            return Math.max(timeUntilReset, this.minDelay);
        }
        
        // Calculate minimum delay
        const lastRequest = this.lastRequestTime.get(key) || 0;
        const timeSinceLastRequest = now - lastRequest;
        
        return Math.max(this.minDelay - timeSinceLastRequest, 0);
    }

    // Exponential backoff for failed requests
    getRetryDelay(identifier, attempt = 1) {
        const key = identifier || 'global';
        const baseDelay = this.retryDelays.get(key) || this.minDelay;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
        
        // Add some jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        const finalDelay = exponentialDelay + jitter;
        
        this.retryDelays.set(key, Math.min(baseDelay * 2, this.maxDelay));
        
        return finalDelay;
    }

    // Queue a request to be processed with rate limiting
    async queueRequest(requestFunction, identifier, priority = 0) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                fn: requestFunction,
                identifier,
                priority,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            // Sort by priority (higher priority first)
            this.requestQueue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
            
            this.processQueue();
        });
    }

    // Process the request queue
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            try {
                // Check if we can make the request
                if (!await this.canMakeRequest(request.identifier)) {
                    const delay = this.getDelayTime(request.identifier);
                    await this.sleep(delay);
                    
                    // Re-check after delay
                    if (!await this.canMakeRequest(request.identifier)) {
                        // Put request back in queue if still rate limited
                        this.requestQueue.unshift(request);
                        await this.sleep(this.minDelay);
                        continue;
                    }
                }
                
                // Record the request
                this.recordRequest(request.identifier);
                
                // Execute the request
                const result = await request.fn();
                request.resolve(result);
                
                // Small delay between requests
                await this.sleep(500);
                
            } catch (error) {
                // Handle 429 errors with exponential backoff
                if (error.message && error.message.includes('429')) {
                    const retryDelay = this.getRetryDelay(request.identifier);
                    console.log(`Rate limited. Retrying in ${retryDelay}ms`);
                    
                    await this.sleep(retryDelay);
                    
                    // Put request back in queue for retry
                    this.requestQueue.unshift(request);
                    continue;
                }
                
                request.reject(error);
            }
        }
        
        this.isProcessing = false;
    }

    // Helper method for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clean up old entries
    cleanup() {
        const now = Date.now();
        
        // Clean up request counts
        for (const [key, data] of this.requestCounts.entries()) {
            if (now >= data.resetTime) {
                this.requestCounts.delete(key);
            }
        }
        
        // Clean up last request times (older than 1 hour)
        for (const [key, timestamp] of this.lastRequestTime.entries()) {
            if (now - timestamp > 3600000) {
                this.lastRequestTime.delete(key);
            }
        }
        
        // Clean up retry delays
        this.retryDelays.clear();
    }

    // Get current stats
    getStats() {
        return {
            activeRequests: this.requestCounts.size,
            queuedRequests: this.requestQueue.length,
            isProcessing: this.isProcessing,
            requestCounts: Object.fromEntries(this.requestCounts)
        };
    }
}

module.exports = RateLimiter;