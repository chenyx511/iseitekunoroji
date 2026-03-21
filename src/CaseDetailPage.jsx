import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import SeoMeta from './SeoMeta'

function homePath(lang) {
  if (lang === 'en') return '/en'
  if (lang === 'zh') return '/zh'
  return '/'
}

function casePath(lang, slug) {
  if (lang === 'en') return `/en/cases/${slug}`
  if (lang === 'zh') return `/zh/cases/${slug}`
  return `/cases/${slug}`
}

function CaseDetailPage({ lang, content }) {
  const { slug } = useParams()
  const texts = content?.[lang]

  useEffect(() => {
    const htmlLang = { ja: 'ja', zh: 'zh-CN', en: 'en' }[lang] || 'en'
    document.documentElement.lang = htmlLang
    return () => { document.documentElement.lang = 'en' }
  }, [lang])

  if (!texts) {
    return <div className="empty-state">Loading...</div>
  }

  const caseItem = texts.casesSection?.items?.find((item) => item.slug === slug)

  if (!caseItem) {
    return (
      <div className="site detail-page">
        <SeoMeta
          title={texts.seo.title}
          description={texts.seo.description}
          urlPath={casePath(lang, slug)}
          image={texts.seo.ogImage}
        />
        <Link className="back-link" to={homePath(lang)}>
          {texts.common?.backHome || 'Back to home'}
        </Link>
        <p className="notice error">{texts.common?.caseNotFound || 'Case not found.'}</p>
      </div>
    )
  }

  const title = `${caseItem.detailTitle} | ${texts.siteName}`
  const description = caseItem.detailSummary || texts.seo.description

  return (
    <div className="site detail-page">
      <SeoMeta
        title={title}
        description={description}
        urlPath={casePath(lang, slug)}
        image={texts.seo.ogImage}
      />

      <Link className="back-link" to={homePath(lang)}>
        {texts.common?.backHome || 'Back to home'}
      </Link>

      <article className="section">
        {caseItem.coverImage && <img className="detail-cover" src={caseItem.coverImage} alt={caseItem.name} />}
        <h1>{caseItem.detailTitle}</h1>
        <p className="case-summary">{caseItem.detailSummary}</p>
        <p>{caseItem.detailBody}</p>
      </article>
    </div>
  )
}

export default CaseDetailPage
