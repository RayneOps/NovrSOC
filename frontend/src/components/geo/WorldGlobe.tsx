'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ContinentMap } from './ContinentMap';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type AttackType = 'Ransomware' | 'Phishing' | 'BruteForce' | 'APT';

export interface ThreatEvent {
    country: string; // ISO 3166-1 alpha-3
    countryName: string;
    continent: string;
    lat: number;
    lng: number;
    type: AttackType;
    count: number;
}

export interface ContinentView {
    name: string;
    bounds: [[number, number], [number, number]]; // [[minLng, minLat], [maxLng, maxLat]]
    center: [number, number]; // [lng, lat]
}

interface ThreatUserData {
    threat: ThreatEvent;
    isPulse?: boolean;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ATTACK_COLORS: Record<AttackType, string> = {
    Ransomware: '#CC2B2B',
    Phishing: '#D97706',
    BruteForce: '#6B1FA8',
    APT: '#2B3BCC',
};

export const CONTINENTS: Record<string, ContinentView> = {
    Africa: { name: 'Africa', bounds: [[-18, -35], [52, 38]], center: [20, 5] },
    Europe: { name: 'Europe', bounds: [[-25, 34], [45, 72]], center: [15, 54] },
    Asia: { name: 'Asia', bounds: [[25, -10], [145, 55]], center: [90, 35] },
    NorthAmerica: { name: 'North America', bounds: [[-170, 7], [-52, 72]], center: [-100, 45] },
    SouthAmerica: { name: 'South America', bounds: [[-82, -56], [-34, 13]], center: [-58, -15] },
    Oceania: { name: 'Oceania', bounds: [[110, -50], [180, -10]], center: [145, -30] },
};

// ─── MOCK THREAT DATA ─────────────────────────────────────────────────────────
// Swap this for a real feed later — every consumer here only cares about the
// ThreatEvent[] shape, not where the data comes from.

const MOCK_THREATS: ThreatEvent[] = [
    { country: 'NGA', countryName: 'Nigeria', continent: 'Africa', lat: 9.0, lng: 8.0, type: 'Ransomware', count: 45 },
    { country: 'ZAF', countryName: 'South Africa', continent: 'Africa', lat: -30.0, lng: 25.0, type: 'Phishing', count: 23 },
    { country: 'KEN', countryName: 'Kenya', continent: 'Africa', lat: -1.0, lng: 37.0, type: 'BruteForce', count: 18 },
    { country: 'GHA', countryName: 'Ghana', continent: 'Africa', lat: 7.9, lng: -1.0, type: 'APT', count: 12 },
    { country: 'USA', countryName: 'United States', continent: 'NorthAmerica', lat: 37.0, lng: -95.0, type: 'APT', count: 89 },
    { country: 'CHN', countryName: 'China', continent: 'Asia', lat: 35.0, lng: 105.0, type: 'APT', count: 134 },
    { country: 'RUS', countryName: 'Russia', continent: 'Asia', lat: 61.0, lng: 105.0, type: 'Ransomware', count: 78 },
    { country: 'BRA', countryName: 'Brazil', continent: 'SouthAmerica', lat: -14.0, lng: -51.0, type: 'Phishing', count: 34 },
    { country: 'DEU', countryName: 'Germany', continent: 'Europe', lat: 51.0, lng: 10.0, type: 'BruteForce', count: 29 },
    { country: 'GBR', countryName: 'UK', continent: 'Europe', lat: 55.0, lng: -3.0, type: 'Phishing', count: 41 },
    { country: 'IND', countryName: 'India', continent: 'Asia', lat: 20.0, lng: 77.0, type: 'BruteForce', count: 56 },
    { country: 'IRN', countryName: 'Iran', continent: 'Asia', lat: 32.0, lng: 53.0, type: 'APT', count: 67 },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function WorldGlobe() {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const globeRef = useRef<THREE.Mesh | null>(null);
    const frameRef = useRef<number>(0);

    const isDragging = useRef(false);
    const prevMouse = useRef({ x: 0, y: 0 });
    const rotation = useRef({ x: 0.3, y: -0.3 });
    const autoRotate = useRef(true);

    const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<AttackType | 'All'>('All');

    // Build Three.js scene
    useEffect(() => {
        if (!mountRef.current || selectedContinent) return;

        const mount = mountRef.current;
        const W = mount.clientWidth;
        const H = mount.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#F8F9FC');
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        camera.position.z = 2.8;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        // Atmosphere glow (subtle outer sphere)
        const atmosphereGeo = new THREE.SphereGeometry(1.02, 64, 64);
        const atmosphereMat = new THREE.MeshPhongMaterial({
            color: 0x2b3bcc,
            transparent: true,
            opacity: 0.08,
            side: THREE.FrontSide,
        });
        scene.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));

        // Globe sphere
        const globeGeo = new THREE.SphereGeometry(1, 64, 64);
        const globeMat = new THREE.MeshPhongMaterial({
            color: 0xeef0f6,
            shininess: 15,
            specular: new THREE.Color(0x2b3bcc).multiplyScalar(0.1),
        });
        const globe = new THREE.Mesh(globeGeo, globeMat);
        scene.add(globe);
        globeRef.current = globe;

        // Attack dots — convert lat/lng to 3D sphere coords
        const filteredThreats = MOCK_THREATS.filter((t) => activeFilter === 'All' || t.type === activeFilter);

        filteredThreats.forEach((threat) => {
            const phi = (90 - threat.lat) * (Math.PI / 180);
            const theta = (threat.lng + 180) * (Math.PI / 180);
            const r = 1.02;

            const x = -(r * Math.sin(phi) * Math.cos(theta));
            const z = r * Math.sin(phi) * Math.sin(theta);
            const y = r * Math.cos(phi);

            const dotGeo = new THREE.SphereGeometry(Math.max(0.008, Math.min(0.025, threat.count * 0.0003)), 16, 16);
            const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ATTACK_COLORS[threat.type]) });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(x, y, z);
            dot.userData = { threat } satisfies ThreatUserData;
            globe.add(dot);

            const ringGeo = new THREE.RingGeometry(
                Math.max(0.012, threat.count * 0.0004),
                Math.max(0.018, threat.count * 0.0006),
                32
            );
            const ringMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(ATTACK_COLORS[threat.type]),
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(x, y, z);
            ring.lookAt(0, 0, 0);
            ring.userData = { threat, isPulse: true } satisfies ThreatUserData;
            globe.add(ring);
        });

        // Grid lines (longitude/latitude) — parented to the globe so they rotate with it
        const gridMat = new THREE.LineBasicMaterial({ color: 0xc4c9d8, transparent: true, opacity: 0.2 });
        for (let lat = -80; lat <= 80; lat += 20) {
            const points: THREE.Vector3[] = [];
            for (let lng = 0; lng <= 360; lng += 2) {
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = lng * (Math.PI / 180);
                points.push(
                    new THREE.Vector3(-1.001 * Math.sin(phi) * Math.cos(theta), 1.001 * Math.cos(phi), 1.001 * Math.sin(phi) * Math.sin(theta))
                );
            }
            globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMat));
        }
        for (let lng = 0; lng < 360; lng += 20) {
            const points: THREE.Vector3[] = [];
            for (let lat = -90; lat <= 90; lat += 2) {
                const phi = (90 - lat) * (Math.PI / 180);
                const theta = lng * (Math.PI / 180);
                points.push(
                    new THREE.Vector3(-1.001 * Math.sin(phi) * Math.cos(theta), 1.001 * Math.cos(phi), 1.001 * Math.sin(phi) * Math.sin(theta))
                );
            }
            globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMat));
        }

        // Animation loop
        let pulseT = 0;
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            pulseT += 0.03;

            if (autoRotate.current && !isDragging.current) {
                rotation.current.y += 0.002;
            }
            globe.rotation.x = rotation.current.x;
            globe.rotation.y = rotation.current.y;

            globe.children.forEach((child) => {
                const data = child.userData as ThreatUserData;
                if (data?.isPulse && child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
                    child.material.opacity = 0.2 + 0.3 * Math.abs(Math.sin(pulseT + data.threat.count));
                }
            });

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            const W2 = mount.clientWidth;
            const H2 = mount.clientHeight;
            camera.aspect = W2 / H2;
            camera.updateProjectionMatrix();
            renderer.setSize(W2, H2);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameRef.current);
            renderer.dispose();
            if (renderer.domElement.parentElement === mount) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [activeFilter, selectedContinent]);

    // ── Mouse handlers ──────────────────────────────────────────────────────

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        autoRotate.current = false;
        prevMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - prevMouse.current.x;
        const dy = e.clientY - prevMouse.current.y;
        rotation.current.y += dx * 0.005;
        rotation.current.x += dy * 0.005;
        rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x));
        prevMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        setTimeout(() => {
            autoRotate.current = true;
        }, 3000);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!cameraRef.current) return;
        cameraRef.current.position.z = Math.max(1.5, Math.min(5, cameraRef.current.position.z + e.deltaY * 0.002));
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!mountRef.current || !cameraRef.current || !globeRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * -2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);
        const hits = raycaster.intersectObjects(globeRef.current.children, true);
        const threat = (hits[0]?.object.userData as ThreatUserData | undefined)?.threat;
        if (threat) setSelectedContinent(threat.continent);
    };

    // ── CONTINENT 2D VIEW ────────────────────────────────────────────────────

    if (selectedContinent) {
        return (
            <ContinentMap
                continent={CONTINENTS[selectedContinent]}
                threats={MOCK_THREATS.filter((t) => t.continent === selectedContinent && (activeFilter === 'All' || t.type === activeFilter))}
                onBack={() => setSelectedContinent(null)}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />
        );
    }

    // ── GLOBE VIEW ───────────────────────────────────────────────────────────

    const filteredThreats = MOCK_THREATS.filter((t) => activeFilter === 'All' || t.type === activeFilter);
    const totalAttacks = filteredThreats.reduce((s, t) => s + t.count, 0);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-blue rounded-full" />
                        <h2 className="font-heading font-semibold text-sm text-foreground uppercase tracking-widest">Global Threat Intelligence</h2>
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5 ml-3">Click a threat origin to explore by continent · Drag to rotate · Scroll to zoom</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-heading font-bold text-red-500">{totalAttacks.toLocaleString()}</div>
                    <div className="text-xs text-foreground-muted">active threats</div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card-muted">
                {(['All', 'Ransomware', 'Phishing', 'BruteForce', 'APT'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeFilter === f ? 'bg-blue text-white' : 'bg-card border border-border text-foreground-muted hover:text-foreground hover:border-grey-300'
                        }`}
                    >
                        {f !== 'All' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTACK_COLORS[f as AttackType] }} />}
                        {f === 'BruteForce' ? 'Brute Force' : f}
                    </button>
                ))}

                <div className="ml-auto flex items-center gap-1.5 text-xs text-foreground-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live
                </div>
            </div>

            {/* Globe canvas */}
            <div
                ref={mountRef}
                className="w-full cursor-grab active:cursor-grabbing"
                style={{ height: '460px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onClick={handleClick}
            />

            {/* Legend + continent quick-select */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                    {(Object.entries(ATTACK_COLORS) as [AttackType, string][]).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-foreground-muted">{type === 'BruteForce' ? 'Brute Force' : type}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-foreground-muted">Jump to:</span>
                    {Object.keys(CONTINENTS).map((c) => (
                        <button
                            key={c}
                            onClick={() => setSelectedContinent(c)}
                            className="text-xs text-blue hover:text-purple hover:underline transition-colors"
                        >
                            {CONTINENTS[c].name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
