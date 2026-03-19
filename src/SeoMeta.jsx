import { Helmet } from 'react-helmet-async'

function SeoMeta({ title, description, urlPath, image }) {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://example.com'
  const canonical = `${siteUrl}${urlPath}`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
    </Helmet>
  )
}

export default SeoMeta
