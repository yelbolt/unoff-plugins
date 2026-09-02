import { getSupabase } from '.'

const checkConnectionStatus = async (
  accessToken: string | undefined,
  refreshToken: string | undefined
) => {
  if (accessToken !== undefined && refreshToken !== undefined) {
    const supabase = getSupabase()

    if (!supabase) throw new Error('Supabase client is not initialized')

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (!error) return data
    else throw error
  }
}

export default checkConnectionStatus
