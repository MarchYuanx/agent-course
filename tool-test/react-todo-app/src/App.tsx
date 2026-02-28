import { useState, useEffect, useRef } from 'react';
import './App.css';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
};

type FilterType = 'all' | 'active' | 'completed';

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // 聚焦到输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 编辑时聚焦到编辑输入框
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const addTodo = () => {
    if (inputValue.trim() === '') return;
    
    const newTodo: Todo = {
      id: Date.now(),
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date()
    };
    
    setTodos([...todos, newTodo]);
    setInputValue('');
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const startEditing = (id: number, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEdit = () => {
    if (editingId !== null && editingText.trim() !== '') {
      setTodos(todos.map(todo => 
        todo.id === editingId ? { ...todo, text: editingText.trim() } : todo
      ));
      setEditingId(null);
      setEditingText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1 className="title">📝 Todo List</h1>
          <p className="subtitle">Stay organized and productive</p>
        </header>

        <div className="input-section">
          <div className="input-group">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="What needs to be done?"
              className="todo-input"
            />
            <button onClick={addTodo} className="add-button">
              <span className="button-icon">+</span> Add Task
            </button>
          </div>
        </div>

        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{totalCount}</div>
              <div className="stat-label">Total Tasks</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{activeCount}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{completedCount}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{Math.round((completedCount / totalCount) * 100) || 0}%</div>
              <div className="stat-label">Progress</div>
            </div>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-buttons">
            <button 
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({totalCount})
            </button>
            <button 
              className={`filter-button ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({activeCount})
            </button>
            <button 
              className={`filter-button ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed ({completedCount})
            </button>
          </div>
          {completedCount > 0 && (
            <button onClick={clearCompleted} className="clear-button">
              Clear Completed
            </button>
          )}
        </div>

        <div className="todos-section">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No tasks found</h3>
              <p>{filter === 'all' ? 'Add your first task above!' : `No ${filter} tasks`}</p>
            </div>
          ) : (
            <div className="todos-list">
              {filteredTodos.map(todo => (
                <div 
                  key={todo.id} 
                  className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}
                >
                  <div className="todo-content">
                    <div className="todo-checkbox">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="checkbox"
                      />
                    </div>
                    
                    {editingId === todo.id ? (
                      <div className="edit-input-group">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          className="edit-input"
                        />
                        <div className="edit-buttons">
                          <button onClick={saveEdit} className="save-button">
                            Save
                          </button>
                          <button onClick={cancelEdit} className="cancel-button">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="todo-text" onClick={() => toggleTodo(todo.id)}>
                          <span className="text">{todo.text}</span>
                          <span className="todo-date">
                            {new Date(todo.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="todo-actions">
                          <button 
                            onClick={() => startEditing(todo.id, todo.text)}
                            className="action-button edit"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => deleteTodo(todo.id)}
                            className="action-button delete"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="footer">
          <p className="footer-text">
            {activeCount === 0 && completedCount > 0 
              ? '🎉 All tasks completed! Great job!' 
              : activeCount === 1 
                ? '1 task left to do' 
                : `${activeCount} tasks left to do`
            }
          </p>
          <p className="footer-hint">
            💡 Tip: Press Enter to add tasks, Escape to cancel editing
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;