import React, { useMemo } from 'react';
import { Table, Button, Checkbox, Space, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';
import type { Todo } from '../types/todo';

interface TodoListProps {
  todos: Todo[];
  onToggleTodo: (id: string, isComplete: boolean) => void;
  onDeleteTodo: (id: string) => void;
  isLoading: boolean;
}

type TodoGroup = {
  key: 'incomplete' | 'complete';
  title: string;
  children: (Todo & { key: string })[];
};

const GROUP_HEADER_STYLE = {
  backgroundColor: '#f5f5f5'
};

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onToggleTodo,
  onDeleteTodo,
  isLoading
}) => {
  // Transform todos into tree structure
  const treeData: TodoGroup[] = useMemo(() => {
    const incompleteTodos = todos.filter(todo => !todo.is_complete);
    const completeTodos = todos.filter(todo => todo.is_complete);

    return [
      {
        key: 'incomplete',
        title: 'Incomplete',
        children: incompleteTodos.map(todo => ({
          ...todo,
          key: todo.id
        }))
      },
      {
        key: 'complete',
        title: 'Complete',
        children: completeTodos.map(todo => ({
          ...todo,
          key: todo.id
        }))
      }
    ];
  }, [todos]);

  const columns: ColumnsType<TodoGroup | (Todo & { key: string })> = [
    {
      title: 'Status',
      dataIndex: 'is_complete',
      width: '80px',
      render: (isComplete: boolean | undefined, record) => {
        if ('children' in record) {
          return (
            <Tag color={record.key === 'incomplete' ? 'error' : 'success'}>
              {record.children.length}
            </Tag>
          );
        }
        return (
          <Checkbox
            checked={isComplete}
            onChange={(e) => onToggleTodo(record.id, e.target.checked)}
          />
        );
      },
    },
    {
      title: 'Task',
      dataIndex: 'title',
      render: (text: string, record) => {
        if ('children' in record) {
          return <Typography.Text strong>{text}</Typography.Text>;
        }
        return (
          <Typography.Text delete={record.is_complete}>
            {text}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      width: '150px',
      render: (date: string | undefined, record) => {
        if ('children' in record) return null;
        return new Date(date!).toLocaleDateString();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '100px',
      render: (_, record) => {
        if ('children' in record) return null;
        return (
          <Space>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteTodo(record.id)}
              aria-label="Delete todo"
            />
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={treeData}
      columns={columns}
      rowKey="key"
      loading={isLoading}
      pagination={false}
      size="middle"
      expandable={{
        defaultExpandedRowKeys: ['incomplete', 'complete'],
      }}
      onRow={(record) => ({
        style: 'children' in record ? GROUP_HEADER_STYLE : {}
      })}
      className="todo-list-table"
    />
  );
}; 