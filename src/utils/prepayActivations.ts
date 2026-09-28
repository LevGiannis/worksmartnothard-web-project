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
const DAY_MS = 24 * 60 * 60 * 1000
// A Modify Add On only counts as an activation of a New Prepay when it completed within this
// many days of it — long enough to cover the normal sale-to-activation lag, short enough that a
// later, unrelated top-up on an already-active number (with no new sale that day) isn't credited
// as if it were a fresh activation.
const ACTIVATION_WINDOW_DAYS = 3

/**
 * Prepay activations = one per completed "Modify Add On" that belongs to a "New Prepay"
 * through the same customer registry number (Αριθμός Μητρώου) AND completed within
 * ACTIVATION_WINDOW_DAYS of it.
 *
 * Every New Prepay row keeps its own user/date and gets `connections` = number of completed
 * add-on numbers of its registry credited to it. Modify Add On rows are consumed (not
 * returned); non-prepay rows and other prepay types pass through untouched.
 *
 * If a registry has several New Prepay orders, an add-on is credited to the latest one
 * completed on or before it, within the window. An add-on with no New Prepay of its registry
 * completed in that window (e.g. a top-up on a number activated in an earlier, unrelated sale)
 * is not credited to anyone.
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
    if (!isDone(addOn) || !addOn.registryNo || !addOn.implDate) continue
    const candidates = newsByRegistry.get(addOn.registryNo)
    if (!candidates) continue

    const key = `${addOn.registryNo}|${addOn.msisdn || addOn.requestId}`
    if (seen.has(key)) continue

    const addOnTime = addOn.implDate.getTime()
    const inWindow = candidates.filter(c => {
      const t = c.implDate?.getTime()
      return t != null && t <= addOnTime && addOnTime - t <= ACTIVATION_WINDOW_DAYS * DAY_MS
    })
    if (!inWindow.length) continue

    seen.add(key)
    const target = inWindow.reduce((a, b) => (b.implDate!.getTime() >= a.implDate!.getTime() ? b : a))
    target.connections = (target.connections ?? 0) + 1
  }

  return [...passthrough, ...news]
}
