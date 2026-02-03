import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchFiles()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchFiles()
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleUpload = async (event) => {
    try {
      setUploading(true)
      setMessage('')

      const file = event.target.files[0]
      if (!file) return

      // Check file size (limit to 5MB for demo)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File too large (max 5MB)')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath)

      // Save file info to database
      const { error: dbError } = await supabase
        .from('files')
        .insert([{
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type,
          user_id: session?.user?.id || null
        }])

      if (dbError) throw dbError

      setMessage(`Uploaded: ${file.name}`)
      fetchFiles()
      
    } catch (error) {
      setMessage('Upload failed: ' + error.message)
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const deleteFile = async (id, fileName) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-uploads')
        .remove([fileName])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      setMessage(`Deleted: ${fileName}`)
      fetchFiles()
    } catch (error) {
      setMessage('Delete failed: ' + error.message)
    }
  }

  // Initial fetch
  useState(() => {
    fetchFiles()
  }, [])

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h3>File Upload Demo</h3>
      <p>Upload files to Supabase Storage (max 5MB)</p>
      
      <div style={{ margin: '20px 0', textAlign: 'center' }}>
        <label style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}>
          {uploading ? 'Uploading...' : 'Choose File to Upload'}
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {message && (
        <div style={{ 
          margin: '15px 0', 
          padding: '10px', 
          backgroundColor: message.includes('failed') ? '#f8d7da' : '#d4edda',
          color: message.includes('failed') ? '#721c24' : '#155724',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h4>Uploaded Files ({files.length})</h4>
        {files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '15px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {files.map((file) => (
              <div key={file.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px',
                borderBottom: '1px solid #eee',
                ':last-child': { borderBottom: 'none' }
              }}>
                <div style={{ flex: 1 }}>
                  <div><strong>{file.name}</strong></div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {(file.size / 1024).toFixed(1)} KB • {file.type}
                  </div>
                  {file.url && (
                    <div style={{ marginTop: '5px' }}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px' }}>
                        View File
                      </a>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => deleteFile(file.id, file.name)}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Tech:</strong> Supabase Storage + PostgreSQL</p>
        <p><strong>Limits:</strong> Free tier: 1GB storage, 2GB bandwidth</p>
        <p><strong>Use cases:</strong> User avatars, document uploads, image galleries</p>
      </div>
    </div>
  )
}