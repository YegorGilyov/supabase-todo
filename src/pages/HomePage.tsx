import React from 'react';
import { Layout, Typography, Card } from 'antd';
import { TodoList } from '../components/TodoList';
import { TodoForm } from '../components/TodoForm';
import { useTodos } from '../hooks/useTodos';

const { Content } = Layout;
const { Title } = Typography;

export function HomePage() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo } = useTodos();

  return (
    <Content style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
        Todo List
      </Title>
      <Card>
        <TodoForm onAddTodo={addTodo} />
        <div style={{ marginTop: 24 }}>
          <TodoList
            todos={todos}
            onToggleTodo={(id, isComplete) => toggleTodo({ id, isComplete })}
            onDeleteTodo={deleteTodo}
            isLoading={isLoading}
          />
        </div>
      </Card>
    </Content>
  );
} 