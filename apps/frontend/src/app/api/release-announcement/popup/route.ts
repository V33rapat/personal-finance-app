import { getReleaseAnnouncements } from '../release-announcement-bff';

export async function GET() {
  return getReleaseAnnouncements('popup');
}
