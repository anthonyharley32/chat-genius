interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
}

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly defaultOptions: RateLimitOptions = {
    maxAttempts: 5,        // 5 attempts
    windowMs: 300000,      // 5 minutes
    blockDurationMs: 900000 // 15 minutes
  };

  private cleanupOldEntries() {
    const now = Date.now();
    Array.from(this.attempts.entries()).forEach(([key, entry]) => {
      if (entry.blocked && now - entry.firstAttempt >= this.defaultOptions.blockDurationMs) {
        this.attempts.delete(key);
      } else if (!entry.blocked && now - entry.firstAttempt >= this.defaultOptions.windowMs) {
        this.attempts.delete(key);
      }
    });
  }

  checkRateLimit(identifier: string): { blocked: boolean; remainingAttempts: number; msBeforeNext: number } {
    this.cleanupOldEntries();
    
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    // If no entry exists or entry has expired, create new entry
    if (!entry) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        blocked: false
      });
      return {
        blocked: false,
        remainingAttempts: this.defaultOptions.maxAttempts - 1,
        msBeforeNext: 0
      };
    }

    // If blocked, check if block duration has passed
    if (entry.blocked) {
      const msUntilUnblock = entry.firstAttempt + this.defaultOptions.blockDurationMs - now;
      if (msUntilUnblock > 0) {
        return {
          blocked: true,
          remainingAttempts: 0,
          msBeforeNext: msUntilUnblock
        };
      } else {
        this.attempts.delete(identifier);
        return this.checkRateLimit(identifier);
      }
    }

    // Check if window has expired
    if (now - entry.firstAttempt >= this.defaultOptions.windowMs) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        blocked: false
      });
      return {
        blocked: false,
        remainingAttempts: this.defaultOptions.maxAttempts - 1,
        msBeforeNext: 0
      };
    }

    // Increment attempt count
    entry.count++;
    
    // Check if should be blocked
    if (entry.count > this.defaultOptions.maxAttempts) {
      entry.blocked = true;
      return {
        blocked: true,
        remainingAttempts: 0,
        msBeforeNext: this.defaultOptions.blockDurationMs
      };
    }

    return {
      blocked: false,
      remainingAttempts: this.defaultOptions.maxAttempts - entry.count,
      msBeforeNext: this.defaultOptions.windowMs - (now - entry.firstAttempt)
    };
  }

  // Reset rate limit for an identifier
  resetLimit(identifier: string) {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter(); 