import { useMemo, useState } from 'react';
import { Table, Button, Checkbox, Space, Typography, Tag, Popover, Input, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TodoWithCategories } from '../types/models/todo';
import { useEntity } from '../contexts/RegistryContext';
import '../styles/TodoList.css';

type TodoWithKey = TodoWithCategories & { key: string };

type TodoGroup = {
  key: 'incomplete' | 'complete';
  title: string;
  children: TodoWithKey[];
};

const GROUP_HEADER_STYLE = {
  backgroundColor: '#f5f5f5'
};

export function TodoList() {
  const { todos, isLoading, error, deleteTodo: onDelete, editTodo: onEdit, toggleTodo: onToggle, addTodoToCategory, removeTodoFromCategory, addTodo } = useEntity('todos');
  const { categories } = useEntity('categories');
  const { message } = App.useApp();
  const [newTodoTitle, setNewTodoTitle] = useState('');

  if (error) {
    return <Typography.Text type="danger">{error.message}</Typography.Text>;
  }

  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) {
      message.error('Todo title cannot be empty');
      return;
    }
    
    // Update UI immediately
    const title = newTodoTitle.trim();
    setNewTodoTitle('');
    
    // Fire and forget - the state will be updated optimistically
    addTodo(title)
      .then(() => message.success('Todo added successfully'))
      .catch(() => {
        message.error('Failed to add todo');
      });
  };

  const handleEdit = (id: string, value: string) => {
    if (!value.trim()) {
      message.error('Todo title cannot be empty');
      return;
    }

    onEdit(id, value)
      .then(() => message.success('Todo updated successfully'))
      .catch(() => {
        message.error('Failed to update todo');
      });
  };

  const handleToggle = (id: string) => {
    onToggle(id)
      .then(() => message.success('Todo status updated successfully'))
      .catch(() => {
        message.error('Failed to update todo status');
      });
  };

  const handleDelete = (id: string) => {
    onDelete(id)
      .then(() => message.success('Todo deleted successfully'))
      .catch(() => {
        message.error('Failed to delete todo');
      });
  };

  const handleAddCategory = (todoId: string, categoryId: string) => {
    addTodoToCategory(todoId, categoryId)
      .then(() => message.success('Category added to todo successfully'))
      .catch(() => {
        message.error('Failed to add category to todo');
      });
  };

  const handleRemoveCategory = (todoId: string, categoryId: string) => {
    removeTodoFromCategory(todoId, categoryId)
      .then(() => message.success('Category removed from todo successfully'))
      .catch(() => {
        message.error('Failed to remove category from todo');
      });
  };

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
            onChange={() => handleToggle(record.id)}
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
              onChange: (value) => handleEdit(record.id, value),
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
      title: 'Categories',
      key: 'categories',
      render: (_, record) => {
        if ('children' in record) return null;
        
        const availableCategories = categories.filter(
          cat => !record.categories.some(c => c.id === cat.id)
        );

        const addCategoryContent = (
          <div style={{ maxWidth: 200 }}>
            {availableCategories.length > 0 ? (
              <Space wrap>
                {availableCategories.map(category => (
                  <Tag
                    key={category.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleAddCategory(record.id, category.id)}
                  >
                    + {category.title}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">No more categories available</Typography.Text>
            )}
          </div>
        );

        return (
          <Space wrap>
            {record.categories.map(category => (
              <Tag
                key={category.id}
                closable
                onClose={() => handleRemoveCategory(record.id, category.id)}
              >
                {category.title}
              </Tag>
            ))}
            <Popover
              content={addCategoryContent}
              title="Add category"
              trigger="click"
              placement="bottom"
            >
              <Button type="text" size="small" icon={<PlusOutlined />} />
            </Popover>
          </Space>
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
              onClick={() => handleDelete(record.id)}
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Input.Search
          placeholder="Add a new todo"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onSearch={handleAddTodo}
          enterButton="Add"
        />
      </div>
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
        style={{ flex: 1, overflow: 'auto' }}
      />
    </div>
  );
} 