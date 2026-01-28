import axios, { AxiosInstance } from 'axios';

interface CloudflareStreamResponse<T = any> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

interface UploadVideoResponse {
  uid: string;
  uploadURL: string;
}

interface VideoDetails {
  uid: string;
  name?: string;
  status: 'queued' | 'inprogress' | 'ready' | 'error';
  duration?: number;
  thumbnail?: string;
  preview?: string;
  created?: string;
  modified?: string;
}

class CloudflareStreamClient {
  private accountId: string;
  private apiToken: string;
  private baseURL: string;
  private client: AxiosInstance;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

    if (!this.accountId || !this.apiToken) {
      throw new Error(
        'Cloudflare credentials are missing: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN'
      );
    }

    this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Request a signed URL for direct uploads
   */
  async requestUploadURL(): Promise<{ uploadURL: string; videoId: string }> {
    try {
      const response = await this.client.post<CloudflareStreamResponse<UploadVideoResponse>>(
        '/upload',
        {}
      );

      if (!response.data.success) {
        throw new Error(response.data.errors[0]?.message || 'Failed to get upload URL');
      }

      return {
        uploadURL: response.data.result.uploadURL,
        videoId: response.data.result.uid,
      };
    } catch (error) {
      console.error('Error requesting upload URL:', error);
      throw error;
    }
  }

  /**
   * Get video details by ID
   */
  async getVideoDetails(videoId: string): Promise<VideoDetails> {
    try {
      const response = await this.client.get<CloudflareStreamResponse<VideoDetails>>(
        `/${videoId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.errors[0]?.message || 'Failed to get video details');
      }

      return response.data.result;
    } catch (error) {
      console.error('Error getting video details:', error);
      throw error;
    }
  }

  /**
   * Delete a video by ID
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      const response = await this.client.delete<CloudflareStreamResponse>(
        `/${videoId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.errors[0]?.message || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  /**
   * List all videos
   */
  async listVideos(limit: number = 100, search?: string): Promise<VideoDetails[]> {
    try {
      const params: any = { limit };
      if (search) {
        params.search = search;
      }

      const response = await this.client.get<CloudflareStreamResponse<VideoDetails[]>>(
        '',
        { params }
      );

      if (!response.data.success) {
        throw new Error(response.data.errors[0]?.message || 'Failed to list videos');
      }

      return response.data.result || [];
    } catch (error) {
      console.error('Error listing videos:', error);
      throw error;
    }
  }

  /**
   * Get playback URL for a video
   */
  getPlaybackURL(videoId: string): string {
    return `https://customer-${this.accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
  }

  /**
   * Get video embed HTML
   */
  getEmbedHTML(videoId: string, options?: { autoplay?: boolean; controls?: boolean }): string {
    const autoplay = options?.autoplay !== false ? 'true' : 'false';
    const controls = options?.controls !== false ? 'true' : 'false';

    return `<iframe 
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
      allowFullScreen="true" 
      src="https://customer-${this.accountId}.cloudflarestream.com/${videoId}/iframe?autoplay=${autoplay}&controls=${controls}" 
      style="border: none; height: 100%; width: 100%;">
    </iframe>`;
  }
}

let cloudflareStreamClient: CloudflareStreamClient | null = null;

export const getCloudflareStreamClient = (): CloudflareStreamClient => {
  if (!cloudflareStreamClient) {
    cloudflareStreamClient = new CloudflareStreamClient();
  }
  return cloudflareStreamClient;
};

export { CloudflareStreamClient, VideoDetails };
