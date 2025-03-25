import { useState } from 'react';
import { TodoItem } from './TodoItem';
import { useTodos } from '../hooks/useTodos';
import { Card, Input, Button, List, Spin, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export function TodoList() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodoTitle, setNewTodoTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    addTodo({ title: newTodoTitle.trim() });
    setNewTodoTitle('');
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="What needs to be done?"
            size="large"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleSubmit}
            size="large"
          >
            Add
          </Button>
        </Space.Compact>
      </form>

      <List
        dataSource={todos}
        renderItem={(todo) => (
          <List.Item style={{ padding: 0, border: 'none' }}>
            <TodoItem
              todo={todo}
              onToggle={(isComplete) => toggleTodo({ id: todo.id, isComplete })}
              onDelete={() => deleteTodo(todo.id)}
            />
          </List.Item>
        )}
      />
    </Card>
  );
} 