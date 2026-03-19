import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AdminPage from './AdminPage'
import AdminLoginPage from './AdminLoginPage'
import CaseDetailPage from './CaseDetailPage'
import HomePage from './HomePage'
import { fetchContent, fetchMe } from './siteApi'

function App() {
  const [content, setContent] = useState(null)
  const [failed, setFailed] = useState(false)
  const [auth, setAuth] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    fetchContent()
      .then((data) => {
        setContent(data)
      })
      .catch(() => {
        setFailed(true)
      })

    fetchMe()
      .then((user) => setAuth(user))
      .catch(() => setAuth(null))
      .finally(() => setAuthReady(true))
  }, [])

  if (failed) {
    return <div className="empty-state">Failed to load API data.</div>
  }

  if (!content) {
    return <div className="empty-state">Loading...</div>
  }

  if (!authReady) {
    return <div className="empty-state">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage lang="ja" content={content} />} />
      <Route path="/zh" element={<HomePage lang="zh" content={content} />} />
      <Route path="/en" element={<HomePage lang="en" content={content} />} />
      <Route path="/cases/:slug" element={<CaseDetailPage lang="ja" content={content} />} />
      <Route path="/zh/cases/:slug" element={<CaseDetailPage lang="zh" content={content} />} />
      <Route path="/en/cases/:slug" element={<CaseDetailPage lang="en" content={content} />} />
      <Route
        path="/admin/login"
        element={<AdminLoginPage onLogin={setAuth} isLoggedIn={Boolean(auth)} />}
      />
      <Route
        path="/admin"
        element={
          auth ? (
            <AdminPage content={content} onSaved={setContent} auth={auth} onLogout={() => setAuth(null)} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
