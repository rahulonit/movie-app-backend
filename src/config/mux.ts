import Mux from '@mux/mux-node';

const getMuxClient = (): Mux => {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error('Mux credentials are missing: set MUX_TOKEN_ID and MUX_TOKEN_SECRET');
  }

  return new Mux(tokenId, tokenSecret);
};

export { getMuxClient };

// Helper functions
export const createMuxAsset = async (
  videoUrl: string
): Promise<{ assetId: string; playbackId: string }> => {
  try {
    const mux = getMuxClient();
    const asset = await mux.Video.Assets.create({
      input: [{ url: videoUrl }],
      playback_policy: ['public'],
      mp4_support: 'standard'
    });

    // Wait for asset to be ready and get playback ID
    const playbackId = asset.playback_ids?.[0]?.id || '';

    return {
      assetId: asset.id,
      playbackId
    };
  } catch (error) {
    console.error('Error creating Mux asset:', error);
    throw error;
  }
};

export const createMuxUploadUrl = async (): Promise<{
  uploadUrl: string;
  assetId: string;
}> => {
  try {
    const mux = getMuxClient();
    const upload = await mux.Video.Uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard'
      },
      cors_origin: '*'
    });

    return {
      uploadUrl: upload.url,
      assetId: upload.asset_id || ''
    };
  } catch (error) {
    console.error('Error creating Mux upload URL:', error);
    throw error;
  }
};

export const deleteMuxAsset = async (assetId: string): Promise<void> => {
  try {
    const mux = getMuxClient();
    await mux.Video.Assets.del(assetId);
  } catch (error) {
    console.error('Error deleting Mux asset:', error);
    throw error;
  }
};

export const getMuxAsset = async (assetId: string) => {
  try {
    const mux = getMuxClient();
    const asset = await mux.Video.Assets.get(assetId);
    return asset;
  } catch (error) {
    console.error('Error retrieving Mux asset:', error);
    throw error;
  }
};

export const getMuxPlaybackUrl = (playbackId: string): string => {
  return `https://stream.mux.com/${playbackId}.m3u8`;
};
