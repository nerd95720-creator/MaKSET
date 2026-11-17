import { Share } from '@capacitor/share';
import { isNativeCapacitor } from './capacitor';

export async function shareTextOrUrl(
  title: string,
  text: string,
  channel: string,
  recipientPhone: string | undefined,
  toast: (msg: string) => void,
): Promise<void> {
  const cleanPhone = (recipientPhone || '').replace(/[^\d+]/g, '');
  if (channel === 'WhatsApp') {
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    toast('WhatsApp opens with this note ready to send');
    return;
  }
  if (channel === 'SMS') {
    const url = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
    window.location.href = url;
    toast('SMS opens with this note ready to send');
    return;
  }

  if (isNativeCapacitor()) {
    try {
      await Share.share({ title, text, dialogTitle: title });
      return;
    } catch {
      // User cancelled or fallback to web/clipboard
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      // Fallback to clipboard
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Summary copied to clipboard');
      return;
    } catch {
      // Ignore clipboard failure
    }
  }
}
