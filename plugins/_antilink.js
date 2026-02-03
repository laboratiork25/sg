export async function before(m, { conn, isAdmin, isBotAdmin }) {
  if (!m.isGroup || m.fromMe) return
  
  const chat = global.db.data.chats[m.chat]
  if (!chat) return
  
  const text = m.text || ''
  
  // ANTILINK (solo whatsapp)
  if (chat.antilink) {
    const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
    if (linkRegex.test(text)) {
      console.log('🔗 ANTILINK MATCH:', {
        user: m.sender.split('@')[0],
        isAdmin: m.isAdmin,
        isBotAdmin: m.isBotAdmin,
        text: text.substring(0, 50)
      })
      
      if (m.isAdmin) return // Admin bypass
      
      if (!m.isBotAdmin) {
        await conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ⚠️ ╭ `ANTILINK ATTIVO` ╯ 』˚｡⋆\n\n『 🤖 』Link WhatsApp rilevato ma non posso eliminare\n\n> Dammi i permessi admin!'.trim(), m)
        return false // BLOCCA comunque
      }
      
      // Elimina
      await conn.sendMessage(m.chat, { delete: m.key })
      await conn.sendMessage(m.chat, {
        text: `ㅤㅤ⋆｡˚『 🔗 ╭ \`KICK LINK WA\` ╯ 』˚｡⋆\n\n『 👤 』@${m.sender.split('@')[0]}\n『 📛 』Link WhatsApp non autorizzato\n\n> Rimosso dal gruppo`.trim(),
        mentions: [m.sender]
      })
      
      // Rimuovi utente
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
      
      return false // BLOCCA ESECUZIONE
    }
  }
  
  // ANTILINK2 (tutti i link)
  if (chat.antilink2) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    if (urlRegex.test(text)) {
      console.log('🔗 ANTILINK2 MATCH:', {
        user: m.sender.split('@')[0],
        isAdmin: m.isAdmin,
        isBotAdmin: m.isBotAdmin
      })
      
      if (m.isAdmin) return // Admin bypass
      
      if (!m.isBotAdmin) {
        await conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ⚠️ ╭ `ANTILINK2 ATTIVO` ╯ 』˚｡⋆\n\n『 🤖 』Link rilevato ma non posso eliminare\n\n> Dammi i permessi admin!'.trim(), m)
        return false
      }
      
      const linkPreview = text.match(urlRegex)?.[0].substring(0, 35) || 'Link'
      
      await conn.sendMessage(m.chat, { delete: m.key })
      await conn.sendMessage(m.chat, {
        text: `ㅤㅤ⋆｡˚『 🌐 ╭ \`KICK LINK\` ╯ 』˚｡⋆\n\n『 👤 』@${m.sender.split('@')[0]}\n『 🔗 』\`${linkPreview}${linkPreview.length >= 35 ? '...' : ''}\`\n『 📛 』Link non autorizzato\n\n> Rimosso dal gruppo`.trim(),
        mentions: [m.sender]
      })
      
      // Rimuovi utente
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
      
      return false
    }
  }
}

export const disabled = false
