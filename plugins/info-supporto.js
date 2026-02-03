const handler = async (m, { conn }) => {
  const ownerJid = '393773842461@s.whatsapp.net' // Il tuo numero
  
  let supportoText = `╭─ ⋆｡˚ ✦ ─╮
  💬 *SUPPORTO* 💬
╰─ ⋆｡˚ ✦ ─╯

Hai bisogno di aiuto?

Contatta lo sviluppatore:
─── ⋆⋅☆⋅⋆ ───

👤 *Sviluppatore:*
@393773842461

📧 *Per:*
✦ Bug report
✦ Richieste features
✦ Supporto tecnico
✦ Collaborazioni`

  await conn.sendMessage(m.chat, {
    text: supportoText,
    mentions: [ownerJid],
    contextInfo: {
      externalAdReply: {
        title: 'Supporto ChatUnity',
        body: 'Contatta lo sviluppatore',
        thumbnailUrl: 'https://i.imgur.com/5hL3tKj.png',
        mediaType: 1
      }
    }
  }, { quoted: m })
  
  // Invia anche il contatto
  await conn.sendMessage(m.chat, {
    contacts: {
      displayName: 'Vale // ChatUnity',
      contacts: [{
        vcard: `BEGIN:VCARD
VERSION:3.0
N:;Vale // ChatUnity;;;
FN:Vale // ChatUnity | CEO
ORG:ChatUnity;
TEL;type=CELL;type=VOICE;waid=393773842461:+39 377 384 2461
END:VCARD`
      }]
    }
  }, { quoted: m })
}

handler.help = ['supporto', 'owner']
handler.tags = ['info']
handler.command = /^(supporto|support|owner|dev|developer)$/i

export default handler
