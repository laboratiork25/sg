export async function before(m, { conn, isAdmin, isBotAdmin }) {
    // Ignora messaggi del bot
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return true;

    const chat = global.db.data.chats[m.chat];
    
    // Se antimedia non è attivo, passa avanti
    if (!chat || !chat.antimedia) return true;

    // Se admin, ignora
    if (isAdmin || m.isAdmin) return true;

    // Check se c'è media (ESCLUSO sticker e audio)
    const hasMedia = !!(
        m.message?.imageMessage ||
        m.message?.videoMessage ||
        m.message?.documentMessage
        // RIMOSSI: audioMessage e stickerMessage
    );

    if (!hasMedia) return true;

    // Bot non admin
    if (!isBotAdmin && !m.isBotAdmin) {
        await conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ⚠️ ╭ `ANTIMEDIA ATTIVO` ╯ 』˚｡⋆\n\n『 🤖 』Rilevato media ma non posso eliminare\n\n> Dammi i permessi admin!'.trim(), m);
        return true;
    }

    // Inizializza warnings
    if (!chat.mediaWarnings) chat.mediaWarnings = {};
    if (!chat.mediaWarnings[m.sender]) chat.mediaWarnings[m.sender] = 0;

    try {
        // Elimina messaggio
        await conn.sendMessage(m.chat, { delete: m.key });

        // Incrementa warn
        chat.mediaWarnings[m.sender]++;
        const warns = chat.mediaWarnings[m.sender];

        const user = `@${m.sender.split('@')[0]}`;
        
        // Determina tipo media
        const mediaType = m.message?.imageMessage ? '📸 Foto' :
                         m.message?.videoMessage ? '🎥 Video' :
                         m.message?.documentMessage ? '📄 Documento' : '📎 Media';

        if (warns < 3) {
            // Avviso
            await conn.sendMessage(m.chat, {
                text: `ㅤㅤ⋆｡˚『 🚫 ╭ \`ANTIMEDIA\` ╯ 』˚｡⋆\n\n『 👤 』${user}\n『 ${mediaType.split(' ')[0]} 』${mediaType.split(' ')[1]} eliminato\n『 ⚠️ 』Avvisi: *${warns}/3*\n\n${warns === 2 ? '> ULTIMO AVVISO! Al prossimo media sarai rimosso' : '> Non puoi inviare media in questo gruppo'}`.trim(),
                mentions: [m.sender]
            });
        } else {
            // Ban al 3° warn
            await conn.sendMessage(m.chat, {
                text: `ㅤㅤ⋆｡˚『 🚫 ╭ \`BAN MEDIA\` ╯ 』˚｡⋆\n\n『 👤 』${user}\n『 📛 』3 avvisi per invio media\n『 ${mediaType.split(' ')[0]} 』${mediaType.split(' ')[1]}\n\n> Rimosso dal gruppo`.trim(),
                mentions: [m.sender]
            });

            // Rimuovi utente
            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');

            // Reset warnings
            delete chat.mediaWarnings[m.sender];
        }

        return false; // Blocca ulteriore elaborazione
    } catch (e) {
        console.error('Errore antimedia:', e);
        await conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ❌ ╭ `ERRORE` ╯ 』˚｡⋆\n\n『 ⚠️ 』Errore durante l\'elaborazione antimedia'.trim(), m);
        return true;
    }
}

export const disabled = false
