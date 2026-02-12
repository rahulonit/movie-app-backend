import bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';

const SALT_ROUNDS = 12;

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Compare password
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

const jwtSecret = process.env.JWT_SECRET ?? '';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? '';

// Generate JWT access token
export const generateAccessToken = (userId: string, role: string): string => {
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRE ?? '24h') as StringValue | number };
  return jwt.sign({ userId, role }, jwtSecret, options);
};

// Generate JWT refresh token
export const generateRefreshToken = (userId: string): string => {
  const options: SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRE ?? '24h') as StringValue | number };
  return jwt.sign({ userId }, jwtRefreshSecret, options);
};

// Verify access token
export type DecodedAccessToken = JwtPayload & { userId: string; role?: string };
export type DecodedRefreshToken = JwtPayload & { userId: string };

export const verifyAccessToken = (token: string): DecodedAccessToken | null => {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    return typeof decoded === 'string' ? null : (decoded as DecodedAccessToken);
  } catch (error) {
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): DecodedRefreshToken | null => {
  try {
    const decoded = jwt.verify(token, jwtRefreshSecret);
    return typeof decoded === 'string' ? null : (decoded as DecodedRefreshToken);
  } catch (error) {
    return null;
  }
};
