// Eligibility — SPEC §6.
// Computed from dob + gender at request creation, enforced server-side.

import type { SupabaseClient } from '@supabase/supabase-js';

const MALE_AGE_CUTOFF = 25; // §16.3 open item; confirm before launch.

export type EligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

export function ageEligibility(
  dob: string | null | undefined,
  gender: 'male' | 'female' | 'other' | null | undefined,
): EligibilityResult {
  if (!dob || !gender) return { ok: false, reason: 'dob_and_gender_required' };
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

  if (gender === 'male' && age >= MALE_AGE_CUTOFF) {
    return { ok: false, reason: 'male_age_cutoff' };
  }
  return { ok: true };
}

export async function policyEligibility(
  sb: SupabaseClient,
  travel_class: 'first' | 'second',
  period: 'monthly' | 'quarterly',
): Promise<EligibilityResult> {
  const { data, error } = await sb
    .from('concession_policies')
    .select('allowed')
    .eq('travel_class', travel_class)
    .eq('period', period)
    .maybeSingle();
  if (error) return { ok: false, reason: 'policy_lookup_failed' };
  if (!data || !data.allowed) return { ok: false, reason: 'policy_not_allowed' };
  return { ok: true };
}
