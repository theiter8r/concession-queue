import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { currentUser } from '@/lib/auth';
import PrintTrigger from './print-trigger';

// Per-request printable: Indian Railways school/college concession certificate.
// Layout follows the paper form (SN99B). Browser print -> PDF.

export const dynamic = 'force-dynamic';

function fmt(d: string | null | undefined) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function ageYearsMonths(dob: string | null | undefined) {
  if (!dob) return { years: '', months: '' };
  const b = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return { years: String(years), months: String(months) };
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
};

const CLASS_LABELS: Record<string, string> = {
  second: 'II',
  first: 'I',
};

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) notFound();

  const sb = await supabaseServer();
  const { data: req } = await sb
    .from('concession_requests')
    .select('*, users:users(*), concession_forms(*)')
    .eq('id', id)
    .single();
  if (!req) notFound();

  if (me.role !== 'admin' && req.user_id !== me.id) notFound();

  const u = req.users ?? {};
  const form = Array.isArray(req.concession_forms) ? req.concession_forms[0] : null;
  const today = fmt(new Date().toISOString());
  const age = ageYearsMonths(u.dob);
  const periodLabel = PERIOD_LABELS[req.period] ?? req.period;
  const classLabel = CLASS_LABELS[req.travel_class] ?? req.travel_class;
  const dob = fmt(u.dob);
  const hasSeason = !!req.season_ticket_no;

  return (
    <>
      <PrintTrigger />
      <div className="sheet">
        <div className="topbar no-print">
          <a href={me.role === 'admin' ? '/admin' : '/profile'}>← Back</a>
          <button className="btn-print" id="btn-print" type="button">Print / Save as PDF</button>
        </div>

        <div className="header">
          <div className="header-left">
            <div className="nearest">+ Nearest station: <u>{u.home_station ?? ''}</u></div>
            <div className="lang">भारतीय रेल</div>
            <div className="lang">INDIAN RAILWAYS</div>
          </div>
          <div className="header-right">
            <div>क्र.सं./Sr. No. <u>{form?.railway_form_no ?? ''}</u></div>
            <div>एसएन 99वी / SN99B</div>
            {form?.booklet_no && <div>Booklet: <u>{form.booklet_no}</u></div>}
          </div>
        </div>

        <p className="body">
          विद्यालय प्रमाण पत्र सिर्फ उन छात्रों के लिए जिनकी आयु 25 वर्ष तक है अन्यथा जिन्हें नियमानुसार अनुज्ञा मिली हो ।
          School certificate to the students only to those not more than 25 years of age except otherwise permitted under the Rules.
        </p>

        <p className="body">
          मैं एतद्द्वारा प्रमाणित करता हूं कि * <u>{u.name ?? ''}</u> इस विद्यालय/महाविद्यालय में जिसका मैं प्राचार्य/प्रधानाध्यापक हूँ, नियमित रूप से आता/आती है और मेरे विश्वास तथा मेरे द्वारा की गयी जांच के आधार पर आज उसकी आयु <u>{age.years}</u> वर्ष <u>{age.months}</u> मास है, विद्यालय/महाविद्यालय के रजिस्टर में दर्ज उसकी जन्म तिथि <u>{dob}</u> है।
        </p>

        <p className="body">
          I hereby certify that * <u>{u.name ?? ''}</u> ({u.department ?? ''}{u.academic_year ? `, ${u.academic_year}` : ''}{u.division ? `-${u.division}` : ''}{u.enrollment_no ? `, Enr. ${u.enrollment_no}` : ''}) regularly attends this School/College for the purpose of receiving education, the Institution of which I am the Principal/Head Master and his/her age this day, according to my belief and from enquiries I have made, is <u>{age.years}</u> years <u>{age.months}</u> months, his/her date of birth as entered in the School/College Register being <u>{dob}</u>. He/She is therefore entitled to the Season Ticket as detailed below at half the full rates charged for Adults.
        </p>

        <table className="grid">
          <thead>
            <tr>
              <th>Class</th>
              <th>Period</th>
              <th>From</th>
              <th>To station</th>
              <th>Class and No. of Season Ticket issued #</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{classLabel}</td>
              <td>{periodLabel}</td>
              <td>{req.station_from}</td>
              <td>{req.station_to}</td>
              <td>{req.season_ticket_no ?? ''}</td>
            </tr>
          </tbody>
        </table>

        <p className="body small">
          @ विद्यार्थी के पास इस समय / The student at present holds{' '}
          {hasSeason ? (
            <>
              <u>{classLabel}</u> श्रेणी/Class का सीजन टिकट नंबर/Season Ticket No <u>{req.season_ticket_no}</u> From <u>{req.station_from}</u> To <u>{req.station_to}</u>, valid until <u>{fmt(req.due_date)}</u>.
            </>
          ) : (
            <> <u>NIL</u> श्रेणी/Class का सीजन टिकट नंबर/Season Ticket No <u>NIL</u>.</>
          )}
        </p>

        <div className="signrow">
          <div>दिनांक/Date <u>{today}</u></div>
          <div>महाविद्यालय/विद्यालय का नाम और मुहर<br/>Name of College/School and Stamp<br/><br/>K.C. College of Engineering, Mumbai</div>
        </div>

        <div className="notes">
          <div>* विद्यार्थी का पूरा नाम लिखे / Enter the name of the student.</div>
          <div>+ Available only between Station nearest to Student&apos;s residence and Station nearest to the College/School.</div>
          <div># This column should be filled in by the Station issuing the Season Ticket.</div>
          <div>@ If no Season Ticket is held the word &apos;NIL&apos; should be inserted.</div>
          <div className="note-block">
            Note: (1) This certificate will be valid for three days including the date of issue and if not made use of within that time must be returned by the issuer for cancellation.
          </div>
          <div className="note-block">
            (2) No fresh concession certificate should be granted by the School/College authorities to any of their students in the event of his/her season ticket being lost during the currency of the previous certificate. Such students must purchase a fresh season ticket at tariff fares during that period.
          </div>
          <div className="foot">C.R.P.P./By/11-2019/01-19-0018-35000Bks.x50Lvs.</div>
        </div>
      </div>

      <style>{`
        :root { color-scheme: light; }
        html, body { background: #f3f4f6; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: #000; }
        .sheet {
          max-width: 760px;
          margin: 24px auto;
          padding: 32px 36px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          font-size: 13px;
          line-height: 1.5;
        }
        .topbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #999;
        }
        .topbar a { color: #2563eb; text-decoration: none; font-size: 13px; }
        .btn-print {
          background: #111; color: #fff; border: 0; padding: 8px 14px; border-radius: 6px;
          font-size: 13px; cursor: pointer;
        }
        .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 14px; }
        .header-left .nearest { margin-bottom: 6px; }
        .header-left .lang { font-weight: 600; }
        .header-right { text-align: right; }
        .body { margin: 10px 0; text-align: justify; }
        .small { font-size: 12px; }
        u { text-underline-offset: 2px; }
        .grid {
          width: 100%; border-collapse: collapse; margin: 12px 0;
        }
        .grid th, .grid td {
          border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 12px;
        }
        .grid th { background: #f3f4f6; }
        .signrow {
          display: flex; justify-content: space-between; gap: 24px; margin-top: 28px;
        }
        .signrow > div:last-child { text-align: right; }
        .notes { margin-top: 24px; font-size: 11px; color: #222; }
        .notes > div { margin-bottom: 4px; }
        .note-block { margin-top: 8px; }
        .foot { margin-top: 10px; font-size: 10px; color: #555; }

        @media print {
          html, body { background: #fff; }
          .no-print { display: none !important; }
          .sheet { box-shadow: none; margin: 0; max-width: none; padding: 14mm 16mm; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
