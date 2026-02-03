import chalk from 'chalk'
import { fileURLToPath } from 'url'

export default async function (m, conn = { user: {} }) {
  if (!m || m.key?.fromMe) return

  try {
    const senderJid = conn.decodeJid ? conn.decodeJid(m.sender) : m.sender
    const chatJid = conn.decodeJid ? conn.decodeJid(m.chat || '') : (m.chat || '')
    
    // Normalizza sender per LID
    const normalizedSender = senderJid.replace(/@lid$/, '@s.whatsapp.net')
    
    let name = ''
    
    // Cache nome con normalizzazione
    if (global.nameCache && global.nameCache.has(normalizedSender)) {
      name = global.nameCache.get(normalizedSender)
    } else if (conn.getName) {
      name = await conn.getName(senderJid)
      if (global.nameCache) global.nameCache.set(normalizedSender, name)
    } else {
      name = senderJid.split('@')[0]
    }
    
    // Formattazione chat
    let chat = ''
    let groupName = ''
    
    if (m.isGroup) {
      if (global.groupMetaCache && global.groupMetaCache.has(chatJid)) {
        const cached = global.groupMetaCache.get(chatJid)
        groupName = cached?.data?.subject || cached?.subject || chatJid.split('@')[0]
      } else if (conn.groupMetadata) {
        try {
          const metadata = await conn.groupMetadata(chatJid)
          groupName = metadata?.subject || chatJid.split('@')[0]
        } catch {
          groupName = chatJid.split('@')[0]
        }
      } else {
        groupName = chatJid.split('@')[0]
      }
      chat = chalk.cyan(groupName)
    } else {
      chat = chalk.blue('DM')
    }
    
    // Rileva tipo messaggio
    let type = chalk.white('MSG')
    let icon = '💬 '
    let roleIcon = ''
    
    // Check se è comando
    const text = m.text || ''
    const isCommand = text && /^[.!#]/.test(text)
    
    if (isCommand) {
      type = chalk.green('CMD')
      icon = '⚡ '
    } else if (m.message?.imageMessage || m.message?.videoMessage) {
      type = chalk.blue('MEDIA')
      icon = '📷 '
    } else if (m.message?.stickerMessage) {
      type = chalk.yellow('STICKER')
      icon = '🎭 '
    } else if (m.message?.audioMessage) {
      type = chalk.magenta('AUDIO')
      icon = '🎵 '
    } else if (m.message?.documentMessage) {
      type = chalk.cyan('DOC')
      icon = '📄 '
    } else if (m.message?.pollCreationMessage) {
      type = chalk.green('POLL')
      icon = '📊 '
    } else if (m.message?.locationMessage) {
      type = chalk.blue('LOCATION')
      icon = '📍 '
    } else if (m.message?.contactMessage) {
      type = chalk.magenta('CONTACT')
      icon = '👤 '
    }
    
    // Check link (solo se non è comando)
    if (!isCommand) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi
      const whatsappLinkRegex = /chat\.whatsapp\.com/i
      
      if (whatsappLinkRegex.test(text)) {
        type = chalk.red('LINK-WA')
        icon = '🔗 '
      } else if (urlRegex.test(text)) {
        type = chalk.yellow('LINK')
        icon = '🌐 '
      }
    }
    
    // Check ruoli
    if (m.isGroup && global.groupMetaCache) {
      const cached = global.groupMetaCache.get(chatJid)
      if (cached) {
        const participants = cached?.data?.participants || cached?.participants || []
        
        // Cerca con normalizzazione LID
        const userP = participants.find(p => {
          const pid = conn.decodeJid ? conn.decodeJid(p.id) : p.id
          const normalizedPid = pid.replace(/@lid$/, '@s.whatsapp.net')
          const normalizedSenderCheck = senderJid.replace(/@lid$/, '@s.whatsapp.net')
          
          return pid === senderJid || 
                 normalizedPid === normalizedSenderCheck ||
                 p.id === senderJid
        })
        
        if (userP) {
          if (userP.admin === 'superadmin') {
            roleIcon = chalk.red.bold('👑 ')
          } else if (userP.admin === 'admin') {
            roleIcon = chalk.yellow.bold('⭐ ')
          }
        }
      }
    }
    
    // Check owner
    const normalizedForOwner = senderJid.replace(/@lid$/, '@s.whatsapp.net')
    const isOwner = global.owner?.some(([num]) => {
      const ownerJid = num.includes('@') ? num : num + '@s.whatsapp.net'
      return ownerJid === normalizedForOwner
    })
    
    if (isOwner) {
      roleIcon = chalk.magenta.bold('🛡️ ')
    }
    
    // Testo display
    let displayText = text.substring(0, 70)
    if (text.length > 70) displayText += '...'
    
    if (!displayText && m.message) {
      if (m.message.imageMessage) displayText = '[Immagine]'
      if (m.message.videoMessage) displayText = '[Video]'
      if (m.message.stickerMessage) displayText = '[Sticker]'
      if (m.message.audioMessage) displayText = '[Audio]'
      if (m.message.documentMessage) displayText = '[Documento]'
      if (m.message.pollCreationMessage) displayText = '[Sondaggio]'
      if (m.message.locationMessage) displayText = '[Posizione]'
      if (m.message.contactMessage) displayText = '[Contatto]'
    }
    
    // Colore testo
    let cmdColor = chalk.white
    
    if (isCommand) {
      if (text.match(/^[.!#](kick|ban|remove|delete|warn)/i)) {
        cmdColor = chalk.red
      } else if (text.match(/^[.!#](tag|hidetag|totag|tagall)/i)) {
        cmdColor = chalk.yellow
      } else if (text.match(/^[.!#](promote|demote|admin)/i)) {
        cmdColor = chalk.cyan
      } else if (text.match(/^[.!#](on|off|enable|disable)/i)) {
        cmdColor = chalk.green
      } else {
        cmdColor = chalk.white
      }
    } else {
      const whatsappLinkRegex = /chat\.whatsapp\.com/i
      const urlRegex = /(https?:\/\/[^\s]+)/gi
      
      if (whatsappLinkRegex.test(text)) {
        cmdColor = chalk.red
      } else if (urlRegex.test(text)) {
        cmdColor = chalk.yellow
      }
    }
    
    // Log formattato
    console.log(
      chalk.gray('[') + type + chalk.gray(']') +
      ' ' + icon + roleIcon + chalk.magenta(name) +
      chalk.gray(' → ') + chat +
      chalk.gray(': ') + cmdColor(displayText)
    )
    
  } catch (e) {
    console.error('Print error:', e.message)
  }
}

let file = fileURLToPath(import.meta.url)
import { watchFile, unwatchFile } from 'fs'
import { pathToFileURL } from 'url'

watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.yellow('✓ print.js'))
  const fileUrl = pathToFileURL(file).href
  import(fileUrl + `?update=${Date.now()}`).catch(console.error)
})
