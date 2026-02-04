import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath, pathToFileURL } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

// ==================== CACHE ULTRA-OTTIMIZZATE ====================
if (!global.processedMessages) global.processedMessages = new Set()
if (!global.groupMetaCache) global.groupMetaCache = new Map()
if (!global.adminCheckCache) global.adminCheckCache = new Map() // NUOVO: cache admin check

const DUPLICATE_WINDOW = 3000
const GROUP_META_CACHE_TTL = 600000 // 10 min (era 5)
const ADMIN_CHECK_CACHE_TTL = 300000 // 5 min cache admin

// Cleanup aggressivo ogni 20 min
if (!global.cacheCleanupInterval) {
  global.cacheCleanupInterval = setInterval(() => {
    const now = Date.now()
    
    // Cleanup group metadata
    for (const [key, value] of global.groupMetaCache.entries()) {
      if (now - value.timestamp > GROUP_META_CACHE_TTL) {
        global.groupMetaCache.delete(key)
      }
    }
    
    // Cleanup admin cache
    for (const [key, value] of global.adminCheckCache.entries()) {
      if (now - value.timestamp > ADMIN_CHECK_CACHE_TTL) {
        global.adminCheckCache.delete(key)
      }
    }
    
    // Cleanup processed messages
    if (global.processedMessages.size > 15000) {
      global.processedMessages.clear()
    }
  }, 20 * 60 * 1000)
}

// DB save throttled
if (!global.dbSaveInterval) {
  let saveTimeout = null
  global.triggerDBSave = () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      if (global.db?.write) global.db.write().catch(() => {})
    }, 30000) // 30s throttle
  }
}

// ==================== HANDLER PRINCIPALE ULTRA-VELOCE ====================
export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || []
  if (!chatUpdate) return
  
  // Push message non-blocking
  if (typeof this.pushMessage === 'function') {
    setImmediate(() => this.pushMessage(chatUpdate.messages).catch(() => {}))
  }
  
  let m = chatUpdate.messages[chatUpdate.messages.length - 1]
  if (!m) return
  
  // ULTRA-FAST: Early exits PRIMA di tutto
  if (m.messageStubType) return
  if (m.key?.fromMe && !m.message) return
  
  const msgId = m.key?.id
  if (!msgId) return
  if (global.processedMessages.has(msgId)) return
  global.processedMessages.add(msgId)
  setTimeout(() => global.processedMessages.delete(msgId), DUPLICATE_WINDOW)
  
  // DB load non-blocking
  if (!global.db?.data) {
    setImmediate(() => global.loadDatabase())
    return
  }
  
  // Normalizza VELOCE
  m = smsg(this, m) || m
  if (!m) return
  
  // Skip messaggi vecchi
  if (m.messageTimestamp && (Date.now() / 1000 - m.messageTimestamp) > 120) return
  
  // Normalizza JID
  if (m.key) {
    m.key.remoteJid = this.decodeJid(m.key.remoteJid)
    if (m.key.participant) m.key.participant = this.decodeJid(m.key.participant)
  }
  if (!m.key?.remoteJid) return
  
  // Skip messaggi privati senza comando
  if (!m.isGroup && typeof m.text === 'string' && !m.text.match(/^[.!#/]/)) return
  
  // Process NON-BLOCKING
  setImmediate(() => processMessage.call(this, m, chatUpdate))
}

// ==================== PROCESS MESSAGE ULTRA-OTTIMIZZATO ====================
async function processMessage(m, chatUpdate) {
  const isOwner = (() => {
    try {
      if (!global.owner) global.owner = []
      const owners = [this.decodeJid(this.user.jid), ...global.owner.map(([num]) => num + '@s.whatsapp.net')]
      return owners.includes(m.sender) || m.fromMe
    } catch {
      return false
    }
  })()
  
  try {
    m.exp = 0
    
    // Init DB structures LAZY
    if (!global.db.data.users) global.db.data.users = {}
    if (!global.db.data.chats) global.db.data.chats = {}
    if (!global.db.data.stats) global.db.data.stats = {}
    if (!global.db.data.settings) global.db.data.settings = {}
    
    const isCommand = typeof m.text === 'string' && m.text.match(/^[.!#]/)
    
    let user = global.db.data.users[m.sender]
    if (!user && isCommand) {
      user = global.db.data.users[m.sender] = {
        name: m.name || m.pushName || 'User',
        banned: false,
        messages: 0
      }
    }
    
    let chat = global.db.data.chats[m.chat]
    if (!chat && isCommand) {
      // VELOCE: No getName async
      chat = global.db.data.chats[m.chat] = {
        name: m.isGroup ? (this.chats[m.chat]?.name || 'Group') : (m.name || 'Chat'),
        isBanned: false,
        welcome: false,
        detect: false,
        sWelcome: '',
        sBye: '',
        sPromote: '',
        sDemote: '',
        antilink: false,
        antilink2: false,
        antispam: false,
        antimedia: false,
        antitoxic: false,
        warnings: {},
        antispamData: {},
        mediaWarnings: {}
      }
    }
    
    let settings = global.db.data.settings[this.user.jid]
    if (!settings) {
      settings = global.db.data.settings[this.user.jid] = {
        self: false,
        autoread: false
      }
    }
    
    // Early exits
    if (global.opts?.['nyimak']) return
    if (!m.fromMe && global.opts?.['self']) return
    if (m.isBaileys) return
    if (user?.banned && !isOwner) return
    if (chat?.isBanned && !isOwner) return
    
    if (typeof m.text !== 'string') m.text = ''
    
    const stats = global.db.data.stats
    let usedPrefix
    
    // ==================== METADATA ULTRA-VELOCE ====================
    let groupMetadata = {}
    let participants = []
    let normalizedParticipants = []
    
    if (m.isGroup) {
      // VELOCE: Usa SEMPRE cache o memoria
      const cached = global.groupMetaCache.get(m.chat)
      
      if (cached && Date.now() - cached.timestamp < GROUP_META_CACHE_TTL) {
        groupMetadata = cached.data
      } else {
        // FALLBACK: metadata da memoria (ZERO latenza)
        groupMetadata = this.chats[m.chat]?.metadata || {}
        
        // Fetch async solo se necessario (non-blocking)
        if (!groupMetadata.participants || groupMetadata.participants.length === 0) {
          setImmediate(async () => {
            try {
              const freshMeta = await this.groupMetadata(m.chat)
              global.groupMetaCache.set(m.chat, {
                data: freshMeta,
                timestamp: Date.now()
              })
            } catch {}
          })
        } else {
          // Cache existing metadata
          global.groupMetaCache.set(m.chat, {
            data: groupMetadata,
            timestamp: Date.now()
          })
        }
      }
      
      participants = groupMetadata.participants || []
      
      // Normalizza solo se serve
      if (isCommand && participants.length > 0) {
        normalizedParticipants = participants.map(u => {
          const normalizedId = this.decodeJid(u.id)
          return { ...u, id: normalizedId, jid: u.jid || normalizedId }
        })
      }
    }
    
    const user_participant = m.isGroup && normalizedParticipants.length > 0 ? normalizedParticipants.find(u => this.decodeJid(u.id) === m.sender) || {} : {}
    const bot = m.isGroup && normalizedParticipants.length > 0 ? normalizedParticipants.find(u => this.decodeJid(u.id) == this.user.jid) || {} : {}
    
    // ==================== ADMIN CHECK CON CACHE (ORIGINALE) ====================
    function isUserAdminSync(conn, participants, senderId) {
      try {
        // CACHE KEY
        const cacheKey = `${m.chat}:${senderId}`
        const cached = global.adminCheckCache.get(cacheKey)
        
        if (cached && Date.now() - cached.timestamp < ADMIN_CHECK_CACHE_TTL) {
          return cached.isAdmin
        }
        
        const decodedSender = conn.decodeJid(senderId)
        const isAdmin = participants.some(p =>
          (conn.decodeJid(p.id) === decodedSender || p.jid === decodedSender) &&
          (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false
        
        // CACHE result
        global.adminCheckCache.set(cacheKey, {
          isAdmin,
          timestamp: Date.now()
        })
        
        return isAdmin
      } catch {
        return false
      }
    }
    
    const isRAdmin = user_participant?.admin == 'superadmin' || false
    const isAdmin = m.isGroup && participants.length > 0 ? isUserAdminSync(this, participants, m.sender) : false
    const isBotAdmin = m.isGroup && participants.length > 0 ? isUserAdminSync(this, participants, this.user.jid) : false
    
    m.isAdmin = isAdmin || isOwner
    m.isBotAdmin = isBotAdmin
    
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
    
    // ==================== PLUGIN.ALL (SKIP) ====================
    if (isCommand) {
      for (let name in global.plugins) {
        let plugin = global.plugins[name]
        if (!plugin || plugin.disabled) continue
        
        if (typeof plugin.all === 'function') {
          try {
            await plugin.all.call(this, m, {
              chatUpdate,
              __dirname: ___dirname,
              __filename: join(___dirname, name)
            })
          } catch (e) {
            console.error(`[plugin.all] ${name}:`, e.message)
          }
        }
      }
    }
    
    // ==================== PLUGIN.BEFORE ====================
    for (let name in global.plugins) {
      let plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue
      
      if (typeof plugin.before === 'function') {
        try {
          const shouldContinue = await plugin.before.call(this, m, {
            conn: this,
            participants: normalizedParticipants,
            groupMetadata,
            user: user_participant,
            bot,
            isOwner,
            isAdmin: m.isAdmin,
            isBotAdmin,
            chatUpdate,
            __dirname: ___dirname,
            __filename: join(___dirname, name)
          })
          if (shouldContinue === false) return
        } catch (e) {
          console.error(`[plugin.before] ${name}:`, e.message)
        }
      }
    }
    
    // Skip se non comando
    if (!isCommand) {
      if (user) user.messages = (user.messages || 0) + 1
      return
    }
    
    // ==================== PLUGIN COMMANDS ====================
    for (let name in global.plugins) {
      let plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue
      if (typeof plugin !== 'function') continue
      
      const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
      let _prefix = plugin.customPrefix || this.prefix || global.prefix
      
      let match = (_prefix instanceof RegExp ?
        [[_prefix.exec(m.text), _prefix]] :
        Array.isArray(_prefix) ?
          _prefix.map(p => {
            let re = p instanceof RegExp ? p : new RegExp(str2Regex(p))
            return [re.exec(m.text), re]
          }) :
          typeof _prefix === 'string' ?
            [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
            [[[], new RegExp]]
      ).find(p => p[1])
      
      if (!match) continue
      
      usedPrefix = (match[0] || '')[0]
      if (!usedPrefix) continue
      
      let noPrefix = m.text.replace(usedPrefix, '')
      let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
      args = args || []
      let _args = noPrefix.trim().split` `.slice(1)
      let text = _args.join` `
      command = (command || '').toLowerCase()
      
      let fail = plugin.fail || global.dfail
      let isAccept = plugin.command instanceof RegExp ?
        plugin.command.test(command) :
        Array.isArray(plugin.command) ?
          plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
          typeof plugin.command === 'string' ?
            plugin.command === command :
            false
      
      if (!isAccept) continue
      
      m.plugin = name
      
      // Check permessi
      if (plugin.owner && !isOwner) {
        fail('owner', m, this)
        continue
      }
      if (plugin.group && !m.isGroup) {
        fail('group', m, this)
        continue
      }
      if (plugin.botAdmin && !isBotAdmin) {
        fail('botAdmin', m, this)
        continue
      }
      if (plugin.admin && !m.isAdmin) {
        fail('admin', m, this)
        continue
      }
      if (plugin.private && m.isGroup) {
        fail('private', m, this)
        continue
      }
      
      m.isCommand = true
      let xp = 'exp' in plugin ? parseInt(plugin.exp) : 0
      m.exp += xp
      
      let extra = {
        match,
        usedPrefix,
        noPrefix,
        _args,
        args,
        command,
        text,
        conn: this,
        normalizedParticipants,
        participants,
        groupMetadata,
        user: user_participant,
        bot,
        isOwner,
        isAdmin: m.isAdmin,
        isBotAdmin,
        chatUpdate,
        __dirname: ___dirname,
        __filename: join(___dirname, name)
      }
      
      try {
        await plugin.call(this, m, extra)
      } catch (e) {
        m.error = e
        console.error(`[plugin] ${name}:`, e.message)
        await m.reply(`❌ Errore: ${e.message}`).catch(() => {})
      } finally {
        if (typeof plugin.after === 'function') {
          try {
            await plugin.after.call(this, m, extra)
          } catch (e) {
            console.error(`[plugin.after] ${name}:`, e.message)
          }
        }
      }
      break
    }
  } catch (e) {
    console.error('[handler]', e.message)
  } finally {
    // Stats update
    if (m?.sender && m.isCommand) {
      let user = global.db.data.users[m.sender]
      if (user) {
        user.exp = (user.exp || 0) + m.exp
        user.messages = (user.messages || 0) + 1
      }
    }
    
    if (m?.plugin) {
      const now = Date.now()
      const stats = global.db.data.stats
      if (!stats[m.plugin]) {
        stats[m.plugin] = {
          total: 0,
          success: 0,
          last: 0,
          lastSuccess: 0
        }
      }
      const stat = stats[m.plugin]
      stat.total++
      stat.last = now
      if (!m.error) {
        stat.success++
        stat.lastSuccess = now
      }
    }
    
    // Trigger DB save (throttled)
    if (global.triggerDBSave) {
      global.triggerDBSave()
    }
    
    // Print NON-BLOCKING
    if (m.isCommand && !global.opts?.['noprint']) {
      setImmediate(async () => {
        try {
          await (await import('./lib/print.js')).default(m, this)
        } catch {}
      })
    }
    
    // Autoread NON-BLOCKING
    if (global.opts?.['autoread']) {
      setImmediate(() => this.readMessages([m.key]).catch(() => {}))
    }
  }
}

// ==================== PARTICIPANTS UPDATE VELOCE ====================
export async function participantsUpdate({ id, participants, action }) {
  if (global.opts?.['self']) return
  if (this.isInit) return
  if (!global.db?.data) await global.loadDatabase()
  
  let chat = global.db.data.chats[id] || {}
  
  if ((action === 'add' || action === 'remove') && !chat.welcome) return
  if ((action === 'promote' || action === 'demote') && !chat.detect) return
  
  let nomeDelBot = 'SafeGuard Bot'
  let jidCanale = '120363259442839354@newsletter'
  
  try {
    // INVALIDA CACHE IMMEDIATAMENTE
    global.groupMetaCache.delete(id)
    global.adminCheckCache.delete(`${id}:${participants[0]}`)
    
    const groupMetadata = await this.groupMetadata(id).catch(() => null) || {}
    if (groupMetadata) {
      global.groupMetaCache.set(id, {
        data: groupMetadata,
        timestamp: Date.now()
      })
    }
    
    switch (action) {
      case 'add':
      case 'remove':
        for (let user of participants) {
          let pp = './media/menu/default.jpg'
          try {
            pp = await this.profilePictureUrl(user, 'image')
          } catch {}
          
          let apii = await this.getFile(pp).catch(() => ({ data: null }))
          let text = ''
          
          if (action === 'add') {
            text = (chat.sWelcome || '👋 Benvenuto/a, @user!')
              .replace('@subject', groupMetadata.subject || 'Gruppo')
              .replace('@desc', groupMetadata.desc?.toString() || 'Nessuna descrizione')
              .replace('@user', '@' + user.split('@')[0])
          } else {
            text = (chat.sBye || '👋 Addio, @user!')
              .replace('@user', '@' + user.split('@')[0])
          }
          
          await this.sendMessage(id, {
            text: text,
            contextInfo: {
              mentionedJid: [user],
              forwardingScore: 99,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: jidCanale,
                serverMessageId: '',
                newsletterName: nomeDelBot
              },
              externalAdReply: {
                title: action === 'add' ? '👋 Benvenuto' : '👋 Addio',
                body: '',
                previewType: 'PHOTO',
                thumbnailUrl: '',
                thumbnail: apii.data,
                mediaType: 1,
                renderLargerThumbnail: false
              }
            }
          }).catch(() => {})
        }
        break
      
      case 'promote':
      case 'demote':
        // INVALIDA CACHE ADMIN PER TUTTI I PARTICIPANTS
        for (let user of participants) {
          global.adminCheckCache.delete(`${id}:${user}`)
        }
        
        for (let user of participants) {
          let text = ''
          
          if (action === 'promote') {
            text = (chat.sPromote || '👑 @user è stato promosso ad amministratore')
              .replace('@user', '@' + user.split('@')[0])
          } else {
            text = (chat.sDemote || '📉 @user non è più amministratore')
              .replace('@user', '@' + user.split('@')[0])
          }
          
          if (text) {
            await this.sendMessage(id, {
              text: text,
              contextInfo: {
                mentionedJid: [user]
              }
            }).catch(() => {})
          }
        }
        
        // Reload metadata dopo 1s
        await delay(1000)
        global.groupMetaCache.delete(id)
        
        try {
          const updatedMetadata = await this.groupMetadata(id)
          global.groupMetaCache.set(id, {
            data: updatedMetadata,
            timestamp: Date.now()
          })
        } catch {}
        break
    }
  } catch (e) {
    console.error('[participantsUpdate]', e.message)
  }
}

// ==================== GROUPS UPDATE ====================
export async function groupsUpdate(groupsUpdate) {
  if (global.opts?.['self']) return
  
  for (const groupUpdate of groupsUpdate) {
    const id = groupUpdate.id
    if (!id) continue
    
    let chats = global.db.data.chats[id] || {}
    let text = ''
    
    if (groupUpdate.icon) {
      text = (chats.sIcon || this.sIcon || '🖼️ Immagine gruppo modificata').replace('@icon', groupUpdate.icon)
    }
    if (groupUpdate.revoke) {
      text = (chats.sRevoke || this.sRevoke || '🔗 Link reimpostato\n\nNuovo link: @revoke').replace('@revoke', groupUpdate.revoke)
    }
    
    if (!text) continue
    
    await this.sendMessage(id, {
      text,
      mentions: this.parseMention(text)
    }).catch(() => {})
  }
}

// ==================== DFAIL ====================
global.dfail = (type, m, conn) => {
  const msg = {
    owner: 'ㅤㅤ⋆｡˚『 🛡️ ╭ `PERMESSO NEGATO` ╯ 』˚｡⋆\n\n『 ⚠️ 』Questo comando è riservato agli *owner* del bot\n\n> Solo i proprietari possono eseguire questa azione',
    admin: 'ㅤㅤ⋆｡˚『 👮 ╭ `PERMESSO NEGATO` ╯ 』˚｡⋆\n\n『 ⚠️ 』Questo comando è riservato agli *admin* del gruppo\n\n> Devi essere un amministratore per usare questo comando',
    botAdmin: 'ㅤㅤ⋆｡˚『 🤖 ╭ `BOT NON ADMIN` ╯ 』˚｡⋆\n\n『 ⚠️ 』Il bot deve essere *admin* per eseguire questo comando\n\n> Promuovi il bot ad amministratore per abilitare questa funzione',
    group: 'ㅤㅤ⋆｡˚『 👥 ╭ `SOLO GRUPPI` ╯ 』˚｡⋆\n\n『 ⚠️ 』Questo comando funziona solo nei gruppi\n\n> Usa questo comando in un gruppo WhatsApp',
    private: 'ㅤㅤ⋆｡˚『 📩 ╭ `SOLO PRIVATO` ╯ 』˚｡⋆\n\n『 ⚠️ 』Questo comando funziona solo in chat privata\n\n> Scrivimi in privato per usare questo comando'
  }[type]
  
  if (msg) conn.reply(m.chat, msg, m).catch(() => {})
}

// ==================== FILE WATCH ====================
const file = fileURLToPath(import.meta.url)
watchFile(file, async () => {
  unwatchFile(file)
  console.log(chalk.magenta("handler.js aggiornato"))
  import(pathToFileURL(file).href + `?update=${Date.now()}`).catch(console.error)
})
