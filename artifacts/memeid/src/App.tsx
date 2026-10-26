import { useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Boxes, Check, ChevronRight, CircleAlert,
  CircleHelp, Code2, Database, FileSearch, Fingerprint, Globe2, ImagePlus, Info, KeyRound,
  Link2, ListFilter, LoaderCircle, LogOut, RefreshCw, Search, Shield, ShieldAlert,
  ShieldCheck, Wallet, X,
} from 'lucide-react';
import {
  getGetPublicIdentityQueryKey, getGetPublicTokenRiskQueryKey, getGetPublicTokenVerificationQueryKey,
  getGetWalletSessionQueryKey, getListIdentitiesQueryKey, useCreateIdentity, useCreateWalletChallenge,
  useGetDashboardOverview, useGetMemeidStatus, useGetPublicIdentity, useGetPublicTokenRisk,
  useGetPublicTokenVerification, useGetWalletSession, useListIdentities,
  useLogoutWallet, usePublishIdentityMetadata, useUploadIdentityArtwork, useVerifyWalletSignature,
} from '@workspace/api-client-react';
import type { Identity, MemeIDStatus, RiskReport, TokenVerification } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { type ReactNode } from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } } });
const navItems = [
  { href: '/', label: 'Registry', icon: Boxes },
  { href: '/discover', label: 'Discover', icon: Search },
  { href: '/register', label: 'Register identity', icon: Fingerprint },
  { href: '/verify', label: 'Verify a mint', icon: ShieldCheck },
  { href: '/risk', label: 'Risk research', icon: Activity },
];
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Unavailable';
const short = (value?: string | null, n = 5) => value ? `${value.slice(0, n)}…${value.slice(-n)}` : 'Unavailable';
const statusText: Record<string, string> = { draft: 'Draft', artwork_uploaded: 'Artwork uploaded', metadata_published: 'Metadata published', nft_verified: 'NFT verified', token_linked: 'Token linked' };
const statusTone: Record<string, string> = { draft: '', artwork_uploaded: 'amber', metadata_published: 'green', nft_verified: 'green', token_linked: 'green' };

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: status } = useGetMemeidStatus();
  const isMainnetReady = status?.cluster === 'mainnet-beta' && status.rpcConfigured && status.rpcHealthy;
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="MemeID registry">
        <span className="brand-mark">M</span><span>MemeID</span><span className="brand-caption">IDENTITY LAYER</span>
      </Link>
      <div className="nav-label">Workspace</div>
      <nav aria-label="Primary navigation">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.href === '/' ? location === '/' : location === item.href || location.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
            <Icon size={16} strokeWidth={1.8}/>{item.label}
          </Link>;
        })}
      </nav>
      <div className="nav-label">Reference</div>
      <Link href="/developers" className={`nav-link ${location === '/developers' ? 'active' : ''}`}><Code2 size={16}/>Developers</Link>
      <Link href="/docs" className={`nav-link ${location === '/docs' ? 'active' : ''}`}><BookOpen size={16}/>Documentation</Link>
      <Link href="/dashboard" className={`nav-link ${location === '/dashboard' ? 'active' : ''}`}><Wallet size={16}/>Creator dashboard</Link>
      <div className="side-bottom">
        <div className="status-note"><span className={`dot ${isMainnetReady ? 'live' : ''}`}/><span>{isMainnetReady ? 'Mainnet RPC responding' : 'Network status is not confirmed'}<br/><span className="mono">{status?.cluster ?? 'Cluster unavailable'}</span></span></div>
        <p className="small muted" style={{ margin: '14px 0 0', lineHeight: 1.6 }}>Identity evidence is not a financial safety guarantee.</p>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="crumb">MemeID <span style={{ color: '#435055' }}>/</span> {navItems.find(n => n.href === location)?.label ?? (location.split('/')[1] || 'Registry').replaceAll('-', ' ')}</div>
        <div className="top-actions">
          <div className="network-pill"><span className={`dot ${isMainnetReady ? 'live' : ''}`}/>{isMainnetReady ? 'MAINNET' : 'NETWORK UNCONFIRMED'}</div>
          <Link href="/dashboard" className="btn"><Wallet size={14}/>Connect wallet</Link>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map(item => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={`mobile-nav-link ${location === item.href ? 'active' : ''}`}><Icon size={14}/><span>{item.label}</span></Link>;
        })}
        <Link href="/dashboard" className={`mobile-nav-link ${location === '/dashboard' ? 'active' : ''}`}><Wallet size={14}/><span>Creator</span></Link>
        <Link href="/developers" className={`mobile-nav-link ${location === '/developers' ? 'active' : ''}`}><Code2 size={14}/><span>Developers</span></Link>
        <Link href="/docs" className={`mobile-nav-link ${location === '/docs' ? 'active' : ''}`}><BookOpen size={14}/><span>Docs</span></Link>
      </nav>
      <div className="content page-fade">{children}</div>
    </main>
  </div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lead">{description}</p></div>{action}</div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusTone[status] ?? ''}`}><span className="dot" style={{ width: 5, height: 5, margin: 0, background: statusTone[status] ? undefined : '#78868a' }}/>{statusText[status] ?? status}</span>;
}

function ErrorState({ title = 'Could not load this record', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return <div className="state-box"><div className="state-icon"><CircleAlert size={17}/></div><strong>{title}</strong><p>{message ?? 'The API did not return a usable response. No records are being inferred.'}</p>{onRetry && <button className="btn" onClick={onRetry}><RefreshCw size={13}/>Try again</button>}</div>;
}

function LoadingRows() {
  return <div style={{ padding: 18 }}>{[0, 1, 2].map(i => <div key={i} style={{ height: 47, marginBottom: 8, borderRadius: 7, background: 'linear-gradient(90deg,#141a1d,#1a2124,#141a1d)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease infinite', opacity: 1 - i * .2 }}/>)}</div>;
}

function RegistryPage() {
  const overview = useGetDashboardOverview();
  const status = useGetMemeidStatus();
  const data = overview.data;
  const retry = () => { void overview.refetch(); void status.refetch(); };
  return <>
    <section className="hero panel">
      <div className="hero-copy">
        <div className="eyebrow">Public identity registry · Solana</div>
        <h1>Every meme has<br/><em>an identity.</em></h1>
        <p className="lead">Verify the identity. Investigate the risk. A public record of project claims, on-chain evidence, and what remains unknown.</p>
        <div className="hero-actions"><Link href="/verify" className="btn btn-primary">Investigate a mint <ArrowRight size={14}/></Link><Link href="/register" className="btn">Register identity <ArrowUpRight size={14}/></Link></div>
      </div>
      <div className="mono small" style={{ zIndex: 1, color: '#69827d', alignSelf: 'flex-end' }}>EVIDENCE FIRST<br/>NO SAFETY PROMISES</div>
    </section>
    {status.isError && <div className="notice error" style={{ marginBottom: 15 }}><CircleAlert size={15}/><span>Service status could not be confirmed. Mainnet availability is not asserted.</span></div>}
    <div className="metrics">
      <div className="panel metric"><div className="metric-label">Registered identities</div><div className="metric-value">{overview.isLoading ? '—' : data?.totalIdentities ?? 'Unavailable'}</div><div className="metric-source">{data ? `SOURCE · ${data.source}` : 'LIVE API REQUIRED'}</div></div>
      <div className="panel metric"><div className="metric-label">Linked token mints</div><div className="metric-value">{overview.isLoading ? '—' : data?.linkedTokens ?? 'Unavailable'}</div><div className="metric-source">IDENTITY ↔ MINT LINKS</div></div>
      <div className="panel metric"><div className="metric-label">Verified identity NFTs</div><div className="metric-value">{overview.isLoading ? '—' : data?.mintedIdentityNfts ?? 'Unavailable'}</div><div className="metric-source">INDEPENDENTLY CONFIRMED</div></div>
    </div>
    <section className="panel" style={{ marginBottom: 22 }}>
      <div className="panel-head"><div><h2 className="panel-title">Service readiness</h2><div className="panel-sub">{status.data ? `Server check · ${formatDate(status.data.checkedAt)}` : 'Only server-reported dependency state is shown'}</div></div><Activity size={15} color="#52d8b4"/></div>
      {status.isLoading ? <LoadingRows/> : status.isError || !status.data ? <div className="state-box" style={{ padding: 22 }}><strong>Readiness unavailable</strong><p>The server status endpoint has not confirmed dependency state.</p><button className="btn" onClick={retry}><RefreshCw size={13}/>Retry status</button></div> : <div style={{ padding: '4px 20px 15px' }}>
        <DataRow label="Cluster" value={status.data.cluster}/>
        <DataRow label="Mainnet RPC" value={status.data.rpcConfigured ? (status.data.rpcHealthy ? 'Configured · responding' : 'Configured · unhealthy') : 'Not configured'}/>
        <DataRow label="Storage" value={status.data.storageConfigured ? 'Configured' : 'Not configured'}/>
        <DataRow label="Database" value={status.data.databaseAvailable ? 'Available' : 'Unavailable'}/>
        <DataRow label="Dependencies" value={status.data.dependencies?.length ? status.data.dependencies.join(' · ') : 'No dependency details returned'}/>
      </div>}
    </section>
    <section className="panel">
      <div className="panel-head"><div><h2 className="panel-title">Recently registered</h2><div className="panel-sub">{data ? `Registry snapshot · ${formatDate(data.updatedAt)}` : 'Only records returned by the public API appear here'}</div></div><Link href="/discover" className="btn btn-quiet">Browse registry <ArrowRight size={13}/></Link></div>
      {overview.isLoading ? <LoadingRows/> : overview.isError ? <ErrorState onRetry={retry} message="Dashboard overview could not be retrieved from the registry API."/> : !data?.recentIdentities?.length ? <div className="state-box"><div className="state-icon"><Database size={17}/></div><strong>No identities returned</strong><p>The live API has not returned any recent identity records.</p><Link href="/register" className="btn">Create an identity</Link></div> : <IdentityTable identities={data.recentIdentities}/>}
    </section>
    <p className="footnote">Registry totals and recent records are served by the live MemeID API. A registered identity records creator-submitted metadata; it does not establish token origin or financial safety.</p>
  </>;
}

function IdentityTable({ identities }: { identities: Identity[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Identity</th><th>Creator</th><th>Record status</th><th>Created</th><th/></tr></thead><tbody>
    {identities.map(id => <tr key={id.projectId} data-testid={`row-identity-${id.projectId}`}><td><Link href={`/identity/${id.projectId}`} className="record-link"><span className="record-avatar">{id.symbol?.slice(0, 2).toUpperCase() || 'ID'}</span><span>{id.name}<span className="small muted" style={{ display: 'block', marginTop: 3 }}>{id.symbol}</span></span></Link></td><td className="mono">{short(id.creatorWallet)}</td><td><StatusBadge status={id.status}/></td><td>{formatDate(id.createdAt)}</td><td><Link href={`/identity/${id.projectId}`} aria-label={`View ${id.name}`}><ChevronRight size={15}/></Link></td></tr>)}
  </tbody></table></div>;
}

function DiscoverPage() {
  const [q, setQ] = useState('');
  const params = useMemo(() => ({ q: q.trim() || undefined, limit: 20, offset: 0 }), [q]);
  const query = useListIdentities(params);
  return <>
    <PageHeader eyebrow="Public records" title="Discover identities" description="Search published identity records. Search results reflect API records, not independent validation of project claims."/>
    <div className="panel" style={{ padding: 15, marginBottom: 15 }}>
      <label className="searchbar"><Search size={16}/><input aria-label="Search identity records" data-testid="input-discover-search" placeholder="Search by project, symbol, wallet, or token…" value={q} onChange={e => setQ(e.target.value)}/>{q && <button className="btn btn-quiet" aria-label="Clear search" onClick={() => setQ('')}><X size={14}/></button>}</label>
      <div className="small muted" style={{ margin: '10px 2px 0' }}>{query.data ? `${query.data.total} matching API record${query.data.total === 1 ? '' : 's'}` : 'Results are queried from the public registry API.'}</div>
    </div>
    <section className="panel">
      <div className="panel-head"><div><h2 className="panel-title">Identity records</h2><div className="panel-sub">No synthetic results are shown</div></div><ListFilter size={15} color="#77878a"/></div>
      {query.isLoading ? <LoadingRows/> : query.isError ? <ErrorState onRetry={() => void query.refetch()} title="Registry search unavailable" message="The public identity endpoint did not return a successful response."/> : !query.data?.items?.length ? <div className="state-box"><div className="state-icon"><FileSearch size={17}/></div><strong>{q ? 'No matching records' : 'No records available'}</strong><p>{q ? 'The live API returned no matching identity records. Try another query.' : 'The live API has not returned any public identity records.'}</p></div> : <IdentityTable identities={query.data.items}/>}
    </section>
    <div className="footnote">Displayed identity fields are submitted by the creator unless explicitly marked as independently verified by the backend. Bags.fm and Meteora values are attribution only unless their origin is separately verified.</div>
  </>;
}

function IdentityPage() {
  const params = useParams<{ projectId: string }>();
  const id = params.projectId ?? '';
  const query = useGetPublicIdentity(id, { query: { enabled: !!id, queryKey: getGetPublicIdentityQueryKey(id) } });
  if (query.isLoading) return <LoadingRows/>;
  if (query.isError || !query.data) return <><PageHeader eyebrow="Public record" title="Identity unavailable" description="No identity record could be retrieved for this project ID."/><div className="panel"><ErrorState onRetry={() => void query.refetch()} title="Record not available" message="The API did not return an identity. This may be an unknown ID or a temporary service issue."/></div></>;
  const identity = query.data;
  return <>
    <PageHeader eyebrow="Public identity" title={identity.name} description={identity.description} action={<StatusBadge status={identity.status}/>}/>
    <div className="result-grid">
      <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Identity record</h2><div className="panel-sub">Project ID · <span className="mono">{identity.projectId}</span></div></div><Fingerprint size={17} color="#4fd7b4"/></div><div style={{ padding: '4px 20px 14px' }}>
        <DataRow label="Ticker" value={identity.symbol}/><DataRow label="Creator wallet" value={identity.creatorWallet} mono/><DataRow label="Created" value={formatDate(identity.createdAt)}/><DataRow label="Last updated" value={formatDate(identity.updatedAt)}/><DataRow label="Launchpad attribution" value={`${identity.launchpad} · ${identity.launchpadAttribution}`}/><DataRow label="Artwork URI" value={identity.artworkUri}/><DataRow label="Artwork hash" value={identity.artworkHash} mono/><DataRow label="Canonical metadata" value={identity.metadataUri}/><DataRow label="Metadata hash" value={identity.metadataHash} mono/><DataRow label="Identity NFT" value={identity.identityNftAddress} mono/><DataRow label="Linked token mint" value={identity.linkedTokenMint} mono/>
      </div></section>
      <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Creator-provided links</h2><div className="panel-sub">Not independently validated by this record</div></div><Globe2 size={17} color="#4fd7b4"/></div><div style={{ padding: '4px 20px 14px' }}><DataRow label="Website" value={identity.website}/><DataRow label="X profile" value={identity.xProfile}/><DataRow label="Telegram" value={identity.telegram}/><DataRow label="Discord" value={identity.discord}/><div className="notice info" style={{ marginTop: 17 }}><Info size={14}/><span>An identity NFT is a project identity artifact. It does not certify financial safety, token ownership, or launchpad origin.</span></div></div></section>
    </div>
  </>;
}
function DataRow({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) { return <div className="data-row"><span>{label}</span><span className={mono ? 'key-value' : ''}>{value || 'Unavailable'}</span></div>; }

function VerifyPage() {
  const [mint, setMint] = useState('');
  const [submitted, setSubmitted] = useState('');
  const verify = useGetPublicTokenVerification(submitted, { query: { enabled: !!submitted, queryKey: getGetPublicTokenVerificationQueryKey(submitted) } });
  const risk = useGetPublicTokenRisk(submitted, { query: { enabled: !!submitted, queryKey: getGetPublicTokenRiskQueryKey(submitted) } });
  const submit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(mint.trim()); };
  return <>
    <PageHeader eyebrow="Mainnet inspection" title="Verify a token mint" description="Inspect on-chain token properties and whether a MemeID record has been linked. Evidence is not an endorsement."/>
    <form className="panel" style={{ padding: 17, marginBottom: 16 }} onSubmit={submit}><label className="searchbar"><Search size={16}/><input aria-label="Solana token mint address" data-testid="input-token-mint" value={mint} onChange={e => setMint(e.target.value)} placeholder="Paste a Solana mint address" maxLength={44}/><button className="btn btn-primary" type="submit" disabled={!mint.trim() || verify.isFetching}>Inspect mint <ArrowRight size={13}/></button></label></form>
    {!submitted ? <div className="panel state-box"><div className="state-icon"><Shield size={17}/></div><strong>Evidence begins with an address</strong><p>Enter a mint to request public verification and risk data from the API. No token records or assessments are fabricated.</p></div> :
      verify.isLoading ? <div className="panel"><LoadingRows/></div> : verify.isError ? <div className="panel"><ErrorState onRetry={() => void verify.refetch()} title="Mint inspection unavailable" message="The API could not return token verification evidence. Confirm the address and try again."/></div> :
      verify.data && <VerificationResult verification={verify.data} risk={risk.data} riskLoading={risk.isLoading} riskError={risk.isError} onRiskRetry={() => void risk.refetch()}/>}
    <p className="footnote">Queries use the public MemeID API and its configured mainnet data sources. No browser-side RPC provider key is used. An identity link is only as strong as the evidence explicitly returned by the API.</p>
  </>;
}

function VerificationResult({ verification: v, risk, riskLoading, riskError, onRiskRetry }: { verification: TokenVerification; risk?: RiskReport; riskLoading: boolean; riskError: boolean; onRiskRetry: () => void }) {
  return <div className="result-grid">
    <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Mint evidence</h2><div className="panel-sub mono">{v.mint}</div></div><span className={`badge ${v.exists ? 'green' : ''}`}>{v.exists ? 'Mint found' : 'Not found'}</span></div><div style={{ padding: '4px 20px 15px' }}>
      <DataRow label="Token program" value={v.tokenProgram} mono/><DataRow label="Supply" value={v.supply} mono/><DataRow label="Decimals" value={v.decimals}/><DataRow label="Mint authority" value={v.mintAuthority} mono/><DataRow label="Freeze authority" value={v.freezeAuthority} mono/><DataRow label="Extensions" value={v.extensions?.length ? v.extensions.join(', ') : 'Unavailable'}/><DataRow label="Last checked" value={formatDate(v.lastUpdatedAt)}/>
      <div style={{ marginTop: 15 }}><h3 className="small muted">Evidence statuses</h3>{Object.entries(v.statuses).map(([key, value]) => <div className="data-row" key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><span className={`badge ${value ? 'green' : ''}`}>{value ? 'Verified' : 'Not verified'}</span></div>)}</div>
      <div className="small muted" style={{ marginTop: 14 }}>Sources: {v.sources?.length ? v.sources.join(' · ') : 'Unavailable'}</div>
    </div></section>
    <div>
      {v.identity ? <div className="panel" style={{ marginBottom: 15 }}><div className="panel-head"><div><h2 className="panel-title">Linked identity</h2><div className="panel-sub">API record association</div></div><Link2 size={15} color="#55d3ae"/></div><div style={{ padding: 18 }}><Link href={`/identity/${v.identity.projectId}`} className="record-link"><span className="record-avatar">{v.identity.symbol.slice(0,2)}</span><span>{v.identity.name}<span className="small muted" style={{ display: 'block', marginTop: 3 }}>{v.identity.symbol}</span></span><ArrowUpRight size={13}/></Link><div className="notice info" style={{ marginTop: 16 }}><Info size={14}/><span>A linked identity describes a submitted project record, not financial safety.</span></div></div></div> : <div className="panel state-box" style={{ marginBottom: 15 }}><div className="state-icon"><Fingerprint size={17}/></div><strong>No linked identity returned</strong><p>The API returned no identity association for this mint.</p></div>}
      <RiskPanel report={risk} loading={riskLoading} error={riskError} retry={onRiskRetry}/>
    </div>
  </div>;
}

function RiskPage() {
  const [mint, setMint] = useState('');
  const [submitted, setSubmitted] = useState('');
  const risk = useGetPublicTokenRisk(submitted, { query: { enabled: !!submitted, queryKey: getGetPublicTokenRiskQueryKey(submitted) } });
  return <>
    <PageHeader eyebrow="Evidence research" title="Risk, with its sources" description="Review sourced observations and confidence. An unavailable score is not a low score; no assessment is a safety signal."/>
    <form className="panel" style={{ padding: 17, marginBottom: 15 }} onSubmit={e => { e.preventDefault(); setSubmitted(mint.trim()); }}><label className="searchbar"><Search size={16}/><input aria-label="Mint for risk report" placeholder="Enter a Solana mint address" value={mint} onChange={e => setMint(e.target.value)} maxLength={44}/><button className="btn btn-primary" type="submit" disabled={!mint.trim()}>Request report <ArrowRight size={13}/></button></label></form>
    {!submitted ? <div className="panel state-box"><div className="state-icon"><ShieldAlert size={17}/></div><strong>No risk assessment requested</strong><p>Submit a mint address to request the API's evidence-based report. Risk will remain unavailable when evidence is insufficient.</p></div> : <RiskPanel report={risk.data} loading={risk.isLoading} error={risk.isError} retry={() => void risk.refetch()}/>}
    <p className="footnote">Methodology, findings, sources, confidence and timestamps are shown only as returned by the API. A score, when present, means higher observed risk. It is not a probability of loss or investment advice.</p>
  </>;
}

function RiskPanel({ report, loading, error, retry }: { report?: RiskReport; loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <section className="panel"><LoadingRows/></section>;
  if (error) return <section className="panel"><ErrorState title="Risk report unavailable" message="The risk endpoint did not return a report. This is not evidence of safety." onRetry={retry}/></section>;
  if (!report) return <section className="panel state-box"><div className="state-icon"><CircleHelp size={17}/></div><strong>Risk data not available</strong><p>No report has been returned for this mint.</p></section>;
  const insufficient = report.availability === 'insufficient_data' || report.score === null;
  return <section className="panel">
    <div className="panel-head"><div><h2 className="panel-title">Evidence assessment</h2><div className="panel-sub mono">{short(report.mint, 7)}</div></div><span className={`badge ${insufficient ? 'amber' : ''}`}>{insufficient ? 'Insufficient data' : 'Assessment available'}</span></div>
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}><div><div className="small muted">Observed risk score</div><div className="risk-score">{report.score === null ? '—' : report.score}<span style={{ font: '12px var(--app-font-mono)', color: '#7c8a8c' }}>{report.score !== null ? ' / 100' : ''}</span></div></div><span className="badge">{report.scoreMeaning.replaceAll('_', ' ')}</span></div>
      {insufficient && <div className="notice" style={{ margin: '16px 0' }}><Info size={14}/><span>This report has insufficient evidence to provide a score. Unavailable is not zero, low risk, or safe.</span></div>}
      {report.warning && <div className="notice info" style={{ margin: '12px 0' }}><Info size={14}/><span>{report.warning}</span></div>}
      <p className="small muted" style={{ lineHeight: 1.7, margin: '14px 0' }}>{report.methodology || 'Methodology unavailable.'}</p>
      <h3 className="small muted" style={{ margin: '20px 0 3px' }}>Findings · {report.findings?.length ?? 0}</h3>
      {report.findings?.length ? report.findings.map(f => <div key={f.id} className="finding"><span className={`badge ${f.severity === 'high' || f.severity === 'critical' ? 'red' : f.severity === 'medium' ? 'amber' : ''}`}>{f.severity}</span><h4 className="finding-title">{f.title}</h4><p>{f.explanation}</p><div className="small muted">Evidence: {f.evidence}</div><div className="small muted" style={{ marginTop: 6 }}>Source: {f.source} · Confidence: {Math.round(f.confidence * 100)}% · {formatDate(f.detectedAt)}</div></div>) : <div className="state-box" style={{ padding: '22px 10px' }}><strong>No findings returned</strong><p>No observations are included in this API response.</p></div>}
      <div className="data-row"><span>Sources</span><span>{report.sources?.length ? report.sources.join(' · ') : 'Unavailable'}</span></div><div className="data-row"><span>Updated</span><span>{formatDate(report.lastUpdatedAt)}</span></div>
    </div>
  </section>;
}

function WalletLogin() {
  const client = useQueryClient();
  const session = useGetWalletSession();
  const challenge = useCreateWalletChallenge();
  const verify = useVerifyWalletSignature();
  const logout = useLogoutWallet();
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const signIn = async () => {
    setError(''); setWorking(true);
    try {
      const w = window as unknown as { solana?: { isPhantom?: boolean; publicKey?: { toString(): string }; connect?: () => Promise<unknown>; signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }> }; solflare?: { publicKey?: { toString(): string }; connect?: () => Promise<unknown>; signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }> } };
      const wallet = w.solana?.isPhantom ? w.solana : w.solflare;
      if (!wallet?.connect || !wallet.signMessage) throw new Error('Install or unlock Phantom or Solflare to continue.');
      await wallet.connect();
      const walletAddress = wallet.publicKey?.toString();
      if (!walletAddress) throw new Error('Wallet did not provide a public address.');
      const ch = await challenge.mutateAsync({ data: { walletAddress } });
      const signed = await wallet.signMessage(new TextEncoder().encode(ch.message), 'utf8');
      const signature = btoa(String.fromCharCode(...signed.signature));
      await verify.mutateAsync({ data: { walletAddress, nonce: ch.nonce, signature, message: ch.message } });
      await client.invalidateQueries({ queryKey: getGetWalletSessionQueryKey() });
    } catch (e) { setError(e instanceof Error ? e.message : 'Wallet sign-in failed.'); }
    finally { setWorking(false); }
  };
  const authenticated = session.data?.authenticated;
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
    {authenticated ? <><span className="badge green"><Wallet size={12}/>{short(session.data?.walletAddress, 4)}</span><button className="btn" onClick={() => logout.mutate(undefined, { onSuccess: () => void client.invalidateQueries({ queryKey: getGetWalletSessionQueryKey() }) })} disabled={logout.isPending}><LogOut size={13}/>Disconnect</button></> : <button className="btn btn-primary" onClick={() => void signIn()} disabled={working}>{working ? <LoaderCircle size={14} className="spin"/> : <Wallet size={14}/>} {working ? 'Waiting for wallet' : 'Connect wallet'}</button>}
    {error && <span className="small" style={{ color: '#dc9b95' }} role="alert">{error}</span>}
  </div>;
}

function DashboardPage() {
  const session = useGetWalletSession();
  const query = useListIdentities({ limit: 50, offset: 0 });
  const walletAddress = session.data?.walletAddress;
  const myIdentities = useMemo(() => query.data?.items.filter(i => i.creatorWallet === walletAddress) ?? [], [query.data?.items, walletAddress]);
  return <>
    <PageHeader eyebrow="Creator workspace" title="Your identity records" description="Wallet-owned records and session status. Records are filtered from the live public identity list." action={<WalletLogin/>}/>
    {session.isLoading ? <div className="panel"><LoadingRows/></div> : session.isError ? <div className="panel"><ErrorState title="Session status unavailable" message="The wallet session endpoint could not be checked." onRetry={() => void session.refetch()}/></div> : !session.data?.authenticated ? <div className="panel state-box"><div className="state-icon"><KeyRound size={17}/></div><strong>No authenticated wallet session</strong><p>Connect Phantom or Solflare and approve signing a one-time MemeID challenge to view your creator records.</p><WalletLogin/></div> : <>
      <div className="panel" style={{ padding: 20, marginBottom: 16 }}><div className="eyebrow">Authenticated creator</div><div className="key-value">{session.data.walletAddress}</div><div className="small muted" style={{ marginTop: 8 }}>Session expires {formatDate(session.data.expiresAt)}</div></div>
      <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Your records</h2><div className="panel-sub">Ownership matched against the authenticated wallet address</div></div><Link href="/register" className="btn btn-primary">New identity <ArrowRight size={13}/></Link></div>
        {query.isLoading ? <LoadingRows/> : query.isError ? <ErrorState onRetry={() => void query.refetch()}/> : !myIdentities.length ? <div className="state-box"><div className="state-icon"><Fingerprint size={17}/></div><strong>No records found for this wallet</strong><p>The public API returned no identity records owned by this authenticated wallet.</p><Link href="/register" className="btn">Create an identity</Link></div> : <IdentityTable identities={myIdentities}/>}
      </section>
    </>}
  </>;
}

function RegisterPage() {
  const client = useQueryClient();
  const session = useGetWalletSession();
  const create = useCreateIdentity();
  const upload = useUploadIdentityArtwork();
  const publish = usePublishIdentityMetadata();
  const [projectId, setProjectId] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', symbol: '', description: '', website: '', xProfile: '', telegram: '', discord: '', launchpad: 'none' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const identityQuery = useGetPublicIdentity(projectId, { query: { enabled: !!projectId, queryKey: getGetPublicIdentityQueryKey(projectId) } });
  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const validate = () => {
    if (!form.name.trim() || form.name.length > 48) return 'Project name is required (48 characters maximum).';
    if (!/^[a-zA-Z0-9]{1,12}$/.test(form.symbol.trim())) return 'Ticker must be 1–12 letters or numbers.';
    if (!form.description.trim() || form.description.length > 1000) return 'Description is required (1,000 characters maximum).';
    for (const key of ['website', 'xProfile', 'telegram', 'discord'] as const) { const value = form[key]; if (value && value.length > 300) return `${key} must be 300 characters or fewer.`; }
    for (const key of ['website', 'xProfile', 'telegram', 'discord'] as const) {
      const value = form[key].trim();
      if (value && !/^https?:\/\//i.test(value)) return `${key} must be a full http or https URL.`;
      if (value) { try { new URL(value); } catch { return `${key} must be a valid URL.`; } }
    }
    if (file && (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024)) return 'Artwork must be an image no larger than 8 MB.';
    return '';
  };
  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault(); const issue = validate(); if (issue) { setNotice(issue); return; }
    setNotice('');
    try {
      const created = await create.mutateAsync({ data: { ...form, name: form.name.trim(), symbol: form.symbol.trim().toUpperCase(), description: form.description.trim(), launchpad: form.launchpad as 'none' | 'bags.fm' | 'meteora' | 'other' } });
      setProjectId(created.projectId);
      if (file) await upload.mutateAsync({ projectId: created.projectId, data: { file } });
      await client.invalidateQueries({ queryKey: getListIdentitiesQueryKey() });
      setNotice('Draft identity created. Continue to publish canonical metadata.');
    } catch (error) { setNotice(apiError(error)); }
  };
  const publishMetadata = async () => {
    setNotice('');
    try {
      await publish.mutateAsync({ projectId });
      await client.invalidateQueries({ queryKey: getGetPublicIdentityQueryKey(projectId) });
      setNotice('Canonical metadata publication completed by the API.');
    } catch (error) { setNotice(apiError(error)); }
  };
  const current = identityQuery.data;
  const isAuthenticated = !!session.data?.authenticated;
  return <>
    <PageHeader eyebrow="Creator workflow" title="Publish an identity" description="Create a wallet-owned record, attach original artwork, then publish canonical metadata through the MemeID API." action={<WalletLogin/>}/>
    {!isAuthenticated && <div className="notice" style={{ marginBottom: 16 }}><Wallet size={15}/><span>An authenticated wallet session is required before creating a record. Sign-in requires an explicit wallet message approval.</span></div>}
    {notice && <div className={`notice ${/failed|error|invalid|must|required|unavailable/i.test(notice) ? 'error' : 'info'}`} role="status" style={{ marginBottom: 15 }}><Info size={15}/><span>{notice}</span></div>}
    <div className="result-grid">
      <form onSubmit={createDraft}>
        <section className="panel form-section"><h2 className="form-section-title">Project details</h2><div className="form-grid">
          <div className="field"><label htmlFor="project-name">Project name *</label><input id="project-name" value={form.name} onChange={e => update('name', e.target.value)} maxLength={48} required/><span className="field-help">Maximum 48 characters</span></div>
          <div className="field"><label htmlFor="project-symbol">Ticker *</label><input id="project-symbol" value={form.symbol} onChange={e => update('symbol', e.target.value)} maxLength={12} required/><span className="field-help">1–12 letters or numbers</span></div>
          <div className="field full"><label htmlFor="project-description">Description *</label><textarea id="project-description" value={form.description} onChange={e => update('description', e.target.value)} maxLength={1000} required/><span className="field-help">{form.description.length}/1,000 · Submitted as creator-provided content</span></div>
          <div className="field"><label htmlFor="project-website">Website</label><input id="project-website" value={form.website} onChange={e => update('website', e.target.value)} maxLength={300} placeholder="https://"/></div>
          <div className="field"><label htmlFor="project-x">X profile</label><input id="project-x" value={form.xProfile} onChange={e => update('xProfile', e.target.value)} maxLength={300} placeholder="https://x.com/"/></div>
          <div className="field"><label htmlFor="project-telegram">Telegram</label><input id="project-telegram" value={form.telegram} onChange={e => update('telegram', e.target.value)} maxLength={300}/></div>
          <div className="field"><label htmlFor="project-discord">Discord</label><input id="project-discord" value={form.discord} onChange={e => update('discord', e.target.value)} maxLength={300}/></div>
          <div className="field full"><label htmlFor="project-launchpad">Launchpad attribution</label><select id="project-launchpad" value={form.launchpad} onChange={e => update('launchpad', e.target.value)}><option value="none">No attribution</option><option value="bags.fm">Bags.fm</option><option value="meteora">Meteora</option><option value="other">Other</option></select><span className="field-help">Attribution is not proof of launchpad origin.</span></div>
        </div></section>
        <section className="panel form-section"><h2 className="form-section-title">Project artwork</h2><input ref={fileRef} type="file" accept="image/*" hidden onChange={e => setFile(e.target.files?.[0] ?? null)}/><button type="button" className="dropzone" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}><ImagePlus size={20} style={{ marginBottom: 8 }}/><div style={{ color: '#c4d1cd', fontSize: 12 }}>{file ? file.name : 'Choose original artwork'}</div><div className="field-help" style={{ marginTop: 6 }}>Image file, up to 8 MB · uploaded as multipart form data</div></button></section>
        <button className="btn btn-primary" type="submit" disabled={!isAuthenticated || create.isPending || upload.isPending}>{create.isPending || upload.isPending ? <LoaderCircle size={14} className="spin"/> : <Fingerprint size={14}/>} {create.isPending || upload.isPending ? 'Creating record…' : 'Create identity draft'}</button>
      </form>
      <div>
        <section className="panel" style={{ padding: 19, marginBottom: 15 }}><div className="eyebrow">Publication steps</div>
          <div className={`step-row ${projectId ? 'complete' : ''}`}><span className="step-number">{projectId ? <Check size={12}/> : '01'}</span>Create a wallet-owned draft</div>
          <div className={`step-row ${current?.artworkUri ? 'complete' : ''}`}><span className="step-number">{current?.artworkUri ? <Check size={12}/> : '02'}</span>Upload and validate artwork</div>
          <div className={`step-row ${current?.metadataUri ? 'complete' : ''}`}><span className="step-number">{current?.metadataUri ? <Check size={12}/> : '03'}</span>Publish canonical metadata</div>
          <div className="step-row"><span className="step-number">04</span>Wallet-approved Core NFT transaction</div>
          {projectId && <button className="btn btn-primary" style={{ width: '100%', marginTop: 15 }} onClick={() => void publishMetadata()} disabled={publish.isPending || !current}>{publish.isPending ? <LoaderCircle size={13}/> : <ArrowUpRight size={13}/>} Publish canonical metadata</button>}
        </section>
        <div className="notice"><CircleAlert size={15}/><span>Minting is not enabled until the API supplies a genuine Core transaction for wallet review. No transaction is fabricated or signed here. Identity registration does not imply token safety.</span></div>
        {current && <section className="panel" style={{ padding: 16, marginTop: 15 }}><h2 className="panel-title">Draft record</h2><div className="small muted" style={{ marginTop: 7 }}>Project ID</div><div className="key-value" style={{ marginTop: 5 }}>{current.projectId}</div><div style={{ marginTop: 12 }}><StatusBadge status={current.status}/></div></section>}
      </div>
    </div>
  </>;
}
function apiError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Request could not be completed. The API did not confirm success.';
}

function DocsPage({ developers = false }: { developers?: boolean }) {
  return <>
    <PageHeader eyebrow={developers ? 'Integration reference' : 'Public API'} title={developers ? 'Build on evidence' : 'API & limitations'} description="A precise guide to the live public endpoints, record semantics, and what MemeID does not claim."/>
    <div className="result-grid">
      <section className="panel" style={{ padding: 20 }}>
        <div className="eyebrow">Public endpoints</div>
        {[
          ['GET', '/api/memeid/status', 'Server-confirmed cluster and dependency readiness'],
          ['GET', '/api/dashboard/overview', 'Live registry totals and recent records'],
          ['GET', '/api/identities?q={query}', 'Search public identity records'],
          ['GET', '/api/identities/{projectId}', 'Read one public identity'],
          ['GET', '/api/tokens/{mint}/verification', 'Token inspection and returned evidence'],
          ['GET', '/api/tokens/{mint}/risk', 'Risk findings or insufficient-data report'],
        ].map(([method, path, meaning]) => <div key={path} style={{ padding: '13px 0', borderBottom: '1px solid #202a2e' }}><div style={{ display: 'flex', gap: 9, alignItems: 'center' }}><span className="badge green">{method}</span><span className="mono small" style={{ color: '#c5d1cf' }}>{path}</span></div><div className="small muted" style={{ marginTop: 7 }}>{meaning}</div></div>)}
        <div className="notice info" style={{ marginTop: 17 }}><Info size={14}/><span>Responses are actual API values only. This interface never substitutes example records or fabricated metrics.</span></div>
      </section>
      <section className="panel" style={{ padding: 20 }}>
        <div className="eyebrow">Interpretation</div>
        <h3 className="panel-title" style={{ marginBottom: 13 }}>A record is not a guarantee</h3>
        <div className="data-row"><span>Identity record</span><span>Creator-submitted project metadata</span></div>
        <div className="data-row"><span>Identity NFT</span><span>Identity artifact, not financial endorsement</span></div>
        <div className="data-row"><span>Token verification</span><span>Specific observed on-chain fields</span></div>
        <div className="data-row"><span>Risk report</span><span>Sourced findings, or insufficient data</span></div>
        <div className="data-row"><span>Launchpad attribution</span><span>Not verified origin by itself</span></div>
        <div className="notice" style={{ marginTop: 17 }}><ShieldAlert size={14}/><span>Missing evidence must be read as unavailable. A missing risk score does not mean a zero score or a safe asset.</span></div>
      </section>
    </div>
    <section className="panel" style={{ padding: 20, marginTop: 16 }}>
      <div className="eyebrow">Creator authentication</div><p className="small muted" style={{ lineHeight: 1.8, marginBottom: 0 }}>The creator workflow requests a short-lived challenge from the API, asks the wallet to sign the exact message, then submits the signature for a server-managed session. Signing in does not authorize an NFT transaction. Any mint transaction must be explicitly presented to and approved by the wallet.</p>
    </section>
    <p className="footnote">Public endpoints are same-origin routes. Mainnet status is displayed only when the API reports cluster <span className="mono">mainnet-beta</span> and a configured, healthy RPC. Do not expose provider credentials in browser code.</p>
  </>;
}

function RoutedBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Router() {
  return <RoutedBoundary><AppShell><Switch>
    <Route path="/" component={RegistryPage}/>
    <Route path="/discover" component={DiscoverPage}/>
    <Route path="/register" component={RegisterPage}/>
    <Route path="/verify" component={VerifyPage}/>
    <Route path="/risk" component={RiskPage}/>
    <Route path="/identity/:projectId" component={IdentityPage}/>
    <Route path="/dashboard" component={DashboardPage}/>
    <Route path="/developers"><DocsPage developers/></Route>
    <Route path="/docs"><DocsPage/></Route>
    <Route component={NotFound}/>
  </Switch></AppShell></RoutedBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
