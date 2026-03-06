import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getProfile } from '@/lib/api'
import { getStoredUser, setAuth, getStoredToken } from '@/lib/auth'

/**
 * Hook personnalisé pour gérer le profil utilisateur
 * Rafraîchit automatiquement les permissions depuis l'API
 */
export function useUserProfile() {
  const [storedUser] = useState(() => getStoredUser())
  const [token] = useState(() => getStoredToken())

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getProfile,
    enabled: !!storedUser && !!token,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (profile && token) {
      setAuth(token, profile)
    }
  }, [profile, token])

  return profile ?? storedUser
}

