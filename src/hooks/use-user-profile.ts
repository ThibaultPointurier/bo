import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getProfile } from '@/lib/api'
import { getStoredUser, setAuth, getStoredToken } from '@/lib/auth'

/**
 * Hook personnalisé pour gérer le profil utilisateur
 * Rafraîchit automatiquement les permissions depuis l'API
 */
export function useUserProfile() {
  const storedUser = getStoredUser()
  const token = getStoredToken()

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getProfile,
    enabled: !!storedUser && !!token,
    // Rafraîchir toutes les 5 minutes
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  // Mettre à jour le sessionStorage quand le profil change
  useEffect(() => {
    if (profile && token) {
      setAuth(token, profile)
    }
  }, [profile, token])

  // Retourner le profil à jour ou le profil stocké
  return profile ?? storedUser
}

