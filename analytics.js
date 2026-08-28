// CityFlow AI - Analytics Dashboard (D3.js Visualization Engine)
// Visualizes measurable benchmarks: Fuel Savings, Carbon Reductions, Waste Reduction Trends, and Traffic Delays.

class CityFlowAnalytics {
    constructor(containerId = 'analyticsDashboardContainer') {
        this.containerId = containerId;
        this.currentTimeframe = '30d';
        this.data = null;
        this.resizeObserver = null;
        this.init();
    }

    async init() {
        await this.fetchAnalyticsData(this.currentTimeframe);
        this.renderDashboard();
        this.setupTimeframeControls();
        this.setupResizeObserver();
    }

    async fetchAnalyticsData(timeframe) {
        try {
            const res = await fetch(`/api/cityflow/analytics?timeframe=${timeframe}`);
            if (res.ok) {
                const json = await res.json();
                this.data = json.data;
            }
        } catch (e) {
            console.error('Error loading analytics telemetry:', e);
        }
    }

    setupTimeframeControls() {
        const buttons = document.querySelectorAll('.analytics-time-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTimeframe = btn.dataset.timeframe || '30d';
                await this.fetchAnalyticsData(this.currentTimeframe);
                this.renderDashboard();
            });
        });
    }

    setupResizeObserver() {
        const container = document.getElementById(this.containerId);
        if (container && window.ResizeObserver) {
            let resizeTimer;
            this.resizeObserver = new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (this.data) this.renderDashboard();
                }, 200);
            });
            this.resizeObserver.observe(container);
        }
    }

    renderDashboard() {
        if (!this.data || typeof d3 === 'undefined') return;

        this.renderFuelSavingsChart('fuelSavingsChartContainer', this.data.fuelTrend);
        this.renderWasteTrendChart('wasteTrendChartContainer', this.data.wasteTrend);
        this.renderSectorGainsChart('sectorGainsChartContainer', this.data.sectorGains);
    }

    // Chart 1: Fuel & CO2 Savings Over Time (D3.js Area & Multi-Line Chart)
    renderFuelSavingsChart(containerId, dataset) {
        const container = document.getElementById(containerId);
        if (!container || !dataset) return;
        container.innerHTML = '';

        const rect = container.getBoundingClientRect();
        const width = Math.max(300, rect.width || 560);
        const height = 280;
        const margin = { top: 25, right: 30, bottom: 40, left: 50 };

        const svg = d3.select(`#${containerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('overflow', 'visible');

        // Tooltip
        let tooltip = d3.select('#d3AnalyticsTooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body')
                .append('div')
                .attr('id', 'd3AnalyticsTooltip')
                .attr('class', 'd3-analytics-tooltip')
                .style('opacity', 0)
                .style('position', 'absolute')
                .style('pointer-events', 'none')
                .style('z-index', 9999);
        }

        // Scales
        const x = d3.scalePoint()
            .domain(dataset.map(d => d.day))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const maxVal = d3.max(dataset, d => Math.max(d.baselineFuel, d.actualFuel)) * 1.15;
        const y = d3.scaleLinear()
            .domain([0, maxVal])
            .range([height - margin.bottom, margin.top]);

        // Gridlines
        svg.append('g')
            .attr('class', 'grid-lines')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-(width - margin.left - margin.right))
                .tickFormat('')
            )
            .selectAll('line')
            .attr('stroke', '#E2E8F0')
            .attr('stroke-dasharray', '3,3');

        svg.select('.grid-lines .domain').remove();

        // Gradient for Fuel Saved Area
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'fuelSavingsGradient')
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '0%').attr('y2', '100%');

        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#28A745').attr('stop-opacity', 0.35);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#28A745').attr('stop-opacity', 0.02);

        // Area generator
        const area = d3.area()
            .x(d => x(d.day))
            .y0(d => y(d.actualFuel))
            .y1(d => y(d.baselineFuel))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(dataset)
            .attr('fill', 'url(#fuelSavingsGradient)')
            .attr('d', area);

        // Line generator - Baseline
        const lineBaseline = d3.line()
            .x(d => x(d.day))
            .y(d => y(d.baselineFuel))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(dataset)
            .attr('fill', 'none')
            .attr('stroke', '#94A3B8')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '5,5')
            .attr('d', lineBaseline);

        // Line generator - Actual AI Optimized
        const lineActual = d3.line()
            .x(d => x(d.day))
            .y(d => y(d.actualFuel))
            .curve(d3.curveMonotoneX);

        const pathActual = svg.append('path')
            .datum(dataset)
            .attr('fill', 'none')
            .attr('stroke', '#28A745')
            .attr('stroke-width', 3)
            .attr('d', lineActual);

        // Add Points with interactive hover
        dataset.forEach(d => {
            // Actual Fuel Point
            svg.append('circle')
                .attr('cx', x(d.day))
                .attr('cy', y(d.actualFuel))
                .attr('r', 5)
                .attr('fill', '#28A745')
                .attr('stroke', '#FFFFFF')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseenter', (event) => {
                    tooltip.transition().duration(150).style('opacity', 1);
                    tooltip.html(`
                        <div class="d3-tip-card">
                            <strong style="color: #231F20;">${d.day} Performance</strong>
                            <div style="margin-top: 4px; font-size: 12px;">
                                <div style="color: #64748B;">Baseline: <strong style="color:#231F20;">${d.baselineFuel} L</strong></div>
                                <div style="color: #28A745;">CityFlow Optimized: <strong>${d.actualFuel} L</strong></div>
                                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E2E8F0; color: #0077FC;">
                                    🌱 <strong>${d.fuelSaved} L Fuel Saved</strong> (${d.co2SavedKg} kg CO₂ avoided)
                                </div>
                            </div>
                        </div>
                    `)
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseleave', () => {
                    tooltip.transition().duration(200).style('opacity', 0);
                });
        });

        // X Axis
        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('fill', '#64748B')
            .attr('font-size', '11px')
            .attr('font-weight', '500');

        // Y Axis
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}L`))
            .selectAll('text')
            .attr('fill', '#64748B')
            .attr('font-size', '11px');

        svg.selectAll('.domain').attr('stroke', '#CBD5E1');
    }

    // Chart 2: Waste Route Distance & Overflow Trends (Grouped Bar + Line)
    renderWasteTrendChart(containerId, dataset) {
        const container = document.getElementById(containerId);
        if (!container || !dataset) return;
        container.innerHTML = '';

        const rect = container.getBoundingClientRect();
        const width = Math.max(300, rect.width || 560);
        const height = 280;
        const margin = { top: 25, right: 45, bottom: 40, left: 45 };

        const svg = d3.select(`#${containerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);

        const tooltip = d3.select('#d3AnalyticsTooltip');

        // Scales
        const x = d3.scaleBand()
            .domain(dataset.map(d => d.period))
            .range([margin.left, width - margin.right])
            .padding(0.35);

        const yLeft = d3.scaleLinear()
            .domain([0, 140])
            .range([height - margin.bottom, margin.top]);

        const yRight = d3.scaleLinear()
            .domain([0, 24])
            .range([height - margin.bottom, margin.top]);

        // Gridlines
        svg.append('g')
            .attr('class', 'grid-lines')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yLeft)
                .ticks(5)
                .tickSize(-(width - margin.left - margin.right))
                .tickFormat('')
            )
            .selectAll('line')
            .attr('stroke', '#E2E8F0')
            .attr('stroke-dasharray', '3,3');

        svg.select('.grid-lines .domain').remove();

        // Render Distance Bars
        svg.selectAll('.distance-bar')
            .data(dataset)
            .enter()
            .append('rect')
            .attr('class', 'distance-bar')
            .attr('x', d => x(d.period))
            .attr('y', d => yLeft(d.routeKm))
            .attr('width', x.bandwidth())
            .attr('height', d => (height - margin.bottom) - yLeft(d.routeKm))
            .attr('fill', '#0077FC')
            .attr('rx', 4)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => {
                tooltip.transition().duration(150).style('opacity', 1);
                tooltip.html(`
                    <div class="d3-tip-card">
                        <strong style="color: #0077FC;">${d.period} Waste Telemetry</strong>
                        <div style="margin-top: 4px; font-size: 12px;">
                            <div>🚚 Driven Distance: <strong>${d.routeKm} km</strong> (Target: ${d.targetKm}km)</div>
                            <div>🗑️ Total Bins Serviced: <strong>${d.collectedBins} bins</strong></div>
                            <div style="color: #DC3545; margin-top: 3px;">⚠️ Critical Overflow Bins: <strong>${d.criticalOverflowBins}</strong></div>
                        </div>
                    </div>
                `)
                .style('left', (event.pageX + 12) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseleave', () => {
                tooltip.transition().duration(200).style('opacity', 0);
            });

        // Overflow Trend Line
        const lineOverflow = d3.line()
            .x(d => x(d.period) + x.bandwidth() / 2)
            .y(d => yRight(d.criticalOverflowBins))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(dataset)
            .attr('fill', 'none')
            .attr('stroke', '#DC3545')
            .attr('stroke-width', 3)
            .attr('d', lineOverflow);

        // Overflow Dots
        dataset.forEach(d => {
            svg.append('circle')
                .attr('cx', x(d.period) + x.bandwidth() / 2)
                .attr('cy', yRight(d.criticalOverflowBins))
                .attr('r', 5)
                .attr('fill', '#DC3545')
                .attr('stroke', '#FFFFFF')
                .attr('stroke-width', 2);
        });

        // X Axis
        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('fill', '#64748B')
            .attr('font-size', '11px');

        // Y Axis Left (Distance)
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(yLeft).ticks(5).tickFormat(d => `${d}km`))
            .selectAll('text')
            .attr('fill', '#0077FC')
            .attr('font-size', '11px');

        // Y Axis Right (Critical Bins)
        svg.append('g')
            .attr('transform', `translate(${width - margin.right}, 0)`)
            .call(d3.axisRight(yRight).ticks(4).tickFormat(d => `${d}`))
            .selectAll('text')
            .attr('fill', '#DC3545')
            .attr('font-size', '11px');

        svg.selectAll('.domain').attr('stroke', '#CBD5E1');
    }

    // Chart 3: Sector Gains & Multi-Dimension Progress
    renderSectorGainsChart(containerId, dataset) {
        const container = document.getElementById(containerId);
        if (!container || !dataset) return;
        container.innerHTML = '';

        const listContainer = d3.select(`#${containerId}`)
            .append('div')
            .attr('class', 'sector-gains-list');

        dataset.forEach(item => {
            const row = listContainer.append('div').attr('class', 'sector-gain-row');
            
            const header = row.append('div').attr('class', 'sector-gain-header');
            header.append('span').attr('class', 'sector-name').text(item.sector);
            header.append('span').attr('class', 'sector-pct').style('color', item.color).text(`+${item.efficiencyGain}%`);

            const track = row.append('div').attr('class', 'sector-progress-track');
            track.append('div')
                .attr('class', 'sector-progress-fill')
                .style('width', '0%')
                .style('background', item.color)
                .transition()
                .duration(800)
                .style('width', `${Math.min(100, item.efficiencyGain * 2.2)}%`);
        });
    }
}

// Global initialization helper
window.CityFlowAnalytics = CityFlowAnalytics;
