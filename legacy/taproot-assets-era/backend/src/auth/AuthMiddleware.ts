/**
 * JWT-based authentication middleware for Express routes.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// SECURITY: Generate strong JWT secret if not provided
// In production, JWT_SECRET MUST be set via environment variable
function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET;
  
  if (envSecret && envSecret.length >= 32 && envSecret !== 'change_me_in_production') {
    return envSecret;
  }
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL: JWT_SECRET must be set to a strong secret (min 32 chars) in production. ' +
      'Run: export JWT_SECRET=$(openssl rand -hex 32)'
    );
  }
  
  // Development: generate a temporary secret with warning
  const devSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[AuthMiddleware] WARNING: Using temporary JWT secret. Set JWT_SECRET in .env for persistence.');
  return devSecret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRY = '24h';
const JWT_ALGORITHM = 'HS256';

export interface AuthPayload {
  pubkey: string;
  iat?: number;
  exp?: number;
}

/**
 * Extend Express Request to include authenticated user info.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Generate a JWT token for an authenticated user.
 */
export function generateToken(pubkey: string): string {
  const payload: AuthPayload = { pubkey };
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRY,
    algorithm: JWT_ALGORITHM as jwt.Algorithm,
  });
}

/**
 * Verify and decode a JWT token with strict validation.
 */
export function verifyToken(token: string): AuthPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM as jwt.Algorithm],
      maxAge: JWT_EXPIRY,
    }) as AuthPayload;
    
    // Validate payload structure
    if (!decoded.pubkey || typeof decoded.pubkey !== 'string') {
      throw new Error('Invalid token payload: missing pubkey');
    }
    
    // Validate pubkey format (64-66 hex characters)
    if (!/^[0-9a-fA-F]{64,66}$/.test(decoded.pubkey)) {
      throw new Error('Invalid token payload: malformed pubkey');
    }
    
    return decoded;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw new Error('Authentication failed');
  }
}

/**
 * Required authentication middleware.
 * Rejects requests without a valid JWT.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Authorization header is required',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Authorization header must be: Bearer <token>',
    });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyToken(token);
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  }
}

/**
 * Optional authentication middleware.
 * Attaches auth info if a valid JWT is present, but doesn't reject otherwise.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      try {
        const payload = verifyToken(parts[1]);
        req.auth = payload;
      } catch {
        // Ignore invalid tokens for optional auth
      }
    }
  }

  next();
}
