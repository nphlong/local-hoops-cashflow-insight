export type CompanyId = 'local-hoops' | 'tlsc'

const brandUrl = (file: string) => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}${file}`
}

export interface CompanyProfile {
  id: CompanyId
  name: string
  accountNo: string
  mark: string
  /** Folder under /data/v1. Empty keeps the original Local Hoops snapshot. */
  dataDir: string
}

export const COMPANIES: CompanyProfile[] = [
  {
    id: 'local-hoops',
    name: 'Local Hoops',
    accountNo: '7789797968',
    mark: brandUrl('brand/local-hoops-mark.jpg'),
    dataDir: '',
  },
  {
    id: 'tlsc',
    name: 'The Lam Sport Center',
    accountNo: '3395880880',
    mark: brandUrl('brand/tlsc-mark.jpg'),
    dataDir: 'tlsc',
  },
]

const STORAGE_KEY = 'cashflow-company'

export const companyById = (id: CompanyId): CompanyProfile =>
  COMPANIES.find((company) => company.id === id) ?? COMPANIES[0]

export const readStoredCompany = (): CompanyId => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'tlsc' ? 'tlsc' : 'local-hoops'
  } catch {
    return 'local-hoops'
  }
}

export const writeStoredCompany = (id: CompanyId) => {
  localStorage.setItem(STORAGE_KEY, id)
}
