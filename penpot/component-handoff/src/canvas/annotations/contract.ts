import {
  CONTRACT_INDEX_KEY,
  CONTRACT_NAMESPACE,
  CONTRACT_SCHEMA,
  DEFAULT_CONTRACT_SETTINGS,
  contractKey,
} from '../../app/types/annotations'
import { docName } from './views/name'
import { resolveTarget, safe } from './target'
import { makeRefCtx } from './refs'
import { readOptions } from './options'
import { buildMerged } from './merged'
import { invalidate, readPhase, markSelfWrite } from './memo'
import { currentPage, findExistingAnywhere } from './layer'
import { collectEntries } from './groups'
import { fingerprintOf } from './fingerprint'
import { KEYS } from './constants'
import { analysisFor, expandTokens } from './analysis'
import type { Shape } from '@penpot/plugin-types'
import type {
  AnnotationRefusedData,
  ContractLoadedData,
  ContractSettings,
  ContractStatus,
  ContractSummary,
  ContractsUpdatedData,
  DocTarget,
  RefusalReason,
  UpdateContractsData,
} from '../../app/types/annotations'
import type { Resolved } from './target'

/** Strings only, parsed in try/catch; written only when the value changes, or the contentsave it triggers would loop. */

const NS = CONTRACT_NAMESPACE

interface IndexEntry {
  key: string
  name: string
  page: string
  status: 'current' | 'outdated'
  target: DocTarget
  targetId: string
  generatedAt: number
  summary: ContractSummary
}

const file = () => {
  const f = penpot.currentFile
  if (!f) throw new Error('No current file')
  return f
}

const setIfChanged = (key: string, value: string): boolean => {
  if (file().getSharedPluginData(NS, key) === value) return false
  file().setSharedPluginData(NS, key, value)
  markSelfWrite()
  return true
}

const readIndex = (): Array<IndexEntry> => {
  try {
    const parsed = JSON.parse(file().getSharedPluginData(NS, CONTRACT_INDEX_KEY) || '[]')
    return Array.isArray(parsed)
      ? parsed.filter((e) => e && typeof e.key === 'string')
      : []
  } catch {
    return []
  }
}

const writeIndex = (list: Array<IndexEntry>): void => {
  const sorted = [...list].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0
  )
  setIfChanged(
    CONTRACT_INDEX_KEY,
    JSON.stringify(
      sorted.map((e) => ({
        key: e.key,
        name: e.name,
        page: e.page,
        status: e.status,
        target: e.target,
        targetId: e.targetId,
        generatedAt: e.generatedAt,
        summary: e.summary,
      }))
    )
  )
}

interface Built {
  key: string
  name: string
  target: DocTarget
  targetId: string
  json: string
  summary: ContractSummary
  generatedAt: number
}

const build = (res: Resolved): Built => {
  penpot.flags.naturalChildOrdering = true
  const isFamily = res.target === 'FAMILY' && res.variants !== null
  const analysis = analysisFor(res, isFamily, null, 'FAMILY_ONLY')
  const { entries, order } = analysis
  const name = docName(res, isFamily)

  // Part numbers come from the last generated documentation; none for per-structure grouping.
  const numbers = new Map<string, number>()
  const doc = findExistingAnywhere('DOCUMENTATION', [res.root.id])
  if (doc) {
    const o = readOptions(doc.getPluginData(KEYS.options))
    if (!isFamily || o.grouping === 'MERGED') {
      const docEntries = collectEntries(res, isFamily, isFamily ? o.variantFilter : null)
      if (docEntries.length > 0) {
        const model =
          o.depth === 'ALL' && docEntries.length === entries.length
            ? analysis.model
            : readPhase(() => buildMerged(docEntries, o.depth))
        for (const p of model.parts) if (p.n > 0) numbers.set(p.key, p.n)
      }
    }
  }

  const generatedAt = Date.now()
  const contract = {
    schema: CONTRACT_SCHEMA,
    component: {
      id: res.root.id,
      name,
      kind: isFamily ? 'family' : 'component',
      library: res.comp?.path ?? '',
    },
    status: 'current',
    generatedAt: new Date(generatedAt).toISOString(),
    fingerprint: fingerprintOf(res.root),
    props: Object.fromEntries(order.map((o) => [o.name, o.values])),
    parts: analysis.parts.map((p) => {
      const n = numbers.get(p.mergedKey)
      return {
        path: p.path,
        ...(n !== undefined ? { n } : {}),
        type: p.type,
        in: p.in,
      }
    }),
    rules: analysis.rules,
    exceptions: analysis.exceptions,
    tokens: analysis.tokens,
  }
  return {
    key: contractKey(res.root.id),
    name,
    target: isFamily ? 'FAMILY' : 'COMPONENT',
    targetId: res.root.id,
    json: JSON.stringify(contract),
    summary: analysis.summary,
    generatedAt,
  }
}

const store = (b: Built): boolean => {
  const index = readIndex()
  const created = !index.some((e) => e.key === b.key)
  setIfChanged(b.key, b.json)
  writeIndex([
    ...index.filter((e) => e.key !== b.key),
    {
      key: b.key,
      name: b.name,
      page: currentPage().id,
      status: 'current',
      target: b.target,
      targetId: b.targetId,
      generatedAt: b.generatedAt,
      summary: b.summary,
    },
  ])
  return created
}

type Refused = { refused: AnnotationRefusedData }
const refuse = (reason: RefusalReason): Refused => ({
  refused: { kind: 'CONTRACT', reason },
})

/** Spec: one generation, two readers. Call right after the documentation is drawn. */
export const writeContract = (res: Resolved): ContractSummary => {
  const built = build(res)
  store(built)
  return built.summary
}

export const getContract = (
  key: string
): { loaded: ContractLoadedData } | Refused => {
  const raw = file().getSharedPluginData(NS, String(key ?? ''))
  if (!raw) return refuse('NO_CONTRACT')
  let json = raw
  try {
    json = JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    /* hand the raw text over */
  }
  return { loaded: { key, json } }
}

export const removeContract = (
  key: string
): { updated: ContractsUpdatedData } | Refused => {
  const index = readIndex()
  const known =
    index.some((e) => e.key === key) || Boolean(file().getSharedPluginData(NS, key))
  if (!known || key === CONTRACT_INDEX_KEY) return refuse('NO_CONTRACT')
  setIfChanged(key, '')
  writeIndex(index.filter((e) => e.key !== key))
  return { updated: { updated: 0, removed: 1 } }
}

export const collectContractStatuses = (): Array<ContractStatus> => {
  const page = currentPage()
  return readIndex()
    .filter((e) => e.page === page.id)
    .map((e) => {
      const missing = !safe(() => page.getShapeById(e.targetId))
      return {
        key: e.key,
        targetId: e.targetId,
        name: e.name,
        target: e.target === 'FAMILY' ? 'FAMILY' : 'COMPONENT',
        outdated: e.status === 'outdated' || missing,
        missing,
        generatedAt: e.generatedAt || 0,
        summary: e.summary ?? { props: 0, rules: 0, tokenizedShare: 1, exceptions: 0 },
      }
    })
}

const setStatus = (entry: IndexEntry, status: 'current' | 'outdated'): void => {
  try {
    const stored = JSON.parse(file().getSharedPluginData(NS, entry.key) || 'null')
    if (stored && typeof stored === 'object') {
      stored.status = status
      setIfChanged(entry.key, JSON.stringify(stored))
    }
  } catch {
    /* unreadable contract: leave it */
  }
  const index = readIndex()
  writeIndex(index.map((e) => (e.key === entry.key ? { ...e, status } : e)))
}

/** Flagging is the only write made on the designer's behalf, unless auto-update is on. */
export const refreshContracts = (): void => {
  const page = currentPage()
  let index = readIndex()
  if (index.length === 0) return
  penpot.flags.naturalChildOrdering = true

  // A target moved to another page: the entry follows it instead of being reported missing.
  const pageOf = (id: string): string | null => {
    if (safe(() => page.getShapeById(id))) return page.id
    for (const p of safe(() => file().pages) ?? [])
      if (p.id !== page.id && safe(() => p.getShapeById(id))) return p.id
    return null
  }
  const moved = index.flatMap((e) => {
    const onThisPage = Boolean(safe(() => page.getShapeById(e.targetId)))
    if (e.page === page.id && !onThisPage) {
      const found = pageOf(e.targetId)
      return found && found !== e.page ? [{ ...e, page: found }] : []
    }
    return e.page !== page.id && onThisPage ? [{ ...e, page: page.id }] : []
  })
  if (moved.length > 0) {
    writeIndex(index.map((e) => moved.find((m) => m.key === e.key) ?? e))
    index = readIndex()
  }

  const entries = index.filter((e) => e.page === page.id)
  if (entries.length === 0) return
  const settings = loadContractSettings()
  const refs = makeRefCtx()
  for (const entry of entries) 
    try {
      const target = safe(() => page.getShapeById(entry.targetId))
      if (!target) {
        // Reported missing + outdated; never removed automatically.
        if (entry.status !== 'outdated') setStatus(entry, 'outdated')
        continue
      }
      let stored: { fingerprint?: string; tokens?: Record<string, unknown> } = {}
      try {
        stored = JSON.parse(file().getSharedPluginData(NS, entry.key) || '{}') ?? {}
      } catch {
        /* treated as changed */
      }
      // Current only if the tokens it embeds are unchanged too.
      const tokens = stored.tokens && typeof stored.tokens === 'object' ? stored.tokens : {}
      const fresh =
        fingerprintOf(target) === (stored.fingerprint ?? '') &&
        JSON.stringify(expandTokens(refs, Object.keys(tokens))) === JSON.stringify(tokens)
      if (fresh) {
        if (entry.status !== 'current') setStatus(entry, 'current')
      } else if (settings.autoUpdate && rebuild(entry, target)) {
        /* rewritten, now current */
      } else if (entry.status !== 'outdated') setStatus(entry, 'outdated')
    } catch (error) {
      console.error('[component-handoff] contract refresh failed', error)
    }
}

const rebuild = (entry: IndexEntry, target: Shape): boolean => {
  const res = resolveTarget(target, entry.target === 'FAMILY' ? 'FAMILY' : 'COMPONENT')
  if (typeof res === 'string') return false
  store(build(res))
  return true
}

export const updateContracts = (
  data: UpdateContractsData
): { updated: ContractsUpdatedData } | Refused => {
  const statuses = collectContractStatuses()
  invalidate()
  const wanted =
    data.keys === 'OUTDATED'
      ? statuses.filter((s) => s.outdated && !s.missing)
      : statuses.filter((s) => Array.isArray(data.keys) && data.keys.includes(s.key))
  if (wanted.length === 0) return refuse('NOTHING_TO_UPDATE')
  const page = currentPage()
  const index = readIndex()
  let updated = 0
  for (const s of wanted) {
    const target = s.missing ? null : safe(() => page.getShapeById(s.targetId))
    const entry = index.find((e) => e.key === s.key)
    if (target && entry && rebuild(entry, target)) updated++
  }
  return { updated: { updated, removed: 0 } }
}

export const loadContractSettings = (): ContractSettings => {
  try {
    const raw = penpot.currentFile?.getPluginData(KEYS.contractSettings)
    const o = raw ? JSON.parse(raw) : {}
    return { autoUpdate: o?.autoUpdate === true }
  } catch {
    return { ...DEFAULT_CONTRACT_SETTINGS }
  }
}

export const saveContractSettings = (raw: unknown): ContractSettings => {
  const clean: ContractSettings = {
    autoUpdate: (raw as { autoUpdate?: unknown } | null)?.autoUpdate === true,
  }
  penpot.currentFile?.setPluginData(KEYS.contractSettings, JSON.stringify(clean))
  return clean
}
