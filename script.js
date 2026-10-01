const profile = {
	email: 'tbbbaraka@gmail.com',
};

const themes = ['grove', 'tide', 'orchid', 'midnight', 'warm', 'high-contrast'];
const contentStorageKey = 'baraka-portfolio-content-v1';
const themeStorageKey = 'baraka-portfolio-theme';
const legacyThemeStorageKey = 'baraka-portfolio-theme-index';
const supabaseSettings = window.PORTFOLIO_SUPABASE_CONFIG ?? {};
const supabaseUrl = typeof supabaseSettings.url === 'string' ? supabaseSettings.url.trim().replace(/\/$/, '') : '';
const adminEmail = typeof supabaseSettings.adminEmail === 'string' ? supabaseSettings.adminEmail.trim().toLowerCase() : '';
	const supabaseClient = supabaseSettings.setupComplete === true && /^https:\/\/.+/.test(supabaseUrl) && adminEmail && typeof supabaseSettings.anonKey === 'string' && supabaseSettings.anonKey.trim()
	? window.supabase?.createClient(supabaseUrl, supabaseSettings.anonKey.trim()) ?? null
	: null;
const videoDatabaseName = 'baraka-portfolio-videos-v1';
let videoDatabasePromise;
const defaultCvProfile = {
	name: 'Baraka Tuyisenge',
	role: 'Information Technology Student | Web Developer | Aspiring Cybersecurity Professional',
	email: 'tbbbaraka@gmail.com',
	phone: '+254 119 212524',
	location: 'Nairobi, Kenya',
	summary: 'Information Technology student at Africa International University, passionate about using technology to solve real-world problems and create practical digital solutions. Interests include web development, software development, networking, cybersecurity, and information systems.',
	education: 'Bachelor of Science in Information Technology\nAfrica International University (AIU), Kenya',
	skills: 'HTML, CSS, JavaScript, Python, PHP, MySQL, Databases, Data Structures, Networking, Linux, Cybersecurity Fundamentals',
	experience: 'Karate Trainer\nTeach and guide students in focus, technique, discipline, and respectful training.',
	projects: 'Personal Portfolio\nResponsive portfolio featuring projects, media galleries, and a browser-based content editor.',
};

function readStorage(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key, value) {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

function cleanText(value, maxLength = 1400) {
	return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanMediaUrl(value) {
	if (typeof value !== 'string' || !supabaseUrl) return '';
	try {
		const candidate = new URL(value);
		const project = new URL(supabaseUrl);
		return candidate.origin === project.origin && candidate.pathname.startsWith('/storage/v1/object/public/portfolio-media/')
			? candidate.href
			: '';
	} catch {
		return '';
	}
}

function cleanPhoto(value) {
	if (typeof value !== 'string') return '';
	return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : cleanMediaUrl(value);
}

function cleanCv(value) {
	if (!value || typeof value !== 'object') return null;
	const data = typeof value.data === 'string' && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(value.data)
		? value.data
		: '';
	const url = cleanMediaUrl(value.url);
	if (!data && !url) return null;
	return {
		...(data ? { data } : { url }),
		storagePath: cleanText(value.storagePath, 300),
		name: cleanText(value.name, 120).replace(/[\\/:*?"<>|]/g, '_') || 'Baraka-CV.pdf',
		updatedAt: cleanText(value.updatedAt, 40),
	};
}

function cleanCvProfile(value) {
	const profile = value && typeof value === 'object' ? value : {};
	const email = cleanText(profile.email, 254);
	return {
		name: cleanText(profile.name, 100) || defaultCvProfile.name,
		role: cleanText(profile.role, 180) || defaultCvProfile.role,
		email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : defaultCvProfile.email,
		phone: cleanText(profile.phone, 40).replace(/[^+0-9().\s-]/g, '') || defaultCvProfile.phone,
		location: cleanText(profile.location, 100) || defaultCvProfile.location,
		summary: cleanText(profile.summary, 1600) || defaultCvProfile.summary,
		education: cleanText(profile.education, 1000) || defaultCvProfile.education,
		skills: cleanText(profile.skills, 700) || defaultCvProfile.skills,
		experience: cleanText(profile.experience, 1200),
		projects: cleanText(profile.projects, 1200),
	};
}

function openVideoDatabase() {
	if (!('indexedDB' in window)) return Promise.reject(new Error('Video storage is not available in this browser.'));
	if (!videoDatabasePromise) {
		videoDatabasePromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(videoDatabaseName, 1);
			request.onupgradeneeded = () => request.result.createObjectStore('videos', { keyPath: 'id' });
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(new Error('Could not open local video storage.'));
		});
	}
	return videoDatabasePromise;
}

async function storeUploadedVideo(id, file) {
	const database = await openVideoDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('videos', 'readwrite');
		transaction.objectStore('videos').put({ id, file });
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(new Error('This video could not be saved on this device.'));
		transaction.onabort = () => reject(new Error('Saving this video was cancelled.'));
	});
}

async function readUploadedVideo(id) {
	const database = await openVideoDatabase();
	return new Promise((resolve, reject) => {
		const request = database.transaction('videos', 'readonly').objectStore('videos').get(id);
		request.onsuccess = () => resolve(request.result?.file ?? null);
		request.onerror = () => reject(new Error('Could not read a saved video.'));
	});
}

async function deleteUploadedVideo(id) {
	const database = await openVideoDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('videos', 'readwrite');
		transaction.objectStore('videos').delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(new Error('Could not remove the saved video.'));
	});
}

function cleanCustomContent(stored) {
	const source = stored && typeof stored === 'object' ? stored : {};
	const cleanEntries = (entries, kind) => Array.isArray(entries)
		? entries.slice(0, 80).map((entry) => ({
			id: cleanText(entry.id, 80),
			title: cleanText(entry.title, 90),
			category: cleanText(entry.category, 50),
			description: cleanText(entry.description),
			image: cleanPhoto(entry.image),
			imagePath: cleanText(entry.imagePath, 300),
			...(kind === 'project' ? {
				status: cleanText(entry.status, 30),
				tools: Array.isArray(entry.tools) ? entry.tools.slice(0, 10).map((tool) => cleanText(tool, 30)) : [],
			} : {}),
			...(kind === 'update' ? { date: cleanText(entry.date, 40) } : {}),
			...(kind === 'photo' ? { galleryCategory: entry.galleryCategory === 'karate' ? 'karate' : 'campus' } : {}),
			...(kind === 'video' ? {
				videoCategory: entry.videoCategory === 'karate' ? 'karate' : 'projects',
				videoUrl: cleanMediaUrl(entry.videoUrl),
				videoPath: cleanText(entry.videoPath, 300),
			} : {}),
		})).filter((entry) => entry.id && entry.title)
		: [];

	return {
		projects: cleanEntries(source.projects, 'project'),
		updates: cleanEntries(source.updates, 'update'),
		photos: cleanEntries(source.photos, 'photo'),
		videos: cleanEntries(source.videos, 'video'),
		cv: cleanCv(source.cv),
		cvProfile: cleanCvProfile(source.cvProfile),
	};
}

function loadCustomContent() {
	try {
		return cleanCustomContent(JSON.parse(readStorage(contentStorageKey) || '{}'));
	} catch {
		return cleanCustomContent(null);
	}
}

let customContent = loadCustomContent();
function applyTheme(themeName) {
	const selectedTheme = themes.includes(themeName) ? themeName : themes[0];
	document.documentElement.dataset.theme = selectedTheme;
	document.querySelector('#theme-select').value = selectedTheme;
	document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
	writeStorage(themeStorageKey, selectedTheme);
}

const storedTheme = readStorage(themeStorageKey);
const oldThemeIndex = Number.parseInt(readStorage(legacyThemeStorageKey) ?? '', 10);
const oldTheme = ['grove', 'tide', 'orchid', 'midnight'][oldThemeIndex];
applyTheme(themes.includes(storedTheme) ? storedTheme : oldTheme ?? 'grove');

const focusAreas = [
	{
		title: 'Coding & software',
		description: 'Writing code, exploring how applications work, and learning through hands-on projects.',
	},
	{
		title: 'Networks & systems',
		description: 'Network administration, setup, device configuration, and practical troubleshooting.',
	},
	{
		title: 'Updates & testing',
		description: 'Keeping software current, checking changes, and reporting issues clearly.',
	},
	{
		title: 'Technical support',
		description: 'Helping people solve everyday technology problems with patience and care.',
	},
];

const projects = [
	{
		name: 'Personal portfolio',
		category: 'Web development',
		status: 'In progress',
		description: 'A responsive portfolio bringing together my IT studies, technical interests, and karate journey.',
		tools: ['HTML', 'CSS', 'JavaScript'],
		image: 'media/images/projects/media.png.jpeg',
	},
];

const galleryImages = [
	{ src: 'media/images/karate/AIU Karate.png.jpeg', alt: 'Karate practice at Africa International University', caption: 'AIU karate', category: 'karate' },
	{ src: 'media/images/karate/karateka.png.jpeg', alt: 'Karate practice and training', caption: 'Karate practice', category: 'karate' },
	{ src: 'media/images/karate/karate.png.jpg', alt: 'A moment from karate training', caption: 'On the mat', category: 'karate' },
	{ src: 'media/images/karate/team.png.jpeg', alt: 'A karate team together', caption: 'Team spirit', category: 'karate' },
	{ src: 'media/images/campus/event.png.jpeg', alt: 'A university event', caption: 'Campus life', category: 'campus' },
	{ src: 'media/images/campus/chapel.png.jpeg', alt: 'The university chapel', caption: 'University community', category: 'campus' },
	{ src: 'media/images/campus/chapel2.png.jpeg', alt: 'A gathering at the university chapel', caption: 'A moment together', category: 'campus' },
];

const focusGrid = document.querySelector('#focus-grid');
const projectList = document.querySelector('#project-list');
const updatesList = document.querySelector('#updates-list');
const galleryGrid = document.querySelector('#gallery-grid');
const projectVideoList = document.querySelector('#project-video-list');
const karateVideoList = document.querySelector('#karate-video-list');
const galleryFilters = document.querySelectorAll('.filter-button');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxCaption = document.querySelector('#lightbox-caption');
let activeGalleryImages = [...galleryImages];
let activeImageIndex = 0;
const uploadedVideoUrls = new Map();

function renderFocusAreas() {
	focusGrid.innerHTML = focusAreas.map((area, index) => `
		<article class="focus-card">
			<span>${String(index + 1).padStart(2, '0')} / FOCUS</span>
			<h3>${escapeHtml(area.title)}</h3>
			<p>${escapeHtml(area.description)}</p>
		</article>
	`).join('');
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	})[character]);
}

function updateBirthdayCountdown() {
	const birthdayCard = document.querySelector('#milestone');
	const [birthYear, birthMonth, birthDay] = birthdayCard.dataset.birthday.split('-').map(Number);
	const now = new Date();
	const thisYearBirthday = new Date(now.getFullYear(), birthMonth - 1, birthDay);
	const age = now.getFullYear() - birthYear - (now < thisYearBirthday ? 1 : 0);
	const isBirthday = now.getMonth() === birthMonth - 1 && now.getDate() === birthDay;
	const nextBirthday = new Date(now.getFullYear() + (isBirthday ? 0 : now >= thisYearBirthday ? 1 : 0), birthMonth - 1, birthDay);
	const remaining = isBirthday ? 0 : Math.max(0, nextBirthday.getTime() - now.getTime());
	const totalMinutes = Math.floor(remaining / 60000);
	const days = Math.floor(totalMinutes / 1440);
	const hours = Math.floor((totalMinutes % 1440) / 60);
	const minutes = totalMinutes % 60;

	document.querySelector('#birthday-age').textContent = String(age);
	document.querySelector('#birthday-days').textContent = String(days).padStart(3, '0');
	document.querySelector('#birthday-hours').textContent = String(hours).padStart(2, '0');
	document.querySelector('#birthday-minutes').textContent = String(minutes).padStart(2, '0');
	document.querySelector('#birthday-caption').textContent = isBirthday ? 'Happy birthday, Baraka!' : `Next birthday in ${days} days`;
	birthdayCard.classList.toggle('is-birthday', isBirthday);
}

function renderProjects() {
	const allProjects = [...projects, ...customContent.projects];
	if (allProjects.length === 0) {
		projectList.innerHTML = '<p class="gallery-empty">Project case studies are on the way.</p>';
		return;
	}

	projectList.innerHTML = allProjects.map((project) => `
		<article class="project-card">
			<div class="project-meta">
				<span class="project-tag">${escapeHtml(project.category)}</span>
				<span class="project-tag">${escapeHtml(project.status)}</span>
			</div>
			<div class="project-content">
				<h3>${escapeHtml(project.name ?? project.title)}</h3>
				<p>${escapeHtml(project.description)}</p>
				<div class="project-tools" aria-label="Technologies">
					${project.tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join('')}
				</div>
				${project.image ? `<img class="project-cover" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.name ?? project.title)}" loading="lazy">` : ''}
			</div>
		</article>
	`).join('');
}

function renderUpdates() {
	if (customContent.updates.length === 0) {
		updatesList.innerHTML = '<div class="update-empty"><p>Updates from the journey will appear here.</p></div>';
		return;
	}

	updatesList.innerHTML = [...customContent.updates].reverse().map((update) => `
		<article class="update-card${update.image ? ' has-image' : ''}">
			<p class="update-meta">${escapeHtml(update.category)}${update.date ? ` · ${escapeHtml(update.date)}` : ''}</p>
			<h3>${escapeHtml(update.title)}</h3>
			${update.image ? `<img src="${escapeHtml(update.image)}" alt="${escapeHtml(update.title)}" loading="lazy">` : ''}
			<p>${escapeHtml(update.description)}</p>
		</article>
	`).join('');
}

function renderGallery(filter = 'all') {
	const allImages = [...galleryImages, ...customContent.photos.map((image) => ({
		src: image.image,
		alt: image.title,
		caption: image.title,
		category: image.galleryCategory,
	}))];
	activeGalleryImages = allImages.filter((image) => filter === 'all' || image.category === filter);

	galleryGrid.innerHTML = activeGalleryImages.length
		? activeGalleryImages.map((image, index) => `
			<button class="gallery-item" type="button" data-image-index="${index}" aria-label="View photo: ${escapeHtml(image.caption)}">
				<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy">
				<span class="gallery-caption">${escapeHtml(image.caption)}</span>
			</button>
		`).join('')
		: '<p class="gallery-empty">No photos in this collection yet.</p>';
}

async function renderVideoCollection(category, container) {
	const videos = customContent.videos.filter((video) => video.videoCategory === category);
	if (videos.length === 0) {
		container.innerHTML = `<p class="video-empty">No ${category === 'projects' ? 'coding' : 'karate'} videos published yet.</p>`;
		return;
	}

	const cards = await Promise.all(videos.map(async (video) => {
		let source = video.videoUrl || uploadedVideoUrls.get(video.id);
		if (!source && video.id) {
			const file = await readUploadedVideo(video.id).catch(() => null);
			if (file) {
			source = URL.createObjectURL(file);
			uploadedVideoUrls.set(video.id, source);
			}
		}
		if (!source) return '';
		return `
			<article class="video-card">
				<video controls playsinline preload="metadata" src="${source}"></video>
				<div class="video-card-copy">
					<p class="update-meta">${escapeHtml(video.category)}</p>
					<h4>${escapeHtml(video.title)}</h4>
					${video.description ? `<p>${escapeHtml(video.description)}</p>` : ''}
				</div>
			</article>
		`;
	}));

	container.innerHTML = cards.filter(Boolean).join('') || '<p class="video-empty">The saved video is unavailable. Add it again from this device.</p>';
}

function renderVideoLibrary() {
	void renderVideoCollection('projects', projectVideoList);
	void renderVideoCollection('karate', karateVideoList);
}

function renderManagedItems() {
	const items = [
		...customContent.updates.map((item) => ({ ...item, kind: 'update', label: 'Story or update' })),
		...customContent.projects.map((item) => ({ ...item, kind: 'project', label: 'Project' })),
		...customContent.photos.map((item) => ({ ...item, kind: 'photo', label: 'Gallery photo' })),
		...customContent.videos.map((item) => ({ ...item, kind: item.videoCategory === 'karate' ? 'video-karate' : 'video-project', label: item.videoCategory === 'karate' ? 'Karate video' : 'Coding / IT video' })),
		...(customContent.cv ? [{ ...customContent.cv, id: 'cv-document', title: customContent.cv.name, kind: 'cv', label: 'CV document' }] : []),
	];

	document.querySelector('#managed-items').innerHTML = items.length
		? items.map((item) => `
			<div class="managed-item">
				<span>${escapeHtml(item.title)}<small>${item.label}</small></span>
				<button class="managed-delete" type="button" data-remove-kind="${item.kind}" data-remove-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)}">Remove</button>
			</div>
		`).join('')
		: '<p class="managed-empty">Nothing added yet. Your built-in portfolio stays here.</p>';
}

function renderCvLines(target, value) {
	target.replaceChildren(...value.split('\n').filter(Boolean).map((line) => {
		const paragraph = document.createElement('p');
		paragraph.textContent = line;
		return paragraph;
	}));
}

function renderCvProfile() {
	const profile = customContent.cvProfile;
	document.querySelector('#cv-document-name').textContent = profile.name;
	document.querySelector('#cv-document-role').textContent = profile.role;
	document.querySelector('#cv-document-email').textContent = profile.email;
	document.querySelector('#cv-document-email').href = `mailto:${profile.email}`;
	document.querySelector('#cv-document-phone').textContent = profile.phone;
	document.querySelector('#cv-document-phone').href = `tel:${profile.phone.replace(/[^+\d]/g, '')}`;
	document.querySelector('#cv-document-location').textContent = profile.location;
	document.querySelector('#cv-document-summary').textContent = profile.summary;
	renderCvLines(document.querySelector('#cv-document-education'), profile.education);
	renderCvLines(document.querySelector('#cv-document-experience'), profile.experience);
	renderCvLines(document.querySelector('#cv-document-projects'), profile.projects);
	document.querySelector('#cv-document-skills').replaceChildren(...profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean).map((skill) => {
		const item = document.createElement('li');
		item.textContent = skill;
		return item;
	}));
}

function renderCv() {
	renderCvProfile();
	const card = document.querySelector('#cv-card');
	const download = document.querySelector('#cv-download');
	if (!customContent.cv) {
		card.hidden = true;
		download.removeAttribute('href');
		return;
	}

	card.hidden = false;
	document.querySelector('#cv-file-name').textContent = customContent.cv.name;
	document.querySelector('#cv-updated').textContent = customContent.cv.updatedAt
		? `PDF · Updated ${customContent.cv.updatedAt}`
		: 'PDF document';
	download.href = customContent.cv.url || customContent.cv.data;
	download.download = customContent.cv.name;
}

function renderCustomContent() {
	renderProjects();
	renderUpdates();
	renderGallery(document.querySelector('.filter-button.is-active').dataset.filter);
	renderVideoLibrary();
	renderManagedItems();
	renderCv();
}

async function persistContent(nextContent) {
	if (!supabaseClient) throw new Error('Supabase is not configured. Complete the setup before publishing.');
	if (!isAdminAuthenticated) throw new Error('Sign in with the configured admin account before publishing.');
	const { error } = await supabaseClient.from('portfolio_content').upsert({
		id: 'portfolio',
		content: nextContent,
		updated_at: new Date().toISOString(),
	});
	if (error) throw error;
	customContent = cleanCustomContent(nextContent);
	renderCustomContent();
}

async function uploadPortfolioMedia(file, folder, id) {
	if (!supabaseClient || !isAdminAuthenticated) throw new Error('Sign in to upload portfolio media.');
	const safeName = file.name ? file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-100) : 'upload';
	const path = `${folder}/${id}-${safeName}`;
	const { error } = await supabaseClient.storage.from('portfolio-media').upload(path, file, {
		cacheControl: '3600',
		contentType: file.type || undefined,
		upsert: false,
	});
	if (error) throw error;
	const { data } = supabaseClient.storage.from('portfolio-media').getPublicUrl(path);
	return { path, url: data.publicUrl };
}

async function removePortfolioMedia(paths) {
	const storedPaths = paths.filter(Boolean);
	if (!storedPaths.length || !supabaseClient) return;
	const { error } = await supabaseClient.storage.from('portfolio-media').remove(storedPaths);
	if (error) throw error;
}

function createId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function compressImage(file) {
	if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose a photo file.'));
	if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('Choose a photo smaller than 15 MB.'));

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('The photo could not be opened.'));
		reader.onload = () => {
			const image = new Image();
			image.onerror = () => reject(new Error('The photo could not be opened.'));
			image.onload = () => {
				const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
				const canvas = document.createElement('canvas');
				canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
				canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
				canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
				let result = canvas.toDataURL('image/jpeg', .76);
				if (result.length > 1400000) result = canvas.toDataURL('image/jpeg', .55);
				if (result.length > 1400000) {
					reject(new Error('This photo is too detailed to save. Choose a smaller image.'));
					return;
				}
				resolve(result);
			};
			image.src = String(reader.result);
		};
		reader.readAsDataURL(file);
	});
}

function readCvFile(file) {
	if (!file || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
		return Promise.reject(new Error('Choose a PDF file for your CV.'));
	}
	if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error('Choose a CV smaller than 2 MB.'));
	return Promise.resolve({
		file,
		name: file.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120),
		updatedAt: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date()),
	});
}

function readVideoFile(file) {
	if (!file || !/\.(?:mp4|webm)$/i.test(file.name) || (file.type && !['video/mp4', 'video/webm'].includes(file.type))) {
		return Promise.reject(new Error('Choose an MP4 or WebM video.'));
	}
	if (file.size > 150 * 1024 * 1024) return Promise.reject(new Error('Choose a video smaller than 150 MB.'));
	return Promise.resolve(file);
}

function showLightboxImage(index) {
	activeImageIndex = (index + activeGalleryImages.length) % activeGalleryImages.length;
	const image = activeGalleryImages[activeImageIndex];
	lightboxImage.src = image.src;
	lightboxImage.alt = image.alt;
	lightboxCaption.textContent = image.caption;
}

function openProfilePhoto(button) {
	const image = button.querySelector('img');
	lightbox.classList.add('lightbox--portrait');
	lightboxImage.src = image.currentSrc || image.src;
	lightboxImage.alt = 'Portrait of Baraka Tuyisenge';
	lightboxCaption.textContent = 'Baraka Tuyisenge';
	lightbox.showModal();
	document.body.classList.add('has-lightbox');
}

document.querySelectorAll('[data-open-profile]').forEach((button) => {
	button.addEventListener('click', () => openProfilePhoto(button));
});

focusGrid.addEventListener('click', (event) => {
	if (event.target.closest('.focus-card')) {
		focusGrid.querySelectorAll('.focus-card').forEach((card) => card.classList.remove('is-selected'));
		event.target.closest('.focus-card').classList.add('is-selected');
	}
});

galleryGrid.addEventListener('click', (event) => {
	const imageButton = event.target.closest('[data-image-index]');
	if (!imageButton) return;
	lightbox.classList.remove('lightbox--portrait');
	showLightboxImage(Number(imageButton.dataset.imageIndex));
	lightbox.showModal();
	document.body.classList.add('has-lightbox');
});

galleryFilters.forEach((button) => {
	button.addEventListener('click', () => {
		galleryFilters.forEach((filter) => {
			const isActive = filter === button;
			filter.classList.toggle('is-active', isActive);
			filter.setAttribute('aria-pressed', String(isActive));
		});
		renderGallery(button.dataset.filter);
	});
});

document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
document.querySelector('.lightbox-previous').addEventListener('click', () => showLightboxImage(activeImageIndex - 1));
document.querySelector('.lightbox-next').addEventListener('click', () => showLightboxImage(activeImageIndex + 1));

lightbox.addEventListener('click', (event) => {
	if (event.target === lightbox) lightbox.close();
});

lightbox.addEventListener('close', () => {
	document.body.classList.remove('has-lightbox');
	lightbox.classList.remove('lightbox--portrait');
});
lightbox.addEventListener('keydown', (event) => {
	if (event.key === 'ArrowLeft') showLightboxImage(activeImageIndex - 1);
	if (event.key === 'ArrowRight') showLightboxImage(activeImageIndex + 1);
});

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const managerDialog = document.querySelector('#manager-dialog');
const managerForm = document.querySelector('#manager-form');
const managerKind = document.querySelector('#content-kind');
const managerDescription = document.querySelector('#content-description');
const managerDescriptionLabel = document.querySelector('.manager-description-label');
const managerToolsLabel = document.querySelector('.manager-tools-label');
const managerTitleLabel = document.querySelector('.manager-title-label');
const managerCategoryLabel = document.querySelector('.manager-category-label');
const managerImage = document.querySelector('#content-image');
const managerImageLabel = document.querySelector('.manager-image-label');
const managerCvFile = document.querySelector('#content-cv');
const managerCvLabel = document.querySelector('.manager-cv-label');
const managerCvEditor = document.querySelector('#manager-cv-editor');
const managerVideoFile = document.querySelector('#content-video');
const managerVideoLabel = document.querySelector('.manager-video-label');
const managerStatus = document.querySelector('#manager-status');
const managerLayout = document.querySelector('#manager-layout');
const adminLoginForm = document.querySelector('#admin-login-form');
const adminEmailField = document.querySelector('#admin-email');
const adminAuthStatus = document.querySelector('#admin-auth-status');
const adminConfigStatus = document.querySelector('#admin-config-status');
const adminSessionControls = document.querySelector('#admin-session-controls');
const adminPasswordForm = document.querySelector('#admin-password-form');
let isAdminAuthenticated = false;
let passwordEditorOpen = false;

function updateAdminAccess(session) {
	const signedInEmail = session?.user?.email?.trim().toLowerCase() || '';
	const hasAdminRole = session?.user?.app_metadata?.portfolio_admin === true;
	isAdminAuthenticated = Boolean(supabaseClient && adminEmail && signedInEmail === adminEmail && hasAdminRole);
	const isConfigured = Boolean(supabaseClient && adminEmail);
	adminEmailField.value = adminEmail;
	adminConfigStatus.hidden = isConfigured;
	adminConfigStatus.textContent = isConfigured
		? ''
		: 'Finish the Supabase setup, then set setupComplete to true in supabase-config.js.';
	adminLoginForm.hidden = !isConfigured || isAdminAuthenticated;
	adminSessionControls.hidden = !isAdminAuthenticated;
	adminPasswordForm.hidden = !isAdminAuthenticated || !passwordEditorOpen;
	managerLayout.hidden = !isAdminAuthenticated;
	document.querySelector('#admin-account-email').textContent = isAdminAuthenticated ? signedInEmail : '';
	document.querySelectorAll('[data-admin-only]').forEach((button) => {
		button.hidden = !isAdminAuthenticated;
	});
}

async function loadCloudContent() {
	if (!supabaseClient) return;
	const { data, error } = await supabaseClient.from('portfolio_content').select('content').eq('id', 'portfolio').maybeSingle();
	if (error) {
		console.error('Could not load shared portfolio content:', error.message);
		return;
	}
	if (data?.content) {
		customContent = cleanCustomContent(data.content);
		renderCustomContent();
	}
}

async function initializeAdminAccess() {
	updateAdminAccess(null);
	if (!supabaseClient) return;
	if (new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') passwordEditorOpen = true;
	const { data, error } = await supabaseClient.auth.getSession();
	if (error) adminAuthStatus.textContent = error.message;
	updateAdminAccess(data?.session ?? null);
	supabaseClient.auth.onAuthStateChange((event, session) => {
		if (event === 'PASSWORD_RECOVERY' && session?.user?.email?.toLowerCase() === adminEmail && session?.user?.app_metadata?.portfolio_admin === true) {
			passwordEditorOpen = true;
		}
		updateAdminAccess(session);
	});
	supabaseClient
		.channel('portfolio-content-live')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_content', filter: 'id=eq.portfolio' }, (payload) => {
			if (payload.new?.content) {
				customContent = cleanCustomContent(payload.new.content);
				renderCustomContent();
			}
		})
		.subscribe();
	await loadCloudContent();
}

function fillCvEditor() {
	const profile = customContent.cvProfile;
	document.querySelector('#cv-edit-name').value = profile.name;
	document.querySelector('#cv-edit-role').value = profile.role;
	document.querySelector('#cv-edit-email').value = profile.email;
	document.querySelector('#cv-edit-phone').value = profile.phone;
	document.querySelector('#cv-edit-location').value = profile.location;
	document.querySelector('#cv-edit-summary').value = profile.summary;
	document.querySelector('#cv-edit-education').value = profile.education;
	document.querySelector('#cv-edit-skills').value = profile.skills;
	document.querySelector('#cv-edit-experience').value = profile.experience;
	document.querySelector('#cv-edit-projects').value = profile.projects;
}

function updateManagerFields() {
	const kind = managerKind.value;
	const isPhoto = kind === 'photo';
	const isCvUpload = kind === 'cv';
	const isCvEdit = kind === 'cv-edit';
	const isCv = isCvUpload || isCvEdit;
	const isVideo = kind === 'video-project' || kind === 'video-karate';
	managerTitleLabel.hidden = isCv;
	document.querySelector('#content-title').required = !isCv;
	managerCategoryLabel.hidden = isCv;
	managerDescriptionLabel.hidden = isPhoto || isCv;
	managerDescription.required = kind === 'update' || kind === 'project';
	managerToolsLabel.hidden = kind !== 'project';
	managerImageLabel.hidden = isCv || isVideo;
	managerImage.required = isPhoto;
	managerCvLabel.hidden = !isCvUpload;
	managerCvFile.required = isCvUpload;
	managerCvEditor.hidden = !isCvEdit;
	managerCvEditor.querySelectorAll('[data-cv-required]').forEach((field) => {
		field.required = isCvEdit;
	});
	managerVideoLabel.hidden = !isVideo;
	managerVideoFile.required = isVideo;
	document.querySelector('.manager-submit').innerHTML = kind === 'photo'
		? 'Add photo to gallery <span aria-hidden="true">↗</span>'
		: kind === 'project'
			? 'Add project <span aria-hidden="true">↗</span>'
			: isCvEdit
				? 'Save CV changes <span aria-hidden="true">✓</span>'
				: isCvUpload
					? 'Upload or replace PDF <span aria-hidden="true">↗</span>'
				: isVideo
					? 'Add video <span aria-hidden="true">↗</span>'
					: 'Publish update <span aria-hidden="true">↗</span>';
}

document.querySelectorAll('[data-open-manager]').forEach((button) => {
	button.addEventListener('click', () => {
		if (!isAdminAuthenticated) {
			managerDialog.showModal();
			adminEmailField.focus();
			return;
		}
		if (button.dataset.managerKind) {
			managerKind.value = button.dataset.managerKind;
			if (button.dataset.managerKind === 'cv-edit') fillCvEditor();
		}
		if (button.dataset.videoKind) {
			managerKind.value = button.dataset.videoKind;
			document.querySelector('#content-category').value = button.dataset.videoKind === 'video-karate' ? 'Karate' : 'IT & learning';
		}
		updateManagerFields();
		managerDialog.showModal();
		document.querySelector(managerKind.value === 'cv-edit' ? '#cv-edit-name' : managerKind.value === 'cv' ? '#content-cv' : '#content-title').focus();
	});
});

document.querySelector('[data-open-admin]').addEventListener('click', () => {
	managerDialog.showModal();
	if (isAdminAuthenticated) document.querySelector('#admin-change-password').focus();
	else if (adminConfigStatus.hidden) adminEmailField.focus();
});

adminLoginForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!supabaseClient || !adminEmail) return;
	const password = String(new FormData(adminLoginForm).get('password'));
	adminAuthStatus.textContent = 'Signing in…';
	const { data, error } = await supabaseClient.auth.signInWithPassword({ email: adminEmail, password });
	if (error) {
		adminAuthStatus.textContent = error.message;
		return;
	}
	if (data.user?.email?.toLowerCase() !== adminEmail || data.user?.app_metadata?.portfolio_admin !== true) {
		await supabaseClient.auth.signOut();
		adminAuthStatus.textContent = 'This account is not the configured administrator.';
		return;
	}
	adminLoginForm.reset();
	adminEmailField.value = adminEmail;
	adminAuthStatus.textContent = '';
});

document.querySelector('#admin-password-reset').addEventListener('click', async () => {
	if (!supabaseClient || !adminEmail) return;
	adminAuthStatus.textContent = 'Sending password reset email…';
	const redirectTo = `${window.location.origin}${window.location.pathname}`;
	const { error } = await supabaseClient.auth.resetPasswordForEmail(adminEmail, { redirectTo });
	adminAuthStatus.textContent = error ? error.message : 'Check the administrator email for a password reset link.';
});

document.querySelector('#admin-change-password').addEventListener('click', () => {
	passwordEditorOpen = !passwordEditorOpen;
	adminPasswordForm.hidden = !passwordEditorOpen;
	if (passwordEditorOpen) document.querySelector('#admin-new-password').focus();
});

adminPasswordForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!supabaseClient || !isAdminAuthenticated || !adminPasswordForm.reportValidity()) return;
	const password = String(new FormData(adminPasswordForm).get('newPassword'));
	const { error } = await supabaseClient.auth.updateUser({ password });
	document.querySelector('#admin-password-status').textContent = error ? error.message : 'Password updated.';
	if (!error) {
		passwordEditorOpen = false;
		adminPasswordForm.reset();
		adminPasswordForm.hidden = true;
	}
});

document.querySelector('#admin-sign-out').addEventListener('click', async () => {
	if (!supabaseClient) return;
	await supabaseClient.auth.signOut();
	passwordEditorOpen = false;
	adminAuthStatus.textContent = 'Signed out.';
});

document.querySelector('.manager-close').addEventListener('click', () => managerDialog.close());
managerDialog.addEventListener('click', (event) => {
	if (event.target === managerDialog) managerDialog.close();
});
document.querySelector('#theme-select').addEventListener('change', (event) => applyTheme(event.currentTarget.value));
managerKind.addEventListener('change', () => {
	if (managerKind.value === 'cv-edit') fillCvEditor();
	updateManagerFields();
});
document.querySelector('#cv-print').addEventListener('click', () => window.print());

managerForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!isAdminAuthenticated) {
		managerStatus.textContent = 'Sign in with the configured administrator account to publish.';
		return;
	}
	if (!managerForm.reportValidity()) return;

	const submitButton = managerForm.querySelector('[type="submit"]');
	const formData = new FormData(managerForm);
	const kind = String(formData.get('kind'));
	const title = cleanText(String(formData.get('title')), 90);
	const category = cleanText(String(formData.get('category')), 50);
	const description = cleanText(String(formData.get('description')));
	const selectedImage = managerImage.files[0];
	const selectedCv = managerCvFile.files[0];
	const selectedVideo = managerVideoFile.files[0];
	const uploadedPaths = [];
	submitButton.disabled = true;
	managerStatus.textContent = selectedVideo
		? 'Saving your video…'
		: selectedCv
			? 'Preparing your CV…'
			: selectedImage
				? 'Preparing your photo…'
				: 'Saving…';

	try {
		const nextContent = {
			projects: [...customContent.projects],
			updates: [...customContent.updates],
			photos: [...customContent.photos],
			videos: [...customContent.videos],
			cv: customContent.cv,
			cvProfile: customContent.cvProfile,
		};

		if (kind === 'cv') {
			const preparedCv = await readCvFile(selectedCv);
			const uploadedCv = await uploadPortfolioMedia(preparedCv.file, 'cv', createId());
			uploadedPaths.push(uploadedCv.path);
			const previousCvPath = customContent.cv?.storagePath;
			nextContent.cv = { url: uploadedCv.url, storagePath: uploadedCv.path, name: preparedCv.name, updatedAt: preparedCv.updatedAt };
			await persistContent(nextContent);
			uploadedPaths.length = 0;
			await removePortfolioMedia([previousCvPath]).catch(() => {});
			managerForm.reset();
			updateManagerFields();
			managerStatus.textContent = 'CV published for all visitors.';
			return;
		}

		if (kind === 'cv-edit') {
			nextContent.cvProfile = cleanCvProfile({
				name: String(formData.get('cvName')),
				role: String(formData.get('cvRole')),
				email: String(formData.get('cvEmail')),
				phone: String(formData.get('cvPhone')),
				location: String(formData.get('cvLocation')),
				summary: String(formData.get('cvSummary')),
				education: String(formData.get('cvEducation')),
				skills: String(formData.get('cvSkills')),
				experience: String(formData.get('cvExperience')),
				projects: String(formData.get('cvProjects')),
			});
			await persistContent(nextContent);
			fillCvEditor();
			managerStatus.textContent = 'CV changes published for all visitors.';
			return;
		}

		if (kind === 'video-project' || kind === 'video-karate') {
			const file = await readVideoFile(selectedVideo);
			const id = createId();
			const uploadedVideo = await uploadPortfolioMedia(file, 'videos', id);
			uploadedPaths.push(uploadedVideo.path);
			nextContent.videos.push({
				id,
				title,
				category,
				description,
				videoCategory: kind === 'video-karate' ? 'karate' : 'projects',
				videoUrl: uploadedVideo.url,
				videoPath: uploadedVideo.path,
			});
			await persistContent(nextContent);
			uploadedPaths.length = 0;
			managerForm.reset();
			updateManagerFields();
			managerStatus.textContent = 'Video published for all visitors.';
			return;
		}

		const id = createId();
		const compressedImage = selectedImage ? await compressImage(selectedImage) : '';
		let image = '';
		let imagePath = '';
		if (compressedImage) {
			const imageBlob = await (await fetch(compressedImage)).blob();
			const uploadedImage = await uploadPortfolioMedia(new File([imageBlob], `${id}.jpg`, { type: 'image/jpeg' }), 'images', id);
			uploadedPaths.push(uploadedImage.path);
			image = uploadedImage.url;
			imagePath = uploadedImage.path;
		}
		const entry = { id, title, category, description, image, imagePath };
		if (kind === 'project') {
			entry.status = 'New work';
			entry.tools = cleanText(String(formData.get('tools')), 120).split(',').map((tool) => cleanText(tool, 30)).filter(Boolean).slice(0, 10);
			nextContent.projects.push(entry);
		} else if (kind === 'photo') {
			entry.galleryCategory = category === 'Karate' ? 'karate' : 'campus';
			nextContent.photos.push(entry);
		} else {
			entry.date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date());
			nextContent.updates.push(entry);
		}

		await persistContent(nextContent);
		uploadedPaths.length = 0;

		managerForm.reset();
		updateManagerFields();
		managerStatus.textContent = 'Published for all visitors.';
	} catch (error) {
		await removePortfolioMedia(uploadedPaths).catch(() => {});
		managerStatus.textContent = error instanceof Error ? error.message : 'This item could not be saved.';
	} finally {
		submitButton.disabled = false;
	}
});

document.querySelector('#managed-items').addEventListener('click', async (event) => {
	const removeButton = event.target.closest('[data-remove-kind]');
	if (!removeButton) return;
	if (!isAdminAuthenticated) {
		managerStatus.textContent = 'Sign in with the configured administrator account to remove content.';
		return;
	}
	const kind = removeButton.dataset.removeKind;
	const isVideo = kind === 'video-project' || kind === 'video-karate';
	if (!['project', 'update', 'photo', 'cv', 'video-project', 'video-karate'].includes(kind)) return;
	try {
		const nextContent = {
			projects: [...customContent.projects],
			updates: [...customContent.updates],
			photos: [...customContent.photos],
			videos: [...customContent.videos],
			cv: customContent.cv,
			cvProfile: customContent.cvProfile,
		};
		const mediaPaths = [];
		if (kind === 'cv') {
			if (nextContent.cv?.storagePath) mediaPaths.push(nextContent.cv.storagePath);
			nextContent.cv = null;
		} else if (isVideo) {
			const removedVideo = nextContent.videos.find((item) => item.id === removeButton.dataset.removeId);
			if (removedVideo?.videoPath) mediaPaths.push(removedVideo.videoPath);
			nextContent.videos = nextContent.videos.filter((item) => item.id !== removeButton.dataset.removeId);
		} else {
			const collection = kind === 'project' ? 'projects' : kind === 'photo' ? 'photos' : 'updates';
			const removedItem = nextContent[collection].find((item) => item.id === removeButton.dataset.removeId);
			if (removedItem?.imagePath) mediaPaths.push(removedItem.imagePath);
			nextContent[collection] = nextContent[collection].filter((item) => item.id !== removeButton.dataset.removeId);
		}
		await persistContent(nextContent);
		await removePortfolioMedia(mediaPaths);
		if (isVideo) {
			const videoUrl = uploadedVideoUrls.get(removeButton.dataset.removeId);
			if (videoUrl) URL.revokeObjectURL(videoUrl);
			uploadedVideoUrls.delete(removeButton.dataset.removeId);
			await deleteUploadedVideo(removeButton.dataset.removeId).catch(() => {});
			renderVideoLibrary();
		}
		managerStatus.textContent = 'Removed for all visitors.';
	} catch (error) {
		managerStatus.textContent = error instanceof Error ? error.message : 'This item could not be removed.';
	}
});

menuToggle.addEventListener('click', () => {
	const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
	menuToggle.setAttribute('aria-expanded', String(!isExpanded));
	siteNav.classList.toggle('is-open', !isExpanded);
});

siteNav.addEventListener('click', (event) => {
	if (event.target.closest('a')) {
		menuToggle.setAttribute('aria-expanded', 'false');
		siteNav.classList.remove('is-open');
	}
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		menuToggle.setAttribute('aria-expanded', 'false');
		siteNav.classList.remove('is-open');
	}
});

document.querySelector('#subscribe-form').addEventListener('submit', (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	if (!form.reportValidity()) return;

	const formData = new FormData(form);
	const name = cleanText(String(formData.get('name')), 100);
	const email = cleanText(String(formData.get('email')), 254);
	const subject = 'Request to receive portfolio updates';
	const body = `Please add me to your portfolio updates.\n\nName: ${name || 'Not provided'}\nEmail: ${email}\n\nI agree to receive occasional portfolio updates.`;
	document.querySelector('#subscribe-status').textContent = 'Your email app is opening with a ready-to-send request. You will not be added until you send it.';
	window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

document.querySelector('#contact-form').addEventListener('submit', (event) => {
	event.preventDefault();
	const form = event.currentTarget;
	if (!form.reportValidity()) return;

	const formData = new FormData(form);
	const subject = String(formData.get('subject')).replace(/[\r\n]/g, ' ').trim();
	const senderName = String(formData.get('name')).trim();
	const senderEmail = String(formData.get('email')).trim();
	const message = String(formData.get('message')).trim();
	const body = `From: ${senderName}\nEmail: ${senderEmail}\n\n${message}`;
	const mailto = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	document.querySelector('#form-status').textContent = 'Your email app is opening with the message ready.';
	window.location.href = mailto;
});

renderFocusAreas();
renderProjects();
renderUpdates();
renderGallery();
renderManagedItems();
renderCv();
renderVideoLibrary();
updateManagerFields();
updateBirthdayCountdown();
window.setInterval(updateBirthdayCountdown, 60000);
void initializeAdminAccess();

if ('IntersectionObserver' in window) {
	const revealObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add('is-visible');
				observer.unobserve(entry.target);
			}
		});
	}, { threshold: 0.12 });

	document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
} else {
	document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
}