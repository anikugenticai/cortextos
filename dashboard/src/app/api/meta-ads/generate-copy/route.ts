import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface CopyVariation {
  primary_text: string;
  headline: string;
}

interface GenerateCopyRequest {
  product: string;
  audience: string;
  tone: string;
  imageDescription?: string;
}

function generateVariations(input: GenerateCopyRequest): CopyVariation[] {
  const { product, audience, tone, imageDescription } = input;
  const imageHook = imageDescription ? ` ${imageDescription}.` : '';

  const templates: CopyVariation[] = [
    // Variation 1: Pain-point hook
    {
      primary_text: `Tired of struggling with ${product.toLowerCase()} that doesn't deliver? ${audience} are switching to a smarter solution.${imageHook} Stop wasting time and money — get results that actually matter. Click below to see how.`,
      headline: `${audience}: Stop Settling`,
    },
    // Variation 2: Desire-driven hook
    {
      primary_text: `What if you could transform your results with ${product}? Thousands of ${audience.toLowerCase()} already have.${imageHook} This is your chance to join them — but only if you act now. Spots are limited.`,
      headline: `Transform Your Results Today`,
    },
    // Variation 3: Social proof hook
    {
      primary_text: `${audience} are raving about ${product}. The results speak for themselves — and now it’s your turn.${imageHook} Don’t wait until it’s too late. Tap below to claim your spot before they’re gone.`,
      headline: `See Why They’re Raving`,
    },
  ];

  // Adjust tone
  if (tone === 'professional' || tone === 'formal') {
    return templates.map(v => ({
      primary_text: v.primary_text
        .replace(/Tired of struggling with/g, 'Looking for a better approach to')
        .replace(/Stop wasting time and money — get/g, 'Achieve')
        .replace(/raving about/g, 'seeing results with')
        .replace(/Tap below/g, 'Click below')
        .replace(/Don't wait until it's too late\./g, "Availability is limited."),
      headline: v.headline,
    }));
  }

  if (tone === 'casual' || tone === 'friendly') {
    return templates.map(v => ({
      primary_text: v.primary_text
        .replace(/Tired of struggling with/g, 'Over dealing with')
        .replace(/Click below to see how\./g, 'Check it out 👇')
        .replace(/Tap below to claim your spot before they're gone\./g, "Grab yours before they're all gone 👇"),
      headline: v.headline,
    }));
  }

  if (tone === 'urgent') {
    return templates.map(v => ({
      primary_text: v.primary_text
        .replace(/Click below to see how\./g, "Act NOW — this won't last.")
        .replace(/Spots are limited\./g, "Spots are filling FAST.")
        .replace(/before they're gone\./g, "before it's too late."),
      headline: v.headline.length <= 36 ? v.headline + ' NOW' : v.headline,
    }));
  }

  return templates;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const product = body.product as string | undefined;
  const audience = body.audience as string | undefined;
  const tone = body.tone as string | undefined;

  if (!product || !audience || !tone) {
    const missing = ['product', 'audience', 'tone'].filter(f => !body[f]);
    return Response.json(
      { error: `Missing required fields: ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  const variations = generateVariations({
    product,
    audience,
    tone,
    imageDescription: body.imageDescription as string | undefined,
  });

  return Response.json({ variations });
}
