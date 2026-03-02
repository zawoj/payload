import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fileURLToPath } from 'node:url'
import path from 'path'

import { buildConfigWithDefaults } from '../buildConfigWithDefaults.js'
import { devUser } from '../credentials.js'
import { MediaCollection } from './collections/Media/index.js'
import { PagesCollection, pagesSlug } from './collections/Pages/index.js'
import { PostsCollection, postsSlug } from './collections/Posts/index.js'
import { MenuGlobal } from './globals/Menu/index.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfigWithDefaults({
  // ...extend config here
  collections: [PostsCollection, PagesCollection, MediaCollection],
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  editor: lexicalEditor({}),
  globals: [
    // ...add more globals here
    MenuGlobal,
  ],
  onInit: async (payload) => {
    await payload.create({
      collection: 'users',
      data: {
        email: devUser.email,
        password: devUser.password,
      },
    })

    const post = await payload.create({
      collection: postsSlug,
      data: {
        title: 'example post',
      },
    })

    await payload.create({
      collection: pagesSlug,
      data: {
        title: 'Home Page',
        slug: 'home',
        status: 'published',
        hero: {
          heading: 'Welcome to our site',
          subheading: 'This is the hero section of the home page',
          ctaLabel: 'Get Started',
          ctaLink: '/getting-started',
        },
        layout: [
          {
            blockType: 'richText',
            content:
              'This is the main body text of the home page. It contains important information about our product.',
          },
          {
            blockType: 'banner',
            style: 'info',
            message: 'Check out our latest features!',
          },
          {
            blockType: 'cta',
            heading: 'Ready to begin?',
            description: 'Sign up today and get started for free.',
            buttonLabel: 'Sign Up',
            buttonLink: '/signup',
          },
        ],
        meta: {
          metaTitle: 'Home | My Website',
          metaDescription: 'Welcome to our website - the best place for everything.',
          keywords: 'home, website, landing page',
        },
        ogTitle: 'Home | My Website',
        relatedPosts: [post.id],
        tags: [
          { tag: 'featured', color: 'red' },
          { tag: 'homepage', color: 'blue' },
          { tag: 'landing', color: 'green' },
        ],
      },
    })
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
