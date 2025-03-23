import { useAuth } from '../hooks/useAuth';
import { TodoList } from '../components/TodoList';
import styles from '../styles/HomePage.module.css';

export function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Welcome, {user?.email}!
        </h1>
        <button
          onClick={signOut}
          className={styles.signOutButton}
        >
          Sign Out
        </button>
      </div>
      <TodoList />
    </div>
  );
} 