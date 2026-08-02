# fix: allow generic wrappers around the Local API select types

Reported on Discord: a user tried to wrap `payload.find` in their own generic repository
function for server-side rendering, and could not get `select` to narrow the return type.

```ts
const projects = (await find({ collection: 'projects', select: { title: true } })).docs
//    ^? wanted: { id: string; title?: string }[]
```

Two separate defects blocked this. Neither breaks a direct `payload.find()` call, which is why
both survived unnoticed.

## Defect 1: the constraint type was never exported

`SelectFromCollectionSlug` is the declared constraint of six public `Payload` methods
(`find`, `findByID`, `create`, `update`, `delete`, `duplicate`), and `SelectFromGlobalSlug` of
two more (`findGlobal`, `updateGlobal`). In the built `dist/index.d.ts` they are imported on
line 10 and used throughout those signatures — but never re-exported.

Consumers could not name the constraint of a public API. The sibling type from the same
module, `DataFromCollectionSlug`, _is_ exported, so this reads as an oversight rather than a
decision.

Also missing: `Globals`, the type of the public `payload.globals` property.

## Defect 2: exporting it would not have been enough

The transform types constrained their select parameter on `SelectType`:

```ts
export type TransformCollectionWithSelect<
  TSlug extends CollectionSlug,
  TSelect extends SelectType, // <- here
> = TSelect extends SelectType
  ? TransformDataWithSelect<DataFromCollectionSlug<TSlug>, TSelect>
  : DataFromCollectionSlug<TSlug>
```

`SelectType` is an index-signature type (`{ [k: string]: … }`). Generated `*Select` types are
**interfaces**, and interfaces get no implicit index signature. So `SelectFromCollectionSlug<TSlug>`
is not assignable to `SelectType`, and forwarding it fails:

```
Type 'SelectFromCollectionSlug<TSlug>' is not assignable to type 'SelectType'.
  Index signature for type 'string' is missing in type 'PostsSelect<false>'.
```

A direct call still works, because an argument written inline (`select: { title: true }`) is
inferred as a _fresh object literal type_, and those **do** get an implicit index signature.
The failure only appears when `TSelect` stays a deferred generic — i.e. exactly when you wrap
the API.

### Why the repo could not see it

Inside `packages/payload`, `PayloadTypes` has no generated types, so `SelectFromCollectionSlug<TSlug>`
degrades to `any` and `findLocal`'s own signature compiles despite the mismatch. The defect is
only observable from a consumer that has generated types.

## The fix

Introduce `SelectConstraint` and use it for **constraint positions only**:

```ts
export type SelectConstraint = Record<string, any>
```

The conditional _checks_ deliberately stay on `SelectType`:

```ts
  TSelect extends SelectConstraint,   // constraint: accepts generated interfaces
> = TSelect extends SelectType        // check: unchanged
```

That check is what discriminates "caller passed a select" from "caller did not" — and it works
**precisely because** generated interfaces fail it. When no `select` is passed, `TSelect` infers
to its constraint (`PostsSelect<false> | PostsSelect<true>`), fails `extends SelectType`, and
falls to the full-document branch.

Widening those checks too breaks 14 existing tests: every no-select call starts taking the
exclude branch and returns only the fields _absent_ from the select interface. A regression test
now pins this (`.type.not.toBeAssignableTo<SelectType>()`).

Narrowing is otherwise unaffected — inline `select` arguments still hit the transform branch.

## Result

The reported pattern now compiles with no workaround:

```ts
import type {
  CollectionSlug,
  PaginatedDocs,
  SelectFromCollectionSlug,
  TransformCollectionWithSelect,
} from 'payload'

export const find = async <
  TSlug extends CollectionSlug,
  TSelect extends SelectFromCollectionSlug<TSlug>,
>(options: {
  collection: TSlug
  select?: TSelect
}): Promise<PaginatedDocs<TransformCollectionWithSelect<TSlug, TSelect>>> => {
  const { payload } = await getPayloadClient()

  return await payload.find({ collection: options.collection, select: options.select })
}

const { docs } = await find({ collection: 'posts', select: { title: true } })
docs[0].title // string
docs[0].content // error: not selected
```

**Caller gotcha (unchanged behaviour, worth documenting):** `const select = { title: true }`
widens to `{ title: boolean }`, and the transform checks `Select[K] extends true`. Use
`satisfies` when hoisting a select into a variable.

## Why the tests missed it

1. **Every existing select test called the API directly with an inline literal.** Fresh object
   literals satisfy `SelectType`, so they narrow fine. No test ever held `TSelect` as a deferred
   generic.
2. **No test imported `SelectFromCollectionSlug` from `'payload'`,** so the missing export was
   invisible. There was no test of the public export surface at all.
3. **The bug is undetectable from inside `packages/payload`** (see above). `test/types` is the
   only place with generated types plus tstyche — which is exactly where the coverage belongs.

## Test coverage added

`test/types/types.spec.ts`, 6 new assertions:

| Test                                                                            | Guards                                                                                 |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SelectFromCollectionSlug satisfies the constraint used by the transform types` | Both halves of the contract: assignable to `SelectConstraint`, **not** to `SelectType` |
| `SelectFromCollectionSlug can constrain a generic wrapper around the Local API` | The reported pattern narrows correctly                                                 |
| `a generic wrapper without a select returns the full document`                  | The no-select fallback                                                                 |
| `public type exports` block                                                     | Fails to compile if any of these types leaves the package root                         |

## Verification

- `pnpm test:types` — **110 passed, 150 assertions** (was 105 / 136)
- Confirmed the new tests fail without the source fix, and pass with it
- `packages/payload` typechecks clean; `sdk`, `graphql`, `drizzle`, `db-mongodb`, `next`, `ui`
  all clean
- No new lint errors
- Type-only change; emitted JavaScript is unchanged

### Not verified

- **Integration tests did not run** — MongoDB was not reachable on port 27018 in this
  environment (`pnpm docker:start` needed). Zero tests executed. The change is type-only, but
  this was not executed and is not being claimed as passing.
- `pnpm build:core` fails on three pre-existing `sloppyRanges does not exist in type
'CronOptions'` errors from croner typings. Identical on a clean tree — unrelated to this
  change.

## Notes for review

- `packages/sdk` has the same shape but **not** the same defect: its `TransformCollectionWithSelect`
  leaves `TSelect` unconstrained. Left untouched.
- Consider whether `SelectConstraint` should be internal rather than exported. It is currently
  public via `export * from './types/index.js'`, and the export-surface test references it.
