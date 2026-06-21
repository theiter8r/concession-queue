'use client';
import { useEffect } from 'react';

export default function PrintTrigger() {
  useEffect(() => {
    const btn = document.getElementById('btn-print');
    btn?.addEventListener('click', () => window.print());
    return () => btn?.removeEventListener('click', () => window.print());
  }, []);
  return null;
}
