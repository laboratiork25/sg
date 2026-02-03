const handler = async (m, { conn, text }) => {
  if (!m.isGroup) return m.reply('❌ Questo comando funziona solo nei gruppi')
  
  let chat = global.db.data.chats[m.chat]
  
  if (!chat) {
    global.db.data.chats[m.chat] = { welcome: false, sWelcome: '', sBye: '' }
    chat = global.db.data.chats[m.chat]
  }

  if (!text) {
    return m.reply(`ㅤㅤ⋆｡˚『 ╭ \`SET BYE\` ╯ 』˚｡⋆\n╭\n│ 『 📝 』 \`uso:\` *.setbye <testo>*\n│\n│ 『 💡 』 \`variabili:\`\n│ • @user - _menziona utente_\n│\n│ 『 📋 』 \`esempio:\`\n│ .setbye Addio @user, ci mancherai!\n│\n│ 『 ℹ️ 』 \`attuale:\`\n│ ${chat.sBye || 'Non impostato'}\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`)
  }

  chat.sBye = text

  await m.reply(`ㅤㅤ⋆｡˚『 ╭ \`BYE IMPOSTATO\` ╯ 』˚｡⋆\n╭\n│ 『 ✅ 』 \`salvato:\` *${text}*\n│\n│ 『 💡 』 \`tip:\` Usa .enable per attivare\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`)
}

handler.help = ['setbye']
handler.tags = ['group']
handler.command = /^setbye$/i
handler.group = true
handler.admin = true

export default handler
