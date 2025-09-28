import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Create an in-memory MongoDB instance for Storybook
let mongoServer: MongoMemoryServer

const getMongoUri = async () => {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create()
  }
  return mongoServer.getUri()
}

export const config = {
  admin: {
    user: 'users',
    autoRefresh: false,
    routes: {
      account: '/account',
      browseByFolder: '/browse-by-folder',
      createFirstUser: '/create-first-user',
      forgot: '/forgot',
      inactivity: '/logout-inactivity',
      login: '/login',
      logout: '/logout',
      reset: '/reset',
      unauthorized: '/unauthorized',
    },
  },
  blocks: [],
  collections: [
    {
      slug: 'posts',
      labels: {
        singular: 'Post',
        plural: 'Posts',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
        },
      ],
      admin: {
        useAsTitle: 'title',
      },
    },
    {
      slug: 'categories',
      labels: {
        singular: 'Category',
        plural: 'Categories',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        useAsTitle: 'name',
      },
    },
  ],
  globals: [],
  routes: {
    admin: '/admin',
    api: '/api',
    graphQL: '/graphql',
    graphQLPlayground: '/graphql-playground',
  },
  serverURL: 'http://localhost:3000',
  db: mongooseAdapter({
    url: await getMongoUri(),
  }),
  secret: 'storybook',
}
