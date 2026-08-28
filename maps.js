// CityFlow AI - Intelligent Urban Operations Map Integration
class CityFlowMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            center: [13.0827, 80.2707], // Default city center (Chennai/Metro)
            zoom: 13,
            minZoom: 11,
            maxZoom: 18,
            activeFilter: 'all',
            ...options
        };
        
        this.map = null;
        this.layers = {
            traffic: null,
            waste: null,
            delivery: null,
            loading: null,
            routes: null
        };
        this.markers = [];
        this.userLocation = null;
        this.data = {
            bins: [],
            trucks: [],
            deliveries: [],
            loadingZones: [],
            roads: []
        };
        
        this.init();
    }

    async init() {
        await this.loadMap();
        await this.detectUserLocation();
        await this.loadData();
        this.renderAllLayers();
        this.setupFilterEvents();
        this.startRealtimeTicker();
    }

    async loadMap() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Map container #${this.containerId} not found`);
            return;
        }

        // Initialize Leaflet map
        this.map = L.map(this.containerId, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView(this.options.center, this.options.zoom);

        // Add standard clean OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors | CityFlow AI Decision Engine',
            maxZoom: this.options.maxZoom,
            minZoom: this.options.minZoom
        }).addTo(this.map);

        // Layer groups
        this.layers.traffic = L.layerGroup().addTo(this.map);
        this.layers.waste = L.layerGroup().addTo(this.map);
        this.layers.delivery = L.layerGroup().addTo(this.map);
        this.layers.loading = L.layerGroup().addTo(this.map);
        this.layers.routes = L.layerGroup().addTo(this.map);

        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 200);
    }

    async detectUserLocation() {
        if (navigator.geolocation) {
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        this.userLocation = [latitude, longitude];
                        this.options.center = [latitude, longitude];
                        if (this.map) {
                            this.map.setView([latitude, longitude], 13);
                        }
                        this.addUserMarker(latitude, longitude);
                        this.generateGeoRelativeData(latitude, longitude);
                        resolve();
                    },
                    (err) => {
                        console.log('Using default city coordinates:', err.message);
                        this.generateGeoRelativeData(this.options.center[0], this.options.center[1]);
                        resolve();
                    },
                    { timeout: 5000, enableHighAccuracy: true }
                );
            });
        } else {
            this.generateGeoRelativeData(this.options.center[0], this.options.center[1]);
        }
    }

    addUserMarker(lat, lng) {
        const userIcon = L.divIcon({
            html: `<div style="
                background: #0077FC;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 3px solid #FFFFFF;
                box-shadow: 0 0 14px rgba(0, 119, 252, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFFFFF;
                font-size: 13px;
            "><i class="fas fa-crosshairs"></i></div>`,
            className: 'user-geo-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker([lat, lng], { icon: userIcon })
            .addTo(this.map)
            .bindPopup(`
                <div style="font-family: inherit; font-size: 13px; padding: 4px;">
                    <strong style="color: #0077FC;"><i class="fas fa-location-arrow"></i> Your Operations Node</strong><br>
                    <span style="color: #666;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span><br>
                    <small style="color: #28A745;">Connected to CityFlow MCP Gateway</small>
                </div>
            `);
    }

    generateGeoRelativeData(baseLat, baseLng) {
        this.data.bins = [
            { id: 'BIN-B003', location: 'Commercial High Street', fill: 97, status: 'urgent', type: 'General Waste', lat: baseLat + 0.008, lng: baseLng + 0.006, assignedTruck: 'TRK-04' },
            { id: 'BIN-B012', location: 'Market Central Plaza', fill: 88, status: 'urgent', type: 'Recyclables', lat: baseLat - 0.009, lng: baseLng + 0.012, assignedTruck: 'TRK-12' },
            { id: 'BIN-B019', location: 'Tech Park Metro Gate', fill: 85, status: 'collect_soon', type: 'Organic Waste', lat: baseLat + 0.014, lng: baseLng - 0.008, assignedTruck: null },
            { id: 'BIN-B024', location: 'North Transit Terminal', fill: 93, status: 'urgent', type: 'General Waste', lat: baseLat - 0.012, lng: baseLng - 0.014, assignedTruck: 'TRK-07' },
            { id: 'BIN-B007', location: 'Greenwood Public Park', fill: 22, status: 'normal', type: 'General Waste', lat: baseLat + 0.018, lng: baseLng + 0.015, assignedTruck: null },
            { id: 'BIN-B015', location: 'South Harbor Road', fill: 45, status: 'normal', type: 'Recyclables', lat: baseLat - 0.016, lng: baseLng + 0.004, assignedTruck: null }
        ];

        this.data.trucks = [
            { id: 'TRK-04', driver: 'Rajesh K.', status: 'En Route to B003', capacity: 75, lat: baseLat + 0.004, lng: baseLng + 0.002, targetBin: 'BIN-B003' },
            { id: 'TRK-07', driver: 'Vikram S.', status: 'En Route to B024', capacity: 60, lat: baseLat - 0.006, lng: baseLng - 0.008, targetBin: 'BIN-B024' },
            { id: 'TRK-12', driver: 'Anand M.', status: 'Collecting B012', capacity: 85, lat: baseLat - 0.008, lng: baseLng + 0.010, targetBin: 'BIN-B012' },
            { id: 'TRK-15', driver: 'Suresh R.', status: 'Available / Standby', capacity: 15, lat: baseLat + 0.015, lng: baseLng - 0.002, targetBin: null }
        ];

        this.data.deliveries = [
            { id: 'DEL-V18', driver: 'Karthik S.', cluster: 8, lat: baseLat + 0.006, lng: baseLng - 0.005, status: 'Active Delivery Loop', route: 'Downtown Hub #2' },
            { id: 'DEL-V24', driver: 'Pooja N.', cluster: 12, lat: baseLat - 0.004, lng: baseLng + 0.009, status: 'Unloading Zone B', route: 'Market Sector #4' },
            { id: 'DEL-V31', driver: 'Amit V.', cluster: 6, lat: baseLat + 0.012, lng: baseLng + 0.010, status: 'En Route Hub #7', route: 'Tech Corridor #1' }
        ];

        this.data.loadingZones = [
            { id: 'LZ-01', name: 'Downtown Express Bay', total: 4, occupied: 2, lat: baseLat + 0.005, lng: baseLng + 0.004 },
            { id: 'LZ-02', name: 'Market Street Virtual Zone', total: 3, occupied: 3, lat: baseLat - 0.007, lng: baseLng + 0.011 },
            { id: 'LZ-03', name: 'East Logistics Bay', total: 6, occupied: 3, lat: baseLat + 0.011, lng: baseLng - 0.009 }
        ];

        this.data.roads = [
            {
                name: "Downtown Arterial Corridor",
                congestion: 0.85,
                speed: "18 km/h",
                coords: [
                    [baseLat - 0.015, baseLng - 0.02],
                    [baseLat - 0.008, baseLng - 0.01],
                    [baseLat, baseLng],
                    [baseLat + 0.008, baseLng + 0.01],
                    [baseLat + 0.018, baseLng + 0.022]
                ]
            },
            {
                name: "Market Street Commercial Way",
                congestion: 0.65,
                speed: "26 km/h",
                coords: [
                    [baseLat + 0.02, baseLng - 0.015],
                    [baseLat + 0.01, baseLng - 0.005],
                    [baseLat - 0.002, baseLng + 0.008],
                    [baseLat - 0.012, baseLng + 0.018]
                ]
            },
            {
                name: "Ring Expressway North",
                congestion: 0.25,
                speed: "58 km/h",
                coords: [
                    [baseLat + 0.022, baseLng - 0.025],
                    [baseLat + 0.024, baseLng],
                    [baseLat + 0.022, baseLng + 0.025]
                ]
            }
        ];
    }

    async loadData() {
        try {
            const res = await fetch('/api/cityflow/status');
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.waste) {
                    console.log('CityFlow Live Status synced');
                }
            }
        } catch (e) {
            console.log('Fallback to local geo dataset:', e.message);
        }
    }

    renderAllLayers() {
        this.renderTraffic();
        this.renderWasteBins();
        this.renderWasteTrucks();
        this.renderDeliveryVehicles();
        this.renderLoadingZones();
        this.renderOptimizedRoutes();
    }

    renderTraffic() {
        if (!this.layers.traffic) return;
        this.layers.traffic.clearLayers();

        this.data.roads.forEach(road => {
            const color = road.congestion > 0.7 ? '#DC3545' : (road.congestion > 0.4 ? '#FFC107' : '#28A745');
            const weight = 6;
            
            const polyline = L.polyline(road.coords, {
                color: color,
                weight: weight,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(this.layers.traffic);

            polyline.bindPopup(`
                <div style="font-family: inherit; font-size: 13px; padding: 4px;">
                    <strong><i class="fas fa-traffic-light" style="color: ${color};"></i> ${road.name}</strong><br>
                    <span>Congestion Level: <strong>${Math.round(road.congestion * 100)}%</strong></span><br>
                    <span>Avg Transit Speed: <strong>${road.speed}</strong></span><br>
                    <small style="color: #666;">CityFlow AI Signal Coordination: Active</small>
                </div>
            `);
        });
    }

    renderWasteBins() {
        if (!this.layers.waste) return;
        this.layers.waste.clearLayers();

        this.data.bins.forEach(bin => {
            const color = bin.fill >= 85 ? '#DC3545' : (bin.fill >= 50 ? '#FFC107' : '#28A745');
            const badgeClass = bin.fill >= 85 ? 'urgent' : (bin.fill >= 50 ? 'collect-soon' : 'normal');

            const binIcon = L.divIcon({
                html: `<div style="
                    background: ${color};
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    border: 2.5px solid #FFFFFF;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #FFFFFF;
                    font-size: 11px;
                    font-weight: 700;
                    ${bin.fill >= 85 ? 'animation: pulse 1.5s infinite;' : ''}
                ">
                    <i class="fas fa-trash-alt" style="font-size: 10px;"></i>
                    <span>${bin.fill}%</span>
                </div>`,
                className: 'smart-bin-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([bin.lat, bin.lng], { icon: binIcon }).addTo(this.layers.waste);

            marker.bindPopup(`
                <div style="font-family: inherit; font-size: 13px; min-width: 200px; padding: 4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                        <strong style="font-size: 14px;">🗑️ ${bin.id}</strong>
                        <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; font-weight: 700;">
                            ${bin.fill}% Fill
                        </span>
                    </div>
                    <div style="color: #444; margin-bottom: 4px;"><i class="fas fa-map-pin"></i> ${bin.location}</div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 8px;">Type: ${bin.type}</div>
                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 11px; color: #777; margin-bottom: 2px;">Sensor Telemetry:</div>
                        <div style="background: #E0E0E0; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: ${color}; width: ${bin.fill}%; height: 100%;"></div>
                        </div>
                    </div>
                    ${bin.assignedTruck ? `<div style="font-size: 12px; color: #0077FC; font-weight: 600; margin-bottom: 8px;"><i class="fas fa-truck"></i> Assigned: ${bin.assignedTruck}</div>` : ''}
                    <button class="btn-primary" style="width: 100%; padding: 6px; font-size: 12px;" onclick="window.cityFlowMap.dispatchTruckTo('${bin.id}')">
                        <i class="fas fa-route"></i> ${bin.assignedTruck ? 'Re-optimize Route' : 'Dispatch Nearest Truck'}
                    </button>
                </div>
            `);
        });
    }

    renderWasteTrucks() {
        if (!this.layers.waste) return;

        this.data.trucks.forEach(truck => {
            const truckIcon = L.divIcon({
                html: `<div style="
                    background: #231F20;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid #28A745;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #28A745;
                    font-size: 13px;
                "><i class="fas fa-truck"></i></div>`,
                className: 'waste-truck-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            L.marker([truck.lat, truck.lng], { icon: truckIcon })
                .addTo(this.layers.waste)
                .bindPopup(`
                    <div style="font-family: inherit; font-size: 13px; padding: 4px;">
                        <strong style="color: #231F20;"><i class="fas fa-truck-moving" style="color: #28A745;"></i> ${truck.id}</strong><br>
                        <span>Driver: <strong>${truck.driver}</strong></span><br>
                        <span>Status: <strong>${truck.status}</strong></span><br>
                        <span>Current Load: <strong>${truck.capacity}%</strong></span>
                    </div>
                `);
        });
    }

    renderDeliveryVehicles() {
        if (!this.layers.delivery) return;
        this.layers.delivery.clearLayers();

        this.data.deliveries.forEach(del => {
            const delIcon = L.divIcon({
                html: `<div style="
                    background: #0077FC;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    border: 2px solid #FFFFFF;
                    box-shadow: 0 4px 10px rgba(0, 119, 252, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #FFFFFF;
                    font-size: 12px;
                "><i class="fas fa-box"></i></div>`,
                className: 'del-van-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            L.marker([del.lat, del.lng], { icon: delIcon })
                .addTo(this.layers.delivery)
                .bindPopup(`
                    <div style="font-family: inherit; font-size: 13px; padding: 4px;">
                        <strong style="color: #0077FC;"><i class="fas fa-shipping-fast"></i> ${del.id}</strong><br>
                        <span>Driver: ${del.driver}</span><br>
                        <span>Clustered Orders: <strong>${del.cluster} Deliveries</strong></span><br>
                        <span>Status: ${del.status}</span>
                    </div>
                `);
        });
    }

    renderLoadingZones() {
        if (!this.layers.loading) return;
        this.layers.loading.clearLayers();

        this.data.loadingZones.forEach(zone => {
            const isFull = zone.occupied >= zone.total;
            const color = isFull ? '#DC3545' : '#0077FC';

            const lzIcon = L.divIcon({
                html: `<div style="
                    background: #FFFFFF;
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    border: 2px solid ${color};
                    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${color};
                    font-size: 12px;
                    font-weight: 700;
                ">P</div>`,
                className: 'lz-icon',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            L.marker([zone.lat, zone.lng], { icon: lzIcon })
                .addTo(this.layers.loading)
                .bindPopup(`
                    <div style="font-family: inherit; font-size: 13px; padding: 4px;">
                        <strong>🅿️ ${zone.name}</strong><br>
                        <span>Occupancy: <strong>${zone.occupied} / ${zone.total} Bays</strong></span><br>
                        <span style="color: ${isFull ? '#DC3545' : '#28A745'}; font-weight: 600;">
                            ${isFull ? 'Zone Full - Slot Queue Active' : 'Available for Loading'}
                        </span>
                    </div>
                `);
        });
    }

    renderOptimizedRoutes() {
        if (!this.layers.routes) return;
        this.layers.routes.clearLayers();

        // Draw Truck 04 dynamic route to Bin B003
        const truck = this.data.trucks[0];
        const urgentBin = this.data.bins[0];

        if (truck && urgentBin) {
            const routeLine = L.polyline([
                [truck.lat, truck.lng],
                [(truck.lat + urgentBin.lat) / 2 + 0.002, (truck.lng + urgentBin.lng) / 2 - 0.002],
                [urgentBin.lat, urgentBin.lng]
            ], {
                color: '#28A745',
                weight: 4,
                dashArray: '6, 6',
                opacity: 0.9
            }).addTo(this.layers.routes);

            routeLine.bindTooltip('🚛 AI Dynamic Waste Route (TRK-04 → BIN-B003)');
        }
    }

    filterLayer(type) {
        this.options.activeFilter = type;

        // Manage visibility
        if (type === 'all') {
            this.map.addLayer(this.layers.traffic);
            this.map.addLayer(this.layers.waste);
            this.map.addLayer(this.layers.delivery);
            this.map.addLayer(this.layers.loading);
            this.map.addLayer(this.layers.routes);
        } else if (type === 'waste') {
            this.map.removeLayer(this.layers.traffic);
            this.map.addLayer(this.layers.waste);
            this.map.removeLayer(this.layers.delivery);
            this.map.removeLayer(this.layers.loading);
            this.map.addLayer(this.layers.routes);
        } else if (type === 'delivery') {
            this.map.removeLayer(this.layers.traffic);
            this.map.removeLayer(this.layers.waste);
            this.map.addLayer(this.layers.delivery);
            this.map.addLayer(this.layers.loading);
            this.map.removeLayer(this.layers.routes);
        } else if (type === 'traffic') {
            this.map.addLayer(this.layers.traffic);
            this.map.removeLayer(this.layers.waste);
            this.map.removeLayer(this.layers.delivery);
            this.map.removeLayer(this.layers.loading);
            this.map.removeLayer(this.layers.routes);
        } else if (type === 'loading') {
            this.map.removeLayer(this.layers.traffic);
            this.map.removeLayer(this.layers.waste);
            this.map.addLayer(this.layers.delivery);
            this.map.addLayer(this.layers.loading);
            this.map.removeLayer(this.layers.routes);
        }

        // Update active class on chips
        document.querySelectorAll('.layer-chip').forEach(chip => {
            if (chip.dataset.layer === type) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    setupFilterEvents() {
        document.querySelectorAll('.layer-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const layer = chip.dataset.layer;
                this.filterLayer(layer);
            });
        });

        const recenterBtn = document.getElementById('recenterMapBtn');
        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => {
                if (this.userLocation) {
                    this.map.setView(this.userLocation, 14);
                } else {
                    this.map.setView(this.options.center, 13);
                }
            });
        }

        const optimizeBtn = document.getElementById('optimizeAllRoutesBtn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.triggerGlobalOptimization());
        }
    }

    async triggerGlobalOptimization() {
        const optimizeBtn = document.getElementById('optimizeAllRoutesBtn');
        if (optimizeBtn) {
            optimizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing with AI...';
        }

        try {
            const res = await fetch('/api/cityflow/optimize-waste', { method: 'POST' });
            const data = await res.json();
            
            setTimeout(() => {
                if (window.app && window.app.showModal) {
                    window.app.showModal('CityFlow AI Route Optimization', `
                        <div style="font-size: 14px; line-height: 1.5;">
                            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px; color: #28A745;">
                                <i class="fas fa-check-circle" style="font-size: 28px;"></i>
                                <div>
                                    <strong style="font-size: 16px; color: #231F20;">Optimization Successful</strong>
                                    <div style="font-size: 12px; color: #666;">Generated dynamic routes via MCP server & OpenRouteService</div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #F8F9FA; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
                                <div>
                                    <div style="font-size: 11px; color: #666;">Distance Saved</div>
                                    <strong style="color: #28A745; font-size: 16px;">${data.totalKilometersSaved}</strong>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: #666;">Trips Eliminated</div>
                                    <strong style="color: #0077FC; font-size: 16px;">${data.tripsEliminated}</strong>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: #666;">Fuel Saved</div>
                                    <strong style="color: #28A745; font-size: 16px;">${data.fuelSaved}</strong>
                                </div>
                            </div>
                            <h5 style="margin-bottom: 8px; font-weight: 600;">Assigned Priority Dispatches:</h5>
                            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                                ${data.assignedRoutes.map(r => `
                                    <div style="padding: 8px 10px; background: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${r.binId}</strong> (${r.location})<br>
                                            <small style="color: #DC3545;">Fill: ${r.fillLevel}%</small>
                                        </div>
                                        <div style="text-align: right;">
                                            <span style="background: #0077FC; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">${r.assignedTruck}</span><br>
                                            <small style="color: #666;">ETA ${r.timeEstimated}</small>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `);
                }

                if (optimizeBtn) {
                    optimizeBtn.innerHTML = '<i class="fas fa-magic"></i> AI Route Optimization';
                }
            }, 700);
        } catch (e) {
            console.error(e);
            if (optimizeBtn) optimizeBtn.innerHTML = '<i class="fas fa-magic"></i> AI Route Optimization';
        }
    }

    async dispatchTruckTo(binId) {
        try {
            const res = await fetch('/api/cityflow/dispatch-truck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ binId })
            });
            const data = await res.json();
            
            if (window.app && window.app.showModal) {
                window.app.showModal('Dispatch Confirmed', `
                    <div style="text-align: center; padding: 12px 0;">
                        <i class="fas fa-truck" style="font-size: 36px; color: #28A745; margin-bottom: 12px;"></i>
                        <h4 style="margin-bottom: 6px;">Truck #04 Dispatched!</h4>
                        <p style="color: #666; font-size: 13px;">${data.message}</p>
                        <div style="margin-top: 12px; padding: 8px; background: #F8F9FA; border-radius: 6px; font-size: 12px;">
                            Route calculated avoiding congested Zone A. Estimated transit time: <strong>4 minutes</strong>.
                        </div>
                    </div>
                `);
            }
        } catch (e) {
            console.error(e);
        }
    }

    startRealtimeTicker() {
        setInterval(() => {
            // Subtle simulated drift/updates for trucks & vans
            this.data.trucks.forEach(t => {
                t.lat += (Math.random() - 0.5) * 0.0003;
                t.lng += (Math.random() - 0.5) * 0.0003;
            });
            this.data.deliveries.forEach(d => {
                d.lat += (Math.random() - 0.5) * 0.0003;
                d.lng += (Math.random() - 0.5) * 0.0003;
            });
            this.renderWasteTrucks();
            this.renderDeliveryVehicles();
        }, 15000);
    }

    updateLiveData(state) {
        if (!state) return;

        // If new trucks coordinates received
        if (state.waste && state.waste.trucks) {
            this.data.trucks = state.waste.trucks.map(trk => ({
                id: trk.id,
                name: trk.driver,
                status: trk.status,
                capacity: trk.capacity,
                lat: trk.lat,
                lng: trk.lng,
                target: trk.targetBin,
                eta: trk.eta
            }));
            this.renderWasteTrucks();
        }

        // If new bins status received
        if (state.waste && state.waste.bins) {
            this.data.bins = state.waste.bins.map(bin => ({
                id: bin.id,
                name: bin.location,
                fill: bin.fillLevel,
                type: bin.type,
                lat: bin.lat,
                lng: bin.lng,
                status: bin.status,
                lastEmptied: bin.lastEmptied
            }));
            this.renderWasteBins();
        }

        // If new delivery coordinates received
        if (state.logistics && state.logistics.vehicles) {
            this.data.deliveries = state.logistics.vehicles.map(veh => ({
                id: veh.id,
                name: veh.driver,
                packages: veh.clusterSize,
                status: veh.status,
                lat: veh.lat,
                lng: veh.lng,
                progress: veh.routeProgress
            }));
            this.renderDeliveryVehicles();
        }
    }
}

// Global initialization helper
window.CityFlowMap = CityFlowMap;
