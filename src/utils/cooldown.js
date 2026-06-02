function checkCooldown(lastTimestamp, cooldownMs) {
  if (!lastTimestamp) return { ready: true, remaining: 0 }
  const elapsed = Date.now() - new Date(lastTimestamp).getTime()
  if (elapsed >= cooldownMs) return { ready: true, remaining: 0 }
  return { ready: false, remaining: cooldownMs - elapsed }
}

function formatRemaining(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

module.exports = { checkCooldown, formatRemaining }
