import type { CollectionConfig } from 'payload'

export const pagesSlug = 'pages'

export const PagesCollection: CollectionConfig = {
  slug: pagesSlug,
  admin: {
    useAsTitle: 'title',
  },
  versions: {
    drafts: {
      autosave: {
        interval: 2000,
      },
    },
    maxPerDoc: 20,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'hero',
              type: 'group',
              fields: [
                {
                  name: 'heading',
                  type: 'text',
                },
                {
                  name: 'subheading',
                  type: 'textarea',
                },
                {
                  name: 'ctaLabel',
                  type: 'text',
                },
                {
                  name: 'ctaLink',
                  type: 'text',
                },
              ],
            },
            {
              name: 'layout',
              type: 'blocks',
              labels: {
                singular: 'Block',
                plural: 'Blocks',
              },
              blocks: [
                {
                  slug: 'richText',
                  labels: { singular: 'Rich Text', plural: 'Rich Texts' },
                  fields: [{ name: 'content', type: 'textarea' }],
                },
                {
                  slug: 'banner',
                  labels: { singular: 'Banner', plural: 'Banners' },
                  fields: [
                    {
                      name: 'style',
                      type: 'select',
                      options: [
                        { label: 'Info', value: 'info' },
                        { label: 'Warning', value: 'warning' },
                        { label: 'Error', value: 'error' },
                      ],
                    },
                    { name: 'message', type: 'text' },
                  ],
                },
                {
                  slug: 'cta',
                  labels: { singular: 'Call to Action', plural: 'CTAs' },
                  fields: [
                    { name: 'heading', type: 'text' },
                    { name: 'description', type: 'textarea' },
                    { name: 'buttonLabel', type: 'text' },
                    { name: 'buttonLink', type: 'text' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Metadata',
          fields: [
            {
              name: 'meta',
              type: 'group',
              fields: [
                {
                  name: 'metaTitle',
                  type: 'text',
                  label: 'Meta Title',
                },
                {
                  name: 'metaDescription',
                  type: 'textarea',
                  label: 'Meta Description',
                },
                {
                  name: 'keywords',
                  type: 'text',
                  label: 'Keywords',
                },
              ],
            },
            {
              name: 'ogTitle',
              type: 'text',
              label: 'OG Title',
            },
          ],
        },
        {
          label: 'Relations',
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              relationTo: 'posts',
              hasMany: true,
              label: 'Related Posts',
            },
            {
              name: 'author',
              type: 'relationship',
              relationTo: 'users',
              label: 'Author',
            },
            {
              name: 'tags',
              type: 'array',
              label: 'Tags',
              fields: [
                { name: 'tag', type: 'text', required: true },
                {
                  name: 'color',
                  type: 'select',
                  options: [
                    { label: 'Red', value: 'red' },
                    { label: 'Blue', value: 'blue' },
                    { label: 'Green', value: 'green' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
