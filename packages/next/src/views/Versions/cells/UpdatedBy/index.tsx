'use client'
import React, { Fragment } from 'react'

type Props = {
  updatedBy?:
    | {
        email?: string
        id?: number | string
        name?: string
      }
    | number
    | string
}

export const UpdatedByCell: React.FC<Props> = ({ updatedBy }) => {
  if (!updatedBy) {
    return <Fragment>—</Fragment>
  }

  if (typeof updatedBy === 'object') {
    return <Fragment>{updatedBy.email || updatedBy.name || String(updatedBy.id)}</Fragment>
  }

  return <Fragment>{String(updatedBy)}</Fragment>
}
