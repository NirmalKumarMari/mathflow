const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

const configured = !!(accountSid && authToken && fromNumber);

// Falls back to logging the SMS when Twilio isn't configured, so local dev
// and first deploys work before real credentials are wired up.
export async function sendSms({ to, body }) {
  if (!configured) {
    console.log(`[sms] Twilio not configured — would send to ${to}: ${body}`);
    return;
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Twilio SMS send failed (${res.status}): ${detail}`);
  }
}
