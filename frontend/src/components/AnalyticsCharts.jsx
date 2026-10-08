import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { PieChart, BarChart3, TrendingUp, Sparkles, Award } from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

export default function AnalyticsCharts({ stats, featuresList, unitSystem }) {
  if (!stats || !featuresList || featuresList.length === 0) return null;

  const isMetric = unitSystem === 'metric';

  // 1. Geometry Composition Donut Data
  const breakdown = stats.breakdown || {};
  const donutData = {
    labels: ['Polygons (Area)', 'LineStrings (Length)', 'Points (Markers)'],
    datasets: [
      {
        data: [breakdown.polygons || 0, breakdown.lines || 0, breakdown.points || 0],
        backgroundColor: ['#10b981', '#0ea5e9', '#8b5cf6'],
        borderColor: ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
          padding: 14,
          color: '#475569',
        },
      },
    },
    cutout: '70%',
  };

  // 2. Polygon Areas Bar Chart Data
  const polygonFeatures = featuresList.filter((f) => f.measurements?.area_m2 != null).slice(0, 10);
  const barData = {
    labels: polygonFeatures.map((f) => `Feature #${f.feature_index}`),
    datasets: [
      {
        label: isMetric ? 'Area (m²)' : 'Area (Acres)',
        data: polygonFeatures.map((f) =>
          isMetric
            ? f.measurements.area_m2
            : parseFloat((f.measurements.area_m2 * 0.000247105).toFixed(3))
        ),
        backgroundColor: 'rgba(79, 70, 229, 0.85)',
        borderRadius: 8,
        hoverBackgroundColor: '#4f46e5',
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${context.parsed.y.toLocaleString()} ${isMetric ? 'm²' : 'ac'}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'JetBrains Mono', size: 11 }, color: '#64748b' },
      },
    },
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '35% 65%', gap: '1.25rem' }}>
      
      {/* Donut Chart Card */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Vector Layer Breakdown
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Geometry distribution across dataset</p>
          </div>
        </div>

        <div style={{ height: '220px', position: 'relative' }}>
          <Doughnut data={donutData} options={donutOptions} />
        </div>
      </div>

      {/* Bar Chart Card */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Parcel Area Distribution (Top 10)
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Comparison of individual polygon sizes</p>
            </div>
          </div>
          <span className="badge badge-emerald font-mono">UTM Reprojected</span>
        </div>

        <div style={{ height: '220px', position: 'relative' }}>
          {polygonFeatures.length > 0 ? (
            <Bar data={barData} options={barOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              No polygon features to chart.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
