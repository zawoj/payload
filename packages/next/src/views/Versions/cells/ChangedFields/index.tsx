'use client'
import { Pill } from '@payloadcms/ui'
import React, { Fragment } from 'react'

import './index.scss'

const baseClass = 'changed-fields-cell'

type Props = {
  changedFields?: string[]
}

export const ChangedFieldsCell: React.FC<Props> = ({ changedFields }) => {
  if (!changedFields || changedFields.length === 0) {
    return <Fragment>—</Fragment>
  }

  const maxVisible = 3
  const visible = changedFields.slice(0, maxVisible)
  const remaining = changedFields.length - maxVisible

  return (
    <div className={baseClass}>
      {visible.map((field) => (
        <Pill key={field} pillStyle="light" size="small">
          {field}
        </Pill>
      ))}
      {remaining > 0 && (
        <Pill pillStyle="light" size="small">
          +{remaining}
        </Pill>
      )}
    </div>
  )
}
