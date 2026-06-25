'use client'

import { createContext, useContext, useState } from 'react'

interface ResearchContextType {
  isResearching: boolean
  setIsResearching: (v: boolean) => void
}

const ResearchContext = createContext<ResearchContextType>({
  isResearching: false,
  setIsResearching: () => {},
})

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const [isResearching, setIsResearching] = useState(false)
  return (
    <ResearchContext.Provider value={{ isResearching, setIsResearching }}>
      {children}
    </ResearchContext.Provider>
  )
}

export const useResearch = () => useContext(ResearchContext)
