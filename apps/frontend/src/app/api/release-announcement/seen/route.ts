import { NextRequest } from 'next/server';
import { updateReleaseAnnouncementState } from '../release-announcement-bff';

export async function POST(request: NextRequest) {
  return updateReleaseAnnouncementState('seen', request);
}
