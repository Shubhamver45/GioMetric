/**
 * GeoMetric Pro - Core Frontend Engine
 * Handles Leaflet map rendering, file uploads, metric transformations, 
 * real-time table interactions, and export actions.
 */

// ---------------------------------------------------------------------------
// Global State
// ---------------------------------------------------------------------------
const state = {
  currentFileId: null,
  currentFileName: null,
  currentFileCrs: null,
  geoJsonData: null,
  featuresList: [],
  stats: null,
  unitSystem: 'metric', // 'metric' | 'imperial'
  activeFilter: 'all',
  searchQuery: '',
  map: null,
  geoJsonLayer: null,
  highlightLayer: null,
  baseMaps: {},
  layerGroup: null,
};

// ---------------------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------------------
const elements = {
  mapEmptyOverlay: document.getElementById('mapEmptyOverlay'),
  mapCoordinates: document.getElementById('mapCoordinates'),
  mapLegend: document.getElementById('mapLegend'),
  
  // KPI Elements
  kpiAreaPrimary: document.getElementById('kpiAreaPrimary'),
  kpiAreaPrimaryUnit: document.getElementById('kpiAreaPrimaryUnit'),
  kpiAreaSecondary: document.getElementById('kpiAreaSecondary'),
  kpiAreaSecondaryUnit: document.getElementById('kpiAreaSecondaryUnit'),
  kpiAreaTertiary: document.getElementById('kpiAreaTertiary'),
  kpiAreaTertiaryUnit: document.getElementById('kpiAreaTertiaryUnit'),
  polyCountTag: document.getElementById('polyCountTag'),
  
  kpiLengthPrimary: document.getElementById('kpiLengthPrimary'),
  kpiLengthPrimaryUnit: document.getElementById('kpiLengthPrimaryUnit'),
  kpiLengthSecondary: document.getElementById('kpiLengthSecondary'),
  kpiLengthSecondaryUnit: document.getElementById('kpiLengthSecondaryUnit'),
  kpiLengthTertiary: document.getElementById('kpiLengthTertiary'),
  kpiLengthTertiaryUnit: document.getElementById('kpiLengthTertiaryUnit'),
  lineCountTag: document.getElementById('lineCountTag'),
  
  kpiFeatureCount: document.getElementById('kpiFeatureCount'),
  crsTag: document.getElementById('crsTag'),
  barPoly: document.getElementById('barPoly'),
  barLine: document.getElementById('barLine'),
  barPoint: document.getElementById('barPoint'),
  legendPoly: document.getElementById('legendPoly'),
  legendLine: document.getElementById('legendLine'),
  legendPoint: document.getElementById('legendPoint'),

  // Header
  activeFileIndicator: document.getElementById('activeFileIndicator'),
  activeFileName: document.getElementById('activeFileName'),
  activeFileCrs: document.getElementById('activeFileCrs'),
  unitMetricBtn: document.getElementById('unitMetricBtn'),
  unitImperialBtn: document.getElementById('unitImperialBtn'),
  
  // Table
  tableSearchInput: document.getElementById('tableSearchInput'),
  featuresTableBody: document.getElementById('featuresTableBody'),
  countFilterAll: document.getElementById('countFilterAll'),

  // Buttons & Actions
  openUploadBtn: document.getElementById('openUploadBtn'),
  openHistoryBtn: document.getElementById('openHistoryBtn'),
  exportGeoJsonBtn: document.getElementById('exportGeoJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  copyGeoJsonBtn: document.getElementById('copyGeoJsonBtn'),
  fitBoundsBtn: document.getElementById('fitBoundsBtn'),

  // Modals
  uploadModal: document.getElementById('uploadModal'),
  closeUploadModalBtn: document.getElementById('closeUploadModalBtn'),
  cancelUploadBtn: document.getElementById('cancelUploadBtn'),
  submitUploadBtn: document.getElementById('submitUploadBtn'),
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  fileSelectionPreview: document.getElementById('fileSelectionPreview'),
  previewFileName: document.getElementById('previewFileName'),
  previewFileSize: document.getElementById('previewFileSize'),
  clearSelectedFileBtn: document.getElementById('clearSelectedFileBtn'),
  processingPipeline: document.getElementById('processingPipeline'),
  uploadProgressBar: document.getElementById('uploadProgressBar'),
  
  // Quick Samples
  loadKmlSampleBtn: document.getElementById('loadKmlSampleBtn'),
  loadShpSampleBtn: document.getElementById('loadShpSampleBtn'),
  modalSampleKmlBtn: document.getElementById('modalSampleKmlBtn'),
  modalSampleShpBtn: document.getElementById('modalSampleShpBtn'),

  // History Modal
  historyModal: document.getElementById('historyModal'),
  closeHistoryModalBtn: document.getElementById('closeHistoryModalBtn'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
  historyListContainer: document.getElementById('historyListContainer'),

  // Feature Detail Modal
  featureDetailModal: document.getElementById('featureDetailModal'),
  closeFeatureDetailBtn: document.getElementById('closeFeatureDetailBtn'),
  closeFeatureModalBtn: document.getElementById('closeFeatureModalBtn'),
  zoomToCurrentFeatureBtn: document.getElementById('zoomToCurrentFeatureBtn'),
  featureModalTitle: document.getElementById('featureModalTitle'),
  featureModalSubtitle: document.getElementById('featureModalSubtitle'),
  featureMeasurementsGrid: document.getElementById('featureMeasurementsGrid'),
  featurePropsJson: document.getElementById('featurePropsJson'),
  featureWktText: document.getElementById('featureWktText'),

  // Toast
  toastContainer: document.getElementById('toastContainer'),
};

let selectedUploadFile = null;
let currentInspectedFeature = null;

// ---------------------------------------------------------------------------
// App Initialization
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLucide();
  initMap();
  bindEvents();
  checkInitialFiles();
});

function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ---------------------------------------------------------------------------
// Leaflet Map Setup
// ---------------------------------------------------------------------------
function initMap() {
  // Center on India / World default
  state.map = L.map('map', {
    center: [12.9716, 77.5946],
    zoom: 12,
    zoomControl: true,
  });

  // Basemaps
  state.baseMaps.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(state.map);

  state.baseMaps.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
  });

  state.baseMaps.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  });

  // Layer Group
  state.layerGroup = L.layerGroup().addTo(state.map);

  // Map mouse move coordinate listener
  state.map.on('mousemove', (e) => {
    elements.mapCoordinates.textContent = `Lat: ${e.latlng.lat.toFixed(5)} | Lon: ${e.latlng.lng.toFixed(5)}`;
  });
}

// ---------------------------------------------------------------------------
// Event Binding
// ---------------------------------------------------------------------------
function bindEvents() {
  // Basemap switcher
  document.querySelectorAll('.base-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.base-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const layerType = btn.dataset.layer;
      
      Object.values(state.baseMaps).forEach(layer => state.map.removeLayer(layer));
      if (state.baseMaps[layerType]) {
        state.baseMaps[layerType].addTo(state.map);
      }
    });
  });

  // Unit Toggle
  elements.unitMetricBtn.addEventListener('click', () => setUnitSystem('metric'));
  elements.unitImperialBtn.addEventListener('click', () => setUnitSystem('imperial'));

  // Upload Modal triggers
  elements.openUploadBtn.addEventListener('click', () => openUploadModal());
  elements.closeUploadModalBtn.addEventListener('click', () => closeUploadModal());
  elements.cancelUploadBtn.addEventListener('click', () => closeUploadModal());

  // Drag & Drop
  elements.dropZone.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', handleFileSelect);

  ['dragenter', 'dragover'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      elements.dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    elements.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      elements.dropZone.classList.remove('drag-over');
    }, false);
  });

  elements.dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  });

  elements.clearSelectedFileBtn.addEventListener('click', clearSelectedFile);
  elements.submitUploadBtn.addEventListener('click', submitFileUpload);

  // Quick Samples
  elements.loadKmlSampleBtn.addEventListener('click', () => loadSample('kml'));
  elements.loadShpSampleBtn.addEventListener('click', () => loadSample('shapefile'));
  elements.modalSampleKmlBtn.addEventListener('click', () => loadSample('kml'));
  elements.modalSampleShpBtn.addEventListener('click', () => loadSample('shapefile'));

  // History Modal
  elements.openHistoryBtn.addEventListener('click', openHistoryModal);
  elements.closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
  elements.closeHistoryBtn.addEventListener('click', closeHistoryModal);
  elements.refreshHistoryBtn.addEventListener('click', fetchUploadHistory);

  // Table Search & Filter
  elements.tableSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderTable();
  });

  document.querySelectorAll('.filter-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // Action Buttons
  elements.exportGeoJsonBtn.addEventListener('click', exportGeoJson);
  elements.exportCsvBtn.addEventListener('click', exportCsv);
  elements.copyGeoJsonBtn.addEventListener('click', copyGeoJson);
  elements.fitBoundsBtn.addEventListener('click', fitMapBounds);

  // Feature Detail Modal
  elements.closeFeatureDetailBtn.addEventListener('click', () => elements.featureDetailModal.classList.add('hidden'));
  elements.closeFeatureModalBtn.addEventListener('click', () => elements.featureDetailModal.classList.add('hidden'));
  elements.zoomToCurrentFeatureBtn.addEventListener('click', () => {
    if (currentInspectedFeature) {
      focusFeatureOnMap(currentInspectedFeature.feature_index);
      elements.featureDetailModal.classList.add('hidden');
    }
  });
}

// ---------------------------------------------------------------------------
// Unit System Management
// ---------------------------------------------------------------------------
function setUnitSystem(system) {
  state.unitSystem = system;
  if (system === 'metric') {
    elements.unitMetricBtn.classList.add('active');
    elements.unitImperialBtn.classList.remove('active');
  } else {
    elements.unitImperialBtn.classList.add('active');
    elements.unitMetricBtn.classList.remove('active');
  }
  updateKPIs();
  renderTable();
}

// ---------------------------------------------------------------------------
// Sample Loading
// ---------------------------------------------------------------------------
async function loadSample(sampleType) {
  closeUploadModal();
  showToast(`Loading demo ${sampleType.toUpperCase()} dataset...`, 'info');
  
  try {
    const res = await fetch(`/api/files/sample/${sampleType}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to load sample: ${res.statusText}`);
    }
    const data = await res.json();
    pollFileStatus(data.id, data.filename);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// File Upload Handling
// ---------------------------------------------------------------------------
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    processSelectedFile(e.target.files[0]);
  }
}

function processSelectedFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (ext !== '.zip' && ext !== '.kml') {
    showToast('Unsupported file type. Please upload a .zip (Shapefile) or .kml file.', 'error');
    return;
  }

  selectedUploadFile = file;
  elements.previewFileName.textContent = file.name;
  elements.previewFileSize.textContent = formatBytes(file.size);
  
  elements.dropZone.classList.add('hidden');
  elements.fileSelectionPreview.classList.remove('hidden');
  elements.submitUploadBtn.removeAttribute('disabled');
}

function clearSelectedFile() {
  selectedUploadFile = null;
  elements.fileInput.value = '';
  elements.dropZone.classList.remove('hidden');
  elements.fileSelectionPreview.classList.add('hidden');
  elements.submitUploadBtn.setAttribute('disabled', 'true');
}

function openUploadModal() {
  clearSelectedFile();
  elements.processingPipeline.classList.add('hidden');
  elements.uploadModal.classList.remove('hidden');
}

function closeUploadModal() {
  elements.uploadModal.classList.add('hidden');
}

async function submitFileUpload() {
  if (!selectedUploadFile) return;

  const formData = new FormData();
  formData.append('file', selectedUploadFile);

  elements.processingPipeline.classList.remove('hidden');
  elements.submitUploadBtn.setAttribute('disabled', 'true');
  elements.cancelUploadBtn.setAttribute('disabled', 'true');

  setPipelineStep(1, 30);

  try {
    const res = await fetch('/api/files/', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Upload failed');
    }

    const data = await res.json();
    setPipelineStep(2, 60);

    // Poll for processing completion
    setTimeout(() => {
      closeUploadModal();
      pollFileStatus(data.id, data.filename);
    }, 600);

  } catch (err) {
    showToast(err.message, 'error');
    elements.processingPipeline.classList.add('hidden');
    elements.submitUploadBtn.removeAttribute('disabled');
    elements.cancelUploadBtn.removeAttribute('disabled');
  }
}

function setPipelineStep(stepNum, progressPercent) {
  elements.uploadProgressBar.style.width = `${progressPercent}%`;
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step${i}`);
    if (i <= stepNum) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

// ---------------------------------------------------------------------------
// File Status Polling & Dataset Loading
// ---------------------------------------------------------------------------
async function pollFileStatus(fileId, filename) {
  showToast(`Processing ${filename}... Computing spatial measurements.`, 'info');
  
  let attempts = 0;
  const maxAttempts = 30;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`/api/files/${fileId}/`);
      if (!res.ok) throw new Error('File not found');
      
      const fileData = await res.json();
      if (fileData.status === 'COMPLETED') {
        clearInterval(interval);
        showToast(`Dataset ${filename} processed successfully!`, 'success');
        loadDataset(fileId);
      } else if (fileData.status === 'FAILED') {
        clearInterval(interval);
        showToast(`Processing failed: ${fileData.error_message || 'Unknown error'}`, 'error');
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        showToast('Processing timeout. Check file history.', 'error');
      }
    } catch (err) {
      clearInterval(interval);
      showToast(err.message, 'error');
    }
  }, 1000);
}

// ---------------------------------------------------------------------------
// Load & Render Dataset
// ---------------------------------------------------------------------------
async function loadDataset(fileId) {
  try {
    // 1. Fetch GeoJSON and Stats in parallel
    const [geoJsonRes, statsRes, featuresRes] = await Promise.all([
      fetch(`/api/files/${fileId}/geojson/`),
      fetch(`/api/files/${fileId}/stats/`),
      fetch(`/api/files/${fileId}/features/?limit=500`),
    ]);

    if (!geoJsonRes.ok || !statsRes.ok) {
      throw new Error('Failed to retrieve file geospatial data.');
    }

    state.currentFileId = fileId;
    state.geoJsonData = await geoJsonRes.json();
    state.stats = await statsRes.json();
    const featJson = await featuresRes.json();
    state.featuresList = featJson.items || [];

    state.currentFileName = state.stats.filename;
    state.currentFileCrs = state.stats.crs || 'EPSG:4326';

    // Update Header Pill
    elements.activeFileIndicator.classList.remove('hidden');
    elements.activeFileName.textContent = state.currentFileName;
    elements.activeFileCrs.textContent = state.currentFileCrs;

    // Enable Action Buttons
    elements.exportGeoJsonBtn.removeAttribute('disabled');
    elements.exportCsvBtn.removeAttribute('disabled');
    elements.copyGeoJsonBtn.removeAttribute('disabled');
    elements.fitBoundsBtn.removeAttribute('disabled');

    // Hide empty state overlay on map
    elements.mapEmptyOverlay.classList.add('hidden');
    elements.mapLegend.classList.remove('hidden');

    // Update UI components
    updateKPIs();
    renderMapFeatures();
    renderTable();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Render Features on Leaflet Map
// ---------------------------------------------------------------------------
function renderMapFeatures() {
  state.layerGroup.clearLayers();

  if (!state.geoJsonData || !state.geoJsonData.features || state.geoJsonData.features.length === 0) {
    return;
  }

  state.geoJsonLayer = L.geoJSON(state.geoJsonData, {
    style: (feature) => {
      const type = feature.geometry?.type;
      if (type === 'Polygon' || type === 'MultiPolygon') {
        return {
          fillColor: '#10b981',
          fillOpacity: 0.35,
          color: '#34d399',
          weight: 2,
          opacity: 0.9,
        };
      } else if (type === 'LineString' || type === 'MultiLineString') {
        return {
          color: '#06b6d4',
          weight: 4,
          opacity: 0.9,
          dashArray: '2, 4',
        };
      }
      return {
        color: '#8b5cf6',
        weight: 2,
      };
    },
    pointToLayer: (feature, latlng) => {
      return L.circleMarker(latlng, {
        radius: 8,
        fillColor: '#8b5cf6',
        color: '#c4b5fd',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });
    },
    onEachFeature: (feature, layer) => {
      // Hover highlight
      layer.on('mouseover', () => {
        layer.setStyle({
          fillOpacity: 0.65,
          weight: 4,
          color: '#f59e0b',
        });
      });

      layer.on('mouseout', () => {
        state.geoJsonLayer.resetStyle(layer);
      });

      // Click Popup & Inspection
      layer.on('click', () => {
        highlightTableRow(feature.properties.feature_index);
      });

      // Build Rich Popup
      const props = feature.properties || {};
      const areaText = props.area_m2 != null ? formatArea(props.area_m2) : null;
      const lenText = props.length_m != null ? formatLength(props.length_m) : null;

      let measHtml = '';
      if (areaText) measHtml += `<div class="popup-row"><span class="popup-label">Area:</span><span class="popup-val">${areaText}</span></div>`;
      if (lenText) measHtml += `<div class="popup-row"><span class="popup-label">Length:</span><span class="popup-val">${lenText}</span></div>`;

      const popupHtml = `
        <div class="popup-feature-box">
          <div class="popup-title">Feature #${props.feature_index} &bull; ${props.geometry_type || 'Feature'}</div>
          ${measHtml}
          <div class="popup-row"><span class="popup-label">CRS:</span><span class="popup-val">${props.crs || 'EPSG:4326'}</span></div>
          <button onclick="window.inspectFeatureFromPopup(${props.feature_index})" class="btn-action" style="margin-top: 6px; width: 100%;">
            View Full Attributes & WKT
          </button>
        </div>
      `;

      layer.bindPopup(popupHtml);
    }
  });

  state.layerGroup.addLayer(state.geoJsonLayer);
  fitMapBounds();
}

function fitMapBounds() {
  if (state.geoJsonLayer && state.geoJsonLayer.getLayers().length > 0) {
    state.map.fitBounds(state.geoJsonLayer.getBounds(), { padding: [40, 40], maxZoom: 16 });
  }
}

// ---------------------------------------------------------------------------
// KPI Metric Updates & Calculations
// ---------------------------------------------------------------------------
function updateKPIs() {
  if (!state.stats) return;

  const s = state.stats;
  const isMetric = state.unitSystem === 'metric';

  // Area Calculations
  if (isMetric) {
    elements.kpiAreaPrimary.textContent = formatNumber(s.total_area_m2);
    elements.kpiAreaPrimaryUnit.textContent = 'm²';
    elements.kpiAreaSecondary.textContent = formatNumber(s.total_area_km2, 4);
    elements.kpiAreaSecondaryUnit.textContent = 'km²';
    elements.kpiAreaTertiary.textContent = formatNumber(s.total_area_hectares, 3);
    elements.kpiAreaTertiaryUnit.textContent = 'Hectares';
  } else {
    elements.kpiAreaPrimary.textContent = formatNumber(s.total_area_acres, 3);
    elements.kpiAreaPrimaryUnit.textContent = 'Acres';
    elements.kpiAreaSecondary.textContent = formatNumber(s.total_area_m2 * 10.7639, 1);
    elements.kpiAreaSecondaryUnit.textContent = 'sq ft';
    elements.kpiAreaTertiary.textContent = formatNumber(s.total_area_km2 * 0.386102, 4);
    elements.kpiAreaTertiaryUnit.textContent = 'sq miles';
  }
  elements.polyCountTag.textContent = `${s.breakdown.polygons} Polygons`;

  // Length Calculations
  if (isMetric) {
    elements.kpiLengthPrimary.textContent = formatNumber(s.total_length_m);
    elements.kpiLengthPrimaryUnit.textContent = 'm';
    elements.kpiLengthSecondary.textContent = formatNumber(s.total_length_km, 3);
    elements.kpiLengthSecondaryUnit.textContent = 'km';
    elements.kpiLengthTertiary.textContent = formatNumber(s.total_length_miles, 3);
    elements.kpiLengthTertiaryUnit.textContent = 'Miles';
  } else {
    elements.kpiLengthPrimary.textContent = formatNumber(s.total_length_miles, 3);
    elements.kpiLengthPrimaryUnit.textContent = 'Miles';
    elements.kpiLengthSecondary.textContent = formatNumber(s.total_length_m * 3.28084, 1);
    elements.kpiLengthSecondaryUnit.textContent = 'ft';
    elements.kpiLengthTertiary.textContent = formatNumber(s.total_length_km, 3);
    elements.kpiLengthTertiaryUnit.textContent = 'km';
  }
  elements.lineCountTag.textContent = `${s.breakdown.lines} Lines`;

  // Features Breakdown
  elements.kpiFeatureCount.textContent = s.total_features;
  elements.crsTag.textContent = s.crs || 'UTM Auto';

  const total = s.total_features || 1;
  const pPct = (s.breakdown.polygons / total) * 100;
  const lPct = (s.breakdown.lines / total) * 100;
  const ptPct = (s.breakdown.points / total) * 100;

  elements.barPoly.style.width = `${pPct}%`;
  elements.barLine.style.width = `${lPct}%`;
  elements.barPoint.style.width = `${ptPct}%`;

  elements.legendPoly.textContent = s.breakdown.polygons;
  elements.legendLine.textContent = s.breakdown.lines;
  elements.legendPoint.textContent = s.breakdown.points;
}

// ---------------------------------------------------------------------------
// Table Rendering & Search Filter
// ---------------------------------------------------------------------------
function renderTable() {
  elements.countFilterAll.textContent = state.featuresList.length;

  const filtered = state.featuresList.filter(f => {
    // Filter by geometry type
    if (state.activeFilter !== 'all') {
      const type = (f.geometry_type || '').toLowerCase();
      if (state.activeFilter.toLowerCase() === 'polygon' && !type.includes('polygon')) return false;
      if (state.activeFilter.toLowerCase() === 'linestring' && !type.includes('line')) return false;
      if (state.activeFilter.toLowerCase() === 'point' && !type.includes('point')) return false;
    }

    // Search query
    if (state.searchQuery) {
      const q = state.searchQuery;
      const idxMatch = String(f.feature_index).includes(q);
      const typeMatch = (f.geometry_type || '').toLowerCase().includes(q);
      const propsMatch = JSON.stringify(f.properties || {}).toLowerCase().includes(q);
      return idxMatch || typeMatch || propsMatch;
    }

    return true;
  });

  if (filtered.length === 0) {
    elements.featuresTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6" class="text-center py-8 text-muted">
          No matching features found.
        </td>
      </tr>
    `;
    return;
  }

  elements.featuresTableBody.innerHTML = filtered.map(f => {
    const gType = f.geometry_type || 'Unknown';
    let typeBadgeClass = 'badge-type-poly';
    if (gType.includes('Line')) typeBadgeClass = 'badge-type-line';
    if (gType.includes('Point')) typeBadgeClass = 'badge-type-point';

    const meas = f.measurements || {};
    const areaVal = meas.area_m2 != null ? `<span class="meas-val">${formatArea(meas.area_m2)}</span>` : '<span class="meas-na">—</span>';
    const lenVal = meas.length_m != null ? `<span class="meas-val">${formatLength(meas.length_m)}</span>` : '<span class="meas-na">—</span>';

    // Format properties preview
    const props = f.properties || {};
    const propKeys = Object.keys(props);
    const propPreview = propKeys.length > 0
      ? `${propKeys[0]}: <strong>${String(props[propKeys[0]]).substring(0, 18)}</strong>${propKeys.length > 1 ? ` (+${propKeys.length - 1} more)` : ''}`
      : '<span class="text-muted">No custom attributes</span>';

    return `
      <tr id="row-feature-${f.feature_index}" onclick="window.focusFeatureOnMap(${f.feature_index})">
        <td class="font-mono text-muted">#${f.feature_index}</td>
        <td>
          <span class="badge-type ${typeBadgeClass}">
            ${gType}
          </span>
        </td>
        <td>${areaVal}</td>
        <td>${lenVal}</td>
        <td>${propPreview}</td>
        <td>
          <div class="table-row-actions" onclick="event.stopPropagation()">
            <button class="btn-table-icon" title="Focus feature on Map" onclick="window.focusFeatureOnMap(${f.feature_index})">
              <i data-lucide="crosshair"></i>
            </button>
            <button class="btn-table-icon" title="Inspect attributes & WKT" onclick="window.inspectFeature(${f.feature_index})">
              <i data-lucide="eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  initLucide();
}

function highlightTableRow(featureIndex) {
  document.querySelectorAll('#featuresTableBody tr').forEach(r => r.classList.remove('row-highlight'));
  const row = document.getElementById(`row-feature-${featureIndex}`);
  if (row) {
    row.classList.add('row-highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ---------------------------------------------------------------------------
// Focus Feature on Map
// ---------------------------------------------------------------------------
window.focusFeatureOnMap = function(featureIndex) {
  highlightTableRow(featureIndex);

  if (!state.geoJsonLayer) return;

  state.geoJsonLayer.eachLayer(layer => {
    if (layer.feature && layer.feature.properties.feature_index === featureIndex) {
      if (layer.getBounds) {
        state.map.fitBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 17 });
      } else if (layer.getLatLng) {
        state.map.setView(layer.getLatLng(), 17);
      }
      layer.openPopup();
      
      // Temporary highlight pulse
      layer.setStyle({ color: '#f59e0b', weight: 6, fillOpacity: 0.8 });
      setTimeout(() => {
        state.geoJsonLayer.resetStyle(layer);
      }, 2500);
    }
  });
};

// ---------------------------------------------------------------------------
// Inspect Feature Modal
// ---------------------------------------------------------------------------
window.inspectFeature = function(featureIndex) {
  const feat = state.featuresList.find(f => f.feature_index === featureIndex);
  if (!feat) return;

  currentInspectedFeature = feat;
  elements.featureModalTitle.textContent = `Feature #${feat.feature_index}`;
  elements.featureModalSubtitle.textContent = `Geometry: ${feat.geometry_type || 'Unknown'} • CRS: ${feat.crs || 'EPSG:4326'}`;

  const meas = feat.measurements || {};
  let badgesHtml = '';

  if (meas.area_m2 != null) {
    badgesHtml += `
      <div class="meas-badge-card">
        <span class="label">Area (Square Metres)</span>
        <span class="val">${formatNumber(meas.area_m2)} m²</span>
      </div>
      <div class="meas-badge-card">
        <span class="label">Area (Hectares / Acres)</span>
        <span class="val">${formatNumber(meas.area_m2 * 0.0001, 3)} ha / ${formatNumber(meas.area_m2 * 0.000247105, 3)} ac</span>
      </div>
    `;
  }

  if (meas.length_m != null) {
    badgesHtml += `
      <div class="meas-badge-card">
        <span class="label">Length (Metres / Kilometres)</span>
        <span class="val">${formatNumber(meas.length_m)} m (${formatNumber(meas.length_m / 1000, 3)} km)</span>
      </div>
      <div class="meas-badge-card">
        <span class="label">Length (Miles / Feet)</span>
        <span class="val">${formatNumber(meas.length_m * 0.000621371, 3)} mi (${formatNumber(meas.length_m * 3.28084, 1)} ft)</span>
      </div>
    `;
  }

  if (meas.measurement_error) {
    badgesHtml += `
      <div class="meas-badge-card" style="grid-column: span 2; border-color: var(--accent-rose);">
        <span class="label" style="color: var(--accent-rose);">Measurement Note</span>
        <span class="val" style="font-size: 0.85rem; color: #fda4af;">${meas.measurement_error}</span>
      </div>
    `;
  }

  if (!badgesHtml) {
    badgesHtml = `
      <div class="meas-badge-card" style="grid-column: span 2;">
        <span class="label">Geodesic Note</span>
        <span class="val" style="font-size: 0.85rem; color: var(--text-muted);">Points & Markers have 0 length and 0 area by spatial definition.</span>
      </div>
    `;
  }

  elements.featureMeasurementsGrid.innerHTML = badgesHtml;
  elements.featurePropsJson.textContent = JSON.stringify(feat.properties || {}, null, 2);
  elements.featureWktText.textContent = feat.geometry_wkt || 'No WKT Available';

  elements.featureDetailModal.classList.remove('hidden');
};

window.inspectFeatureFromPopup = function(featureIndex) {
  window.inspectFeature(featureIndex);
};

// ---------------------------------------------------------------------------
// Export Actions
// ---------------------------------------------------------------------------
function exportGeoJson() {
  if (!state.geoJsonData) return;
  const jsonStr = JSON.stringify(state.geoJsonData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentFileName || 'geospatial_features'}_export.geojson`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('GeoJSON exported successfully!', 'success');
}

function exportCsv() {
  if (!state.currentFileId) return;
  window.open(`/api/files/${state.currentFileId}/export/csv`, '_blank');
  showToast('CSV measurements export started.', 'success');
}

function copyGeoJson() {
  if (!state.geoJsonData) return;
  navigator.clipboard.writeText(JSON.stringify(state.geoJsonData, null, 2)).then(() => {
    showToast('GeoJSON copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard.', 'error');
  });
}

// ---------------------------------------------------------------------------
// History Modal & Drawer
// ---------------------------------------------------------------------------
async function openHistoryModal() {
  elements.historyModal.classList.remove('hidden');
  fetchUploadHistory();
}

function closeHistoryModal() {
  elements.historyModal.classList.add('hidden');
}

async function fetchUploadHistory() {
  elements.historyListContainer.innerHTML = '<div class="text-center py-8 text-muted">Loading history...</div>';
  try {
    const res = await fetch('/api/files/?limit=50');
    if (!res.ok) throw new Error('Failed to load history');
    
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      elements.historyListContainer.innerHTML = '<div class="text-center py-8 text-muted">No uploaded datasets yet.</div>';
      return;
    }

    elements.historyListContainer.innerHTML = data.items.map(item => `
      <div class="history-item">
        <div class="history-info">
          <span class="history-name">${item.filename}</span>
          <div class="history-meta">
            <span>Status: <strong style="color: ${item.status === 'COMPLETED' ? '#10b981' : '#f59e0b'}">${item.status}</strong></span>
            <span>Features: ${item.feature_count ?? '—'}</span>
            <span>CRS: ${item.crs || '—'}</span>
            <span>Date: ${new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn btn-secondary" onclick="window.loadDatasetFromHistory('${item.id}')">
            <i data-lucide="folder-open"></i> Load
          </button>
          <button class="btn-icon-danger" onclick="window.deleteFileFromHistory('${item.id}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');

    initLucide();
  } catch (err) {
    elements.historyListContainer.innerHTML = `<div class="text-center py-8 text-rose-400">${err.message}</div>`;
  }
}

window.loadDatasetFromHistory = function(fileId) {
  closeHistoryModal();
  loadDataset(fileId);
  showToast('Dataset loaded.', 'success');
};

window.deleteFileFromHistory = async function(fileId) {
  if (!confirm('Are you sure you want to delete this dataset?')) return;
  try {
    const res = await fetch(`/api/files/${fileId}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete file');
    showToast('File deleted.', 'success');
    fetchUploadHistory();

    if (state.currentFileId === fileId) {
      location.reload();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ---------------------------------------------------------------------------
// Initial Check for Existing Files
// ---------------------------------------------------------------------------
async function checkInitialFiles() {
  try {
    const res = await fetch('/api/files/?limit=1');
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        // Load latest file automatically
        loadDataset(data.items[0].id);
      }
    }
  } catch (err) {
    console.log('No prior files found.');
  }
}

// ---------------------------------------------------------------------------
// Toast Notification Utility
// ---------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  initLucide();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------
function formatNumber(val, decimals = 2) {
  if (val == null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatArea(m2) {
  if (m2 == null) return '—';
  if (state.unitSystem === 'metric') {
    if (m2 >= 1_000_000) {
      return `${formatNumber(m2 / 1_000_000, 3)} km²`;
    }
    return `${formatNumber(m2, 1)} m²`;
  } else {
    const acres = m2 * 0.000247105;
    return `${formatNumber(acres, 3)} Acres`;
  }
}

function formatLength(m) {
  if (m == null) return '—';
  if (state.unitSystem === 'metric') {
    if (m >= 1000) {
      return `${formatNumber(m / 1000, 3)} km`;
    }
    return `${formatNumber(m, 1)} m`;
  } else {
    const miles = m * 0.000621371;
    return `${formatNumber(miles, 3)} Miles`;
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
