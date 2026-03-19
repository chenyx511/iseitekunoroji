import { Navigate } from 'react-router-dom'
import { useState } from 'react'
import SeoMeta from './SeoMeta'
import { loginAdmin } from './siteApi'

function AdminLoginPage({ onLogin, isLoggedIn }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoggedIn) {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await loginAdmin(form)
      localStorage.setItem('adminToken', result.token)
      onLogin({ username: result.username, role: result.role })
    } catch (err) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="site detail-page">
      <SeoMeta
        title="Admin Login - Weisheng Tech"
        description="Admin login page"
        urlPath="/admin/login"
        image="https://example.com/og-default.jpg"
      />

      <section className="section login-section">
        <h1>管理后台登录</h1>
        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="用户名"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
          {error && <p className="notice error">{error}</p>}
        </form>
      </section>
    </div>
  )
}

export default AdminLoginPage
