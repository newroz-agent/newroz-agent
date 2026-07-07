import { useQuery } from '@tanstack/react-query'

import { getNewrozConfigRecord } from '@/newroz'
import { queryClient, writeCache } from '@/lib/query-client'
import type { NewrozConfigRecord } from '@/types/newroz'

// One shared cache for the whole profile config record (`GET /api/config`).
// Every settings surface (MCP, model, config) reads and writes through this key
// so a save in one shows in the others, and revisiting a tab paints the cache
// instead of blanking on a fresh fetch.
//
// Distinct from session/hooks/use-newroz-config.ts, which is side-effecting —
// it pushes personality/cwd/voice/… into the session stores for live chat.
export const NEWROZ_CONFIG_KEY = ['newroz-config-record'] as const

// staleTime 0 → serve cache instantly, background-revalidate on every mount.
export const useNewrozConfigRecord = () =>
  useQuery({ queryKey: NEWROZ_CONFIG_KEY, queryFn: getNewrozConfigRecord, staleTime: 0 })

export const setNewrozConfigCache = writeCache<NewrozConfigRecord>(NEWROZ_CONFIG_KEY)

export const invalidateNewrozConfig = () => queryClient.invalidateQueries({ queryKey: NEWROZ_CONFIG_KEY })
