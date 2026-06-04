const { getData, save } = require('./db')

const DEFAULT_USER = () => ({
  gemas: 50,
  bank: 0,
  xp: 0,
  level: 1,
  pontos: 0,
  wins: 0,
  losses: 0,
  games: 0,
  streak: 0,
  job: 'desempregado',
  last_daily: null,
  last_mine: null,
  mine_today_count: 0,
  mine_today_date: null,
  last_rob: null,
  last_work: null,
  work_today_count: 0,
  work_today_date: null,
  cassino_today_count: 0,
  cassino_today_date: null,
  last_crime: null,
  last_bank_interest: null,
  prison_until: null,
  achievements: {},
  stats: {},
  warnings: 0,
  daily_games: {},
  last_tax_date: null,
  titulo: null,
  insurance_until: null,
  loan: { active: false, amount: 0, total: 0, due: null },
  partner: null,
  relationship_status: 'solteiro',
  last_paquerar: null,
  inventory: { picareta: 0, bond7: 0, vingancagema: 0, escudo: 0 },
  created_at: new Date().toISOString(),
})

function getUser(jid, name) {
  const db = getData()
  if (!db.users[jid]) {
    db.users[jid] = { jid, name: name || jid.split('@')[0], ...DEFAULT_USER() }
    save()
  } else {
    // migrate old users with missing fields
    const defaults = DEFAULT_USER()
    let changed = false
    for (const [k, v] of Object.entries(defaults)) {
      if (db.users[jid][k] === undefined) { db.users[jid][k] = v; changed = true }
    }
    if (name && db.users[jid].name !== name) { db.users[jid].name = name; changed = true }
    if (changed) save()
  }
  return db.users[jid]
}

function updateUser(jid, fields) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  Object.assign(db.users[jid], fields)
  save()
  return db.users[jid]
}

const MAX_LOG = 20

function logTransaction(jid, amount, reason) {
  const db = getData()
  if (!db.users[jid]) return
  if (!db.users[jid].historico) db.users[jid].historico = []
  db.users[jid].historico.unshift({
    amount,
    reason,
    balance: db.users[jid].gemas,
    ts: new Date().toISOString(),
  })
  if (db.users[jid].historico.length > MAX_LOG) {
    db.users[jid].historico = db.users[jid].historico.slice(0, MAX_LOG)
  }
}

function addGemas(jid, amount, reason = '') {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].gemas = Math.max(0, (db.users[jid].gemas || 0) + amount)
  if (reason) logTransaction(jid, +amount, reason)
  save()
}

function removeGemas(jid, amount, reason = '') {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  const actual = Math.min(amount, db.users[jid].gemas || 0)
  db.users[jid].gemas = Math.max(0, (db.users[jid].gemas || 0) - actual)
  if (reason) logTransaction(jid, -actual, reason)
  save()
}

function setGemas(jid, amount) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].gemas = Math.max(0, amount)
  save()
}

function addWin(jid) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].wins = (db.users[jid].wins || 0) + 1
  db.users[jid].games = (db.users[jid].games || 0) + 1
  save()
}

function addLoss(jid) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].losses = (db.users[jid].losses || 0) + 1
  db.users[jid].games = (db.users[jid].games || 0) + 1
  save()
}

function setLastDaily(jid) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].last_daily = new Date().toISOString()
  save()
}

function setLastMine(jid) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].last_mine = new Date().toISOString()
  save()
}

function setLastRob(jid) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].last_rob = new Date().toISOString()
  save()
}

function addPontos(jid, amount) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  db.users[jid].pontos = (db.users[jid].pontos || 0) + amount
  save()
}

function getRankingGemas(limit = 10) {
  const db = getData()
  return Object.values(db.users)
    .sort((a, b) => ((b.gemas || 0) + (b.bank || 0)) - ((a.gemas || 0) + (a.bank || 0)))
    .slice(0, limit)
}

function getRankingPontos(limit = 10) {
  const db = getData()
  return Object.values(db.users)
    .sort((a, b) => (b.pontos || 0) - (a.pontos || 0))
    .slice(0, limit)
}

// keep old name as alias
function getRanking(limit = 10) { return getRankingGemas(limit) }

// Inventory
function hasItem(jid, item) {
  const db = getData()
  const user = db.users[jid]
  if (!user) return false
  return (user.inventory?.[item] || 0) > 0
}

function addItem(jid, item, qty = 1) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  if (!db.users[jid].inventory) db.users[jid].inventory = {}
  db.users[jid].inventory[item] = (db.users[jid].inventory[item] || 0) + qty
  save()
}

function useItem(jid, item) {
  const db = getData()
  if (!db.users[jid]) return false
  const qty = db.users[jid].inventory?.[item] || 0
  if (qty <= 0) return false
  db.users[jid].inventory[item] = qty - 1
  save()
  return true
}

function getInventory(jid) {
  const db = getData()
  return db.users[jid]?.inventory || {}
}

function resetUser(jid) {
  const db = getData()
  if (!db.users[jid]) getUser(jid)
  const name = db.users[jid].name
  db.users[jid] = { jid, name, ...DEFAULT_USER() }
  save()
}

function isInPrison(jid) {
  const db = getData()
  const user = db.users[jid]
  if (!user?.prison_until) return false
  if (new Date(user.prison_until) <= new Date()) {
    db.users[jid].prison_until = null
    save()
    return false
  }
  return true
}

function getPrisonRemaining(jid) {
  const db = getData()
  const user = db.users[jid]
  if (!user?.prison_until) return 0
  return Math.max(0, new Date(user.prison_until).getTime() - Date.now())
}

// Revenge system
function setRevenge(victimJid, robberJid, groupJid) {
  const db = getData()
  if (!db.revenge) db.revenge = {}
  db.revenge[victimJid] = { robberJid, groupJid }
  save()
}

function getRevenge(victimJid) {
  const db = getData()
  return db.revenge?.[victimJid] || null
}

function clearRevenge(victimJid) {
  const db = getData()
  if (db.revenge?.[victimJid]) {
    delete db.revenge[victimJid]
    save()
  }
}

// Relationship system
function setRelationship(jid1, jid2, status) {
  const db = getData()
  if (!db.users[jid1]) getUser(jid1)
  if (!db.users[jid2]) getUser(jid2)
  db.users[jid1].partner = jid2
  db.users[jid1].relationship_status = status
  db.users[jid2].partner = jid1
  db.users[jid2].relationship_status = status
  save()
}

function clearRelationship(jid) {
  const db = getData()
  const user = db.users[jid]
  if (!user) return
  const partnerId = user.partner
  user.partner = null
  user.relationship_status = 'solteiro'
  if (partnerId && db.users[partnerId]) {
    db.users[partnerId].partner = null
    db.users[partnerId].relationship_status = 'solteiro'
  }
  save()
}

function setProposal(targetJid, fromJid, type, groupJid) {
  const db = getData()
  if (!db.proposals) db.proposals = {}
  db.proposals[targetJid] = {
    from: fromJid,
    type,
    groupJid,
    expires: new Date(Date.now() + 60_000).toISOString(),
  }
  save()
}

function getProposal(targetJid) {
  const db = getData()
  const p = db.proposals?.[targetJid]
  if (!p) return null
  if (new Date(p.expires) < new Date()) {
    delete db.proposals[targetJid]
    save()
    return null
  }
  return p
}

function clearProposal(targetJid) {
  const db = getData()
  if (db.proposals?.[targetJid]) {
    delete db.proposals[targetJid]
    save()
  }
}

// Active games
function getActiveGame(groupJid, gameType) {
  const db = getData()
  const key = `${groupJid}__${gameType}`
  return db.active_games[key] || null
}

function saveActiveGame(groupJid, gameType, playerJid, state) {
  const db = getData()
  const key = `${groupJid}__${gameType}`
  db.active_games[key] = {
    group_jid: groupJid,
    game_type: gameType,
    player_jid: playerJid,
    state,
    created_at: new Date().toISOString(),
  }
  save()
}

function deleteActiveGame(groupJid, gameType) {
  const db = getData()
  const key = `${groupJid}__${gameType}`
  delete db.active_games[key]
  save()
}

module.exports = {
  getUser, updateUser, addGemas, removeGemas, setGemas, logTransaction,
  addWin, addLoss, addPontos, setLastDaily, setLastMine, setLastRob,
  getRanking, getRankingGemas, getRankingPontos,
  resetUser, isInPrison, getPrisonRemaining,
  hasItem, addItem, useItem, getInventory,
  setRelationship, clearRelationship, setProposal, getProposal, clearProposal,
  setRevenge, getRevenge, clearRevenge,
  getActiveGame, saveActiveGame, deleteActiveGame,
  bankHeist,
}

function bankHeist(criminalJid, targetAmount) {
  const db = getData()
  const entries = Object.entries(db.users)
    .filter(([jid, u]) => jid !== criminalJid && (u.bank || 0) > 0)

  if (!entries.length) return { stolen: 0, victims: 0, sharePerPerson: 0 }

  const share = Math.ceil(targetAmount / entries.length)
  let stolen = 0
  for (const [jid, u] of entries) {
    const take = Math.min(share, u.bank || 0)
    if (take > 0) {
      db.users[jid].bank -= take
      stolen += take
    }
  }
  db.users[criminalJid].gemas = (db.users[criminalJid].gemas || 0) + stolen
  save()
  return { stolen, victims: entries.length, sharePerPerson: share }
}
