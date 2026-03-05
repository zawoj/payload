import { sanitizeID } from '@payloadcms/ui/shared'
import {
  combineQueries,
  extractAccessFromPermission,
  type Payload,
  type SanitizedCollectionConfig,
  type SanitizedDocumentPermissions,
  type SanitizedGlobalConfig,
  type TypedUser,
} from 'payload'
import { hasAutosaveEnabled, hasDraftsEnabled } from 'payload/shared'

type Args = {
  collectionConfig?: SanitizedCollectionConfig
  /**
   * Optional - performance optimization.
   * If a document has been fetched before fetching versions, pass it here.
   * If this document is set to published, we can skip the query to find out if a published document exists,
   * as the passed in document is proof of its existence.
   */
  doc?: Record<string, any>
  docPermissions: SanitizedDocumentPermissions
  globalConfig?: SanitizedGlobalConfig
  id?: number | string
  locale?: string
  payload: Payload
  user: TypedUser
}

type Result = Promise<{
  hasPublishedDoc: boolean
  mostRecentVersionIsAutosaved: boolean
  unpublishedVersionCount: number
  versionCount: number
}>

export const getVersions = async ({
  id: idArg,
  collectionConfig,
  doc,
  docPermissions,
  globalConfig,
  locale,
  payload,
  user,
}: Args): Result => {
  const id = sanitizeID(idArg)
  let publishedDoc
  let hasPublishedDoc = false
  let mostRecentVersionIsAutosaved = false
  let unpublishedVersionCount = 0
  let versionCount = 0

  const entityConfig = collectionConfig || globalConfig
  const versionsConfig = entityConfig?.versions

  const shouldFetchVersions = Boolean(versionsConfig && docPermissions?.readVersions)

  if (!shouldFetchVersions) {
    const hasPublishedDoc = doc?._status !== 'draft'

    return {
      hasPublishedDoc,
      mostRecentVersionIsAutosaved,
      unpublishedVersionCount,
      versionCount,
    }
  }

  if (collectionConfig) {
    if (!id) {
      return {
        hasPublishedDoc,
        mostRecentVersionIsAutosaved,
        unpublishedVersionCount,
        versionCount,
      }
    }

    const parentWhere = combineQueries(
      { and: [{ parent: { equals: id } }] },
      extractAccessFromPermission(docPermissions.readVersions),
    )

    if (hasDraftsEnabled(collectionConfig)) {
      // Phase 1: Run published doc check + autosave check + total count in parallel.
      // These are independent queries that don't depend on each other.
      const publishedDocPromise =
        doc?._status === 'published'
          ? Promise.resolve(doc)
          : payload
              .find({
                collection: collectionConfig.slug,
                depth: 0,
                limit: 1,
                locale: locale || undefined,
                pagination: false,
                select: { updatedAt: true },
                user,
                where: {
                  and: [
                    { or: [{ _status: { equals: 'published' } }, { _status: { exists: false } }] },
                    { id: { equals: id } },
                  ],
                },
              })
              .then((res) => res?.docs?.[0])

      const autosavePromise = hasAutosaveEnabled(collectionConfig)
        ? payload.findVersions({
            collection: collectionConfig.slug,
            depth: 0,
            limit: 1,
            select: { autosave: true },
            user,
            where: parentWhere,
          })
        : Promise.resolve(null)

      const totalCountPromise = payload.countVersions({
        collection: collectionConfig.slug,
        depth: 0,
        user,
        where: parentWhere,
      })

      const [publishedDocResult, autosaveResult, totalCountResult] = await Promise.all([
        publishedDocPromise,
        autosavePromise,
        totalCountPromise,
      ])

      publishedDoc = publishedDocResult
      if (publishedDoc) {
        hasPublishedDoc = true
      }

      if (
        autosaveResult?.docs?.[0] &&
        'autosave' in autosaveResult.docs[0] &&
        autosaveResult.docs[0].autosave
      ) {
        mostRecentVersionIsAutosaved = true
      }

      versionCount = totalCountResult.totalDocs

      // Phase 2: Unpublished count depends on publishedDoc.updatedAt
      if (publishedDoc?.updatedAt) {
        ;({ totalDocs: unpublishedVersionCount } = await payload.countVersions({
          collection: collectionConfig.slug,
          user,
          where: combineQueries(
            {
              and: [
                { parent: { equals: id } },
                { 'version._status': { equals: 'draft' } },
                { updatedAt: { greater_than: publishedDoc.updatedAt } },
              ],
            },
            extractAccessFromPermission(docPermissions.readVersions),
          ),
        }))
      }
    } else {
      ;({ totalDocs: versionCount } = await payload.countVersions({
        collection: collectionConfig.slug,
        depth: 0,
        user,
        where: parentWhere,
      }))
    }
  }

  if (globalConfig) {
    if (hasDraftsEnabled(globalConfig)) {
      const publishedDocPromise =
        doc?._status === 'published'
          ? Promise.resolve(doc)
          : payload.findGlobal({
              slug: globalConfig.slug,
              depth: 0,
              locale,
              select: { updatedAt: true },
              user,
            })

      const autosavePromise = hasAutosaveEnabled(globalConfig)
        ? payload.findGlobalVersions({
            slug: globalConfig.slug,
            limit: 1,
            select: { autosave: true },
            user,
          })
        : Promise.resolve(null)

      const totalCountPromise = payload.countGlobalVersions({
        depth: 0,
        global: globalConfig.slug,
        user,
      })

      const [publishedDocResult, autosaveResult, totalCountResult] = await Promise.all([
        publishedDocPromise,
        autosavePromise,
        totalCountPromise,
      ])

      publishedDoc = publishedDocResult
      if (publishedDoc?._status === 'published') {
        hasPublishedDoc = true
      }

      if (
        autosaveResult?.docs?.[0] &&
        'autosave' in autosaveResult.docs[0] &&
        autosaveResult.docs[0].autosave
      ) {
        mostRecentVersionIsAutosaved = true
      }

      versionCount = totalCountResult.totalDocs

      if (publishedDoc?.updatedAt) {
        ;({ totalDocs: unpublishedVersionCount } = await payload.countGlobalVersions({
          depth: 0,
          global: globalConfig.slug,
          user,
          where: combineQueries(
            {
              and: [
                { 'version._status': { equals: 'draft' } },
                { updatedAt: { greater_than: publishedDoc.updatedAt } },
              ],
            },
            extractAccessFromPermission(docPermissions.readVersions),
          ),
        }))
      }
    } else {
      ;({ totalDocs: versionCount } = await payload.countGlobalVersions({
        depth: 0,
        global: globalConfig.slug,
        user,
      }))
    }
  }

  return {
    hasPublishedDoc,
    mostRecentVersionIsAutosaved,
    unpublishedVersionCount,
    versionCount,
  }
}
