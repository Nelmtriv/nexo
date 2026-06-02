const fs = require('fs')
const path = require('path')

const dataDir = path.join(__dirname, '..', '..', 'data')
const DB_FILE = path.join(dataDir, 'bot.json')

const defaultData = { users: {}, active_games: {} }

let _data = null

function load() {
  if (_data) return _data
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    try { _data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) } catch { _data = { ...defaultData } }
  } else {
    _data = { ...defaultData }
  }
  return _data
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(_data, null, 2))
}

function getData() {
  return load()
}

function initDB() {
  load()
  save()
  console.log('💾 Base de dados inicializada.')
}

module.exports = { getData, save, initDB }
