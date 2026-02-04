const handler = async (m, { conn, text, command, usedPrefix, isBotAdmin }) => {
  try {
    if (!isBotAdmin) {
      return m.reply('🤖 *BOT NON ADMIN*\n\nIl bot deve essere admin per usare questo comando.');
    }
    
    // Stessa logica di gp-warn.js
    const mention = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
    
    if (!mention) {
      return m.reply(createUsageMessage(usedPrefix, command));
    }
    
    const target = mention;
    
    // Check bot
    const botJid = conn.user.jid;
    if (target === botJid) {
      return m.reply('🤖 *Il bot non ha warn!*');
    }
    
    // Check owner
    const ownerBot = global.owner[0][0] + '@s.whatsapp.net';
    if (target === ownerBot) {
      return m.reply('🛡️ *Non puoi togliere warn agli owner!*');
    }
    
    const user = getUserData(target);
    const currentGroupWarns = user.warns?.[m.chat] || 0;
    
    if (currentGroupWarns === 0) {
      const targetDisplayNumber = target.replace(/[^0-9]/g, '');
      return m.reply(`✅ *NESSUN WARN*

L'utente @${targetDisplayNumber} non ha avvertimenti in questo gruppo.`, null, {
        mentions: [target]
      });
    }
    
    // Rimuovi warn
    user.warns[m.chat] = Math.max(0, currentGroupWarns - 1);
    const remainingWarns = user.warns[m.chat];
    const targetDisplayNumber = target.replace(/[^0-9]/g, '');
    
    console.log(`[UNWARN] ${targetDisplayNumber} → ${remainingWarns}/3 warn`)
    
    if (remainingWarns === 0) {
      await handleCleanRecord(conn, m, target, targetDisplayNumber);
    } else {
      await handlePartialRemoval(conn, m, target, targetDisplayNumber, remainingWarns);
    }

  } catch (error) {
    console.error('[UNWARN] Errore:', error.message);
    return m.reply(`❌ *ERRORE*\n\n${error.message}`);
  }
};

function getUserData(userId) {
  if (!global.db.data.users[userId]) {
    global.db.data.users[userId] = {
      warns: {}
    };
  }
  return global.db.data.users[userId];
}

function createUsageMessage(usedPrefix, command) {
  return `❌ *USO CORRETTO*

• \`Rispondi:\` Rispondi al messaggio con .${command} ⭐ *CONSIGLIATO*
• \`Menziona:\` ${usedPrefix}${command} @utente`;
}

async function handleCleanRecord(conn, m, target, displayNumber) {
  const cleanMessage = `✅ *WARN RIMOSSI*

@${displayNumber} non ha più avvertimenti in questo gruppo.`;
  
  await conn.sendMessage(m.chat, {
    text: cleanMessage,
    mentions: [target]
  }, { quoted: m });
}

async function handlePartialRemoval(conn, m, target, displayNumber, remainingWarns) {
  const emoji = remainingWarns === 1 ? '⚠️' : '♻️';
  
  const message = `${emoji} *WARN RIMOSSO*

👤 @${displayNumber}
⚠️ Avvertimenti: ${remainingWarns}/3`;
  
  await conn.sendMessage(m.chat, {
    text: message,
    mentions: [target]
  }, { quoted: m });
}

handler.command = /^(unwarn|delwarn|togliwarn|togliavvertimento)$/i;
handler.tags = ['gruppo'];   
handler.help = ['unwarn @utente'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
