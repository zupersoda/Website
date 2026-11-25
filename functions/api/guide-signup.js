/* Cloudflare Pages Function: POST /api/guide-signup
   Adds an email to the Brevo "Free Guide Downloads" list server-side, so the
   Brevo API key never has to sit in client-side JavaScript or in this repo.

   Requires two environment variables, set in the Cloudflare Pages dashboard
   (Settings -> Environment variables) for the Production environment, NOT
   committed here:
     BREVO_API_KEY  - the key from Brevo (Settings -> SMTP & API -> API Keys)
     BREVO_LIST_ID  - the numeric ID of the "Free Guide Downloads" list
                      (open the list in Brevo, the ID is in the page URL,
                      e.g. .../contact/list/5 means the ID is 5)
*/
export async function onRequestPost({ request, env }) {
  const cors = { 'Access-Control-Allow-Origin': '*' };
  try {
    if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) {
      return json({ success: false, message: 'Guide signup is not configured yet.' }, 500, cors);
    }
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').trim();
    const guide = (body.guide || '').trim().slice(0, 200);
    const honeypot = (body.company || '').trim(); // hidden field, humans leave it empty

    if (honeypot) return json({ success: true }, 200, cors); // silently accept bots, don't tip them off

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return json({ success: false, message: 'Please add a valid email address.' }, 400, cors);
    }

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [Number(env.BREVO_LIST_ID)],
        updateEnabled: true,
        attributes: guide ? { LAST_GUIDE_REQUESTED: guide } : undefined,
      }),
    });

    // Brevo returns 204 for a new contact and 400 "duplicate_parameter" if the
    // email is already on the list, both of which are a success from the
    // visitor's point of view: either way, the automation inside Brevo sends
    // the guide.
    if (res.status === 204 || res.status === 201) return json({ success: true }, 200, cors);
    const out = await res.json().catch(() => ({}));
    if (res.status === 400 && out.code === 'duplicate_parameter') return json({ success: true }, 200, cors);

    // Cloudflare's edge replaces 502/504/52x responses with its own generic
    // error page before they reach the browser, hiding whatever body we send.
    // Use a plain 400 instead so the real Brevo error message actually gets
    // through to the signup form.
    console.error('Brevo rejected contact add:', res.status, JSON.stringify(out));
    return json({ success: false, message: out.message || ('Brevo error ' + res.status) }, 400, cors);
  } catch (err) {
    return json({ success: false, message: 'Something went wrong. Please try again.' }, 500, cors);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
