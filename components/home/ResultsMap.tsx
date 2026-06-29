'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { BusinessResult } from './constants'

// This file is only ever loaded on the client (ResultsView uses dynamic+ssr:false),
// so the top-level L import is safe — Leaflet's window access never runs on the server.
function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface Props {
  businesses: BusinessResult[]
}

export function ResultsMap({ businesses }: Props) {
  useEffect(() => { fixLeafletIcons() }, [])

  const pinned = businesses.filter((b) => b.lat != null && b.lng != null)
  if (pinned.length === 0) return null

  const center: [number, number] = [pinned[0].lat!, pinned[0].lng!]

  return (
    <div
      className="rounded-xl overflow-hidden border mb-4"
      style={{ height: '280px', borderColor: 'var(--border)' }}
    >
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((biz) => (
          <Marker key={biz.business_name} position={[biz.lat!, biz.lng!]}>
            <Popup>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{biz.business_name}</span>
              {biz.address && (
                <><br /><span style={{ fontSize: '12px', color: '#666' }}>{biz.address}</span></>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
