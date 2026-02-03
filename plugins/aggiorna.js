import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let handler = async (m, { conn, isOwner }) => {
  if (!isOwner) {
    return m.reply('🛡️ Solo gli owner possono aggiornare il bot')
  }
  
  try {
    await m.reply('🔄 *Aggiornamento in corso...*\n\nAttendi, sto scaricando gli ultimi aggiornamenti da GitHub')
    
    // Esegui git pull
    const { stdout, stderr } = await execAsync('git pull')
    
    let response = '╭━━━『 *GIT PULL* 』━━━╮\n'
    response += '│\n'
    
    if (stdout.includes('Already up to date') || stdout.includes('Già aggiornato')) {
      response += '│ ✅ *Bot già aggiornato*\n'
      response += '│\n'
      response += '│ Nessun aggiornamento disponibile\n'
    } else if (stdout.includes('Updating') || stdout.includes('Fast-forward')) {
      response += '│ ✅ *Aggiornamento completato*\n'
      response += '│\n'
      response += '│ 📝 *Modifiche:*\n'
      
      // Mostra i file modificati
      const lines = stdout.split('\n').filter(line => 
        line.trim() && 
        !line.includes('From') && 
        !line.includes('Updating')
      )
      
      lines.slice(0, 10).forEach(line => {
        response += `│    ${line.trim()}\n`
      })
      
      if (lines.length > 10) {
        response += `│    ... e altri ${lines.length - 10} file\n`
      }
      
      response += '│\n'
      response += '│ ⚠️ *Riavvia il bot per applicare*\n'
      response += '│ Usa: .restart\n'
    } else {
      response += '│ ℹ️ *Output:*\n'
      response += `│ ${stdout.substring(0, 200)}\n`
    }
    
    response += '│\n'
    response += '╰━━━━━━━━━━━━━━━━━━╯'
    
    if (stderr && !stderr.includes('Already up to date')) {
      response += `\n\n⚠️ *Warning:*\n\`\`\`${stderr.substring(0, 200)}\`\`\``
    }
    
    await m.reply(response)
    
  } catch (e) {
    console.error('Errore git pull:', e)
    
    let errorMsg = '❌ *Errore durante l\'aggiornamento*\n\n'
    
    if (e.message.includes('not a git repository')) {
      errorMsg += '⚠️ La directory non è un repository Git\n'
      errorMsg += '\nInizia il bot da una cartella clonata con:\n'
      errorMsg += '`git clone <url-repo>`'
    } else if (e.message.includes('working tree clean')) {
      errorMsg += '⚠️ Hai modifiche locali non committate\n'
      errorMsg += '\nUsa:\n'
      errorMsg += '`git stash` per salvare le modifiche\n'
      errorMsg += '`git pull` per aggiornare\n'
      errorMsg += '`git stash pop` per ripristinare'
    } else {
      errorMsg += `\`\`\`${e.message}\`\`\``
    }
    
    await m.reply(errorMsg)
  }
}

handler.help = ['update', 'gitpull']
handler.tags = ['owner']
handler.command = /^(update|gitpull|aggiorna)$/i
handler.owner = true

export default handler
