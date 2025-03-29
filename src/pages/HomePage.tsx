import { Splitter } from 'antd';
import { Categories } from '../components/Categories';
import { TodoList } from '../components/TodoList';

export function HomePage() {
  return (
    <div style={{ height: 'calc(100vh - 64px)' }}>
      <Splitter style={{ height: '100%' }}>
        <Splitter.Panel defaultSize="25%" min="20%" max="70%">
          <Categories />
        </Splitter.Panel>
        <Splitter.Panel>
          <TodoList />
        </Splitter.Panel>
      </Splitter>
    </div>
  );
} 