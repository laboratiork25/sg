const handler = async (m, { conn, args, usedPrefix, command }) => {
  const chat = global.db.data.chats[m.chat]
  
  const features = {
    welcome: { 
      name: 'Welcome/Bye', 
      icon: '👋', 
      desc: 'Messaggi di benvenuto e addio', 
      config: ['.setwelcome', '.setbye'] 
    },
    antilink: { 
      name: 'Antilink', 
      icon: '🔗', 
      desc: 'Elimina link WhatsApp', 
      config: [] 
    },
    antilink2: { 
      name: 'Antilink2', 
      icon: '🌐', 
      desc: 'Elimina tutti i link', 
      config: [] 
    },
    antispam: { 
      name: 'Antispam', 
      icon: '⚡', 
      desc: 'Blocca messaggi ripetuti', 
      config: [] 
    },
    antimedia: { 
      name: 'Antimedia', 
      icon: '🎬', 
      desc: 'Limita media a utenti non-admin', 
      config: [] 
    },

  }
  
  // ==================== COMANDO: .status ====================
  if (command === 'status' || command === 'stato' || command === 'funzioni') {
    // Dettagli funzione specifica
    if (args[0]) {
      const feature = args[0].toLowerCase()
      
      if (!features[feature]) {
        return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ❌ ╭ \`NON TROVATO\` ╯ 』˚｡⋆\n\n『 ⚠️ 』Funzione \`${feature}\` non esiste\n\n> Usa ${usedPrefix}status per vedere tutte`.trim(), m)
      }
      
      const f = features[feature]
      const isActive = chat[feature] || false
      const status = isActive ? '✅ ATTIVO' : '❌ DISATTIVO'
      
      let text = `ㅤㅤ⋆｡˚『 ${f.icon} ╭ \`${f.name.toUpperCase()}\` ╯ 』˚｡⋆\n\n`
      text += `『 📊 』Stato: *${status}*\n`
      text += `『 📝 』${f.desc}\n\n`
      text += `*Gestione:*\n`
      text += `• ${usedPrefix}on ${feature}\n`
      text += `• ${usedPrefix}off ${feature}\n`
      
      if (f.config.length > 0) {
        text += `\n*Configurazione:*\n`
        f.config.forEach(cmd => {
          text += `• ${cmd}\n`
        })
      }
      
      // Mostra statistiche specifiche
      if (feature === 'antispam' && chat.antispamData) {
        const spammers = Object.keys(chat.antispamData).length
        text += `\n*Statistiche:*\n`
        text += `• Spammer tracciati: ${spammers}\n`
      }
      
      if (feature === 'antimedia' && chat.mediaWarnings) {
        const warned = Object.keys(chat.mediaWarnings).length
        text += `\n*Statistiche:*\n`
        text += `• Utenti avvisati: ${warned}\n`
      }
      
      if ((feature === 'antilink' || feature === 'antitoxic') && chat.warnings) {
        const warned = Object.keys(chat.warnings).length
        text += `\n*Statistiche:*\n`
        text += `• Warning attivi: ${warned}\n`
      }
      
      text += `\n> Usa ${usedPrefix}status per vedere tutte`
      
      return await conn.reply(m.chat, text.trim(), m)
    }
    
    // Mostra tutte le funzioni
    let text = `ㅤㅤ⋆｡˚『 🛡️ ╭ \`STATUS PROTEZIONI\` ╯ 』˚｡⋆\n\n`
    text += `『 📍 』${await conn.getName(m.chat)}\n\n`
    
    let active = 0
    let inactive = 0
    
    for (const [key, feature] of Object.entries(features)) {
      const isActive = chat[key] || false
      const status = isActive ? '✅' : '❌'
      
      if (isActive) active++
      else inactive++
      
      text += `『 ${status} 』${feature.icon} *${feature.name}*\n`
      text += `ㅤㅤ_${feature.desc}_\n\n`
    }
    
    text += `『 📊 』Attive: *${active}/${Object.keys(features).length}*\n`
    text += `『 📊 』Disattive: *${inactive}*\n\n`
    text += `> Usa \`${usedPrefix}status <funzione>\` per dettagli`
    
    return await conn.reply(m.chat, text.trim(), m)
  }
  
  // ==================== COMANDO: .on ====================
  if (command === 'on' || command === 'enable' || command === 'attiva') {
    if (!args[0]) {
      let text = `ㅤㅤ⋆｡˚『 ✅ ╭ \`ATTIVA FUNZIONI\` ╯ 』˚｡⋆\n\n`
      text += `*Uso:* ${usedPrefix}on <funzione>\n\n`
      
      for (const [key, feature] of Object.entries(features)) {
        const status = chat[key] ? '✅' : '❌'
        text += `『 ${status} 』\`${key}\` - ${feature.name}\n`
      }
      
      text += `\n> Esempio: ${usedPrefix}on antispam`
      
      return await conn.reply(m.chat, text.trim(), m)
    }
    
    const feature = args[0].toLowerCase()
    
    if (!features[feature]) {
      return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ❌ ╭ \`NON TROVATO\` ╯ 』˚｡⋆\n\n『 ⚠️ 』Funzione \`${feature}\` non esiste\n\n> Usa ${usedPrefix}status`.trim(), m)
    }
    
    if (chat[feature]) {
      return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ⚠️ ╭ \`GIÀ ATTIVO\` ╯ 』˚｡⋆\n\n『 ${features[feature].icon} 』*${features[feature].name}* è già attivo`.trim(), m)
    }
    
    chat[feature] = true
    
    // Inizializza dati necessari
    if (feature === 'antilink' || feature === 'antitoxic') {
      if (!chat.warnings) chat.warnings = {}
    }
    
    if (feature === 'antispam') {
      if (!chat.antispamData) chat.antispamData = {}
    }
    
    if (feature === 'antimedia') {
      if (!chat.mediaWarnings) chat.mediaWarnings = {}
    }
    
    return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ✅ ╭ \`ATTIVATO\` ╯ 』˚｡⋆\n\n『 ${features[feature].icon} 』*${features[feature].name}*\n『 📝 』${features[feature].desc}\n\n> La funzione è ora operativa`.trim(), m)
  }
  
  // ==================== COMANDO: .off ====================
  if (command === 'off' || command === 'disable' || command === 'disattiva') {
    if (!args[0]) {
      let text = `ㅤㅤ⋆｡˚『 ❌ ╭ \`DISATTIVA FUNZIONI\` ╯ 』˚｡⋆\n\n`
      text += `*Uso:* ${usedPrefix}off <funzione>\n\n`
      
      for (const [key, feature] of Object.entries(features)) {
        const status = chat[key] ? '✅' : '❌'
        text += `『 ${status} 』\`${key}\` - ${feature.name}\n`
      }
      
      text += `\n> Esempio: ${usedPrefix}off antispam`
      
      return await conn.reply(m.chat, text.trim(), m)
    }
    
    const feature = args[0].toLowerCase()
    
    if (!features[feature]) {
      return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ❌ ╭ \`NON TROVATO\` ╯ 』˚｡⋆\n\n『 ⚠️ 』Funzione \`${feature}\` non esiste\n\n> Usa ${usedPrefix}status`.trim(), m)
    }
    
    if (!chat[feature]) {
      return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ⚠️ ╭ \`GIÀ DISATTIVO\` ╯ 』˚｡⋆\n\n『 ${features[feature].icon} 』*${features[feature].name}* è già disattivo`.trim(), m)
    }
    
    chat[feature] = false
    
    // Pulisci dati se necessario
    if (feature === 'antispam' && chat.antispamData) {
      chat.antispamData = {}
    }
    
    if (feature === 'antimedia' && chat.mediaWarnings) {
      chat.mediaWarnings = {}
    }
    
    return await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ❌ ╭ \`DISATTIVATO\` ╯ 』˚｡⋆\n\n『 ${features[feature].icon} 』*${features[feature].name}*\n\n> La funzione è stata disattivata`.trim(), m)
  }
}

handler.help = ['on', 'off', 'status']
handler.tags = ['group']
handler.command = /^(on|off|enable|disable|attiva|disattiva|status|stato|funzioni)$/i
handler.group = true
handler.admin = true

export default handler
