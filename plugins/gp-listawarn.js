const handler = async (m, { conn, isOwner, isAdmin }) => {
  try {
    const allUsers = global.db.data.users;
    const currentChat = m.chat;
    
    // Filtra utenti che hanno warn in QUESTO gruppo
    let usersWithWarns = [];
    
    for (let [jid, userData] of Object.entries(allUsers)) {
      if (userData.warns && userData.warns[currentChat] > 0) {
        usersWithWarns.push({
          jid: jid,
          warns: userData.warns[currentChat]
        });
      }
    }
    
    // Ordina per numero di warn (decrescente)
    usersWithWarns.sort((a, b) => b.warns - a.warns);
    
    if (usersWithWarns.length === 0) {
      return conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ✅ ╭ \`NESSUN WARN\` ╯ 』˚｡⋆\n\n『 👥 』Non ci sono utenti con avvertimenti\n\n> Ottimo comportamento nel gruppo!`.trim(), m);
    }
    
    // Costruisci lista
    let mappedWarns = await Promise.all(
      usersWithWarns.map(async ({ jid, warns }, i) => {
        const name = await conn.getName(jid) || 'Sconosciuto';
        const warnEmoji = warns === 1 ? '⚠️' : warns === 2 ? '🔔' : '🚨';
        const userMention = isOwner || isAdmin ? `@${jid.split('@')[0]}` : name;
        
        return `『 ${warnEmoji} 』*${i + 1}.* ${name}\nㅤㅤ${userMention} • *${warns}/3* warns`;
      })
    );
    
    // Calcola totale warns
    const totalWarns = usersWithWarns.reduce((sum, u) => sum + u.warns, 0);
    
    const caption = `ㅤㅤ⋆｡˚『 ⚠️ ╭ \`LISTA WARN\` ╯ 』˚｡⋆\n\n『 👥 』Utenti avvisati: *${usersWithWarns.length}*\n『 📊 』Warn totali: *${totalWarns}*\n\n${mappedWarns.join('\n\n')}\n\n> Gli utenti con 3 warn vengono rimossi automaticamente`.trim();
    
    await conn.sendMessage(m.chat, {
      text: caption,
      mentions: usersWithWarns.map(u => u.jid)
    }, { quoted: m });
    
  } catch (error) {
    console.error('Errore listawarn:', error);
    return conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ❌ ╭ \`ERRORE\` ╯ 』˚｡⋆\n\n『 ⚠️ 』${error.message}`.trim(), m);
  }
};

handler.help = ['listawarn'];
handler.tags = ['group'];
handler.command = ['listawarn', 'listwarn', 'warnlist'];
handler.group = true;
handler.admin = true;

export default handler;
