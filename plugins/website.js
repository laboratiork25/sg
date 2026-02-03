const handler = async (m, { conn }) => {
  const interactiveMessage = {
    body: { 
      text: `｡˚『 🌐╭ \`CHATUNITY WEBSITE\` ╯ 』˚｡⋆\n\n『 💻 』Visita il nostro sito ufficiale\n『 🚀 』Scopri tutti i nostri progetti`.trim()
    },
    footer: { 
      text: '© ChatUnity' 
    },
    header: {
      hasMediaAttachment: false
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: '🌐 Visita il Sito',
            url: 'https://chatunity.it'
          })
        }
      ]
    }
  }

  await conn.relayMessage(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: interactiveMessage
      }
    }
  }, {})
}

handler.command = ['website', 'sito']
handler.tags = ['info']
handler.help = ['website', 'sito']
handler.group = true

export default handler
