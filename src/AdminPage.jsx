import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import SeoMeta from './SeoMeta'
import { listMedia, logoutAdmin, removeMedia, saveContent, uploadMedia } from './siteApi'

function AdminPage({ content, onSaved, auth, onLogout }) {
  const [status, setStatus] = useState('')
  const [activeLang, setActiveLang] = useState('ja')
  const [draft, setDraft] = useState(() => structuredClone(content || {}))
  const [mediaList, setMediaList] = useState([])
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [selectedUploadCase, setSelectedUploadCase] = useState('')

  const hasContent = useMemo(
    () => Boolean(content && content.ja && content.zh && content.en),
    [content],
  )

  function resetDraft() {
    setDraft(structuredClone(content || {}))
  }

  async function handleLogout() {
    await logoutAdmin().catch(() => {})
    localStorage.removeItem('adminToken')
    onLogout()
  }

  function updateLangField(path, value) {
    setDraft((prev) => {
      const next = structuredClone(prev)
      let cursor = next[activeLang]
      for (let i = 0; i < path.length - 1; i += 1) {
        cursor = cursor[path[i]]
      }
      cursor[path[path.length - 1]] = value
      return next
    })
  }

  function updateCase(index, key, value) {
    setDraft((prev) => {
      const next = structuredClone(prev)
      next[activeLang].casesSection.items[index][key] = value
      return next
    })
  }

  async function loadMedia() {
    const data = await listMedia()
    setMediaList(data)
    setMediaLoaded(true)
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file || !selectedUploadCase) {
      return
    }
    const result = await uploadMedia(file)
    const index = Number(selectedUploadCase)
    updateCase(index, 'coverImage', result.url)
    await loadMedia()
    setStatus('media uploaded')
  }

  async function handleDeleteMedia(filename) {
    await removeMedia(filename)
    await loadMedia()
    setStatus('media deleted')
  }

  async function handleSave() {
    try {
      await saveContent(draft)
      setStatus('saved')
      onSaved(structuredClone(draft))
    } catch (error) {
      setStatus(error.message || 'save failed')
    }
  }

  if (!auth) {
    return <Navigate to="/admin/login" replace />
  }

  const page = draft?.[activeLang]

  return (
    <div className="site detail-page">
      <SeoMeta
        title="CMS Admin - Weisheng Tech"
        description="Edit site content in JSON format."
        urlPath="/admin"
        image="https://example.com/og-default.jpg"
      />

      <section className="section admin-section">
        <h1>CMS 管理后台</h1>
        <p>
          当前账号：{auth.username}（{auth.role}）
        </p>
        {!hasContent && <p className="notice error">当前未加载到站点内容，请先检查 API。</p>}

        <div className="lang-tabs">
          {['ja', 'zh', 'en'].map((lang) => (
            <button
              type="button"
              key={lang}
              className={lang === activeLang ? 'tab active' : 'tab'}
              onClick={() => setActiveLang(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {page && (
          <>
            <div className="form-grid">
              <label>
                站点名称
                <input
                  value={page.siteName || ''}
                  onChange={(event) => updateLangField(['siteName'], event.target.value)}
                />
              </label>
              <label>
                SEO 标题
                <input
                  value={page.seo?.title || ''}
                  onChange={(event) => updateLangField(['seo', 'title'], event.target.value)}
                />
              </label>
              <label>
                SEO 描述
                <textarea
                  rows="3"
                  value={page.seo?.description || ''}
                  onChange={(event) => updateLangField(['seo', 'description'], event.target.value)}
                />
              </label>
              <label>
                Hero 标题
                <input
                  value={page.hero?.title || ''}
                  onChange={(event) => updateLangField(['hero', 'title'], event.target.value)}
                />
              </label>
              <label>
                Hero 描述
                <textarea
                  rows="3"
                  value={page.hero?.description || ''}
                  onChange={(event) => updateLangField(['hero', 'description'], event.target.value)}
                />
              </label>
              <label>
                联系按钮文案
                <input
                  value={page.contactSection?.submit || ''}
                  onChange={(event) => updateLangField(['contactSection', 'submit'], event.target.value)}
                />
              </label>
            </div>

            <h2>案例管理</h2>
            <div className="case-admin-list">
              {page.casesSection?.items?.map((item, index) => (
                <div className="case-admin-item" key={item.slug}>
                  <label>
                    案例标题
                    <input value={item.name || ''} onChange={(event) => updateCase(index, 'name', event.target.value)} />
                  </label>
                  <label>
                    案例摘要
                    <input value={item.value || ''} onChange={(event) => updateCase(index, 'value', event.target.value)} />
                  </label>
                  <label>
                    封面图 URL
                    <input
                      value={item.coverImage || ''}
                      onChange={(event) => updateCase(index, 'coverImage', event.target.value)}
                    />
                  </label>
                  <label>
                    详情标题
                    <input
                      value={item.detailTitle || ''}
                      onChange={(event) => updateCase(index, 'detailTitle', event.target.value)}
                    />
                  </label>
                  <label>
                    详情内容
                    <textarea
                      rows="4"
                      value={item.detailBody || ''}
                      onChange={(event) => updateCase(index, 'detailBody', event.target.value)}
                    />
                  </label>
                  {item.coverImage && (
                    <img className="thumb" src={item.coverImage} alt={item.name || 'cover'} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <h2>媒体管理</h2>
        <div className="media-tools">
          <select value={selectedUploadCase} onChange={(event) => setSelectedUploadCase(event.target.value)}>
            <option value="">选择要替换封面的案例</option>
            {(page?.casesSection?.items || []).map((item, index) => (
              <option value={String(index)} key={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <input type="file" accept="image/*" onChange={handleUpload} />
          <button type="button" className="btn ghost" onClick={loadMedia}>
            {mediaLoaded ? '刷新媒体列表' : '加载媒体列表'}
          </button>
        </div>
        {!!mediaList.length && (
          <div className="media-list">
            {mediaList.map((item) => (
              <div className="media-item" key={item.filename}>
                <img src={item.url} alt={item.filename} />
                <p>{item.filename}</p>
                {auth.role === 'admin' && (
                  <button type="button" onClick={() => handleDeleteMedia(item.filename)}>
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="admin-actions">
          <button type="button" onClick={handleSave}>
            保存内容
          </button>
          <button type="button" className="btn ghost" onClick={resetDraft}>
            重置
          </button>
          <button type="button" className="btn ghost" onClick={handleLogout}>
            退出登录
          </button>
        </div>

        {status === 'saved' && <p className="notice success">保存成功。</p>}
        {status && status !== 'saved' && <p className="notice error">{status}</p>}
      </section>
    </div>
  )
}

export default AdminPage
