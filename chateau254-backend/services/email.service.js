const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM || 'Château254 <noreplyreservations@chateau254.co.ke>';

async function send(to, subject, html) {
  if (!resend || !to) return null;
  try {
    return await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error('Email send failed:', e.message);
    return null;
  }
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function emailLayout({ preheader, eyebrow, title, content }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f0e9;color:#28231f;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
    <div style="display:none;font-size:1px;color:#f4f0e9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${escapeHtml(preheader)}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f0e9;width:100%;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td align="center" style="padding:4px 20px 24px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:26px;letter-spacing:3px;color:#672f38;font-weight:bold;">CHÂTEAU<span style="color:#b58a50;">254</span></div>
                <div style="padding-top:5px;font-size:9px;line-height:14px;letter-spacing:2.5px;color:#84796f;">DINING · WINE · MOMENTS</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#672f38;padding:30px 38px 32px;border-radius:8px 8px 0 0;">
                <div style="font-size:10px;line-height:15px;letter-spacing:2px;text-transform:uppercase;color:#e2c393;">${escapeHtml(eyebrow)}</div>
                <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:37px;font-weight:normal;color:#fffaf3;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="background-color:#fffdf9;padding:34px 38px 38px;border:1px solid #e9e1d6;border-top:0;border-radius:0 0 8px 8px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 20px 4px;color:#857b72;font-size:12px;line-height:19px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#672f38;">Your table awaits.</div>
                <div style="padding-top:7px;">Château254 · Nairobi, Kenya</div>
                <div style="padding-top:3px;color:#a1988f;">This is an automated message. Please do not reply to this email.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 17px;font-size:15px;line-height:25px;color:#514a44;">${text}</p>`;
}

function detailPanel(rows) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0;background-color:#f8f4ee;border:1px solid #eee5da;border-radius:6px;">
    ${rows.map(([label, value]) => `<tr>
      <td style="padding:13px 16px;border-bottom:1px solid #e9e0d5;font-size:12px;line-height:18px;letter-spacing:.5px;color:#887d73;">${escapeHtml(label)}</td>
      <td align="right" style="padding:13px 16px;border-bottom:1px solid #e9e0d5;font-size:14px;line-height:20px;font-weight:bold;color:#342d28;">${escapeHtml(value)}</td>
    </tr>`).join('')}
  </table>`;
}

function emailButton(label, href) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;">
    <tr><td align="center" bgcolor="#672f38" style="border-radius:4px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 24px;border:1px solid #672f38;border-radius:4px;color:#fffaf3;text-decoration:none;font-size:14px;line-height:18px;font-weight:bold;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function welcomeEmail(name) {
  const safeName = escapeHtml(name);
  const perks = ['Priority reservations and table booking', 'Loyalty points on every order', 'Exclusive wine cellar access', 'Special offers and events'];
  const list = `<ul style="margin:0 0 22px;padding-left:21px;color:#514a44;font-size:14px;line-height:25px;">${perks.map((perk) => `<li style="padding:2px 0;">${perk}</li>`).join('')}</ul>`;
  return emailLayout({
    preheader: 'Welcome to Château254. We are delighted to have you at our table.',
    eyebrow: 'A seat at our table',
    title: 'Welcome to Château254',
    content: `${paragraph(`Dear ${safeName},`)}${paragraph("We're delighted to have you join our table. As a member you enjoy:")}${list}${paragraph('Visit us soon and make every meal special.')}`,
  });
}

function staffWelcomeEmail(name, email, role, loginLink) {
  return emailLayout({
    preheader: 'Your Château254 team account is ready.',
    eyebrow: 'Team account',
    title: 'Welcome to the team',
    content: `${paragraph(`Dear ${escapeHtml(name)},`)}${paragraph(`You have been added to the Château254 team as <strong style="color:#342d28;">${escapeHtml(role)}</strong>.`)}${detailPanel([['Login email', email], ['Default password', 'staff@chateau254']])}${emailButton('Go to Staff Login', loginLink)}${paragraph('Sign in with the details above, then change your password immediately.')}`,
  });
}

function orderPlacedEmail(name, orderId, total) {
  return emailLayout({
    preheader: `Order #${orderId} has been received.`,
    eyebrow: 'Order update',
    title: 'We have your order',
    content: `${paragraph(`Dear ${escapeHtml(name)}, your order has been placed successfully.`)}${detailPanel([['Order reference', `#${orderId}`], ['Order total', `KES ${Number(total).toLocaleString('en-KE')}`]])}${paragraph("We'll notify you when it's ready.")}`,
  });
}

function orderCompletedEmail(name, orderId) {
  return emailLayout({
    preheader: `Order #${orderId} is complete.`,
    eyebrow: 'Order update',
    title: 'Your order is complete',
    content: `${paragraph(`Dear ${escapeHtml(name)},`)}${paragraph(`Your order <strong style="color:#672f38;">#${escapeHtml(orderId)}</strong> is complete. Thank you for choosing Château254.`)}`,
  });
}

function reservationEmail(name, ref, diningTime, partySize) {
  return emailLayout({
    preheader: `We have received reservation #${ref}.`,
    eyebrow: 'Reservation update',
    title: 'Your table request is in',
    content: `${paragraph(`Dear ${escapeHtml(name)}, we have received your reservation request.`)}${detailPanel([['Reservation reference', `#${ref}`], ['Guests', partySize], ['Date and time', diningTime]])}${paragraph("Our team will confirm your reservation shortly.")}`,
  });
}

function resetPasswordEmail(name, link) {
  return emailLayout({
    preheader: 'Use the secure link to choose a new password.',
    eyebrow: 'Account security',
    title: 'Reset your password',
    content: `${paragraph(`Dear ${escapeHtml(name)}, use the button below to choose a new password for your Château254 account.`)}${emailButton('Reset password', link)}${paragraph('For your security, this link expires in 24 hours.')}`,
  });
}

module.exports = { send, welcomeEmail, staffWelcomeEmail, orderPlacedEmail, orderCompletedEmail, reservationEmail, resetPasswordEmail };
