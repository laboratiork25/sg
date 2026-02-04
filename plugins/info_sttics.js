let handler = async (m, { conn, isOwner }) => {
  // Solo owner può vedere questa info
  if (!isOwner) {
    return m.reply('🛡️ Solo gli owner possono usare questo comando')
  }
  
  try {
    const groups = Object.entries(await conn.groupFetchAllParticipating())
    
    if (groups.length === 0) {
      return m.reply('📊 Il bot non è in nessun gruppo')
    }
    
    let text = `╭━━━『 *GRUPPI BOT* 』━━━╮\n`
    text += `│\n`
    text += `│ 📊 *Totale gruppi:* ${groups.length}\n`
    text += `│\n`
    text += `╰━━━━━━━━━━━━━━━━━━╯\n\n`
    
    groups.forEach(([jid, group], index) => {
      const participantCount = group.participants?.length || 0
      const groupName = group.subject || 'Nome sconosciuto'
      
      text += `*${index + 1}.* ${groupName}\n`
      text += `   👥 ${participantCount} membri\n`
      text += `   🆔 \`${jid}\`\n\n`
    })
    
    text += `\n> Usa .gruppi per aggiornare la lista`
    
    await m.reply(text)
  } catch (e) {
    console.error('Errore gruppi:', e)
    await m.reply('❌ Errore nel recupero dei gruppi')
  }
}

handler.help = ['gruppi', 'groups']
handler.tags = ['owner']
handler.command = /^(gruppi|groups|grouplist)$/i
handler.owner = true

export default handler
