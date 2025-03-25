import { type Todo } from '../types/todo';
import styles from '../styles/TodoItem.module.css';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, isComplete: boolean) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className={styles.todoItem}>
      <input
        type="checkbox"
        checked={todo.is_complete}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        className={styles.checkbox}
      />
      <p className={`${styles.title} ${todo.is_complete ? styles.completed : ''}`}>
        {todo.title + (todo.id.startsWith('temp_') ? ' *' : '')}
      </p>
      <button
        onClick={() => onDelete(todo.id)}
        className={styles.deleteButton}
        aria-label="Delete todo"
      >
        ×
      </button>
    </div>
  );
} 