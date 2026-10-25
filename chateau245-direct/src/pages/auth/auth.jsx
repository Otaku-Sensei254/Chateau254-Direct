import { useState, useEffect, useRef } from 'react';
import { FiArrowLeft, FiArrowRight, FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import Brand from '../../components/Brand';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '175951330735-25k2nh44r67hjrl2loc0bo8duj750vb8.apps.googleusercontent.com';

const Auth = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleBtnRef = useRef(null);

  const [googleToken, setGoogleToken] = useState(null);
  const [phonePrompt, setPhonePrompt] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');

  const handleGoogleCredential = async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Google sign-in failed');
      if (!result.user.phone) {
        setGoogleToken(result.token);
        setPhonePrompt(true);
      } else {
        onSuccess(result.user, result.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/phone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${googleToken}` },
        body: JSON.stringify({ phone: phoneValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save phone');
      onSuccess(result.user, googleToken);
      setPhonePrompt(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load Google Identity Services script
    if (document.getElementById('google-gis-script')) {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
          });
        }
      }
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
        });
      }
    };
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = { email: form.get('email'), password: form.get('password') };
    if (mode === 'signup') {
      payload.name = form.get('name');
      payload.phone = form.get('phone');
    }

    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Authentication failed');
      onSuccess(result.user, result.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (phonePrompt) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <div className="auth-heading">
            <p className="eyebrow">One more step</p>
            <h1>Enter your phone number.</h1>
            <p>We need your phone number to confirm reservations and orders.</p>
          </div>
          <form className="auth-form" onSubmit={handlePhoneSubmit}>
            <label>
              <span>Phone number</span>
              <div className="auth-input">
                <FiPhone />
                <input
                  name="phone"
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  required
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                />
              </div>
            </label>
            {error && (
              <div className="auth-error" role="alert">
                <FiAlertCircle />
                <span>{error}</span>
              </div>
            )}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <button type="button" className="auth-back" onClick={onBack}>
          <FiArrowLeft /> Back to Château254
        </button>

        <div className="auth-brand">
          <Brand />
        </div>

        <div className="auth-heading">
          <p className="eyebrow">Your table awaits</p>
          <h1>{mode === 'signin' ? 'Welcome back.' : 'Join the table.'}</h1>
          <p>
            {mode === 'signin'
              ? 'Sign in to continue your Château254 experience.'
              : 'Create an account and make every order feel special.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label>
                <span>Full name</span>
                <div className="auth-input">
                  <FiUser />
                  <input name="name" type="text" placeholder="Your Name" required />
                </div>
              </label>
              <label>
                <span>Phone number</span>
                <div className="auth-input">
                  <FiPhone />
                  <input name="phone" type="tel" placeholder="+254 7XX XXX XXX" required />
                </div>
              </label>
            </>
          )}
          <label>
            <span>Email address</span>
            <div className="auth-input">
              <FiMail />
              <input name="email" type="email" placeholder="you@example.com" required />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="auth-input">
              <FiLock />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                minLength="6"
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>
          {mode === 'signin' && (
            <button className="forgot-password" type="button">
              Forgot password?
            </button>
          )}
          {error && (
            <div className="auth-error" role="alert">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            {!loading && <FiArrowRight />}
          </button>
        </form>
        <div className="auth-divider">
          <span>or</span>
        </div>
        <div ref={googleBtnRef} className="auth-google-btn" />
        <p className="auth-switch">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  );
};

export default Auth;
