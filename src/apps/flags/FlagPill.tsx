import { Badge, Tooltip } from '@fluentui/react-components'
import type { BadgeProps } from '@fluentui/react-components'
import type { EnvironmentPill, PillTone } from './flagUtils'

const toneToColor: Record<PillTone, NonNullable<BadgeProps['color']>> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  informative: 'informative',
  subtle: 'subtle',
}

export function FlagPill({ pill }: { pill: EnvironmentPill }) {
  return (
    <Tooltip content={pill.detail} relationship="description" withArrow>
      <Badge
        className="flags-pill"
        appearance="tint"
        color={toneToColor[pill.tone]}
        shape="rounded"
      >
        {pill.label}
      </Badge>
    </Tooltip>
  )
}
