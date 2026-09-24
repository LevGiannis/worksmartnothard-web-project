export interface PrepayRow {
  category: string
  subCategory?: string
  status: string
  requestId: string
  registryNo?: string
  msisdn?: string
  implDate?: Date | null
  connections?: number
}

const NEW_PREPAY = 'New Prepay'
const MODIFY_ADD_ON = 'Modify Add On'

/**
 * Prepay activations = one per completed "Modify Add On" that belongs to a "New Prepay"
 * through the same customer registry number (Αριθμός Μητρώου).
 *
 * Every New Prepay row keeps its own user/date and gets `connections` = number of completed
 * add-on numbers of its registry. Modify Add On rows are consumed (not returned); non-prepay
 * rows and other prepay types pass through untouched.
 *
 * If a registry has several New Prepay orders, an add-on is credited to the latest New Prepay
 * completed on or before it (or the earliest one when none precedes it).
 * Duplicate add-ons for the same number in a registry are counted once.
 */
export function linkPrepayActivations<T extends PrepayRow>(entries: T[], isDone: (e: T) => boolean): T[] {
  const isNew = (e: T) => e.category === 'prepay' && e.subCategory === NEW_PREPAY
  const isAddOn = (e: T) => e.category === 'prepay' && e.subCategory === MODIFY_ADD_ON

  const passthrough = entries.filter(e => !isNew(e) && !isAddOn(e))
  const news = entries.filter(isNew).map(e => ({ ...e, connections: 0 }))

  const newsByRegistry = new Map<string, T[]>()
  for (const n of news) {
    if (!n.registryNo) continue
    const arr = newsByRegistry.get(n.registryNo)
    if (arr) arr.push(n)
    else newsByRegistry.set(n.registryNo, [n])
  }

  const seen = new Set<string>()
  for (const addOn of entries.filter(isAddOn)) {
    if (!isDone(addOn) || !addOn.registryNo) continue
    const candidates = newsByRegistry.get(addOn.registryNo)
    if (!candidates) continue

    const key = `${addOn.registryNo}|${addOn.msisdn || addOn.requestId}`
    if (seen.has(key)) continue
    seen.add(key)

    const time = (e: T) => e.implDate?.getTime() ?? 0
    const addOnTime = addOn.implDate?.getTime() ?? Infinity
    const preceding = candidates.filter(c => time(c) <= addOnTime)
    const target = preceding.length
      ? preceding.reduce((a, b) => (time(b) >= time(a) ? b : a))
      : candidates.reduce((a, b) => (time(b) < time(a) ? b : a))
    target.connections = (target.connections ?? 0) + 1
  }

  return [...passthrough, ...news]
}
