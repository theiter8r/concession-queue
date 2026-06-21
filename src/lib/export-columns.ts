// SPEC §10: never interpolate user-supplied column names into SQL.
// This whitelist is the only mapping the export endpoints accept.

export const COLUMN_WHITELIST = {
  name:            (r: any) => r.users?.name,
  enrollment_no:   (r: any) => r.users?.enrollment_no,
  college_email:   (r: any) => r.users?.college_email,
  phone:           (r: any) => r.users?.phone,
  dob:             (r: any) => r.users?.dob,
  gender:          (r: any) => r.users?.gender,
  address:         (r: any) => r.users?.address,
  home_station:    (r: any) => r.users?.home_station,
  station_from:    (r: any) => r.station_from,
  station_to:      (r: any) => r.station_to,
  travel_class:    (r: any) => r.travel_class,
  period:          (r: any) => r.period,
  reason:          (r: any) => r.reason,
  status:          (r: any) => r.status,
  due_date:        (r: any) => r.due_date,
  created_at:      (r: any) => r.created_at,
  booklet_no:      (r: any) => r.concession_forms?.[0]?.booklet_no,
  railway_form_no: (r: any) => r.concession_forms?.[0]?.railway_form_no,
  issued_at:       (r: any) => r.concession_forms?.[0]?.issued_at,
} as const;

export type AllowedColumn = keyof typeof COLUMN_WHITELIST;

export function pickColumns(requested: string[]): AllowedColumn[] {
  return requested.filter((c): c is AllowedColumn => c in COLUMN_WHITELIST);
}
