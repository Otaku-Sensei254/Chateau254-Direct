import React, { useState, useEffect } from 'react';

export default function InstallButton({ alwaysVisible = false, className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    if (isStandalone) {
      return; // Already installed, don't show button
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setUnavailable(true);
      window.setTimeout(() => setUnavailable(false), 3200);
      return;
    }

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible && !alwaysVisible) {
    return null;
  }

  return (
    <button
      className={`install-app-button ${className}`.trim()}
      onClick={handleInstallClick}
      type="button"
      aria-label={unavailable ? 'Installation is available from your browser menu' : 'Install Chateau254 app'}
      style={{
        padding: '8px 16px',
        background: 'var(--accent-nav)',
        color: 'var(--text-on-accent)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.target.style.background = 'var(--accent-nav-deep)'}
      onMouseLeave={(e) => e.target.style.background = 'var(--accent-nav)'}
    >
      {unavailable ? 'Use browser menu to install' : '📥 Install App'}
    </button>
  );
}
