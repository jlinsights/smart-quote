import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // BridgeLogis Insights는 메인 도메인 /insights 경로 하위에서 서빙
  basePath: '/insights',
  assetPrefix: '/insights',
  reactStrictMode: true,
  poweredByHeader: false,

  // MDX 콘텐츠 페이지 확장자 허용
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],

  // 이미지 최적화 (메인 도메인 자산 공유)
  images: {
    domains: ['bridgelogis.com', 'cdn.bridgelogis.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // 실험적 기능
  experimental: {
    mdxRs: false,
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
  },
});

export default withMDX(nextConfig);
