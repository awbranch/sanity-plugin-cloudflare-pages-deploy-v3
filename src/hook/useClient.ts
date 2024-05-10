import { useClient as useSanityClient, type SanityClient } from 'sanity'

export const useClient = (): SanityClient => {
  return useSanityClient({ apiVersion: '2024-05-10' })
}
