import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import styles from '../styles/Auth.module.css';

export function Auth() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{isLogin ? 'Sign In' : 'Sign Up'}</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className={styles.input}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toggle}>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className={styles.toggleButton}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
} 