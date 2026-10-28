import { useState } from 'react'
import { Outlet } from 'react-router'
import AiChatWidget from '@/components/AiChatWidget'

export interface DistributorOutletContext {
  setBatchContext: (ctx: { batchId?: number | null; batchCode?: string | null }) => void
}

/**
 * Wraps all Distributor pages with the AI Chat Widget.
 * The widget floats over every distributor page as a FAB.
 */
export default function DistributorLayout() {
  const [batchContext, setBatchContext] = useState<{ batchId?: number | null; batchCode?: string | null }>({})

  return (
    <>
      <Outlet context={{ setBatchContext } satisfies DistributorOutletContext} />
      <AiChatWidget
        batchContextId={batchContext.batchId}
        batchContextCode={batchContext.batchCode}
      />
    </>
  )
}
