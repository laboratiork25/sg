const handler = async (m, { conn }) => {
  const interactiveMessage = {
    body: { 
      text: `ㅤㅤ⋆｡˚『 📢 ╭ \`CANALE CHATUNITY\` ╯ 』˚｡⋆\n\n『 ✦ 』Aggiornamenti bot\n『 ✦ 』Novità e features\n『 ✦ 』Annunci importanti\n『 ✦ 』Tips & tricks\n\n> Seguici per restare sempre aggiornato`.trim()
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
            display_text: '📢 Segui il Canale',
            url: 'https://whatsapp.com/channel/0029VaZVlJZHwXb8naJBQN0J'
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

handler.help = ['canale']
handler.tags = ['info']
handler.command = /^(canale|channel|updates)$/i

export default handler
