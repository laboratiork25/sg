const handler = async (m, { conn, text, command, usedPrefix, isBotAdmin }) => {
    try {
        if (!isBotAdmin) {
            return m.reply('🤖 *BOT NON ADMIN*\n\nIl bot deve essere admin per usare questo comando.');
        }
        
        // Prendi target da mention o quoted
        const mention = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : null;
        
        if (!mention) {
            return m.reply(createUsageMessage(usedPrefix, command));
        }
        
        const target = mention;
        
        // Check bot
        if (target === conn.user.jid) {
            return m.reply('🤖 *Non puoi warnare il bot!*');
        }
        
        // Check owner
        const ownerBot = global.owner[0][0] + '@s.whatsapp.net';
        if (target === ownerBot) {
            return m.reply('🛡️ *Non puoi warnare gli owner!*');
        }
        
        // Check se è admin
        const groupMetadata = conn.chats[m.chat]?.metadata || await conn.groupMetadata(m.chat);
        const participants = groupMetadata?.participants || [];
        const utente = participants.find(u => conn.decodeJid(u.id) === target);
        
        if (utente?.admin === 'superadmin' || utente?.admin === 'admin') {
            return m.reply('👑 *Non puoi warnare gli admin!*');
        }
        
        // Estrai motivo dal text
        const reason = text ? text.replace(/@\d+/g, '').trim() : 'Non specificato';

        const user = getUserData(target);
        if (!user.warns) user.warns = {};
        if (typeof user.warns[m.chat] !== 'number') user.warns[m.chat] = 0;

        user.warns[m.chat] += 1;
        const remainingWarns = user.warns[m.chat];
        
        if (remainingWarns >= 3) {
            user.warns[m.chat] = 0;
            await handleRemoval(conn, m, target);
        } else {
            await handleWarnMessage(conn, m, target, remainingWarns, reason);
        }
        
    } catch (error) {
        console.error('Errore warn:', error);
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

• \`Menziona:\` ${usedPrefix}${command} @utente motivo
• \`Rispondi:\` Rispondi con .${command} motivo`;
}

async function handleWarnMessage(conn, m, target, remainingWarns, reason) {
    const username = target.split('@')[0];
    const emoji = remainingWarns === 1 ? '⚠️' : remainingWarns === 2 ? '🔔' : '🚨';
    
    const message = `${emoji} *AVVERTIMENTO*

👤 @${username}
📝 Motivo: ${reason}
⚠️ Avvertimenti: ${remainingWarns}/3

${remainingWarns === 2 ? '⚠️ _Attenzione: al prossimo warn verrai rimosso dal gruppo_' : ''}`;
    
    await conn.sendMessage(m.chat, {
        text: message,
        mentions: [target]
    }, { quoted: m });
}

async function handleRemoval(conn, m, target) {
    const username = target.split('@')[0];
    const message = `🚨 *LIMITE RAGGIUNTO*

@${username} ha raggiunto 3 avvertimenti ed è stato rimosso dal gruppo.`;
    
    await conn.sendMessage(m.chat, {
        text: message,
        mentions: [target]
    }, { quoted: m });
    
    // Kick usando lo stesso metodo del plugin kick
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
}

handler.command = ['avverti', 'warn', 'avvertimento'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
