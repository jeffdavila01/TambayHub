export function registrationError(error: { message: string, code?: string }): string {
 const text = `${error.code || ''} ${error.message}`.toLowerCase()
 if (text.includes('email_address_not_authorized') || text.includes('not authorized')) return 'Hindi ma-send ang verification email sa address na ito. Kailangan i-configure ng app owner ang custom SMTP sa Supabase para makapag-register ang public users.'
 if (text.includes('over_email_send_rate_limit') || text.includes('email rate limit')) return 'Naabot ang email sending limit. Subukan ulit mamaya. Kailangang i-check ng app owner ang Supabase email provider at rate limits.'
 if (text.includes('signup_disabled')) return 'Hindi enabled ang new account registration. Contact the app owner.'
 if (text.includes('database error saving new user')) return 'Hindi ma-save ng Supabase ang bagong account. Kailangang i-check ng app owner ang profile trigger at Auth logs.'
 return error.message
}
