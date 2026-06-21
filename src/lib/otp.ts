import { createHash, randomInt } from 'node:crypto';

// 6-digit numeric OTP. Only the hash is stored (appointments.otp_hash, §3).
export function generateOtp(): { code: string; hash: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return { code, hash: hashOtp(code) };
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
