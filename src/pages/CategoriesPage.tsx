import { Button, Card, Input, List, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useEntity } from '../contexts/RegistryContext';
import { useAuthContext } from '../contexts/AuthContext';

const { Title } = Typography;

export function CategoriesPage() {
  const { signOut } = useAuthContext();
  const { categories, isLoading, addCategory, deleteCategory, editCategory } = useEntity('categories');
  const [newCategoryTitle, setNewCategoryTitle] = useState('');

  const handleAddCategory = () => {
    if (!newCategoryTitle.trim()) return;
    addCategory(newCategoryTitle);
    setNewCategoryTitle('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Categories
        </Title>
        <Button 
          icon={<LogoutOutlined />}
          onClick={signOut}
          type="text"
          size="large"
        >
          Logout
        </Button>
      </div>
      <Card>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <Input
            placeholder="New category name"
            value={newCategoryTitle}
            onChange={(e) => setNewCategoryTitle(e.target.value)}
            onPressEnter={handleAddCategory}
          />
          <Button type="primary" onClick={handleAddCategory}>
            Add Category
          </Button>
        </div>

        <List
          loading={isLoading}
          dataSource={categories}
          renderItem={(category) => (
            <List.Item
              actions={[
                <Typography.Link key="edit" onClick={() => {
                  const newTitle = window.prompt('Enter new category name:', category.title);
                  if (newTitle && newTitle !== category.title) {
                    editCategory(category.id, newTitle);
                  }
                }}>
                  Edit
                </Typography.Link>,
                <Typography.Link
                  key="delete"
                  type="danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this category?')) {
                      deleteCategory(category.id);
                    }
                  }}
                >
                  Delete
                </Typography.Link>,
              ]}
            >
              <List.Item.Meta title={category.title} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
} 