export type EmailMessage = {
  id: string
  sender: string
  timestamp: string
  recipient: string
  html?: string
  text?: string
  subject?: string
}
