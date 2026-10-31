export function invitationError(error: { message: string, code?: string }): string {
 if (['PGRST202','PGRST205','42P01','42883'].includes(error.code || '')) return 'Room invitations are not set up yet. The app owner needs to run the room invitations SQL migration in Supabase.'
 return error.message
}
