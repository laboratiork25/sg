let handler = async (m, { isOwner, isAdmin, conn, text, participants, args, groupMetadata }) => {
    if (!(isAdmin || isOwner)) return
    
    let message = args.join` ` || 'Messaggio vuoto'
    
    // OTTIMIZZAZIONE: Normalizza tutti i JID e rimuovi duplicati
    const normalizedUsers = []
    const seen = new Set()
    
    for (let user of participants) {
        let jid = user.id || user.jid
        if (!jid) continue
        
        // Normalizza JID
        let normalized = conn.decodeJid(jid)
        
        // Converti @lid in @s.whatsapp.net
        if (normalized.includes('@lid')) {
            // Estrai numero base
            const numberMatch = normalized.match(/(\d+)/)
            if (numberMatch) {
                normalized = numberMatch[1] + '@s.whatsapp.net'
            }
        }
        
        // Assicurati che finisca con @s.whatsapp.net
        if (!normalized.includes('@')) {
            normalized = normalized + '@s.whatsapp.net'
        } else if (normalized.includes('@') && !normalized.includes('@s.whatsapp.net') && !normalized.includes('@g.us')) {
            const num = normalized.split('@')[0]
            normalized = num + '@s.whatsapp.net'
        }
        
        // Skip duplicati
        if (seen.has(normalized)) continue
        seen.add(normalized)
        
        normalizedUsers.push({
            id: normalized,
            number: normalized.split('@')[0]
        })
    }
    
    // Costruisci messaggio
    let tagText = `🔔 *MEMBRI DEL GRUPPO*\n${message}\n\n`
    
    for (let user of normalizedUsers) {
        tagText += `✧ @${user.number}\n`
    }
    
    tagText += '\n══════ •⊰✦⊱• ══════'
    
    // Invia con mention normalizzati
    await conn.sendMessage(m.chat, {
        text: tagText,
        mentions: normalizedUsers.map(u => u.id)
    }, { quoted: m })
}

handler.command = /^(tagall|taggatutti|marcar|todos)$/i
handler.group = true
handler.admin = true
handler.botAdmin = false // Non serve che il bot sia admin per taggare

export default handler
