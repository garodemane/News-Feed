/**
 * Professional News Aggregator - Core Logic
 */

const NEWS_SOURCES = [
    { name: 'Reuters', url: 'https://www.reuters.com/news/world', rss: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best' },
    { name: 'AP News', url: 'https://apnews.com/', rss: 'https://rsshub.app/apnews/topics/ap-top-news' },
    { name: 'AFP', url: 'https://www.afp.com/', rss: 'https://rsshub.app/afp/news' },
    { name: 'BBC News', url: 'https://www.bbc.com/news', rss: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'NPR', url: 'https://www.npr.org/', rss: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'DW', url: 'https://www.dw.com/', rss: 'https://rss.dw.com/rdf/rss-en-all' },
    { name: 'NY Times', url: 'https://www.nytimes.com', rss: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
    { name: 'Guardian', url: 'https://www.theguardian.com/', rss: 'https://www.theguardian.com/world/rss' },
    { name: 'Washington Post', url: 'https://www.washingtonpost.com/', rss: 'https://feeds.washingtonpost.com/rss/world' },
    { name: 'Bloomberg', url: 'https://www.bloomberg.com', rss: 'https://feeds.bloomberg.com/markets/news.rss' },
    { name: 'WSJ', url: 'https://www.wsj.com/', rss: 'https://www.wsj.com/xml/rss/current/wsj_world_news.xml' },
    { name: 'Financial Times', url: 'https://www.ft.com/', rss: 'https://www.ft.com/world?format=rss' },
    { name: 'The Economist', url: 'https://www.economist.com/', rss: 'https://rsshub.app/economist/latest' },
    { name: 'CNN', url: 'https://edition.cnn.com/', rss: 'http://rss.cnn.com/rss/cnn_topstories.rss' }
];

const PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/'
];

let currentProxyIndex = 0;
const TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='; // Language appended later

let allNews = [];
let filteredNews = [];
let favorites = JSON.parse(localStorage.getItem('news_favorites') || '[]');
let readLater = JSON.parse(localStorage.getItem('news_readlater') || '[]');
let disabledSources = JSON.parse(localStorage.getItem('news_disabled_sources') || '[]');
let currentTab = 'feed';
let currentLang = localStorage.getItem('news_lang') || 'fa';
let currentTheme = localStorage.getItem('news_theme') || 'dark';
let currentFontSize = localStorage.getItem('news_font_size') || '16';
let categories = new Set();
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

const UI_STRINGS = {
    fa: {
        title: 'News Feed | خبرخوان هوشمند',
        feed: 'خبرخوان',
        favorites: 'علاقه‌مندی‌ها',
        readlater: 'بخوانم!',
        all_categories: 'همه دسته‌ها',
        settings: 'تنظیمات',
        sources: 'مدیریت منابع',
        lang: 'زبان برنامه و اخبار',
        theme: 'تم برنامه',
        font_size: 'اندازه فونت',
        empty: 'هنوز خبری در این بخش ذخیره نشده است.',
        refresh: 'به‌روز‌رسانی',
        shared: 'لینک خبر در کلیپ‌بورد کپی شد.'
    },
    en: {
        title: 'News Feed | AI Reader',
        feed: 'Home',
        favorites: 'Favorites',
        readlater: 'Read Later',
        all_categories: 'All Categories',
        settings: 'Settings',
        sources: 'Source Management',
        lang: 'App & News Language',
        theme: 'UI Theme',
        font_size: 'Font Size',
        empty: 'No news saved here yet.',
        refresh: 'Refresh',
        shared: 'News link copied to clipboard.'
    },
    de: {
        title: 'News Feed | KI Lesegerät',
        feed: 'Startseite',
        favorites: 'Favoriten',
        readlater: 'Später lesen',
        all_categories: 'Alle Kategorien',
        settings: 'Einstellungen',
        sources: 'Quellenverwaltung',
        lang: 'App- & Nachrichtensprache',
        theme: 'Thema',
        font_size: 'Schriftgröße',
        empty: 'Noch keine Nachrichten hier gespeichert.',
        refresh: 'Aktualisieren',
        shared: 'Link in die Zwischenablage kopiert.'
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
    initSettings();
    lucide.createIcons();
    fetchNews();

    document.getElementById('refreshBtn').addEventListener('click', () => {
        currentPage = 1;
        fetchNews();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        filterByCategory(e.target.value);
    });

    // Language switch
    document.getElementById('langSelect').addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('news_lang', currentLang);
        applySettings();
        currentPage = 1;
        fetchNews();
    });

    // Theme switch
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTheme = btn.dataset.theme;
            localStorage.setItem('news_theme', currentTheme);
            applySettings();
        });
    });

    // Font size switch
    document.getElementById('fontSizeRange').addEventListener('input', (e) => {
        currentFontSize = e.target.value;
        localStorage.setItem('news_font_size', currentFontSize);
        applySettings();
    });

    // Tab Logic
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.tab-link.active').classList.remove('active');
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            currentPage = 1; // Reset page on tab switch
            renderNews();
        });
    });

    // Sidebar Logic
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsSidebar').classList.add('open');
    });
    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsSidebar').classList.remove('open');
    });

    // Infinite Scroll
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && allNews.length > 0 && currentTab === 'feed') {
            loadMoreNews();
        }
    }, { threshold: 0.1 });

    observer.observe(document.getElementById('loadMoreTrigger'));
});

function applySettings() {
    const root = document.documentElement;
    const strings = UI_STRINGS[currentLang];

    // Apply Theme and Font Size
    root.setAttribute('data-theme', currentTheme);
    root.style.setProperty('--font-base', currentFontSize + 'px');
    document.getElementById('fontSizeDisplay').textContent = currentFontSize + 'px';
    document.getElementById('fontSizeRange').value = currentFontSize;

    // Update Theme Buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });

    // Apply Language UI
    document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
    document.getElementById('langSelect').value = currentLang;

    document.title = strings.title;
    document.querySelector('.tab-link[data-tab="feed"]').textContent = strings.feed;
    document.querySelector('.tab-link[data-tab="favorites"]').textContent = strings.favorites;
    document.querySelector('.tab-link[data-tab="readlater"]').textContent = strings.readlater;
    document.getElementById('settingsTitle').textContent = strings.settings;
    document.getElementById('sourcesTitle').textContent = strings.sources;
    document.getElementById('langLabel').textContent = strings.lang;
    document.getElementById('themeLabel').textContent = strings.theme;
    document.getElementById('fontSizeLabel').textContent = strings.font_size;
    document.getElementById('refreshBtn').title = strings.refresh;
    document.getElementById('settingsBtn').title = strings.settings;
}

function initSettings() {
    const list = document.getElementById('sourceList');
    list.innerHTML = '';
    NEWS_SOURCES.forEach(source => {
        const item = document.createElement('div');
        item.className = 'source-item';
        const isEnabled = !disabledSources.includes(source.name);
        item.innerHTML = `
            <span>${source.name}</span>
            <label class="switch">
                <input type="checkbox" ${isEnabled ? 'checked' : ''} data-source="${source.name}">
                <span class="slider"></span>
            </label>
        `;
        item.querySelector('input').addEventListener('change', (e) => {
            const sourceName = e.target.dataset.source;
            if (e.target.checked) {
                disabledSources = disabledSources.filter(s => s !== sourceName);
            } else {
                if (!disabledSources.includes(sourceName)) disabledSources.push(sourceName);
            }
            localStorage.setItem('news_disabled_sources', JSON.stringify(disabledSources));
            currentPage = 1;
            fetchNews();
        });
        list.appendChild(item);
    });
}

async function fetchNews() {
    const grid = document.getElementById('newsGrid');
    if (currentPage === 1) {
        grid.innerHTML = Array(6).fill(0).map(() => '<div class="glass skeleton skeleton-card"></div>').join('');
    }

    try {
        const activeSources = NEWS_SOURCES.filter(s => !disabledSources.includes(s.name));
        const fetchPromises = activeSources.map(source =>
            fetchWithFallback(source)
                .then(data => parseRSS(data, source.name))
                .catch(err => {
                    console.error(`Failed to fetch ${source.name}:`, err);
                    return [];
                })
        );

        const results = await Promise.all(fetchPromises);
        allNews = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Extract categories
        allNews.forEach(item => {
            if (item.category) categories.add(item.category);
        });
        updateCategoryDropdown();

        filteredNews = allNews;
        renderNews();
    } catch (error) {
        console.error('Error fetching all news:', error);
        grid.innerHTML = '<p class="error">خطا در دریافت خبرها. لطفا دوباره تلاش کنید.</p>';
    }
}

const CATEGORY_MAP = {
    'politics': 'سیاسی',
    'world': 'سیاسی',
    'government': 'سیاسی',
    'business': 'اقتصادی',
    'markets': 'اقتصادی',
    'economy': 'اقتصادی',
    'finance': 'اقتصادی',
    'sports': 'ورزشی',
    'health': 'سلامت و پزشکی',
    'medical': 'سلامت و پزشکی',
    'science': 'سلامت و پزشکی',
    'arts': 'فرهنگ و هنر',
    'culture': 'فرهنگ و هنر',
    'lifestyle': 'فرهنگ و هنر',
    'entertainment': 'سرگرمی',
    'movies': 'سرگرمی',
    'music': 'سرگرمی',
    'iran': 'ایران'
};

const ALLOWED_CATEGORIES = ['ایران', 'سیاسی', 'اقتصادی', 'ورزشی', 'سلامت و پزشکی', 'فرهنگ و هنر', 'سرگرمی'];

function parseRSS(xmlString, sourceName) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    return items.map(item => {
        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        let pubDate = item.querySelector("pubDate")?.textContent || "";

        // Fix for DW and other RDF/DublinCore dates
        if (!pubDate) {
            pubDate = item.querySelector("dc\\:date")?.textContent ||
                item.querySelector("date")?.textContent || "";
        }

        const description = item.querySelector("description")?.textContent || "";
        const rawCategory = (item.querySelector("category")?.textContent || sourceName).toLowerCase();

        // Map category
        let category = 'سیاسی'; // Default
        for (const [key, val] of Object.entries(CATEGORY_MAP)) {
            if (rawCategory.includes(key)) {
                category = val;
                break;
            }
        }

        // Filter out "Not found" messages from third-party services
        if (title.toLowerCase().includes("not found") || title.toLowerCase().includes("sign up to rss.app")) {
            return null;
        }

        // Find image
        let image = "";
        const mediaContent = item.getElementsByTagName("media:content")[0];
        if (mediaContent) image = mediaContent.getAttribute("url");
        else {
            const enclosure = item.querySelector("enclosure");
            if (enclosure) image = enclosure.getAttribute("url");
            else {
                // Try to find image in description
                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) image = imgMatch[1];
            }
        }

        return {
            title,
            link,
            pubDate,
            description: description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...', // Strip HTML and truncate
            source: sourceName,
            category,
            image,
            translatedTitle: null,
            translatedDescription: null
        };
    }).filter(item => item !== null);
}

function updateCategoryDropdown() {
    const select = document.getElementById('categoryFilter');
    const currentValue = select.value;
    select.innerHTML = `<option value="all">${UI_STRINGS[currentLang].all_categories}</option>`;

    ALLOWED_CATEGORIES.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });

    select.value = currentValue;
}

function filterByCategory(category) {
    if (category === 'all') {
        filteredNews = allNews;
    } else {
        filteredNews = allNews.filter(n => n.category === category);
    }
    currentPage = 1;
    renderNews();
}

async function renderNews() {
    const grid = document.getElementById('newsGrid');
    let sourceArray = [];

    if (currentTab === 'feed') {
        sourceArray = filteredNews;
        document.getElementById('loadMoreTrigger').style.display = 'flex';
    } else if (currentTab === 'favorites') {
        sourceArray = favorites;
        document.getElementById('loadMoreTrigger').style.display = 'none';
    } else {
        sourceArray = readLater;
        document.getElementById('loadMoreTrigger').style.display = 'none';
    }

    const newsToShow = sourceArray.slice(0, currentTab === 'feed' ? currentPage * ITEMS_PER_PAGE : sourceArray.length);

    if (currentPage === 1 || currentTab !== 'feed') grid.innerHTML = '';

    const sliceStart = currentTab === 'feed' ? (currentPage - 1) * ITEMS_PER_PAGE : 0;
    const itemsToRender = newsToShow.slice(sliceStart);

    if (itemsToRender.length === 0 && currentTab !== 'feed') {
        grid.innerHTML = '<p class="empty-msg" style="padding: 3rem; text-align: center; color: var(--text-dim);">هنوز خبری در این بخش ذخیره نشده است.</p>';
        return;
    }

    const cardPromises = itemsToRender.map(async (news) => {
        const card = createNewsCard(news);
        grid.appendChild(card);

        // Translate in parallel if not already translated
        if (!news.translatedTitle) {
            translateNews(news).then(() => {
                updateCardWithTranslation(card, news);
            });
        } else {
            updateCardWithTranslation(card, news);
        }
    });

    await Promise.all(cardPromises);
    lucide.createIcons();
}

function createNewsCard(news) {
    const card = document.createElement('div');
    card.className = 'glass news-card';

    const isFav = favorites.some(f => f.link === news.link);
    const isLater = readLater.some(r => r.link === news.link);

    card.innerHTML = `
        ${news.image ? `<img src="${news.image}" class="news-image" alt="${news.title}" onerror="this.style.display='none'">` : ''}
        <div class="news-content">
            <span class="news-source">${news.source} | ${news.category}</span>
            <h3 class="news-title ${!news.translatedTitle ? 'skeleton-text' : ''}">${news.translatedTitle || news.title}</h3>
            <p class="news-description ${!news.translatedDescription ? 'skeleton-text' : ''}">${news.translatedDescription || news.description}</p>
            <div class="news-footer">
                <span class="news-time">${new Date(news.pubDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <div class="news-actions">
                    <button class="btn-icon fav-btn ${isFav ? 'active' : ''}" title="علاقه‌مندی">
                        <i data-lucide="heart" ${isFav ? 'fill="red" stroke="red"' : ''}></i>
                    </button>
                    <button class="btn-icon later-btn ${isLater ? 'active' : ''}" title="بخوانم!">
                        <i data-lucide="bookmark" ${isLater ? 'fill="var(--primary)" stroke="var(--primary)"' : ''}></i>
                    </button>
                    <button class="btn-icon share-btn" title="اشتراک‌گذاری">
                        <i data-lucide="share-2"></i>
                    </button>
                    <a href="${news.link}" target="_blank" class="btn-icon" title="مشاهده خبر">
                        <i data-lucide="external-link"></i>
                    </a>
                </div>
            </div>
        </div>
    `;

    card.querySelector('.fav-btn').addEventListener('click', () => toggleList(news, 'favorites'));
    card.querySelector('.later-btn').addEventListener('click', () => toggleList(news, 'readlater'));
    card.querySelector('.share-btn').addEventListener('click', () => shareNews(news));

    return card;
}

async function fetchWithFallback(source) {
    for (const proxy of PROXIES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const url = `${proxy}${encodeURIComponent(source.rss)}`;
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) continue;

            const text = await res.text();
            // Handle AllOrigins structure which wraps in .contents
            if (proxy.includes('allorigins')) {
                const json = JSON.parse(text);
                return json.contents;
            }
            return text;
        } catch (e) {
            continue;
        }
    }
    throw new Error('All proxies failed');
}

async function translateNews(news) {
    if (news.translatedTitle) return;

    try {
        const lang = currentLang;
        const [titleRes, descRes] = await Promise.all([
            fetch(`${TRANSLATE_API}${lang}&dt=t&q=${encodeURIComponent(news.title)}`).then(r => r.json()),
            fetch(`${TRANSLATE_API}${lang}&dt=t&q=${encodeURIComponent(news.description.substring(0, 200))}`).then(r => r.json())
        ]);

        news.translatedTitle = titleRes[0][0][0];
        news.translatedDescription = descRes[0][0][0];
    } catch (err) {
        console.error('Translation error:', err);
        news.translatedTitle = news.title;
        news.translatedDescription = news.description;
    }
}

function updateCardWithTranslation(card, news) {
    const titleEl = card.querySelector('.news-title');
    const descEl = card.querySelector('.news-description');

    if (news.translatedTitle) {
        titleEl.textContent = news.translatedTitle;
        titleEl.classList.remove('skeleton-text');
    }
    if (news.translatedDescription) {
        descEl.textContent = news.translatedDescription;
        descEl.classList.remove('skeleton-text');
    }
}

function loadMoreNews() {
    if (currentPage * ITEMS_PER_PAGE < filteredNews.length) {
        currentPage++;
        renderNews();
    }
}

async function shareNews(news) {
    const shareData = {
        title: news.translatedTitle || news.title,
        text: news.translatedDescription || news.description,
        url: news.link
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Error sharing:', err);
        }
    } else {
        copyToClipboard(news.link);
    }
}

function toggleList(news, listName) {
    if (listName === 'favorites') {
        const index = favorites.findIndex(f => f.link === news.link);
        if (index > -1) favorites.splice(index, 1);
        else favorites.push(news);
        localStorage.setItem('news_favorites', JSON.stringify(favorites));
    } else {
        const index = readLater.findIndex(r => r.link === news.link);
        if (index > -1) readLater.splice(index, 1);
        else readLater.push(news);
        localStorage.setItem('news_readlater', JSON.stringify(readLater));
    }
    renderNews();
}

function copyToClipboard(text) {
    const dummy = document.createElement('input');
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    alert('لینک خبر در کلیپ‌بورد کپی شد.');
}
