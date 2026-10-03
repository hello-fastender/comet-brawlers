// MD5 der Protokolle und der Eingabedatei (Kampf 11.3, 11.6) über node:crypto.
// Nur in Node (Prüflauf, Tests); der Kern nutzt es nicht.

import { createHash } from 'node:crypto';

/** MD5 eines Textes in UTF-8, als Hex-Zeichenkette. */
export function md5(text: string): string {
  return createHash('md5').update(text, 'utf8').digest('hex');
}
