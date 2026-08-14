import rateLimit from 'express-rate-limit';

/**
 * Rate limiting (W-10). Protects credential endpoints from brute force and bounds the
 * cost of the two Claude-API-backed endpoints (storefront chat, admin assistant). All
 * limits are configurable via env; sensible defaults apply otherwise.
 */

// Credential / token endpoints: login, register, password reset.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Storefront chatbot — each call hits the Claude API. Keyed by IP (guests allowed).
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.RATE_LIMIT_CHAT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You are sending messages too quickly. Please slow down.' },
});

// Admin assistant — also Claude-backed. Keyed by admin id (runs after adminProtect).
// Public file uploads (e.g. applicant CVs) — bound abuse of the disk-writing endpoint.
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads. Please try again later.' },
});

export const assistantLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.RATE_LIMIT_ASSISTANT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin:${req.admin?.adminId ?? 'unknown'}`,
  message: { message: 'Too many assistant requests. Please slow down.' },
});
