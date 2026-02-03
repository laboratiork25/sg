export async function handler(m, { conn, isOwner, text }) {

    if (!text) {
        return m.reply(`📢 *USO BROADCAST*

Invia un messaggio a tutti i gruppi dove il bot è presente.

*Uso:*
• .broadcast <messaggio>
• .bc <messaggio>

*Esempio:*
.broadcast Il bot verrà riavviato tra 5 minuti per manutenzione

_Il messaggio sarà inviato con protezioni anti-ban e retry automatico._`)
    }

    const chats = Object.keys(global.db.data.chats || {})
    const groups = chats.filter(id => id.endsWith('@g.us'))

    if (groups.length === 0) {
        return m.reply('❌ Il bot non è in nessun gruppo!')
    }

    await m.reply(
        `📤 Invio broadcast a *${groups.length}* gruppi...\n\n` +
        `⏱️ Tempo stimato: ~${Math.ceil(groups.length * 3 / 60)} minuti\n\n` +
        `_Attendi..._`
    )

    const message = text

    let sent = 0
    let failed = 0
    const failedGroups = []

    // 🔹 funzione invio sicuro con fallback
    async function safeSend(groupId) {
        // 1️⃣ pre-check: gruppo valido
        try {
            await conn.groupMetadata(groupId)
        } catch {
            // gruppo non più valido → rimuovi dal db
            delete global.db.data.chats[groupId]
            return false
        }

        // 2️⃣ tentativo completo (newsletter + preview)
        try {
            await conn.sendMessage(groupId, {
                text: message,
                contextInfo: {
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363259442839354@newsletter',
                        newsletterName: 'ChatUnity'
                    },
                    externalAdReply: {
                        title: '📢 MESSAGGIO DA DIO',
                        body: 'Messaggio dal creatore del bot',
                        thumbnailUrl: 'https://telegra.ph/file/ba01cc1e5bd64ca9d65ef.jpg',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            })
            return true
        } catch (e) {
            // 3️⃣ fallback: SOLO testo
            try {
                await new Promise(r => setTimeout(r, 1500))
                await conn.sendMessage(groupId, { text: message })
                return true
            } catch {
                return false
            }
        }
    }

    // 🔁 loop gruppi
    for (const groupId of groups) {
        const ok = await safeSend(groupId)

        if (ok) {
            sent++
        } else {
            failed++
            failedGroups.push(groupId)
        }

        // delay base anti-ban
        await new Promise(r => setTimeout(r, 3000))
    }

    // 📊 report finale
    let report = `✅ *BROADCAST COMPLETATO*\n\n`
    report += `📊 *Statistiche:*\n`
    report += `✔️ Inviati: *${sent}/${groups.length}*\n`
    report += `❌ Falliti: *${failed}*\n`
    report += `📈 Successo: *${Math.round((sent / groups.length) * 100)}%*\n`

    if (failed > 0 && failedGroups.length > 0) {
        report += `\n⚠️ *Gruppi falliti:*\n`
        for (let i = 0; i < Math.min(5, failedGroups.length); i++) {
            try {
                const meta = await conn.groupMetadata(failedGroups[i])
                report += `• ${meta.subject}\n`
            } catch {
                report += `• ${failedGroups[i]}\n`
            }
        }
        if (failedGroups.length > 5) {
            report += `_...e altri ${failedGroups.length - 5} gruppi_\n`
        }
    }

    await m.reply(report)
}

handler.command = /^(keys10)$/i
export default handler