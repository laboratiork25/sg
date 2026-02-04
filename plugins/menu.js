import fs from 'fs'

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const chat = global.db.data.chats[m.chat]
    const features = ['welcome', 'antilink', 'antispam', 'antitoxic', 'antilink2', 'detect', 'autosticker', 'antiporno']
    const activeFeatures = features.filter(f => chat[f]).length
    
    let menuText = `╭─ ⋆｡˚ ✦ ─ ⋆｡˚ ✦ ─╮
   🛡️ *S A F E G U A R D* 🛡️
╰─ ⋆｡˚ ✦ ─ ⋆｡˚ ✦ ─╯

Ciao *${m.pushName || 'Admin'}*! ✨ questi sono i comandi!

─── ⋆⋅☆⋅⋆ ───
*👑 AMMINISTRAZIONE*

• promote / p → _Promuovi admin_
• demote / d → _Rimuovi admin_
• kick / k → _Rimuovi utente_
• tagall / tag → _Menziona tutti_
• hidetag → _Tag nascosto_
• apri / chiudi → _Gestione gruppo_
• setnome → _Cambia nome gruppo_
• link / linkqr → _Link gruppo_

─── ⋆⋅☆⋅⋆ ───
*👮 MODERAZIONE*

• warn → _Avvisa utente_
• unwarn → _Rimuovi avviso_
• listawarn → _Lista avvisati_
• inattivi → _Utenti inattivi_
• richieste → _Richieste pendenti_

─── ⋆⋅☆⋅⋆ ───
*🛡️ PROTEZIONE* (${activeFeatures}/8)

• on <funzione> → _Attiva_
• off <funzione> → _Disattiva_
• status → _Mostra stato_

*Funzioni disponibili:*
${chat.welcome ? '✅' : '❌'} welcome - Benvenuto/Addio
${chat.antilink ? '✅' : '❌'} antilink - Blocca link WA
${chat.antilink2 ? '✅' : '❌'} antilink2 - Blocca tutti i link
${chat.antispam ? '✅' : '❌'} antispam - Blocca spam
${chat.antimedia ? '✅' : '❌'} antimedia - Permette solo 1 visual

─── ⋆⋅☆⋅⋆ ───
*⚙️ CONFIGURAZIONE*

• setwelcome → _Messaggio benvenuto_
• setbye → _Messaggio addio_
• regole / setregole → _Regole gruppo_

─── ⋆⋅☆⋅⋆ ───
*👤 COMANDI UTENTI*

• admins → _Avvisa admin_
• link → _Link gruppo_
• sito → _sito chatunity_
• canale → _canale chatunity_

╭─ ⋆｡˚ ✦ ─ ⋆｡˚ ✦ ─╮
  *Sviluppato da ChatUnity* ♡
╰─ ⋆｡˚ ✦ ─ ⋆｡˚ ✦ ─╯`
    
    // Carica immagine
    let imageBuffer
    try {
      imageBuffer = fs.readFileSync('./media/safeguard.jpeg')
    } catch (e) {
      console.log('⚠️ Immagine non trovata')
      imageBuffer = null
    }
    
    // Messaggio SENZA bottoni
    const message = {
      image: imageBuffer,
      caption: menuText
    }
    
    await conn.sendMessage(m.chat, message, { quoted: m })
    
  } catch (e) {
    console.error('Errore menu:', e)
    
    // Fallback
    const chat = global.db.data.chats[m.chat]
    const features = ['welcome', 'antilink', 'antispam', 'antitoxic', 'antilink2', 'detect', 'autosticker', 'antiporno']
    const activeFeatures = features.filter(f => chat[f]).length
    
    let fallbackText = `╭─ ⋆｡˚ ✦ ─╮
  🛡️ *SAFEGUARD* 🛡️
╰─ ⋆｡˚ ✦ ─╯


*Ciao ${m.pushName}!* ✨


*👑 Admin*
promote, demote, kick, tagall, hidetag


*👮 Moderazione*
warn, unwarn, listawarn, inattivi, richieste


*🛡️ Protezione* (${activeFeatures}/8)
on, off, status


*Funzioni:*
${chat.welcome ? '✅' : '❌'} welcome
${chat.antilink ? '✅' : '❌'} antilink
${chat.antispam ? '✅' : '❌'} antispam
${chat.antitoxic ? '✅' : '❌'} antitoxic

*⚙️ Config*
setwelcome, setbye, regole, link

*👤 Utenti*
admins, link

🌐 chatunity.it
📢 whatsapp.com/channel/0029VakH1mu35fM0VqOZWC0W

_Sviluppato da ChatUnity ♡_`

    try {
      const imageBuffer = fs.readFileSync('./media/safeguard.jpeg')
      await conn.sendMessage(m.chat, {
        image: imageBuffer,
        caption: fallbackText
      }, { quoted: m })
    } catch (imgErr) {
      await conn.reply(m.chat, fallbackText, m)
    }
  }
}

handler.help = ['menu', 'help', 'comandi']
handler.tags = ['main']
handler.command = /^(menu|help|comandi|menuadmin)$/i
handler.group = true

export default handler
