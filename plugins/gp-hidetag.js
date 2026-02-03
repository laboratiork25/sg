const handler = async (m, { conn, text, isAdmin, isOwner, isBotAdmin }) => {
  try {
    // ==================== CONTROLLO PERMESSI ====================
    if (!isAdmin && !isOwner) {
      return conn.reply(m.chat, '👮 *PERMESSO NEGATO*\n\nQuesto comando è riservato agli *admin* del gruppo', m);
    }
    
    if (!isBotAdmin) {
      return conn.reply(m.chat, '🤖 *BOT NON ADMIN*\n\nIl bot deve essere *admin* per menzionare tutti', m);
    }
    // ==================== FINE CONTROLLO ====================
    
    // Ottieni participants dal gruppo
    const groupMetadata = await conn.groupMetadata(m.chat);
    const participants = groupMetadata.participants;
    const users = participants.map((u) => conn.decodeJid(u.id));
    
    if (m.quoted) {
      const quoted = m.quoted;
      
      if (quoted.mtype === 'imageMessage') {
        const media = await quoted.download();
        await conn.sendMessage(m.chat, {
          image: media,
          caption: text || quoted.text || '',
          mentions: users
        }, { quoted: m });
      }
      else if (quoted.mtype === 'videoMessage') {
        const media = await quoted.download();
        await conn.sendMessage(m.chat, {
          video: media,
          caption: text || quoted.text || '',
          mentions: users
        }, { quoted: m });
      }
      else if (quoted.mtype === 'audioMessage') {
        const media = await quoted.download();
        await conn.sendMessage(m.chat, {
          audio: media,
          mimetype: 'audio/mp4',
          mentions: users
        }, { quoted: m });
      }
      else if (quoted.mtype === 'documentMessage') {
        const media = await quoted.download();
        await conn.sendMessage(m.chat, {
          document: media,
          mimetype: quoted.mimetype,
          fileName: quoted.fileName,
          caption: text || quoted.text || '',
          mentions: users
        }, { quoted: m });
      }
      else if (quoted.mtype === 'stickerMessage') {
        const media = await quoted.download();
        await conn.sendMessage(m.chat, {
          sticker: media,
          mentions: users
        }, { quoted: m });
      }
      else {
        await conn.sendMessage(m.chat, {
          text: quoted.text || text || '',
          mentions: users
        }, { quoted: m });
      }
    }
    else if (text) {
      await conn.sendMessage(m.chat, {
        text: text,
        mentions: users
      }, { quoted: m });
    }
    else {
      return conn.reply(m.chat, '❌ *Uso corretto:*\n\n• `.tag <testo>`\n• Rispondi a media/messaggio con `.tag`', m);
    }
    
  } catch (e) {
    console.error('Errore tag/hidetag:', e);
    conn.reply(m.chat, '❌ *ERRORE*\n\nSi è verificato un errore durante l\'esecuzione', m);
  }
};

handler.help = ['hidetag', 'totag', 'tag'];
handler.tags = ['admin'];
handler.command = /^(hidetag|totag|tag)$/i;
handler.admin = true;
handler.botAdmin = true;
handler.group = true;

export default handler;
