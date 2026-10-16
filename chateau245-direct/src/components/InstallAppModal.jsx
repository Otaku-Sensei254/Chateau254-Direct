import React, { useEffect, useState } from 'react';

export default function InstallAppModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissed = localStorage.getItem('chateau254_install_dismissed');
    if (dismissed) return;

    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const installed = () => {
      localStorage.setItem('chateau254_install_dismissed', '1');
      setOpen(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);

    const t = setTimeout(() => setOpen(true), 10000);

    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem('chateau254_install_dismissed', '1');
    setOpen(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setUnavailable(true);
      setTimeout(() => setUnavailable(false), 3200);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install outcome:', outcome);
    setDeferredPrompt(null);
    setOpen(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #1a1410, #2c1f14)',
        color: '#f5ebd3', padding: '2.5rem 2rem 2rem 2rem', borderRadius: '14px',
        maxWidth: '460px', width: '90%', position: 'relative', textAlign: 'center',
        border: '1px solid rgba(201,169,108,0.5)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        fontFamily: "'Montserrat', sans-serif",
      }}>
        <button onClick={dismiss} aria-label="Close" style={{
          position: 'absolute', top: 10, right: 14,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,108,0.3)',
          color: '#f5ebd3', fontSize: '1.2rem', cursor: 'pointer',
          borderRadius: '50%', width: '30px', height: '30px', lineHeight: '1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{'\u00D7'}</button>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem',
          color: '#c9a96c', marginBottom: '0.75rem', fontWeight: 600,
        }}>Install Our App</h2>
        <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#d8cdb0', marginBottom: '1.75rem' }}>
          Get the Château254 app for faster access, offline menus and a smoother experience.
        </p>
        <button onClick={handleInstall} style={{
          padding: '11px 28px',
          background: 'linear-gradient(135deg, #c9a96c, #9e7f49)',
          color: '#1a1410', border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.5px',
          boxShadow: '0 4px 14px rgba(201,169,108,0.4)',
        }}>
          {unavailable ? 'Use browser menu to install' : 'Install App'}
        </button>
      </div>
    </div>
  );
}
