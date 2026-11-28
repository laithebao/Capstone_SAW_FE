import type { ComponentProps } from 'react'
import { Link } from 'react-router'

/** Opt-in link for route transitions managed by the dashboard shell. */
export function DashboardLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} data-saw-transition="" />
}
