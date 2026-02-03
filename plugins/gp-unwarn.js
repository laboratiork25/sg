const handler = async (m, { conn, text, command, usedPrefix }) => {
  try {
    let target = getTargetUser(m, text);
    
    if (!target) {
      return m.reply(createUsageMessage(usedPrefix, command));
    }
    
    // ==================== NORMALIZZAZIONE @LID ====================
    const groupMetadata = await conn.groupMetadata(m.chat);
    const participants = groupMetadata.participants || [];
    
    let targetParticipant = participants.find(p => {
      const pid = p.id;
      
      if (pid === target) return true;
      
      const pidNumber = pid.replace(/[^0-9]/g, '');
      const targetNumber = target.replace(/[^0-9]/g, '');
      
      return pidNumber === targetNumber && pidNumber.length > 0;
    });
    
    if (!targetParticipant) {
      return m.reply(`❌ *UTENTE NON TROVATO*\n\nL'utente non è membro di questo gruppo.`);
    }
    
    target = targetParticipant.id;
    // ==================== FINE NORMALIZZAZIONE ====================
    
    const user = getUserData(target);
    const currentGroupWarns = user.warns?.[m.chat] || 0;
    
    if (target === conn.user.jid || conn.decodeJid(target) === conn.user.jid) {
      return m.reply('🤖 *Il bot non ha warn!*');
    }

    if (currentGroupWarns === 0) {
      return m.reply('✅ *NESSUN WARN*\n\nL\'utente non ha avvertimenti in questo gruppo.');
    }
    
    user.warns[m.chat] = Math.max(0, currentGroupWarns - 1);
    const remainingWarns = user.warns[m.chat];
    
    if (remainingWarns === 0) {
      await handleCleanRecord(conn, m, target);
    } else {
      await handlePartialRemoval(conn, m, target, remainingWarns);
    }

  } catch (error) {
    console.error('Errore unwarn:', error);
    return m.reply(`❌ *ERRORE*\n\n${error.message}`);
  }
};

function getTargetUser(m, text) {
  // Priorità 1: Quoted
  if (m.quoted?.sender) {
    return m.quoted.sender;
  }
  
  // Priorità 2: Parse text @number
  if (text && text.includes('@')) {
    const match = text.match(/@(\d+)/);
    if (match) {
      const number = match[1];
      return number + '@lid';
    }
  }
  
  // Priorità 3: Numero puro
  if (text && !isNaN(text.trim())) {
    const number = text.trim();
    if (number.length >= 11 && number.length <= 13) {
      return number + '@s.whatsapp.net';
    }
  }
  
  return null;
}

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

• \`Menziona:\` ${usedPrefix}${command} @utente
• \`Rispondi:\` Rispondi con .${command}
• \`Numero:\` ${usedPrefix}${command} 393401234567`;
}

async function handleCleanRecord(conn, m, target) {
  const username = target.split('@')[0];
  const cleanMessage = `✅ *WARN RIMOSSI*

@${username} non ha più avvertimenti in questo gruppo.`;
  
  await m.reply(cleanMessage, null, { 
    mentions: [target]
  });
}

async function handlePartialRemoval(conn, m, target, remainingWarns) {
  const username = target.split('@')[0];
  const emoji = remainingWarns === 1 ? '⚠️' : '♻️';
  
  const message = `${emoji} *WARN RIMOSSO*

👤 @${username}
⚠️ Avvertimenti: ${remainingWarns}/3`;
  
  await m.reply(message, null, { 
    mentions: [target]
  });
}

handler.command = /^(unwarn|delwarn|togliwarn|togliavvertimento)$/i;
handler.tags = ['gruppo'];   
handler.help = ['unwarn @utente'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
