'use client';
import { useEffect, useState } from 'react';
import { Page, Card, Button, Input, Label } from '@/components/ui';

type Booklet = {
  id: string;
  booklet_no: string;
  total_forms: number;
  notes: string | null;
  created_at: string;
  issued: { count: number }[];
};

export default function BookletPage() {
  const [booklets, setBooklets] = useState<Booklet[]>([]);
  const [newNo, setNewNo] = useState('');
  const [newTotal, setNewTotal] = useState('50');
  const [newNotes, setNewNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const data = await fetch('/api/admin/booklets').then(r => r.json());
    setBooklets(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  async function addBooklet() {
    if (!newNo.trim()) return;
    setBusy(true); setErr(null);
    const res = await fetch('/api/admin/booklets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booklet_no: newNo.trim(), total_forms: parseInt(newTotal) || 50, notes: newNotes.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error === 'booklet_already_exists' ? 'Booklet already exists.' : (j.error ?? 'Failed to create.'));
      return;
    }
    setNewNo(''); setNewTotal('50'); setNewNotes('');
    load();
  }

  async function deleteBooklet(id: string) {
    if (!confirm('Delete this booklet?')) return;
    const res = await fetch(`/api/admin/booklets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      if (j.error === 'booklet_has_issued_forms') {
        alert(`Cannot delete: ${j.used} form(s) already issued from this booklet.`);
      } else {
        alert(j.error ?? 'Failed to delete.');
      }
      return;
    }
    load();
  }

  return (
    <Page title="Booklet Registry" subtitle="Track railway booklet stock and download issued forms per booklet.">
      <Card style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Add booklet</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr auto', gap: 8, alignItems: 'end' }}>
          <div>
            <Label>Booklet number</Label>
            <Input value={newNo} onChange={(e) => setNewNo(e.target.value)} placeholder="e.g. 2024-A-007" />
          </div>
          <div>
            <Label>Total forms</Label>
            <Input type="number" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} min={1} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="e.g. received April 2024" />
          </div>
          <Button variant="primary" onClick={addBooklet} disabled={busy || !newNo.trim()}>
            {busy ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {err && (
          <div style={{ marginTop: 8, fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'color-mix(in oklab, var(--danger) 8%, transparent)', color: 'var(--danger)', border: '1px solid color-mix(in oklab, var(--danger) 25%, transparent)' }}>
            {err}
          </div>
        )}
      </Card>

      {booklets.length === 0 ? (
        <Card style={{ padding: 24, color: 'var(--fg-muted)' }}>No booklets yet.</Card>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {booklets.map(b => {
            const used = b.issued?.[0]?.count ?? 0;
            return (
              <Card key={b.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 2 }}>Booklet</div>
                    <strong>{b.booklet_no}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 2 }}>Usage</div>
                    {used} / {b.total_forms} used
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 2 }}>Created</div>
                    {new Date(b.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 2 }}>Notes</div>
                    {b.notes || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`/api/admin/booklets/${b.id}/export?format=xlsx`} download>
                    <Button size="sm">Download</Button>
                  </a>
                  <Button size="sm" variant="danger" onClick={() => deleteBooklet(b.id)} disabled={used > 0}>
                    {used > 0 ? 'In use' : 'Delete'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
