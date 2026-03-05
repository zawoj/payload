'use client'
import { Pill, Tooltip } from '@payloadcms/ui'
import React, { Fragment } from 'react'

import './index.scss'

const baseClass = 'changed-fields-cell'

type Props = {
  changedFields?: string[]
}

function formatFieldLabel(path: string): string {
  const segments = path.split('.')
  if (segments.length <= 1) {
    return path
  }
  return segments[segments.length - 1]
}

export const ChangedFieldsCell: React.FC<Props> = ({ changedFields }) => {
  if (!changedFields || changedFields.length === 0) {
    return <Fragment>—</Fragment>
  }

  const maxVisible = 4
  const visible = changedFields.slice(0, maxVisible)
  const remaining = changedFields.length - maxVisible

  return (
    <div className={baseClass}>
      {visible.map((field) => (
        <Pill key={field} pillStyle="light" size="small">
          <span title={field}>{formatFieldLabel(field)}</span>
        </Pill>
      ))}
      {remaining > 0 && (
        <Pill pillStyle="light" size="small">
          <span title={changedFields.slice(maxVisible).join(', ')}>+{remaining}</span>
        </Pill>
      )}
    </div>
  )
}
