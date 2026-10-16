import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MembershipPromptModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem('chateau254_membership_dismissed');
    const told = localStorage.getItem('chateau254_membership_seen');
    if (!dismissed && !told) {
      // Only show for guests (no stored session)
      const session = localStorage.getItem('chateau254_session');
      if (!session) {
        const t = setTimeout(() => setOpen(true), 120000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('chateau254_membership_dismissed', '1');
    setOpen(false);
  };

  if (!open) return null;

  return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1410, #2c1f14)',
            color: '#f5ebd3',
            padding: '2.5rem 2rem 2rem 2rem',
            borderRadius: '14px',
            maxWidth: '460px',
            width: '90%',
            position: 'relative',
            textAlign: 'center',
            border: '1px solid rgba(201,169,108,0.5)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 10,
              right: 14,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(201,169,108,0.3)',
              color: '#f5ebd3',
              fontSize: '1.2rem',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              lineHeight: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {'\u00D7'}
          </button>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.8rem',
            color: '#c9a96c',
            marginBottom: '0.75rem',
            fontWeight: 600,
          }}>
            Become a Member Today
          </h2>
          <p style={{
            fontSize: '1rem',
            lineHeight: 1.6,
            color: '#d8cdb0',
            marginBottom: '1.75rem',
          }}>
            Unlock member-exclusive perks &amp; get a discount on your first item of purchase.
          </p>
          <button
            onClick={() => {
              localStorage.setItem('chateau254_membership_seen', '1');
              setOpen(false);
              navigate('/auth');
            }}
            style={{
              padding: '11px 28px',
              background: 'linear-gradient(135deg, #c9a96c, #9e7f49)',
              color: '#1a1410',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
              boxShadow: '0 4px 14px rgba(201,169,108,0.4)',
              transition: 'transform 0.15s, boxShadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Create Account
          </button>
        </div>
      </div>
  );
}
