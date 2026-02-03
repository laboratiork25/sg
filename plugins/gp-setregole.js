let handler = async function (m, { conn, text, usedPrefix }) {
  let chat = global.db.data.chats[m.chat];
  
  if (text) {
    chat.rules = text;
    await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ✅ ╭ \`REGOLE IMPOSTATE\` ╯ 』˚｡⋆\n\n『 📜 』Regole del gruppo salvate con successo\n\n> Usa .regole per visualizzarle`.trim(), m);
  } else {
    await conn.reply(m.chat, `ㅤㅤ⋆｡˚『 ⚠️ ╭ \`TESTO MANCANTE\` ╯ 』˚｡⋆\n\n『 📝 』Specifica le regole del gruppo\n\n> Esempio: ${usedPrefix}setregole Rispetta tutti i membri`.trim(), m);
  }
};

handler.help = ['setrules <text>'];
handler.tags = ['group'];
handler.command = ['setrules', 'setregole'];
handler.group = true;
handler.admin = true;

export default handler;
