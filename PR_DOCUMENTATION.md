# Fix: Relationship field tenant filtering not working for array relationTo in nested fields

## PR Title

`fix(plugin-multi-tenant): relationship field tenant filtering not working for array relationTo in nested fields and allow global collections in relationships`

## Problem Description

Relationship fields with `relationTo` as an array (polymorphic relationships) inside nested field types (`group`, `array`, `tabs`, etc.) were not properly filtering by tenant. The plugin would show all documents from all tenants instead of filtering to only the current tenant's documents.

### Root Cause

The issue was in the `addFilterOptionsToFields` function in `packages/plugin-multi-tenant/src/utilities/addFilterOptionsToFields.ts`. For relationship fields with `relationTo` as an array, the code was calling `addFilter` multiple times in a loop (lines 61-77), once for each tenant-enabled collection in the array. This caused the `filterOptions` function to be wrapped multiple times incorrectly, which could lead to the tenant filtering logic not being applied properly.

### Example of the Problem

```typescript
// This relationship field inside a group would not filter by tenant
{
  name: 'custom404',
  type: 'group',
  fields: [
    {
      name: 'page',
      type: 'relationship',
      relationTo: ['pages', 'posts', 'categories'], // Array of tenant-enabled collections
      // Tenant filtering would not work correctly - would show all documents from all tenants
    },
  ],
}

// Mixed collections scenario
{
  name: 'content',
  type: 'relationship',
  relationTo: ['pages', 'media'], // pages is tenant-enabled, media is not
  // Should filter pages by tenant, but show all media items
  // With the bug, tenant filtering wouldn't work properly for pages
}
```

## Solution

The fix ensures that `addFilter` is called only once for relationship fields with array `relationTo`, even when multiple collections in the array are tenant-enabled. The logic now:

1. Combines both regular tenant-enabled collections and global collections (`isGlobal: true`) into a single list for filtering
2. Checks if any collection in the `relationTo` array is tenant-enabled (regular or global)
3. If at least one collection is tenant-enabled, calls `addFilter` exactly once with the combined list

Additionally, the fix removes the previous restriction that prevented global collections from being used in relationship fields. Global collections now work correctly in relationships and are filtered by tenant just like regular tenant-enabled collections.

**Note for Payload Team**: This change removes the error that was previously thrown when global collections (`isGlobal: true`) were used in relationship fields. Before merging, please confirm if there was a specific reason why global collections were blocked from being used in relationships. The current implementation treats them the same as regular tenant-enabled collections (they both have tenant fields and are filtered by tenant), so this change seems reasonable, but we'd like to understand the original rationale for the restriction.

This ensures proper wrapping of the `filterOptions` function and correct tenant filtering behavior for polymorphic relationship fields in nested contexts.

The solution correctly handles mixed scenarios where the `relationTo` array contains both tenant-enabled and non-tenant collections:

- Tenant-enabled collections are filtered by the current tenant
- Non-tenant collections show all items (no filtering)
- The `addFilter` function intelligently checks each collection at runtime and applies tenant filtering only where appropriate

### Code Changes

The fix modifies the logic in `addFilterOptionsToFields` to:

- Separate validation (checking for global collections) from filter application
- Apply `addFilter` only once when any collection in the `relationTo` array is tenant-enabled
- Maintain backward compatibility with single string `relationTo` values

### Handling Mixed Collections

The fix correctly handles mixed arrays where some collections are tenant-enabled and others are not:

- **Tenant-enabled collections**: Filtered by the current tenant
- **Global tenant collections** (`isGlobal: true`): Filtered by the current tenant (each tenant has one document)
- **Non-tenant collections**: Show all items (no tenant filtering applied)

The `addFilter` function's logic ensures that when `filterOptions` is called at runtime:

- If `args.relationTo` is a tenant-enabled collection (regular or global) → applies tenant filtering
- If `args.relationTo` is NOT a tenant-enabled collection → returns the original filter (typically `true`, showing all items)

**Examples**:

```typescript
// Mixed tenant-enabled and non-tenant collections
{
  name: 'mixedRelationship',
  type: 'relationship',
  relationTo: ['pages', 'media'], // pages is tenant-enabled, media is not
  // Result: pages filtered by tenant, media shows all items
}

// Including global collections
{
  name: 'navigationRelationship',
  type: 'relationship',
  relationTo: ['pages', 'navigation'], // pages is tenant-enabled, navigation is global (isGlobal: true)
  // Result: both filtered by tenant (navigation has unique tenant field, so shows the one document for current tenant)
}
```

### Testing

The existing test suite should continue to pass. This fix specifically addresses:

- Relationship fields with array `relationTo` inside `group` fields
- Relationship fields with array `relationTo` inside `array` fields
- Relationship fields with array `relationTo` inside `tabs` fields
- Relationship fields with array `relationTo` inside blocks

The `addFilter` function already handles polymorphic relationships correctly by checking `args.relationTo` (which contains a single collection slug when called from `resolveFilterOptions`) against the tenant-enabled collections list.

### How It Works

When a relationship field with array `relationTo` is encountered:

1. **Setup Phase**: The code combines both regular tenant-enabled collections and global collections into a single list for filtering purposes.

2. **Filter Application Phase**: Instead of calling `addFilter` multiple times (once per tenant-enabled collection), it now:

   - Checks if ANY collection in the array is tenant-enabled using `.some()`
   - Calls `addFilter` exactly once if at least one collection is tenant-enabled

3. **Runtime Behavior**: When `filterOptions` is called at runtime:
   - `resolveFilterOptions` (from Payload UI) calls the `filterOptions` function for each collection in the array separately
   - Each call receives `args.relationTo` as a single collection slug
   - The wrapped `filterOptions` function checks if that specific collection is tenant-enabled (regular or global)
   - If tenant-enabled (regular or global) → applies tenant filtering (shows only documents from current tenant)
   - If NOT tenant-enabled → returns `originalFilterResult` (typically `true`, showing all documents)

This ensures that tenant filtering works correctly for all collections in polymorphic relationships while avoiding multiple unnecessary function wrappings.

## Questions for Payload Team

### Global Collections in Relationships

This PR removes the restriction that prevented global collections (`isGlobal: true`) from being used in relationship fields. The previous code would throw an error:

```typescript
throw new Error(
  `The collection ${relationTo} is a global collection and cannot be related to a tenant enabled collection.`,
)
```

**Question**: Was there a specific reason why global collections were blocked from being used in relationship fields?

Global collections have:

- Tenant field with `unique: true` (each tenant has exactly one document)
- Tenant-based filtering via `baseFilter`
- Same filtering mechanism as regular tenant-enabled collections

The current implementation treats global collections the same way as regular tenant-enabled collections for filtering purposes, which seems logical. However, we'd like to understand if there was a design decision or edge case that led to the original restriction before we remove it completely.

If there's a valid reason to maintain the restriction, we can revert that part of the change and keep it only for the array `relationTo` fix.
