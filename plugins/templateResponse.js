const { proto, generateWAMessage, areJidsSameUser } = (await import('@whiskeysockets/baileys')).default

const handler = async (m, { conn }) => {
  // Questo handler non fa nulla, viene usato solo per il .before
  return true
}

handler.before = async function(m, { conn }) {
  if (m.isBaileys) return
  if (!m.message) return
  
  let id
  
  if (m.message.buttonsResponseMessage) {
    id = m.message.buttonsResponseMessage.selectedButtonId
  } else if (m.message.templateButtonReplyMessage) {
    id = m.message.templateButtonReplyMessage.selectedId
  } else if (m.message.listResponseMessage) {
    id = m.message.listResponseMessage.singleSelectReply?.selectedRowId
  } else if (m.message.interactiveResponseMessage) {
    try {
      id = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
    } catch (e) {
      return
    }
  }
  
  if (!id) return
  
  console.log('🔘 Bottone premuto:', id)
  
  try {
    // Modifica il messaggio per far sembrare che l'utente ha digitato il comando
    m.text = id
    m.message = {
      extendedTextMessage: {
        text: id
      }
    }
    
    console.log('📤 Comando elaborato:', id)
    // Non ritornare nulla per far continuare l'elaborazione
    
  } catch (error) {
    console.error('❌ Errore elaborazione bottone:', error)
  }
}

export default handler
