import { getAccessToken, getStoredUser, fetchUserProfile } from './linkedinAuth';
import { PostResult } from '../types';

const LINKEDIN_API_VERSION = '202501';
const API_BASE = 'https://api.linkedin.com';

// Get common headers for LinkedIn API calls
const getHeaders = (): HeadersInit => {
  const token = getAccessToken();
  if (!token) throw new Error('No valid LinkedIn access token');

  return {
    'Authorization': `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'Content-Type': 'application/json',
  };
};

// Get user URN (urn:li:person:xxx)
export const getUserUrn = async (): Promise<string> => {
  let user = getStoredUser();
  if (!user) {
    user = await fetchUserProfile();
  }
  if (!user) throw new Error('Unable to get user profile');
  return `urn:li:person:${user.id}`;
};

// Upload image to LinkedIn and get URN
export const uploadImage = async (base64Data: string): Promise<string> => {
  const userUrn = await getUserUrn();
  const accessToken = getAccessToken();
  const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';

  // Step 1: Initialize upload via proxy
  const initResponse = await fetch(`${proxyServerUrl}/api/linkedin/images/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      userUrn,
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.json().catch(() => ({ message: 'Failed to initialize upload' }));
    throw new Error(`Failed to initialize image upload: ${error.message}`);
  }

  const { uploadUrl, imageUrn } = await initResponse.json();

  // Step 2: Upload the binary image data via proxy
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  const uploadResponse = await fetch(`${proxyServerUrl}/api/linkedin/images/upload`, {
    method: 'PUT',
    headers: {
      'x-access-token': accessToken,
      'x-upload-url': uploadUrl,
      'Content-Type': 'application/octet-stream',
    },
    body: binaryData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload image: ${uploadResponse.status}`);
  }

  return imageUrn;
};

// Upload document (PDF) for carousel and get URN
export const uploadDocument = async (pdfBlob: Blob): Promise<string> => {
  const userUrn = await getUserUrn();
  const accessToken = getAccessToken();
  const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';

  // Step 1: Initialize upload via proxy
  const initResponse = await fetch(`${proxyServerUrl}/api/linkedin/documents/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      userUrn,
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.json().catch(() => ({ message: 'Failed to initialize upload' }));
    throw new Error(`Failed to initialize document upload: ${error.message}`);
  }

  const { uploadUrl, documentUrn } = await initResponse.json();

  // Step 2: Upload the PDF via proxy
  const uploadResponse = await fetch(`${proxyServerUrl}/api/linkedin/documents/upload`, {
    method: 'PUT',
    headers: {
      'x-access-token': accessToken,
      'x-upload-url': uploadUrl,
      'Content-Type': 'application/pdf',
    },
    body: pdfBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload document: ${uploadResponse.status}`);
  }

  return documentUrn;
};

// Upload video and get URN
export const uploadVideo = async (videoBlob: Blob): Promise<string> => {
  const userUrn = await getUserUrn();

  // Step 1: Initialize upload
  const initResponse = await fetch(`${API_BASE}/rest/videos?action=initializeUpload`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: userUrn,
        fileSizeBytes: videoBlob.size,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`Failed to initialize video upload: ${error}`);
  }

  const initData = await initResponse.json();
  const uploadUrl = initData.value.uploadInstructions[0]?.uploadUrl;
  const videoUrn = initData.value.video;

  if (!uploadUrl) throw new Error('No upload URL returned for video');

  // Step 2: Upload the video
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
      'Content-Type': 'video/mp4',
    },
    body: videoBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload video: ${uploadResponse.status}`);
  }

  // Step 3: Finalize upload
  await fetch(`${API_BASE}/rest/videos?action=finalizeUpload`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: '',
        uploadedPartIds: [],
      },
    }),
  });

  return videoUrn;
};

// Helper function to create posts via proxy
const createPostViaProxy = async (postData: Record<string, unknown>): Promise<PostResult> => {
  const accessToken = getAccessToken();
  const proxyServerUrl = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:5001';

  const response = await fetch(`${proxyServerUrl}/api/linkedin/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      postData,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create post' }));
    throw new Error(`Failed to create post: ${error.message || JSON.stringify(error)}`);
  }

  const result = await response.json();
  const postId = result.id || '';

  return {
    success: true,
    postId,
    postUrl: postId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}` : undefined,
  };
};

// Create a text-only post
export const createTextPost = async (text: string): Promise<PostResult> => {
  try {
    const userUrn = await getUserUrn();

    return await createPostViaProxy({
      author: userUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Create a post with image
export const createImagePost = async (text: string, imageUrn: string): Promise<PostResult> => {
  try {
    const userUrn = await getUserUrn();

    return await createPostViaProxy({
      author: userUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          id: imageUrn,
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Create a carousel/document post
export const createCarouselPost = async (text: string, documentUrn: string, title?: string): Promise<PostResult> => {
  try {
    const userUrn = await getUserUrn();

    return await createPostViaProxy({
      author: userUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          title: title || 'Carousel',
          id: documentUrn,
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Create a post with video
export const createVideoPost = async (text: string, videoUrn: string, title?: string): Promise<PostResult> => {
  try {
    const userUrn = await getUserUrn();

    return await createPostViaProxy({
      author: userUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          title: title || 'Video',
          id: videoUrn,
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Create an article link post
export const createArticlePost = async (
  text: string,
  articleUrl: string,
  title?: string,
  description?: string,
  thumbnailUrn?: string
): Promise<PostResult> => {
  try {
    const userUrn = await getUserUrn();

    const articleContent: Record<string, unknown> = {
      source: articleUrl,
    };

    if (title) articleContent.title = title;
    if (description) articleContent.description = description;
    if (thumbnailUrn) articleContent.thumbnail = thumbnailUrn;

    return await createPostViaProxy({
      author: userUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: articleContent,
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Helper: Post with image from base64
export const postWithImage = async (text: string, base64Image: string): Promise<PostResult> => {
  try {
    const imageUrn = await uploadImage(base64Image);
    return await createImagePost(text, imageUrn);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Helper: Post carousel from PDF blob
export const postCarousel = async (text: string, pdfBlob: Blob, title?: string): Promise<PostResult> => {
  try {
    const documentUrn = await uploadDocument(pdfBlob);
    return await createCarouselPost(text, documentUrn, title);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Helper: Post video from blob
export const postVideo = async (text: string, videoBlob: Blob, title?: string): Promise<PostResult> => {
  try {
    const videoUrn = await uploadVideo(videoBlob);
    return await createVideoPost(text, videoUrn, title);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Simple helper for Auto-Pilot: Post text-only content to LinkedIn
export const postToLinkedIn = async (text: string): Promise<void> => {
  const result = await createTextPost(text);
  if (!result.success) {
    throw new Error(result.error || 'Failed to post to LinkedIn');
  }
};
