import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client - will be null if env vars not set
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

// Rate limiter for registration - 5 attempts per 15 minutes per IP
export const registerLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "ratelimit:register",
    })
  : null;

// Rate limiter for vault unlock - 10 attempts per 5 minutes per user
export const unlockLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "5 m"),
      analytics: true,
      prefix: "ratelimit:unlock",
    })
  : null;

// Rate limiter for login - 5 attempts per 15 minutes per IP
export const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "ratelimit:login",
    })
  : null;

// Rate limiter for API token validation - 60 attempts per 1 minute per IP
export const apiTokenLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "ratelimit:api-token",
    })
  : null;

// Helper to get IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "127.0.0.1";
}

// Check if we're in production and rate limiting is required
const isProduction = process.env.NODE_ENV === "production";

// Helper to check rate limit and return error response if exceeded
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  if (!limiter) {
    // SECURITY: In production, fail-closed if rate limiting is not configured
    if (isProduction) {
      console.error("[Rate Limit] CRITICAL: Rate limiting not configured in production!");
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + 60000,
      };
    }
    // In development, allow requests without rate limiting
    return { success: true };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // SECURITY: Fail-closed approach - if rate limiting fails, reject the request
    // This prevents potential abuse if the rate limiting service is unavailable
    console.error("[Rate Limit] Error checking rate limit:", error);
    return {
      success: false,
      remaining: 0,
      reset: Date.now() + 60000 // Retry after 1 minute
    };
  }
}

// Create rate limit response headers
export function rateLimitHeaders(remaining: number, reset: number): HeadersInit {
  return {
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": reset.toString(),
  };
}
