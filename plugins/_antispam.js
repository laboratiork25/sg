export async function before(m, { conn, isAdmin, isBotAdmin }) {
    // Ignora messaggi del bot
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return true;

    const chat = global.db.data.chats[m.chat];
    
    // Se antispam non è attivo, passa avanti
    if (!chat || !chat.antispam) return true;

    // Se admin, ignora
    if (isAdmin || m.isAdmin) return true;

    // Bot non admin
    if (!isBotAdmin && !m.isBotAdmin) {
        return true;
    }

    const userId = m.sender;
    const now = Date.now();
    
    if (!chat.antispamData) chat.antispamData = {};
    if (!chat.antispamData[userId]) {
        chat.antispamData[userId] = {
            messages: [],
            warnings: 0
        };
    }
    
    const userData = chat.antispamData[userId];
    
    // Rimuovi vecchi messaggi (più di 10 secondi)
    userData.messages = userData.messages.filter(msg => now - msg < 10000);
    userData.messages.push(now);
    
    // Controlla spam (5 messaggi in 10 secondi)
    if (userData.messages.length >= 5) {
        userData.warnings++;
        
        try {
            // Elimina messaggio
            await conn.sendMessage(m.chat, { delete: m.key });

            const user = `@${userId.split('@')[0]}`;

            if (userData.warnings === 1) {
                // Primo avviso
                await conn.sendMessage(m.chat, {
                    text: `ㅤㅤ⋆｡˚『 ⚡ ╭ \`ANTISPAM\` ╯ 』˚｡⋆\n\n『 👤 』${user} rallenta!\n『 ⚠️ 』Avviso: *1/2*\n\n> Al prossimo spam sarai rimosso`.trim(),
                    mentions: [userId]
                });
                
                userData.messages = [];
                
            } else if (userData.warnings >= 2) {
                // Kick al 2° warn
                await conn.sendMessage(m.chat, {
                    text: `ㅤㅤ⋆｡˚『 🚫 ╭ \`KICK SPAM\` ╯ 』˚｡⋆\n\n『 👤 』${user}\n『 📛 』Spam eccessivo (2/2)\n\n> Rimosso dal gruppo`.trim(),
                    mentions: [userId]
                });

                // Rimuovi utente
                await conn.groupParticipantsUpdate(m.chat, [userId], 'remove');

                // Reset warnings
                delete chat.antispamData[userId];

                return false;
            }
            
        } catch (e) {
            console.error('Errore antispam:', e);
        }
    }

    return true;
}

export const disabled = false
