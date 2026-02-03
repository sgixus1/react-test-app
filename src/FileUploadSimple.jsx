import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function FileUploadSimple() {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) listFiles()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) listFiles()
    })

    return () => subscription.unsubscribe()
  }, [])

  const listFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .list('', {
          limit: 20,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error listing files:', error)
    }
  }

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

      // Upload to Supabase Storage ONLY (no database)
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      setMessage(`Uploaded: ${file.name}`)
      listFiles()
      
    } catch (error) {
      setMessage('Upload failed: ' + error.message)
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileName) => {
    try {
      const { error } = await supabase.storage
        .from('uploads')
        .remove([fileName])

      if (error) throw error

      setMessage(`Deleted: ${fileName}`)
      listFiles()
    } catch (error) {
      setMessage('Delete failed: ' + error.message)
    }
  }

  const getPublicUrl = (fileName) => {
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName)
    return publicUrl
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h3>Simple File Upload (Storage Only)</h3>
      <p>Upload files directly to Supabase Storage, no database involved.</p>
      
      {!session ? (
        <p style={{ color: '#dc3545' }}>Please sign in to upload files.</p>
      ) : (
        <>
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
                  <div key={file.name} style={{ 
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
                        {(file.metadata?.size / 1024).toFixed(1)} KB • {file.metadata?.mimetype}
                      </div>
                      <div style={{ marginTop: '5px' }}>
                        <a href={getPublicUrl(file.name)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px' }}>
                          View File
                        </a>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteFile(file.name)}
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
        </>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Simplified approach:</strong> Files stored in Supabase Storage only.</p>
        <p><strong>Bucket:</strong> <code>uploads</code> (public)</p>
        <p><strong>No database RLS issues.</strong> Works immediately.</p>
      </div>
    </div>
  )
}