import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, url }) {
  const siteTitle = title || 'دکتر حسین مرادی | روانشناس بالینی';
  const siteDesc = description || 'نوبت‌دهی آنلاین دکتر حسین مرادی، روانشناس بالینی';
  const siteUrl = url || 'https://moradipsy.ir';
  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDesc} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDesc} />
      <meta property="og:url" content={siteUrl} />
      <link rel="canonical" href={siteUrl} />
    </Helmet>
  );
}
