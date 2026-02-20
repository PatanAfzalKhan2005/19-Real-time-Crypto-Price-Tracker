// CoinGecko API Configuration
const API_BASE = 'https://api.coingecko.com/api/v3';
const TOP_CRYPTOS = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'ripple', 'polkadot', 'dogecoin'];

// State
let watchlist = [];
let priceChart = null;
let volumeChart = null;
let currentCrypto = 'bitcoin';
let currentDays = 1;
let autoRefreshInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadWatchlist();
    fetchTopCryptos();
    setupEventListeners();
    
    // Auto-refresh every 60 seconds
    autoRefreshInterval = setInterval(() => {
        fetchTopCryptos();
        updateWatchlistPrices();
    }, 60000);
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDays = e.target.dataset.days;
            fetchChartData(currentCrypto, currentDays);
        });
    });
}

// Fetch Top Cryptocurrencies
async function fetchTopCryptos() {
    showLoader();
    
    try {
        const response = await fetch(`${API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false&price_change_percentage=24h`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        displayCryptos(data);
        
        // Load chart for first crypto
        if (data.length > 0) {
            fetchChartData(data[0].id, currentDays);
        }
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        showToast('Error fetching data. Using demo data...');
        loadDemoData();
    } finally {
        hideLoader();
    }
}

// Demo Data (fallback)
function loadDemoData() {
    const demoData = [
        {
            id: 'bitcoin',
            symbol: 'btc',
            name: 'Bitcoin',
            image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            current_price: 43567.89,
            price_change_percentage_24h: 2.34,
            high_24h: 44123.45,
            low_24h: 42890.12,
            market_cap: 850000000000,
            total_volume: 28000000000
        },
        {
            id: 'ethereum',
            symbol: 'eth',
            name: 'Ethereum',
            image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            current_price: 2289.45,
            price_change_percentage_24h: 1.89,
            high_24h: 2345.67,
            low_24h: 2234.56,
            market_cap: 275000000000,
            total_volume: 15000000000
        },
        {
            id: 'binancecoin',
            symbol: 'bnb',
            name: 'BNB',
            image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
            current_price: 312.45,
            price_change_percentage_24h: -0.87,
            high_24h: 318.90,
            low_24h: 308.12,
            market_cap: 48000000000,
            total_volume: 1200000000
        },
        {
            id: 'solana',
            symbol: 'sol',
            name: 'Solana',
            image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
            current_price: 98.76,
            price_change_percentage_24h: 3.45,
            high_24h: 102.34,
            low_24h: 95.67,
            market_cap: 42000000000,
            total_volume: 2100000000
        }
    ];
    
    displayCryptos(demoData);
    createDemoChart();
}

// Display Cryptocurrencies
function displayCryptos(cryptos) {
    const grid = document.getElementById('cryptoGrid');
    
    grid.innerHTML = cryptos.map(crypto => {
        const isInWatchlist = watchlist.includes(crypto.id);
        const changeClass = crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
        const changeSymbol = crypto.price_change_percentage_24h >= 0 ? '▲' : '▼';
        
        return `
            <div class="crypto-card glass" onclick="selectCrypto('${crypto.id}', '${crypto.name}', '${crypto.symbol}')">
                <div class="crypto-header">
                    <div class="crypto-info">
                        <img src="${crypto.image}" alt="${crypto.name}" class="crypto-icon">
                        <div class="crypto-name">
                            <h3>${crypto.name}</h3>
                            <span class="crypto-symbol">${crypto.symbol.toUpperCase()}</span>
                        </div>
                    </div>
                    <button class="btn-watchlist ${isInWatchlist ? 'active' : ''}" onclick="event.stopPropagation(); toggleWatchlist('${crypto.id}')">
                        ${isInWatchlist ? '⭐' : '☆'}
                    </button>
                </div>
                
                <div class="crypto-price">$${formatNumber(crypto.current_price)}</div>
                <div class="crypto-change ${changeClass}">
                    ${changeSymbol} ${Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                </div>
                
                <div class="crypto-stats">
                    <div class="stat-item">
                        <div class="stat-label">24h High</div>
                        <div class="stat-value">$${formatNumber(crypto.high_24h)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">24h Low</div>
                        <div class="stat-value">$${formatNumber(crypto.low_24h)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Market Cap</div>
                        <div class="stat-value">$${formatLargeNumber(crypto.market_cap)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Volume</div>
                        <div class="stat-value">$${formatLargeNumber(crypto.total_volume)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Select Crypto for Chart
function selectCrypto(id, name, symbol) {
    currentCrypto = id;
    document.getElementById('chartTitle').textContent = `${name} (${symbol.toUpperCase()})`;
    fetchChartData(id, currentDays);
}

// Fetch Chart Data
async function fetchChartData(cryptoId, days) {
    try {
        const response = await fetch(`${API_BASE}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`);
        
        if (!response.ok) {
            throw new Error('Chart data not available');
        }
        
        const data = await response.json();
        updateCharts(data);
    } catch (error) {
        console.error('Error fetching chart data:', error);
        createDemoChart();
    }
}

// Create Demo Chart (fallback)
function createDemoChart() {
    const now = Date.now();
    const demoData = {
        prices: [],
        total_volumes: []
    };
    
    for (let i = 24; i >= 0; i--) {
        const time = now - (i * 3600000);
        const basePrice = 43000 + Math.random() * 2000;
        const baseVolume = 25000000000 + Math.random() * 5000000000;
        
        demoData.prices.push([time, basePrice]);
        demoData.total_volumes.push([time, baseVolume]);
    }
    
    updateCharts(demoData);
}

// Update Charts
function updateCharts(data) {
    const prices = data.prices.map(p => ({ x: new Date(p[0]), y: p[1] }));
    const volumes = data.total_volumes.map(v => ({ x: new Date(v[0]), y: v[1] }));
    
    // Price Chart
    const priceCtx = document.getElementById('priceChart').getContext('2d');
    
    if (priceChart) {
        priceChart.destroy();
    }
    
    priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Price (USD)',
                data: prices,
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: (context) => `$${formatNumber(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: currentDays == 1 ? 'hour' : 'day'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: (value) => '$' + formatNumber(value)
                    }
                }
            }
        }
    });
    
    // Volume Chart
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    
    if (volumeChart) {
        volumeChart.destroy();
    }
    
    volumeChart = new Chart(volumeCtx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Volume (USD)',
                data: volumes,
                backgroundColor: 'rgba(0, 255, 136, 0.6)',
                borderColor: '#00ff88',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: (context) => `$${formatLargeNumber(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: currentDays == 1 ? 'hour' : 'day'
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        callback: (value) => '$' + formatLargeNumber(value)
                    }
                }
            }
        }
    });
}

// Search Handler
async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!query) {
        showToast('Please enter a crypto symbol');
        return;
    }
    
    showLoader();
    
    try {
        const response = await fetch(`${API_BASE}/search?query=${query}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        
        if (data.coins && data.coins.length > 0) {
            const coinId = data.coins[0].id;
            const coinResponse = await fetch(`${API_BASE}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`);
            const coinData = await coinResponse.json();
            
            if (coinData.length > 0) {
                displayCryptos(coinData);
                selectCrypto(coinData[0].id, coinData[0].name, coinData[0].symbol);
                showToast(`Found: ${coinData[0].name}`);
            } else {
                showToast('Crypto not found. Try BTC, ETH, SOL, etc.');
            }
        } else {
            showToast('Crypto not found. Try BTC, ETH, SOL, etc.');
        }
    } catch (error) {
        console.error('Error searching:', error);
        showToast('Search error. Try: bitcoin, ethereum, solana');
    } finally {
        hideLoader();
    }
}

// Watchlist Functions
function toggleWatchlist(cryptoId) {
    if (watchlist.includes(cryptoId)) {
        watchlist = watchlist.filter(id => id !== cryptoId);
        showToast('Removed from watchlist');
    } else {
        watchlist.push(cryptoId);
        showToast('Added to watchlist');
    }
    
    saveWatchlist();
    updateWatchlistDisplay();
    fetchTopCryptos(); // Refresh to update star icons
}

async function updateWatchlistDisplay() {
    const container = document.getElementById('watchlistItems');
    document.getElementById('watchlistCount').textContent = watchlist.length;
    
    if (watchlist.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No items in watchlist</p>';
        return;
    }
    
    try {
        const ids = watchlist.join(',');
        const response = await fetch(`${API_BASE}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=false`);
        const data = await response.json();
        
        container.innerHTML = data.map(crypto => {
            const changeClass = crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
            const changeSymbol = crypto.price_change_percentage_24h >= 0 ? '▲' : '▼';
            
            return `
                <div class="watchlist-item" onclick="selectCrypto('${crypto.id}', '${crypto.name}', '${crypto.symbol}')">
                    <div class="watchlist-item-info">
                        <h4>${crypto.symbol.toUpperCase()}</h4>
                        <p>${crypto.name}</p>
                    </div>
                    <div class="watchlist-item-price">
                        <div class="price">$${formatNumber(crypto.current_price)}</div>
                        <div class="change ${changeClass}">
                            ${changeSymbol} ${Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                        </div>
                    </div>
                    <button class="btn-remove" onclick="event.stopPropagation(); toggleWatchlist('${crypto.id}')">Remove</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error updating watchlist:', error);
    }
}

async function updateWatchlistPrices() {
    if (watchlist.length > 0) {
        updateWatchlistDisplay();
    }
}

function saveWatchlist() {
    localStorage.setItem('cryptoWatchlist', JSON.stringify(watchlist));
}

function loadWatchlist() {
    watchlist = JSON.parse(localStorage.getItem('cryptoWatchlist') || '[]');
    updateWatchlistDisplay();
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('light');
    const icon = document.getElementById('themeToggle');
    icon.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toFixed(6);
}

function formatLargeNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

function showLoader() {
    document.getElementById('loader').classList.add('show');
}

function hideLoader() {
    document.getElementById('loader').classList.remove('show');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
