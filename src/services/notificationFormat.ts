import type { NotificationItem } from '@/types/notification'

export function isVisibleNotification(item: Pick<NotificationItem, 'type'>) {
  return !['GOODS_RECEIPT_CREATED', 'GOODS_ISSUE_CREATED'].includes(item.type)
}

export function notificationMessage(item: Pick<NotificationItem, 'type' | 'message'>) {
  if (!['GOODS_RECEIPT_CREATED', 'GOODS_RECEIPT_COMMITTED'].includes(item.type)) return item.message
  // Older receipt notifications stored SQL decimal scale literally, e.g. 100.000 kg.
  return item.message.replace(/\b(\d+)\.(\d{1,3})(?=\s+kg\b)/g, (_match, whole: string, fraction: string) => {
    const significant = fraction.replace(/0+$/, '')
    return significant ? `${whole},${significant}` : whole
  })
}
