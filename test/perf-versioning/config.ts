import { fileURLToPath } from 'node:url'
import path from 'path'

import { buildConfigWithDefaults } from '../buildConfigWithDefaults.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfigWithDefaults({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: 'simple-versioned',
      versions: { maxPerDoc: 50 },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
    {
      slug: 'complex-versioned',
      versions: {
        drafts: { autosave: { interval: 2000 } },
        maxPerDoc: 50,
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'slug', type: 'text' },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'draft',
          options: ['draft', 'published', 'archived'],
        },
        {
          name: 'hero',
          type: 'group',
          fields: [
            { name: 'heading', type: 'text' },
            { name: 'subheading', type: 'textarea' },
            { name: 'ctaLabel', type: 'text' },
            { name: 'ctaLink', type: 'text' },
          ],
        },
        {
          name: 'content',
          type: 'blocks',
          blocks: [
            {
              slug: 'text',
              fields: [{ name: 'body', type: 'textarea' }],
            },
            {
              slug: 'cta',
              fields: [
                { name: 'heading', type: 'text' },
                { name: 'buttonLabel', type: 'text' },
              ],
            },
          ],
        },
        {
          name: 'meta',
          type: 'group',
          fields: [
            { name: 'metaTitle', type: 'text' },
            { name: 'metaDescription', type: 'textarea' },
            { name: 'keywords', type: 'text' },
          ],
        },
        {
          name: 'tags',
          type: 'array',
          fields: [
            { name: 'tag', type: 'text' },
            { name: 'color', type: 'select', options: ['red', 'blue', 'green'] },
          ],
        },
        { name: 'ogTitle', type: 'text' },
      ],
    },
    {
      slug: 'no-versions',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
  onInit: async (payload) => {
    if (process.env.SEED_IN_CONFIG_ONINIT !== 'false') {
      await payload.create({
        collection: 'users',
        data: { email: 'dev@payloadcms.com', password: 'test' },
      })
    }
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
