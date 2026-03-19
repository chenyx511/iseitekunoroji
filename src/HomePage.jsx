import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SeoMeta from './SeoMeta'
import { fetchCaptcha, submitInquiry } from './siteApi'

function linkWithLang(lang, target) {
  if (lang === 'ja') {
    return target
  }
  if (lang === 'en') {
    return target === '/' ? '/en' : `/en${target}`
  }
  return target === '/' ? '/zh' : `/zh${target}`
}

function HomePage({ lang, content }) {
  const [form, setForm] = useState({
    company: '',
    contact: '',
    phone: '',
    message: '',
  })
  const [submitState, setSubmitState] = useState('idle')
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')

  const texts = useMemo(() => {
    if (content && content[lang]) {
      return content[lang]
    }
    return null
  }, [content, lang])

  useEffect(() => {
    fetchCaptcha()
      .then((data) => setCaptcha(data))
      .catch(() => setCaptcha(null))
  }, [lang])

  if (!texts) {
    return <div className="empty-state">Loading...</div>
  }

  async function refreshCaptcha() {
    const next = await fetchCaptcha()
    setCaptcha(next)
    setCaptchaAnswer('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitState('submitting')
    try {
      await submitInquiry({
        ...form,
        lang,
        sourceUrl: window.location.href,
        captchaId: captcha?.captchaId,
        captchaAnswer,
      })
      setSubmitState('success')
      setForm({ company: '', contact: '', phone: '', message: '' })
      await refreshCaptcha()
    } catch {
      setSubmitState('error')
      await refreshCaptcha()
    }
  }

  return (
    <div className="site">
      <SeoMeta
        title={texts.seo.title}
        description={texts.seo.description}
        urlPath={lang === 'ja' ? '/' : `/${lang}`}
        image={texts.seo.ogImage}
      />

      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          {texts.siteName}
        </div>
        <nav className="nav">
          <a href="#services">{texts.nav.services}</a>
          <a href="#cases">{texts.nav.cases}</a>
          <a href="#about">{texts.nav.about}</a>
          <a href="#contact">{texts.nav.contact}</a>
          <Link to="/" className="lang-switch">
            JP
          </Link>
          <Link to="/zh" className="lang-switch">
            中文
          </Link>
          <Link to="/en" className="lang-switch">
            EN
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="kicker">{texts.hero.kicker}</p>
          <h1>{texts.hero.title}</h1>
          <p className="hero-text">{texts.hero.description}</p>
          <div className="hero-actions">
            <a href="#contact" className="btn primary">
              {texts.hero.primaryButton}
            </a>
            <a href="#services" className="btn ghost">
              {texts.hero.secondaryButton}
            </a>
          </div>
        </div>
        <div className="hero-panel">
          <p>{texts.hero.industriesTitle}</p>
          <ul>
            {texts.hero.industries.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="services" className="section">
        <div className="section-head">
          <h2>{texts.servicesSection.title}</h2>
          <p>{texts.servicesSection.description}</p>
        </div>
        <div className="grid services">
          {texts.servicesSection.items.map((item) => (
            <article className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="tags">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="cases" className="section">
        <div className="section-head">
          <h2>{texts.casesSection.title}</h2>
          <p>{texts.casesSection.description}</p>
        </div>
        <div className="grid cases">
          {texts.casesSection.items.map((item) => (
            <article className="case" key={item.slug}>
              {item.coverImage && <img className="case-cover" src={item.coverImage} alt={item.name} />}
              <h3>{item.name}</h3>
              <p>{item.value}</p>
              <Link to={linkWithLang(lang, `/cases/${item.slug}`)} className="case-link">
                {texts.common?.viewDetail || 'View Details'}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="section about">
        <div>
          <h2>{texts.aboutSection.title}</h2>
          <p>{texts.aboutSection.description}</p>
        </div>
        <div className="timeline">
          <ul>
            {texts.aboutSection.timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="section contact">
        <div className="section-head">
          <h2>{texts.contactSection.title}</h2>
          <p>{texts.contactSection.description}</p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            value={form.company}
            onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
            type="text"
            placeholder={texts.contactSection.fields.company}
            required
          />
          <input
            value={form.contact}
            onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            type="text"
            placeholder={texts.contactSection.fields.contact}
            required
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            type="tel"
            placeholder={texts.contactSection.fields.phone}
            required
          />
          <textarea
            rows="5"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder={texts.contactSection.fields.message}
            required
          />
          <div className="captcha-row">
            <input
              value={captchaAnswer}
              onChange={(event) => setCaptchaAnswer(event.target.value)}
              placeholder={texts.common?.captchaPlaceholder || 'Captcha'}
              required
            />
            <button type="button" className="btn ghost" onClick={refreshCaptcha}>
              {captcha?.question || '...'}
            </button>
          </div>
          <button type="submit" disabled={submitState === 'submitting'}>
            {submitState === 'submitting'
              ? texts.common?.submitting || 'Submitting...'
              : texts.contactSection.submit}
          </button>
          {submitState === 'success' && <p className="notice success">{texts.contactSection.success}</p>}
          {submitState === 'error' && <p className="notice error">{texts.contactSection.failed}</p>}
        </form>
      </section>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} {texts.siteName} · {texts.footer}
        </p>
      </footer>
    </div>
  )
}

export default HomePage
