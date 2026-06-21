export const COLLEGE_EMAIL_DOMAIN = 'kccemsr.edu.in';

export function isCollegeEmail(email: string): boolean {
  return /^[^@\s]+@kccemsr\.edu\.in$/i.test(email.trim());
}
