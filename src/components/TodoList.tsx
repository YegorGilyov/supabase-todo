import { useState, FormEvent } from 'react';
import { TodoItem } from './TodoItem';
import { useTodos } from '../hooks/useTodos';
import styles from '../styles/TodoList.module.css';

export function TodoList() {
  const { todos, loading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodoTitle, setNewTodoTitle] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    await addTodo({ title: newTodoTitle.trim() });
    setNewTodoTitle('');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          Add Todo
        </button>
      </form>

      <ul className={styles.list}>
        {todos.map((todo) => (
          <li key={todo.id}>
            <TodoItem
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          </li>
        ))}
      </ul>
    </div>
  );
} 