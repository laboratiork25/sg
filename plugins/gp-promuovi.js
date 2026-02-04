const handler = async (m, { conn, usedPrefix, text, isAdmin, isOwner, isBotAdmin }) => {
  try {
    
    let targetJid = null
    
    // Priorità 1: Quoted message
    if (m.quoted?.sender) {
      targetJid = m.quoted.sender
      console.log('✓ Target from QUOTED:', targetJid)
    }
    // Priorità 2: Parse text per @number (anche @lid)
    else if (text && text.includes('@')) {
      const match = text.match(/@(\d+)/);
      if (match) {
        const number = match[1];
        targetJid = number + '@lid';
        console.log('✓ Target from TEXT @lid:', targetJid)
      }
    }
    // Priorità 3: Numero puro
    else if (text && !isNaN(text)) {
      const number = text.trim();
      if (number.length >= 11 && number.length <= 13) {
        targetJid = number + '@s.whatsapp.net';
        console.log('✓ Target from NUMBER:', targetJid)
      } else {
        return conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ❌ ╭ `NUMERO INVALIDO` ╯ 』˚｡⋆\n\n『 📱 』Il numero deve avere 11-13 cifre'.trim(), m)
      }
    }
    
    // Validazione
    if (!targetJid) {
      return conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ℹ️ ╭ `USO CORRETTO` ╯ 』˚｡⋆\n\n『 📝 』`.promote @user` o rispondi a messaggio'.trim(), m)
    }
    
    // Fetch metadata gruppo
    const groupMetadata = await conn.groupMetadata(m.chat)
    const participants = groupMetadata.participants || []
    
    console.log(`\n📋 Cercando in ${participants.length} participants...`)
    
    // Cerca participant con match flessibile
    const targetParticipant = participants.find(p => {
      const pid = p.id
      
      // Match diretto (es: @lid)
      if (pid === targetJid) {
        console.log(`  ✓ Match diretto: ${pid}`)
        return true
      }
      
      // Match solo numero (ignora suffisso)
      const pidNumber = pid.replace(/[^0-9]/g, '')
      const targetNumber = targetJid.replace(/[^0-9]/g, '')
      
      if (pidNumber === targetNumber && pidNumber.length > 0) {
        console.log(`  ✓ Match numerico: ${pid} = ${targetJid}`)
        return true
      }
      
      return false
    })
    
    if (!targetParticipant) {
      console.log('❌ Participant non trovato')
      console.log('Participants disponibili:')
      participants.forEach(p => console.log(`  - ${p.id} | admin: ${p.admin || 'null'}`))
      return conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ❌ ╭ `NON TROVATO` ╯ 』˚｡⋆\n\n『 👤 』L\'utente non è nel gruppo'.trim(), m)
    }
    
    console.log('✅ Target participant found:')
    console.log('   id:', targetParticipant.id)
    console.log('   admin:', targetParticipant.admin)
    
    if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
      return conn.reply(m.chat, 'ㅤㅤ⋆｡˚『 ⚠️ ╭ `GIÀ ADMIN` ╯ 』˚｡⋆\n\n『 👮 』Questo utente è già amministratore'.trim(), m)
    }
    
    // ==================== SCELTA JID PER AZIONE ====================
    let actionJids = []
    
    if (targetParticipant.jid) {
      actionJids.push(targetParticipant.jid)
    }
    
    const decodedId = conn.decodeJid(targetParticipant.id)
    if (decodedId && decodedId !== targetParticipant.id) {
      actionJids.push(decodedId)
    }
    
    actionJids.push(targetParticipant.id)
    
    // Rimuovi duplicati
    actionJids = [...new Set(actionJids)]
    
    console.log('🎯 JID candidati per azione:', actionJids)
    // ==================== FINE SCELTA JID ====================
    
    // Frasi ironiche
    const frasiIroniche = [
      "benvenuto nel club esclusivo",
      "ora può bannare gente a caso",
      "promozione sul campo",
      "da user a dio in 0.2 secondi",
      "uno in più al vertice",
      "welcome to the admin zone",
      "promosso come si deve",
      "ora ha i poteri cosmici",
      "benvenuto tra gli eletti",
      "upgrade completato boss",
      "mamma mia che scalata",
      "sei arrivato in cima",
      "plot twist: ora sei admin",
      "character development positivo",
      "achievement unlocked: admin",
      "inizia la pacchia"
    ]
    
    const fraseRandom = frasiIroniche[Math.floor(Math.random() * frasiIroniche.length)]
    
    // Prova tutti i JID finché uno funziona
    let success = false
    let lastError = null
    
    for (const jid of actionJids) {
      try {
        console.log(`🚀 Tentativo promote con JID: ${jid}`)
        await conn.groupParticipantsUpdate(m.chat, [jid], 'promote')
        success = true
        console.log('✅ Promote success!')
        break
      } catch (e) {
        console.log(`❌ Fallito con ${jid}:`, e.message)
        lastError = e
      }
    }
    
    if (!success) {
      console.error('❌ Tutti i JID hanno fallito')
      throw lastError || new Error('Impossibile promuovere utente')
    }
    

    const displayNumber = targetParticipant.id.split('@')[0]
    await conn.sendMessage(m.chat, {
      text: `ㅤㅤ⋆｡˚『 👑 ╭ \`PROMOZIONE\` ╯ 』˚｡⋆\n\n『 👤 』@${displayNumber}\n『 💬 』${fraseRandom}\n\n> Promosso ad amministratore`.trim(),
      mentions: [targetParticipant.id]
    }, { quoted: m })
    
    console.log('✅ Comando completato!\n')
    
  } catch (e) {
    console.error('❌ Errore promote:', e)
    conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ❌ ╭ \`ERRORE\` ╯ 』˚｡⋆\n\n『 ⚠️ 』${e.message || 'Impossibile promuovere l\'utente'}`.trim(), m)
  }
}


handler.help = ['promote']
handler.tags = ['admin']
handler.command = /^(promote|promuovi|mettiadmin|p)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true


export default handler
