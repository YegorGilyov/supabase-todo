import { useMemo } from 'react';
import { Table, Button, Checkbox, Space, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';
import type { Todo } from '../types/models/todo';
import { useEntity } from '../contexts/RegistryContext';
import '../styles/TodoList.css';

type TodoWithKey = Todo & { key: string };

type TodoGroup = {
  key: 'incomplete' | 'complete';
  title: string;
  children: TodoWithKey[];
};

const GROUP_HEADER_STYLE = {
  backgroundColor: '#f5f5f5'
};

export function TodoList() {
  const { todos, isLoading, error, deleteTodo: onDelete, editTodo: onEdit, toggleTodo: onToggle } = useEntity('todos');

  if (error) {
    return <Typography.Text type="danger">{error.message}</Typography.Text>;
  }

  const columns: ColumnsType<TodoWithKey | TodoGroup> = [
    {
      title: 'Status',
      dataIndex: 'is_complete',
      width: '80px',
      render: (_, record) => {
        if ('children' in record) {
          return (
            <Tag color={record.key === 'incomplete' ? 'error' : 'success'}>
              {record.children.length}
            </Tag>
          );
        }
        return (
          <Checkbox
            checked={record.is_complete}
            onChange={() => onToggle(record.id)}
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
          <Typography.Text
            className="editable-cell"
            editable={{
              onChange: (value) => onEdit(record.id, value),
              text,
              enterIcon: null,
              tooltip: 'Click to edit',
            }}
          >
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
              onClick={() => onDelete(record.id)}
              aria-label="Delete todo"
            />
          </Space>
        );
      },
    },
  ];

  const groupedTodos = useMemo(() => {
    const incomplete = todos.filter(todo => !todo.is_complete);
    const complete = todos.filter(todo => todo.is_complete);

    return [
      {
        key: 'incomplete',
        title: 'Incomplete',
        children: incomplete.map(todo => ({ ...todo, key: todo.id })),
      },
      {
        key: 'complete',
        title: 'Complete',
        children: complete.map(todo => ({ ...todo, key: todo.id })),
      },
    ] as TodoGroup[];
  }, [todos]);

  return (
    <Table
      columns={columns}
      dataSource={groupedTodos}
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
} 