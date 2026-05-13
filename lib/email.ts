import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
  return _resend
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Berak <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.easypunto.live'
const LOGO_URL = `${APP_URL}/logo.png`

// ─── Shared layout ────────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Berak</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background-color:#0f2441;padding:28px 36px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:14px;">
                  <img src="${LOGO_URL}" alt="Berak" width="44" height="44"
                    style="display:block;border-radius:8px;object-fit:contain;" />
                </td>
                <td style="vertical-align:middle;">
                  <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;line-height:1.1;">BERAK</div>
                  <div style="color:rgba(255,255,255,0.6);font-size:10px;font-weight:500;letter-spacing:3px;text-transform:uppercase;margin-top:2px;">IglesiaJCReina</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 36px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
              © ${new Date().getFullYear()} IglesiaJCReina · Plataforma Berak<br/>
              Este correo fue generado automáticamente, no respondas a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Email: Bienvenida ────────────────────────────────────────────────────────

export async function sendWelcomeEmail({
  to,
  email,
  password,
  nombre,
}: {
  to: string
  email: string
  password: string
  nombre?: string
}) {
  const greeting = nombre ? `Hola, <strong>${nombre}</strong>` : 'Hola'

  const html = emailWrapper(`
    <h1 style="margin:0 0 8px 0;color:#0f2441;font-size:24px;font-weight:700;">¡Bienvenido a Berak!</h1>
    <p style="margin:0 0 24px 0;color:#64748b;font-size:15px;">Plataforma de gestión · IglesiaJCReina</p>

    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.7;">
      ${greeting}, tu cuenta ha sido creada exitosamente.
      A continuación encontrarás tus credenciales de acceso a la plataforma.
    </p>

    <!-- Credentials box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:#f0f4ff;border:1px solid #c7d7fd;border-radius:10px;padding:20px 24px;">
          <p style="margin:0 0 4px 0;color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Tus credenciales</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid #dbeafe;">
                <span style="color:#6b7280;font-size:13px;font-weight:500;">Usuario</span>
              </td>
              <td style="padding:6px 0;border-bottom:1px solid #dbeafe;text-align:right;">
                <span style="color:#1e3a8a;font-size:14px;font-weight:600;">${email}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;padding-top:10px;">
                <span style="color:#6b7280;font-size:13px;font-weight:500;">Contraseña</span>
              </td>
              <td style="padding:6px 0;padding-top:10px;text-align:right;">
                <span style="color:#1e3a8a;font-size:14px;font-weight:600;font-family:monospace;background:#dbeafe;padding:3px 8px;border-radius:4px;">${password}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-radius:8px;background-color:#1e40af;">
          <a href="${APP_URL}/login" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
            Ingresar a la plataforma →
          </a>
        </td>
      </tr>
    </table>

    <!-- Security note -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;">
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
            <strong>⚠️ Recomendación de seguridad:</strong> Por favor cambia tu contraseña
            después de tu primer inicio de sesión.
          </p>
        </td>
      </tr>
    </table>
  `)

  return getResend().emails.send({
    from: FROM,
    to,
    subject: '¡Bienvenido a Berak! Tus credenciales de acceso',
    html,
  })
}

// ─── Email: Recuperación de contraseña (para Supabase custom SMTP) ────────────
// Este template va en Supabase → Authentication → Email Templates → Reset Password
// Variables disponibles: {{ .ConfirmationURL }}

export function getPasswordResetTemplate(): string {
  return emailWrapper(`
    <h1 style="margin:0 0 8px 0;color:#0f2441;font-size:24px;font-weight:700;">Recuperación de contraseña</h1>
    <p style="margin:0 0 28px 0;color:#64748b;font-size:15px;">Plataforma de gestión · IglesiaJCReina</p>

    <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.7;">
      Recibiste este correo porque se solicitó restablecer la contraseña
      de tu cuenta en la plataforma <strong>Berak</strong>.
    </p>

    <p style="margin:0 0 28px 0;color:#374151;font-size:15px;line-height:1.7;">
      Haz clic en el botón para crear una nueva contraseña:
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="border-radius:8px;background-color:#1e40af;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
            Restablecer contraseña →
          </a>
        </td>
      </tr>
    </table>

    <!-- Security note -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 6px 0;color:#6b7280;font-size:13px;line-height:1.6;">
            🔒 Este enlace expira en <strong>24 horas</strong>.
          </p>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
            Tu cuenta permanece segura.
          </p>
        </td>
      </tr>
    </table>
  `)
}
