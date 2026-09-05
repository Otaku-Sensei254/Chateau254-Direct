import { useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiMail, FiLock, FiUser } from 'react-icons/fi';
import { Brand } from '../UI/shared';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Auth = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = { email: form.get('email'), password: form.get('password') };
    if (mode === 'signup') payload.name = form.get('name');

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

  return <main className="auth-page">
    <div className="auth-panel">
      <button className="auth-back" onClick={onBack}><FiArrowLeft /> Back</button>
      <div className="auth-brand"><Brand /></div>
      <div className="auth-heading">
        <p className="eyebrow">Your table awaits</p>
        <h1>{mode === 'signin' ? 'Welcome back.' : 'Join the table.'}</h1>
        <p>{mode === 'signin' ? 'Sign in to continue your Château254 experience.' : 'Create an account and make every order feel special.'}</p>
      </div>
      <div className="auth-socials">
        <button className="social-button" onClick={() => setError('Social sign-in is demo-only for now. Use email and password.')}><strong>G</strong> Continue with Google</button>
        <button className="social-button" onClick={() => setError('Social sign-in is demo-only for now. Use email and password.')}><strong></strong> Continue with Apple</button>
      </div>
      <div className="auth-divider"><span>or continue with email</span></div>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' && <label><span>Full name</span><div className="auth-input"><FiUser /><input name="name" type="text" placeholder="Your Name" required /></div></label>}
        <label><span>Email address</span><div className="auth-input"><FiMail /><input name="email" type="email" placeholder="you@example.com" required /></div></label>
        <label><span>Password</span><div className="auth-input"><FiLock /><input name="password" type="password" placeholder="Enter your password" minLength="6" required /></div></label>
        {mode === 'signin' && <button className="forgot-password" type="button">Forgot password?</button>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'} {!loading && <FiArrowRight />}</button>
      </form>
      <p className="auth-switch">{mode === 'signin' ? "Don't have an account?" : 'Already have an account?'} <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</button></p>
      <small className="auth-demo-note">Demo mode: authentication is simulated.</small>
    </div>
  </main>;
};

export default Auth;
