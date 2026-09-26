// Vercel Serverless Function: notifies collupworld@gmail.com by email via Resend
// whenever someone joins the VIP waitlist from business-vip.html.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY   your Resend API key (starts with "re_")
// Optional:
//   RESEND_FROM       verified sender, e.g. "CollUp <hola@collup.app>"
//                      (defaults to Resend's shared test sender, which works with no domain setup)
//   NOTIFY_EMAIL      destination address (defaults to collupworld@gmail.com)

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { name, email, business_type, role } = req.body || {};

    if (!name || !email) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM || 'CollUp <onboarding@resend.dev>';
    const TO = process.env.NOTIFY_EMAIL || 'collupworld@gmail.com';

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not configured');
        res.status(500).json({ error: 'Email provider not configured' });
        return;
    }

    try {
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM,
                to: [TO],
                reply_to: email,
                subject: `Nuevo negocio en lista VIP: ${name}`,
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                        <h2 style="margin-bottom:4px;">Nuevo registro VIP · Negocio</h2>
                        <p style="color:#666;margin-top:0;">Desde business-vip.html</p>
                        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                            <tr><td style="padding:6px 0;color:#666;">Negocio</td><td style="padding:6px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
                            <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;">${escapeHtml(email)}</td></tr>
                            <tr><td style="padding:6px 0;color:#666;">Sector</td><td style="padding:6px 0;">${escapeHtml(business_type || '-')}</td></tr>
                            <tr><td style="padding:6px 0;color:#666;">Rol</td><td style="padding:6px 0;">${escapeHtml(role || 'business')}</td></tr>
                        </table>
                    </div>
                `,
            }),
        });

        if (!resendRes.ok) {
            const detail = await resendRes.text();
            console.error('Resend error', resendRes.status, detail);
            res.status(502).json({ error: 'Email provider error' });
            return;
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('notify-signup error', err);
        res.status(500).json({ error: 'Internal error' });
    }
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
