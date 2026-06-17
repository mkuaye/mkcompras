import { convertURL } from '../api/client'
import { useAsync } from './useAsync'

export function useConvert() {
  const { execute, ...rest } = useAsync(convertURL)

  const convert = async (url) => {
    const result = await execute(url)
    return result.affiliateUrl
  }

  return { convert, ...rest }
}
