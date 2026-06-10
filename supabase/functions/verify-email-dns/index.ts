import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const BodySchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(253)
    .regex(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
})

type CheckStatus = 'pass' | 'fail' | 'unknown'
type CheckResult = { status: CheckStatus; detail: string; record?: string }

async function resolveTxt(name: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(name, 'TXT')
    // Deno returns string[][] — each record may be split into chunks
    return records.map((r) => (Array.isArray(r) ? r.join('') : String(r)))
  } catch (_e) {
    return []
  }
}

async function checkSpf(domain: string): Promise<CheckResult> {
  const txts = await resolveTxt(domain)
  const spf = txts.find((t) => t.toLowerCase().startsWith('v=spf1'))
  if (!spf) {
    return { status: 'fail', detail: 'No SPF (v=spf1) TXT record found on the root domain.' }
  }
  return { status: 'pass', detail: 'SPF record present.', record: spf }
}

async function checkDmarc(domain: string): Promise<CheckResult> {
  const txts = await resolveTxt(`_dmarc.${domain}`)
  const dmarc = txts.find((t) => t.toLowerCase().startsWith('v=dmarc1'))
  if (!dmarc) {
    return { status: 'fail', detail: 'No DMARC (v=DMARC1) TXT record found at _dmarc subdomain.' }
  }
  const policyMatch = dmarc.match(/p=(none|quarantine|reject)/i)
  const policy = policyMatch ? policyMatch[1].toLowerCase() : 'none'
  return {
    status: 'pass',
    detail: `DMARC record present (policy: ${policy}).`,
    record: dmarc,
  }
}

async function checkDkim(domain: string): Promise<CheckResult> {
  const selectors = ['default', 'google', 'selector1', 'selector2', 's1', 's2', 'mail', 'k1', 'mxvault']
  for (const sel of selectors) {
    const txts = await resolveTxt(`${sel}._domainkey.${domain}`)
    const dkim = txts.find((t) => t.toLowerCase().includes('v=dkim1') || t.toLowerCase().includes('p='))
    if (dkim) {
      return {
        status: 'pass',
        detail: `DKIM record found at selector "${sel}".`,
        record: dkim.length > 120 ? dkim.slice(0, 120) + '…' : dkim,
      }
    }
  }
  return {
    status: 'unknown',
    detail: 'No DKIM record found at common selectors (default, google, selector1, s1, mail). DKIM uses a custom selector chosen by your email provider — check your provider for the exact selector.',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Enter a valid domain (e.g. notify.yourdomain.com).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const { domain } = parsed.data

    const [spf, dkim, dmarc] = await Promise.all([
      checkSpf(domain),
      checkDkim(domain),
      checkDmarc(domain),
    ])

    return new Response(
      JSON.stringify({ domain, checks: { spf, dkim, dmarc }, checkedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
