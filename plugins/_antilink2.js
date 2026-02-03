const urlRegex = /(https?:\/\/[^\s]+)/gi;

export async function before(m, { conn, isAdmin, isBotAdmin }) {
    // Ignora messaggi del bot
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return true;

    const chat = global.db.data.chats[m.chat];
    
    // Se antilink2 non è attivo, passa avanti
    if (!chat || !chat.antilink2) return true;

    // Se admin, ignora
    if (isAdmin || m.isAdmin) return true;

    const text = m.text || '';
    
    // Check se contiene link
    const hasLink = urlRegex.test(text);
    
    if (!hasLink) return true;

    // Bot non admin
    if (!isBotAdmin && !m.isBotAdmin) {
        await conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ⚠️ ╭ `ANTILINK2 ATTIVO` ╯ 』˚｡⋆\n\n『 🤖 』Rilevato link ma non posso eliminare\n\n> Dammi i permessi admin!'.trim(), m);
        return true;
    }

    // ELIMINA MESSAGGIO E RIMUOVI UTENTE
    try {
        const user = `@${m.sender.split('@')[0]}`;
        const linkPreview = text.match(urlRegex)?.[0].substring(0, 35) || 'Link';
        
        console.log('🌐 ANTILINK2:', {
            user: m.sender.split('@')[0],
            isAdmin: isAdmin,
            isBotAdmin: isBotAdmin,
            link: text.match(urlRegex)?.[0]
        });
        
        // Elimina messaggio
        await conn.sendMessage(m.chat, {
            delete: m.key
        });

        // Avvisa
        await conn.sendMessage(m.chat, {
            text: `ㅤㅤ⋆｡˚『 🌐 ╭ \`KICK LINK\` ╯ 』˚｡⋆\n\n『 👤 』${user}\n『 🔗 』\`${linkPreview}${linkPreview.length >= 35 ? '...' : ''}\`\n『 📛 』Link non autorizzato\n\n> Rimosso dal gruppo`.trim(),
            mentions: [m.sender]
        });

        // Rimuovi utente
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');

        return false; // Blocca ulteriore elaborazione
    } catch (e) {
        console.error('Errore antilink2 removal:', e);
        await conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ❌ ╭ `ERRORE` ╯ 』˚｡⋆\n\n『 ⚠️ 』Errore durante la rimozione dell\'utente'.trim(), m);
        return true;
    }
}

export const disabled = false
