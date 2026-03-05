import type { Payload } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { initPayloadInt } from '../helpers/initPayloadInt.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

let payload: Payload

describe('Versioning Performance', () => {
  beforeAll(async () => {
    process.env.SEED_IN_CONFIG_ONINIT = 'false'
    ;({ payload } = await initPayloadInt(dirname))

    await payload.create({
      collection: 'users',
      data: { email: 'dev@payloadcms.com', password: 'test' },
    })
  })

  afterAll(async () => {
    await payload.destroy()
  })

  describe('Save performance: versioned vs non-versioned', () => {
    it('should measure create performance without versioning', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.create({
          collection: 'no-versions',
          data: { title: `No-version doc ${i}`, description: 'Test' },
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[no-versions] create x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(500)
    })

    it('should measure create performance with simple versioning', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.create({
          collection: 'simple-versioned',
          data: { title: `Simple-versioned doc ${i}`, description: 'Test' },
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[simple-versioned] create x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(500)
    })

    it('should measure create performance with complex versioning + drafts', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.create({
          collection: 'complex-versioned',
          data: {
            title: `Complex doc ${i}`,
            slug: `complex-${i}`,
            hero: { heading: 'Hero', subheading: 'Sub', ctaLabel: 'Click', ctaLink: '/go' },
            content: [
              { blockType: 'text', body: 'Some body text' },
              { blockType: 'cta', heading: 'CTA', buttonLabel: 'Go' },
            ],
            meta: { metaTitle: 'Meta', metaDescription: 'Desc', keywords: 'a,b,c' },
            tags: [
              { tag: 'one', color: 'red' },
              { tag: 'two', color: 'blue' },
            ],
            ogTitle: 'OG Title',
          },
          draft: true,
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[complex-versioned] create x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(1000)
    })
  })

  describe('Update performance: full vs partial payload', () => {
    let docId: number | string

    beforeAll(async () => {
      const doc = await payload.create({
        collection: 'complex-versioned',
        data: {
          title: 'Update Perf Test',
          slug: 'update-perf',
          hero: { heading: 'H', subheading: 'S', ctaLabel: 'C', ctaLink: '/c' },
          content: [
            { blockType: 'text', body: 'Body text content here' },
            { blockType: 'cta', heading: 'CTA heading', buttonLabel: 'Click me' },
          ],
          meta: { metaTitle: 'MT', metaDescription: 'MD', keywords: 'k1,k2' },
          tags: [
            { tag: 'a', color: 'red' },
            { tag: 'b', color: 'blue' },
            { tag: 'c', color: 'green' },
          ],
          ogTitle: 'OG',
        },
        draft: true,
      })
      docId = doc.id
    })

    it('should measure update with full payload (all fields)', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.update({
          collection: 'complex-versioned',
          id: docId,
          data: {
            title: `Full update ${i}`,
            slug: 'update-perf',
            hero: { heading: 'H', subheading: 'S', ctaLabel: 'C', ctaLink: '/c' },
            meta: { metaTitle: 'MT', metaDescription: 'MD', keywords: 'k1,k2' },
            ogTitle: 'OG',
          },
          draft: true,
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[update full payload] x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(1000)
    })

    it('should measure update with partial payload (one field)', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.update({
          collection: 'complex-versioned',
          id: docId,
          data: { title: `Partial update ${i}` },
          draft: true,
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[update partial payload] x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(1000)
    })
  })

  describe('Version accumulation: performance with many versions', () => {
    let docId: number | string

    beforeAll(async () => {
      const doc = await payload.create({
        collection: 'complex-versioned',
        data: { title: 'Many versions doc', slug: 'many-versions' },
        draft: true,
      })
      docId = doc.id
    })

    it('should measure update speed as versions accumulate (10, 20, 30, 40)', async () => {
      const batchResults: { avgMs: number; count: number }[] = []

      for (let batch = 0; batch < 4; batch++) {
        const times: number[] = []

        for (let i = 0; i < 10; i++) {
          const start = performance.now()
          await payload.update({
            collection: 'complex-versioned',
            id: docId,
            data: { title: `Version batch ${batch} iter ${i}` },
            draft: true,
          })
          times.push(performance.now() - start)
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length
        const totalVersions = (batch + 1) * 10 + 1

        batchResults.push({ avgMs: avg, count: totalVersions })
        console.log(
          `[version accumulation] ${totalVersions} versions: avg=${avg.toFixed(1)}ms per save`,
        )
      }

      const degradation = batchResults[3].avgMs / batchResults[0].avgMs

      console.log(
        `[version accumulation] degradation ratio (40v vs 10v): ${degradation.toFixed(2)}x`,
      )
      expect(degradation).toBeLessThan(3)
    })
  })

  describe('Read performance with versions', () => {
    let docId: number | string

    beforeAll(async () => {
      const doc = await payload.create({
        collection: 'complex-versioned',
        data: {
          title: 'Read Perf Doc',
          slug: 'read-perf',
          hero: { heading: 'H', subheading: 'S', ctaLabel: 'C', ctaLink: '/c' },
          content: [{ blockType: 'text', body: 'Some body' }],
          meta: { metaTitle: 'MT', metaDescription: 'MD', keywords: 'k' },
          tags: [{ tag: 'tag1', color: 'red' }],
          ogTitle: 'OG',
        },
        draft: true,
      })
      docId = doc.id

      for (let i = 0; i < 15; i++) {
        await payload.update({
          collection: 'complex-versioned',
          id: docId,
          data: { title: `Read perf version ${i}` },
          draft: true,
        })
      }
    })

    it('should measure findByID performance on versioned document', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.findByID({
          collection: 'complex-versioned',
          id: docId,
          draft: true,
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[findByID versioned] x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(500)
    })

    it('should measure findVersions performance', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.findVersions({
          collection: 'complex-versioned',
          where: { parent: { equals: docId } },
          limit: 10,
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[findVersions] x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(500)
    })

    it('should measure countVersions performance', async () => {
      const times: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.countVersions({
          collection: 'complex-versioned',
          where: { parent: { equals: docId } },
        })
        times.push(performance.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`[countVersions] x20: avg=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms`)
      expect(avg).toBeLessThan(200)
    })
  })

  describe('skipVersioning flag', () => {
    it('should be faster with skipVersioning enabled', async () => {
      const doc = await payload.create({
        collection: 'simple-versioned',
        data: { title: 'Skip test', description: 'Desc' },
      })

      const withVersionTimes: number[] = []
      const skipVersionTimes: number[] = []

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.update({
          collection: 'simple-versioned',
          id: doc.id,
          data: { title: `With version ${i}` },
        })
        withVersionTimes.push(performance.now() - start)
      }

      for (let i = 0; i < 20; i++) {
        const start = performance.now()
        await payload.update({
          collection: 'simple-versioned',
          id: doc.id,
          data: { title: `Skip version ${i}` },
          skipVersioning: true,
        })
        skipVersionTimes.push(performance.now() - start)
      }

      const avgWith = withVersionTimes.reduce((a, b) => a + b, 0) / withVersionTimes.length
      const avgSkip = skipVersionTimes.reduce((a, b) => a + b, 0) / skipVersionTimes.length
      const speedup = avgWith / avgSkip

      console.log(
        `[skipVersioning] with: avg=${avgWith.toFixed(1)}ms | skip: avg=${avgSkip.toFixed(1)}ms | speedup: ${speedup.toFixed(2)}x`,
      )
      expect(avgSkip).toBeLessThan(avgWith)
    })

    it('should not create versions when skipVersioning is true', async () => {
      const doc = await payload.create({
        collection: 'simple-versioned',
        data: { title: 'No version check', description: 'Desc' },
      })

      const beforeCount = (
        await payload.countVersions({
          collection: 'simple-versioned',
          where: { parent: { equals: doc.id } },
        })
      ).totalDocs

      await payload.update({
        collection: 'simple-versioned',
        id: doc.id,
        data: { title: 'Updated without version' },
        skipVersioning: true,
      })

      const afterCount = (
        await payload.countVersions({
          collection: 'simple-versioned',
          where: { parent: { equals: doc.id } },
        })
      ).totalDocs

      expect(afterCount).toBe(beforeCount)
    })
  })

  describe('changedFields computation', () => {
    it('should correctly track changed fields across versions', async () => {
      const doc = await payload.create({
        collection: 'complex-versioned',
        data: {
          title: 'ChangedFields test',
          slug: 'cf-test',
          hero: { heading: 'H', subheading: 'S', ctaLabel: 'C', ctaLink: '/c' },
          meta: { metaTitle: 'MT', metaDescription: 'MD', keywords: 'k' },
          ogTitle: 'OG',
        },
        draft: true,
      })

      await payload.update({
        collection: 'complex-versioned',
        id: doc.id,
        data: { title: 'Changed title only' },
        draft: true,
      })

      await payload.update({
        collection: 'complex-versioned',
        id: doc.id,
        data: { hero: { heading: 'New heading' } },
        draft: true,
      })

      await payload.update({
        collection: 'complex-versioned',
        id: doc.id,
        data: { meta: { metaTitle: 'New MT', keywords: 'new,keys' }, ogTitle: 'New OG' },
        draft: true,
      })

      const versions = await payload.findVersions({
        collection: 'complex-versioned',
        where: { parent: { equals: doc.id } },
        sort: '-updatedAt',
        limit: 10,
      })

      const changedFieldsPerVersion = versions.docs.map((v: any) => v.changedFields || [])

      expect(changedFieldsPerVersion[0]).toEqual(
        expect.arrayContaining(['meta.metaTitle', 'meta.keywords', 'ogTitle']),
      )

      expect(changedFieldsPerVersion[1]).toEqual(expect.arrayContaining(['hero.heading']))

      expect(changedFieldsPerVersion[2]).toEqual(expect.arrayContaining(['title']))
    })
  })
})
