import React from 'react'
import { Link } from 'react-router-dom'

type PageHeaderProps = {
	title: string
	subtitle?: string
	breadcrumb?: string
	backTo?: string | null
	backLabel?: string
}

/**
 * Consistent top-of-page header used across all screens to mirror the home view styling.
 */
export default function PageHeader({
	title,
	subtitle,
	breadcrumb,
		backTo = '/',
	backLabel = 'Αρχική'
}: PageHeaderProps){
	return (
		<header style={{position:'fixed', top:0, left:0, right:0, zIndex:110, background:'linear-gradient(180deg, rgba(6,6,20,0.92), rgba(6,6,20,0.74))', boxShadow:'0 6px 24px rgba(2,6,23,0.6)', padding:'20px 16px'}}>
			<div style={{maxWidth:1400, margin:'0 auto', width:'100%'}}>
				{(backTo || breadcrumb) && (
					<div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
						{backTo ? (
							<Link to={backTo} className="muted" style={{display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none'}} aria-label={backLabel}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
									<path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<span style={{fontSize:13}}>{backLabel}</span>
							</Link>
						) : null}
						{breadcrumb ? (
							<>
								{backTo && <span className="muted" style={{opacity:0.6}}> / </span>}
								<span className="muted" style={{fontSize:13}}>{breadcrumb}</span>
							</>
						) : null}
					</div>
				)}
				<h1 className="heading-xl font-extrabold" style={{fontSize:'1.6rem', margin:0}}>{title}</h1>
				{subtitle ? <div className="muted" style={{marginTop:6}}>{subtitle}</div> : null}
			</div>
		</header>
	)
}
