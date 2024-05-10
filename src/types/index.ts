import React from 'react'

export type StatusType =
  | 'LOADING'
  
  | 'ERROR'
  | 'INITIATED'
  | 'CANCELED'
  | 'READY'
  | 'BUILDING'
  | 'QUEUED'

export interface PagesTeam {
  [key: string]: unknown
  slug: string
  name: string
  id: string
}

export interface SanityDeploySchema {
  _id: string
  name: string
  url: string
  pagesProject: string
  pagesTeam: PagesTeam
  pagesToken: string
  disableDeleteAction: boolean
}

export interface Deployments {
  [key: string]: unknown
  uid: string
  created: string
  state: string
  url: string
  creator: {
    [key: string]: unknown
    username?: string
  }
  meta: {
    [key: string]: unknown
    githubCommitMessage: string
    githubCommitRef: string
  }
}

export interface PagesDeployConfig {
  name?: string
  icon?: React.ReactNode
  title?: string
}
