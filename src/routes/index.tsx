import { createFileRoute } from '@tanstack/react-router'
import { Library } from '../components/Library'

export const Route = createFileRoute('/')({
  component: Library,
})
