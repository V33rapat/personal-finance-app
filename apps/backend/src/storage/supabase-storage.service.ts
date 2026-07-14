import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (this.client) return this.client;

    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase Storage environment variables are not configured');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return this.client;
  }

  async upload(path: string, data: Buffer, contentType: string): Promise<void> {
    const { error } = await this.getClient().storage.from(this.bucket).upload(path, data, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw new Error(`Avatar upload failed: ${error.message}`);
    }
  }

  async createSignedUrl(path: string): Promise<string> {
    const configuredExpiry = Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN || 3600);
    const expiresIn = Number.isFinite(configuredExpiry) && configuredExpiry > 0
      ? configuredExpiry
      : 3600;
    const { data, error } = await this.getClient().storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Avatar URL creation failed: ${error?.message || 'Signed URL is missing'}`);
    }

    return data.signedUrl;
  }

  async remove(path: string | null): Promise<void> {
    if (!path) return;

    const { error } = await this.getClient().storage.from(this.bucket).remove([path]);

    if (error) {
      this.logger.warn(`Could not remove old avatar ${path}: ${error.message}`);
    }
  }
}
