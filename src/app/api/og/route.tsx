import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'ANYFREEBOOK';
  const subtitle = searchParams.get('subtitle') || '247,000+ Free Books for Every Profession';
  const type = searchParams.get('type') || 'website';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 30%, #a855f7 60%, #d946ef 100%)',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '32px',
            padding: '48px 64px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            width: '100%',
            height: '100%',
          }}
        >
          {type === 'book' && (
            <div
              style={{
                display: 'flex',
                width: '80px',
                height: '100px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                marginBottom: '24px',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
              }}
            >
              📚
            </div>
          )}

          <div
            style={{
              fontSize: type === 'book' ? '48px' : '60px',
              fontWeight: 800,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.2,
              maxWidth: '900px',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
              marginTop: '16px',
              maxWidth: '700px',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '32px',
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '100px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              ANYFREEBOOK.COM
            </div>
            <div
              style={{
                background: '#10b981',
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'white',
              }}
            >
              FREE
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
