import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import PayPalPayment from './PayPalPayment'
import FileUploadSimple from './FileUploadSimple'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchTasks()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch tasks for current user
  async function fetchTasks() {
    if (!session) return
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  async function addTask() {
    if (!newTask.trim() || !session) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{ 
          title: newTask, 
          user_id: session.user.id 
        }])
      
      if (error) throw error
      setNewTask('')
      fetchTasks()
    } catch (error) {
      console.error('Error adding task:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTask(id, completed) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', id)
        .eq('user_id', session.user.id)
      
      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  async function deleteTask(id) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)
      
      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setTasks([])
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      
      <h1>✅ Gen's React + Supabase App</h1>
      <h2>Full-Stack with User Authentication</h2>
      
      {!session ? (
        <div className="card">
          <h3>Authentication Required</h3>
          <p>Sign in or create an account to use the task manager.</p>
          <Auth />
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3>Welcome, {session.user.email}!</h3>
                <p>Your tasks are private and secure.</p>
              </div>
              <button onClick={signOut} style={{ padding: '8px 16px' }}>
                Sign Out
              </button>
            </div>
            
            <h4>Task Manager</h4>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Enter new task"
                style={{ marginRight: '10px', padding: '8px', width: '300px' }}
              />
              <button onClick={addTask} disabled={loading}>
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
            
            <div>
              <h5>Your Tasks ({tasks.length})</h5>
              {tasks.length === 0 ? (
                <p>No tasks yet. Add one above!</p>
              ) : (
                <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
                  {tasks.map((task) => (
                    <li key={task.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id, task.completed)}
                        style={{ marginRight: '10px' }}
                      />
                      <span style={{ 
                        textDecoration: task.completed ? 'line-through' : 'none', 
                        flex: 1,
                        color: task.completed ? '#666' : '#000'
                      }}>
                        {task.title}
                      </span>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="card">
            <h3>Payment Processing</h3>
            <p>Test payment with PayPal sandbox (no real money charged):</p>
            
            <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>PayPal Sandbox Payment</h4>
              <p><strong>Test credentials:</strong></p>
              <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '10px auto' }}>
                <li>Email: sb-abcdef123456@personal.example.com</li>
                <li>Password: test123456</li>
              </ul>
              
              <PayPalPayment />
            </div>
            
            <p><strong>Note:</strong> Stripe integration uses LIVE key. Enable test mode first.</p>
          </div>
          
          <div className="card">
            <h3>File Uploads</h3>
            <FileUploadSimple />
          </div>
          
          <div className="card">
            <h3>Progress</h3>
            <ol>
              <li>✅ Database integration (Done!)</li>
              <li>✅ User authentication (Done!)</li>
              <li>✅ Payment processing (Demo ready)</li>
              <li>✅ File uploads (Done!)</li>
              <li>Real-time updates (Next)</li>
            </ol>
          </div>
        </>
      )}
      
      <p className="read-the-docs">
        {session ? `Logged in as: ${session.user.email}` : 'Not authenticated'}
      </p>
    </>
  )
}

export default App