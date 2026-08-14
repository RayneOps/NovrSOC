'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { ArrowLeft } from 'lucide-react';
import type { ContinentView, ThreatEvent } from './WorldGlobe';

type AttackType = 'Ransomware' | 'Phishing' | 'BruteForce' | 'APT';

const ATTACK_COLORS: Record<AttackType, string> = {
    Ransomware: '#CC2B2B',
    Phishing: '#D97706',
    BruteForce: '#6B1FA8',
    APT: '#2B3BCC',
};

interface ContinentMapProps {
    continent: ContinentView;
    threats: ThreatEvent[];
    onBack: () => void;
    activeFilter: AttackType | 'All';
    onFilterChange: (filter: AttackType | 'All') => void;
}

export function ContinentMap({ continent, threats, onBack, activeFilter, onFilterChange }: ContinentMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const W = 800;
        const H = 500;
        const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', '100%');
        svg.selectAll('*').remove();

        const [[minLng, minLat], [maxLng, maxLat]] = continent.bounds;
        const inContinent = (lng: number, lat: number) => lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;

        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then((r) => r.json())
            .then((world: Topology) => {
                const countries = feature(world, world.objects.countries as GeometryCollection) as GeoJSON.FeatureCollection;

                const continentFeatures = countries.features.filter((f) => {
                    const [cx, cy] = d3.geoCentroid(f);
                    return inContinent(cx, cy);
                });

                const projection = d3.geoMercator().fitExtent(
                    [[20, 20], [W - 20, H - 20]],
                    { type: 'FeatureCollection', features: continentFeatures }
                );
                const path = d3.geoPath(projection);

                svg
                    .append('g')
                    .selectAll('path')
                    .data(countries.features)
                    .join('path')
                    .attr('d', (f) => path(f) ?? '')
                    .attr('fill', (f) => {
                        const [cx, cy] = d3.geoCentroid(f);
                        if (!inContinent(cx, cy)) return '#F0F0F0';
                        const threat = threats.find((t) => Math.abs(cx - t.lng) < 5 && Math.abs(cy - t.lat) < 5);
                        return threat ? `${ATTACK_COLORS[threat.type]}33` : '#EEF0F6';
                    })
                    .attr('stroke', '#C4C9D8')
                    .attr('stroke-width', 0.5)
                    .attr('class', 'transition-opacity');

                threats.forEach((threat) => {
                    const coords = projection([threat.lng, threat.lat]);
                    if (!coords) return;
                    const [x, y] = coords;
                    const r = Math.max(6, Math.min(28, threat.count * 0.3));
                    const color = ATTACK_COLORS[threat.type];

                    svg.append('circle').attr('cx', x).attr('cy', y).attr('r', r * 1.6).attr('fill', color).attr('opacity', 0.15);

                    const bubble = svg
                        .append('circle')
                        .attr('cx', x)
                        .attr('cy', y)
                        .attr('r', r)
                        .attr('fill', color)
                        .attr('opacity', 0.85)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1.5);
                    bubble.append('title').text(`${threat.countryName}: ${threat.count} ${threat.type} attacks`);

                    if (r > 10) {
                        svg
                            .append('text')
                            .attr('x', x)
                            .attr('y', y + 1)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'middle')
                            .attr('fill', 'white')
                            .attr('font-size', '10')
                            .attr('font-weight', 'bold')
                            .text(threat.count)
                            .attr('pointer-events', 'none');
                    }
                });
            })
            .catch(() => {
                svg
                    .append('text')
                    .attr('x', W / 2)
                    .attr('y', H / 2)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#7A8099')
                    .attr('font-size', '13')
                    .text('Could not load continent map data');
            });
    }, [continent, threats]);

    const totalAttacks = threats.reduce((s, t) => s + t.count, 0);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-blue transition-colors">
                        <ArrowLeft size={16} />
                        Globe
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue rounded-full" />
                            <h2 className="font-heading font-semibold text-sm text-foreground uppercase tracking-widest">
                                {continent.name} — Threat Landscape
                            </h2>
                        </div>
                        <p className="text-xs text-foreground-muted mt-0.5 ml-3">Country-level attack activity</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-red-500">{totalAttacks.toLocaleString()}</div>
                    <div className="text-xs text-foreground-muted">active threats</div>
                </div>
            </div>

            {/* Filter tabs — same as globe */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card-muted">
                {(['All', 'Ransomware', 'Phishing', 'BruteForce', 'APT'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => onFilterChange(f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeFilter === f ? 'bg-blue text-white' : 'bg-card border border-border text-foreground-muted hover:border-grey-300'
                        }`}
                    >
                        {f !== 'All' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTACK_COLORS[f as AttackType] }} />}
                        {f === 'BruteForce' ? 'Brute Force' : f}
                    </button>
                ))}
            </div>

            {/* 2D Map */}
            <div className="w-full bg-card-muted" style={{ height: '460px' }}>
                <svg ref={svgRef} className="w-full h-full" />
            </div>

            {/* Country list */}
            <div className="px-6 py-4 border-t border-border">
                <div className="flex flex-wrap gap-3">
                    {threats.map((t) => (
                        <div key={t.country} className="flex items-center gap-2 px-3 py-1.5 bg-card-muted border border-border rounded-lg">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTACK_COLORS[t.type] }} />
                            <span className="text-xs font-medium text-foreground">{t.countryName}</span>
                            <span className="text-xs text-foreground-muted">{t.count} attacks</span>
                        </div>
                    ))}
                    {threats.length === 0 && <p className="text-xs text-foreground-muted">No active threats in this region right now.</p>}
                </div>
            </div>
        </div>
    );
}
