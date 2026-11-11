async function sendLine(message) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_USER_ID;
  if (!token || !to) throw new Error('LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID is missing');
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ to, messages: [message?.type === 'flex' ? message : { type: 'text', text: String(message).slice(0, 4900) }] })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE ${response.status}: ${body.slice(0, 500)}`);
  }
  return true;
}

module.exports = { sendLine };
