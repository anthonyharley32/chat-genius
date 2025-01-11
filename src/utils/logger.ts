type LogLevel = 'info' | 'warn' | 'error';

interface AuthLog {
  timestamp: string;
  level: LogLevel;
  event: string;
  userId?: string;
  ip?: string;
  details?: any;
}

class AuthLogger {
  private logs: AuthLog[] = [];
  private readonly MAX_LOGS = 1000; // Keep last 1000 logs in memory

  private createLog(level: LogLevel, event: string, userId?: string, details?: any): AuthLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      event,
      userId,
      details
    };
  }

  private addLog(log: AuthLog) {
    this.logs.push(log);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift(); // Remove oldest log
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[log.level](`[Auth] ${log.event}`, {
        userId: log.userId,
        details: log.details,
        timestamp: log.timestamp
      });
    }

    // In production, you might want to send this to a logging service
    // TODO: Integrate with a logging service like Sentry or LogRocket
  }

  logAuthFailure(event: string, userId?: string, details?: any) {
    const log = this.createLog('error', event, userId, details);
    this.addLog(log);
  }

  logAuthSuccess(event: string, userId: string, details?: any) {
    const log = this.createLog('info', event, userId, details);
    this.addLog(log);
  }

  logAuthWarning(event: string, userId?: string, details?: any) {
    const log = this.createLog('warn', event, userId, details);
    this.addLog(log);
  }

  getLogs(level?: LogLevel): AuthLog[] {
    return level 
      ? this.logs.filter(log => log.level === level)
      : this.logs;
  }

  getRecentLogs(minutes: number = 60): AuthLog[] {
    const cutoff = new Date(Date.now() - minutes * 60000).toISOString();
    return this.logs.filter(log => log.timestamp >= cutoff);
  }

  // Helper to check for suspicious activity
  checkForSuspiciousActivity(userId: string, timeWindowMinutes: number = 5): boolean {
    const recentFailures = this.getRecentLogs(timeWindowMinutes)
      .filter(log => 
        log.level === 'error' && 
        log.userId === userId && 
        log.event.includes('login_failure')
      );
    
    return recentFailures.length >= 5; // 5 failures in timeWindow is suspicious
  }
}

export const authLogger = new AuthLogger(); 