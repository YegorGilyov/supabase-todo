import { type Todo } from '../types/todo';
import { Checkbox, Button, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TodoItemProps {
  todo: Todo;
  onToggle: (isComplete: boolean) => void;
  onDelete: () => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      padding: '12px 24px',
      width: '100%',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <Checkbox
        checked={todo.is_complete}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <Text
        style={{
          margin: '0 12px',
          flex: 1,
          textDecoration: todo.is_complete ? 'line-through' : 'none',
          color: todo.is_complete ? '#00000040' : undefined
        }}
      >
        {todo.title}
      </Text>
      <Button
        type="text"
        icon={<DeleteOutlined />}
        onClick={onDelete}
        danger
      />
    </div>
  );
} 