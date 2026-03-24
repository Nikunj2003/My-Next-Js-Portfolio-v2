import type { MetadataRoute } from 'next'
import { canonicalPages } from '@/lib/seo/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return canonicalPages.map((url, index) => ({
    url,
    lastModified: new Date(),
    changeFrequency: index === 0 ? 'weekly' : 'monthly',
    priority: index === 0 ? 1 : 0.7,
  }))
}
