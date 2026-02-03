let handler = async (m, { conn, command }) => {
    let isOpen = command === 'aperto' || command === 'apri' || command === 'open'
    
    await conn.groupSettingUpdate(m.chat, isOpen ? 'not_announcement' : 'announcement')
    
    const message = isOpen 
        ? `ㅤㅤ⋆｡˚『 ╭ \`GRUPPO APERTO\` ╯ 』˚｡⋆\n╭\n│ 『 🔓 』 \`stato:\` *Aperto*\n│ 『 💬 』 \`info:\` *Tutti possono scrivere*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`
        : `ㅤㅤ⋆｡˚『 ╭ \`GRUPPO CHIUSO\` ╯ 』˚｡⋆\n╭\n│ 『 🔒 』 \`stato:\` *Chiuso*\n│ 『 👑 』 \`info:\` *Solo admin possono scrivere*\n*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*`
    
    await conn.sendMessage(m.chat, {
        text: message,
        contextInfo: {
            forwardingScore: 99,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363259442839354@newsletter',
                serverMessageId: '',
                newsletterName: global.db.data.nomedelbot || `SafeGuard Bot`
            }
        }
    }, { quoted: m })
}

handler.help = ['aperto', 'chiuso']
handler.tags = ['group']
handler.command = /^(aperto|apri|open|chiuso|chiudi|close)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
