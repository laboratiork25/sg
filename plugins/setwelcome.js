const handler = async (m, { conn, text }) => {
  if (!m.isGroup) return m.reply('❌ Questo comando funziona solo nei gruppi')
  
  let chat = global.db.data.chats[m.chat]
  
  if (!chat) {
    global.db.data.chats[m.chat] = { welcome: false, sWelcome: '', sBye: '' }
    chat = global.db.data.chats[m.chat]
  }

  if (!text) {
    return m.reply(`ㅤㅤ⋆｡˚『 ╭ \`SET WELCOME\` ╯ 』˚｡⋆\n╭\n│ 『 📝 』 \`uso:\` *.setwelcome <testo>*\n│\n│ 『 💡 』 \`variabili:\`\n│ • @user - _menziona utente_\n│ • @subject - _nome gruppo_\n│ • @desc - _descrizione gruppo_\n│\n│ 『 📋 』 \`esempio:\`\n│ .setwelcome Benvenuto @user in @subject!\n│\n│ 『 ℹ️ 』 \`attuale:\`\n│ ${chat.sWelcome || 'Non impostato'}\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`)
  }

  chat.sWelcome = text

  await m.reply(`ㅤㅤ⋆｡˚『 ╭ \`WELCOME IMPOSTATO\` ╯ 』˚｡⋆\n╭\n│ 『 ✅ 』 \`salvato:\` *${text}*\n│\n│ 『 💡 』 \`tip:\` Usa .enable per attivare\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`)
}

handler.help = ['setwelcome']
handler.tags = ['group']
handler.command = /^setwelcome$/i
handler.group = true
handler.admin = true

export default handler
